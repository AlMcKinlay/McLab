import { useState, useEffect } from "react";
import {
	getAllPokemon,
	getPokedex,
	getPokemonDetails,
	getTypeDetails,
	getVersion,
	getVersionGroup,
} from "../api/getPokemon";
import PokemonCard from "./PokemonCard";

const DLC_SEPARATOR = "__with_dlc__";

const resolveSpeciesNameFromDexGroups = (
	pokemonName,
	dexGroups,
	speciesNameMap,
) => {
	if (!dexGroups || dexGroups.length === 0) {
		return pokemonName;
	}

	const hasSpecies = (name) =>
		dexGroups.some((group) => group.entries.has(name));

	if (hasSpecies(pokemonName)) {
		return pokemonName;
	}

	const resolvedSpeciesName = speciesNameMap?.get(pokemonName);
	if (resolvedSpeciesName && hasSpecies(resolvedSpeciesName)) {
		return resolvedSpeciesName;
	}

	return pokemonName;
};

const parseSelectedVersions = (selectedGame) => {
	if (!selectedGame) {
		return [];
	}

	if (selectedGame.includes(DLC_SEPARATOR)) {
		return selectedGame.split(DLC_SEPARATOR).filter(Boolean);
	}

	return [selectedGame];
};

function PokemonList({
	filter,
	selectPokemon,
	onTopPokemonChange,
	onFilteredListChange,
	onAllPokemonChange,
	onRegionalDexMapChange,
	selected,
	showList = true,
}) {
	const [list, setList] = useState([]);
	const [typePokemonMap, setTypePokemonMap] = useState(new Map());
	const [speciesNameMap, setSpeciesNameMap] = useState(new Map());
	const [gameDexCache, setGameDexCache] = useState(new Map());
	const [activeGameDex, setActiveGameDex] = useState(null);
	const [regionalPokemonMap, setRegionalPokemonMap] = useState(new Map());
	const isGameDexReady = !filter.game || gameDexCache.has(filter.game);

	useEffect(() => {
		getAllPokemon().then((res) => setList(res.results));
	}, []);

	useEffect(() => {
		if (!filter.game) {
			setActiveGameDex(null);
			return;
		}

		if (gameDexCache.has(filter.game)) {
			setActiveGameDex(gameDexCache.get(filter.game));
			return;
		}

		setActiveGameDex(null);

		let cancelled = false;
		const selectedVersions = parseSelectedVersions(filter.game);

		const loadDexForVersion = (versionName) => {
			return Promise.resolve()
				.then(() => getVersion(versionName))
				.then((version) => getVersionGroup(version.version_group.name))
				.then((versionGroup) => {
					const pokedexNames = (versionGroup.pokedexes || []).map(
						(pokedex) => pokedex.name,
					);

					if (pokedexNames.length === 0) {
						return [];
					}

					return Promise.all(pokedexNames.map((name) => getPokedex(name))).then(
						(pokedexes) => {
							return pokedexes.map((pokedex) => {
								const entries = new Map();
								(pokedex.pokemon_entries || []).forEach((entry) => {
									const existing = entries.get(entry.pokemon_species.name);
									if (
										typeof existing !== "number" ||
										entry.entry_number < existing
									) {
										entries.set(entry.pokemon_species.name, entry.entry_number);
									}
								});

								return {
									name: pokedex.name,
									entries,
								};
							});
						},
					);
				});
		};

		Promise.all(
			selectedVersions.map((versionName) => loadDexForVersion(versionName)),
		)
			.then((dexGroupCollections) => {
				const dedupedGroups = [];
				dexGroupCollections.flat().forEach((group) => {
					if (!dedupedGroups.some((existing) => existing.name === group.name)) {
						dedupedGroups.push(group);
					}
				});

				const lookup = new Map();
				dedupedGroups.forEach((group, groupIndex) => {
					group.entries.forEach((entryNumber, speciesName) => {
						if (!lookup.has(speciesName)) {
							lookup.set(speciesName, {
								groupIndex,
								entryNumber,
								groupName: group.name,
							});
						}
					});
				});

				return { groups: dedupedGroups, lookup };
			})
			.then((dexData) => {
				if (cancelled) return;
				setGameDexCache((prev) => {
					const next = new Map(prev);
					next.set(filter.game, dexData);
					return next;
				});
				setActiveGameDex(dexData);
			})
			.catch(() => {
				if (cancelled) return;
				setActiveGameDex({ groups: [], lookup: new Map() });
			});

		return () => {
			cancelled = true;
		};
	}, [filter.game, gameDexCache]);

	useEffect(() => {
		if (onRegionalDexMapChange) {
			onRegionalDexMapChange(regionalPokemonMap);
		}
	}, [regionalPokemonMap, onRegionalDexMapChange]);

	// Fetch type memberships once per selected type and cache in-memory
	useEffect(() => {
		const selectedTypes = filter.types || [];
		if (selectedTypes.length === 0) {
			return;
		}

		selectedTypes.forEach((typeName) => {
			if (typePokemonMap.has(typeName)) {
				return;
			}

			getTypeDetails(typeName).then((typeDetails) => {
				setTypePokemonMap((prev) => {
					if (prev.has(typeName)) {
						return prev;
					}

					const names = new Set(
						(typeDetails.pokemon || []).map((entry) => entry.pokemon.name),
					);
					const next = new Map(prev);
					next.set(typeName, names);
					return next;
				});
			});
		});
	}, [filter.types, typePokemonMap]);

	useEffect(() => {
		if (!filter.game || !isGameDexReady || !activeGameDex) {
			return;
		}

		const hasSpeciesInDex = (name) =>
			activeGameDex.groups.some((group) => group.entries.has(name));

		const candidates = list.filter((pokemon) => {
			return (
				pokemon.name.includes("-") &&
				!hasSpeciesInDex(pokemon.name) &&
				!speciesNameMap.has(pokemon.name)
			);
		});

		candidates.forEach((pokemon) => {
			getPokemonDetails(pokemon.url).then((details) => {
				setSpeciesNameMap((prev) => {
					if (prev.has(pokemon.name)) {
						return prev;
					}

					const next = new Map(prev);
					next.set(pokemon.name, details.species?.name || pokemon.name);
					return next;
				});
			});
		});
	}, [filter.game, isGameDexReady, activeGameDex, list, speciesNameMap]);

	useEffect(() => {
		if (!activeGameDex || !filter.game || !isGameDexReady) {
			setRegionalPokemonMap(new Map());
			return;
		}

		const map = new Map();
		list.forEach((pokemon) => {
			const speciesName = resolveSpeciesNameFromDexGroups(
				pokemon.name,
				activeGameDex.groups,
				speciesNameMap,
			);
			const regionalEntry = activeGameDex.lookup.get(speciesName);
			if (regionalEntry) {
				map.set(pokemon.name, regionalEntry);
			}
		});
		setRegionalPokemonMap(map);
	}, [activeGameDex, filter.game, isGameDexReady, list, speciesNameMap]);

	const filteredList = list.filter((pokemon) => {
		// Filter by name
		if (!pokemon.name.toLowerCase().includes(filter.name.toLowerCase())) {
			return false;
		}

		// Filter by types if any are selected (exclusive - must match ALL selected types)
		if (filter.types && filter.types.length > 0) {
			const hasAllTypes = filter.types.every((filterType) => {
				const typeSet = typePokemonMap.get(filterType);
				if (!typeSet) {
					return false;
				}
				return typeSet.has(pokemon.name);
			});

			if (!hasAllTypes) {
				return false;
			}
		}

		// Filter by game when selected
		if (filter.game) {
			if (!isGameDexReady || !activeGameDex) return false; // Still loading dex
			const speciesName = resolveSpeciesNameFromDexGroups(
				pokemon.name,
				activeGameDex.groups,
				speciesNameMap,
			);
			if (!activeGameDex.lookup.has(speciesName)) {
				return false;
			}
		}

		return true;
	});

	useEffect(() => {
		if (onTopPokemonChange) {
			onTopPokemonChange(filteredList[0] || null);
		}
	}, [filteredList, onTopPokemonChange]);

	useEffect(() => {
		if (onFilteredListChange) {
			const gameReady =
				!filter.game || (isGameDexReady && Boolean(activeGameDex));
			onFilteredListChange(filteredList, {
				game: filter.game || "",
				name: filter.name || "",
				gameReady,
			});
		}
	}, [
		filteredList,
		onFilteredListChange,
		filter.game,
		filter.name,
		activeGameDex,
		isGameDexReady,
	]);

	useEffect(() => {
		if (onAllPokemonChange) {
			onAllPokemonChange(list);
		}
	}, [list, onAllPokemonChange]);

	if (!showList) {
		return null;
	}

	return (
		<ul className="pokemon-list">
			{filteredList.map((pokemon) => {
				const pokemonId = pokemon.url.split("/").slice(-2)[0];
				const isSelected = selected.some((el) => el.id === pokemonId);
				return (
					<li
						key={pokemon.name}
						className={`pokemon-grid-item ${isSelected ? "selected" : ""}`}
						onClick={() => selectPokemon(pokemon)}
					>
						<PokemonCard
							id={pokemonId}
							name={pokemon.name}
							isSelected={isSelected}
						></PokemonCard>
					</li>
				);
			})}
		</ul>
	);
}

export default PokemonList;
