import { useState, useEffect } from "react";
import {
	getAllPokemon,
	getPokedex,
	getPokemonDetails,
	getVersion,
	getVersionGroup,
} from "../api/getPokemon";
import PokemonCard from "./PokemonCard";

const DLC_SEPARATOR = "__with_dlc__";

const getGenerationFromId = (id) => {
	const numericId = Number(id);
	if (numericId <= 151) return "1";
	if (numericId <= 251) return "2";
	if (numericId <= 386) return "3";
	if (numericId <= 493) return "4";
	if (numericId <= 649) return "5";
	if (numericId <= 721) return "6";
	if (numericId <= 809) return "7";
	if (numericId <= 905) return "8";
	return "9";
};

const resolveSpeciesNameFromDexGroups = (pokemonName, dexGroups) => {
	if (!dexGroups || dexGroups.length === 0) {
		return pokemonName;
	}

	const hasSpecies = (name) =>
		dexGroups.some((group) => group.entries.has(name));

	if (hasSpecies(pokemonName)) {
		return pokemonName;
	}

	const parts = pokemonName.split("-");
	for (let i = parts.length - 1; i > 0; i -= 1) {
		const candidate = parts.slice(0, i).join("-");
		if (hasSpecies(candidate)) {
			return candidate;
		}
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
	getGetTop,
	getGetFiltered,
	getGetAll,
	onRegionalDexMapChange,
	selected,
}) {
	const [list, setList] = useState([]);
	const [pokemonDetailsMap, setPokemonDetailsMap] = useState(new Map());
	const [gameDexCache, setGameDexCache] = useState(new Map());
	const [activeGameDex, setActiveGameDex] = useState(null);
	const [regionalPokemonMap, setRegionalPokemonMap] = useState(new Map());

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
		onRegionalDexMapChange(regionalPokemonMap);
	}, [regionalPokemonMap, onRegionalDexMapChange]);

	// Fetch details for visible pokemon as needed when type filtering is active
	useEffect(() => {
		const shouldFetchDetails = filter.types && filter.types.length > 0;

		if (!shouldFetchDetails) return;

		const visiblePokemon = list.filter((pokemon) =>
			pokemon.name.toLowerCase().includes(filter.name.toLowerCase()),
		);

		visiblePokemon.forEach((pokemon) => {
			if (!pokemonDetailsMap.has(pokemon.name)) {
				getPokemonDetails(pokemon.url).then((details) => {
					setPokemonDetailsMap((prev) => {
						const newMap = new Map(prev);
						newMap.set(pokemon.name, {
							types: details.types.map((t) => t.type.name),
						});
						return newMap;
					});
				});
			}
		});
	}, [list, filter.name, filter.types, pokemonDetailsMap]);

	useEffect(() => {
		if (!activeGameDex || !filter.game) {
			setRegionalPokemonMap(new Map());
			return;
		}

		const map = new Map();
		list.forEach((pokemon) => {
			const speciesName = resolveSpeciesNameFromDexGroups(
				pokemon.name,
				activeGameDex.groups,
			);
			const regionalEntry = activeGameDex.lookup.get(speciesName);
			if (regionalEntry) {
				map.set(pokemon.name, regionalEntry);
			}
		});
		setRegionalPokemonMap(map);
	}, [activeGameDex, filter.game, list]);

	const filteredList = list.filter((pokemon) => {
		const pokemonId = pokemon.url.split("/").slice(-2)[0];

		// Filter by name
		if (!pokemon.name.toLowerCase().includes(filter.name.toLowerCase())) {
			return false;
		}

		// Filter by generation
		if (
			filter.generation &&
			filter.generation !== "all" &&
			getGenerationFromId(pokemonId) !== filter.generation
		) {
			return false;
		}

		// Filter by types if any are selected (exclusive - must match ALL selected types)
		if (filter.types && filter.types.length > 0) {
			const pokemonTypes = pokemonDetailsMap.get(pokemon.name)?.types;
			if (!pokemonTypes) return false; // Still loading
			if (
				!filter.types.every((filterType) => pokemonTypes.includes(filterType))
			) {
				return false;
			}
		}

		// Filter by game when selected
		if (filter.game) {
			if (!activeGameDex) return false; // Still loading dex
			const speciesName = resolveSpeciesNameFromDexGroups(
				pokemon.name,
				activeGameDex.groups,
			);
			if (!activeGameDex.lookup.has(speciesName)) {
				return false;
			}
		}

		return true;
	});

	getGetTop(() => filteredList[0]);
	getGetFiltered(() => filteredList);
	getGetAll(() => list);

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
