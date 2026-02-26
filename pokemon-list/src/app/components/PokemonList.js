import { useState, useEffect } from "react";
import { getAllPokemon, getPokemonDetails } from "../api/getPokemon";
import PokemonCard from "./PokemonCard";

function PokemonList({ filter, selectPokemon, getGetTop, selected }) {
	const [list, setList] = useState([]);
	const [pokemonWithTypes, setPokemonWithTypes] = useState(new Map());

	useEffect(() => {
		getAllPokemon().then((res) => setList(res.results));
	}, []);

	// Fetch types for visible pokemon as needed
	useEffect(() => {
		if (!filter.types || filter.types.length === 0) return;

		const visiblePokemon = list.filter((pokemon) =>
			pokemon.name.toLowerCase().includes(filter.name.toLowerCase()),
		);

		visiblePokemon.forEach((pokemon) => {
			if (!pokemonWithTypes.has(pokemon.name)) {
				getPokemonDetails(pokemon.url).then((details) => {
					setPokemonWithTypes((prev) => {
						const newMap = new Map(prev);
						newMap.set(
							pokemon.name,
							details.types.map((t) => t.type.name),
						);
						return newMap;
					});
				});
			}
		});
	}, [list, filter.name, filter.types, pokemonWithTypes]);

	const filteredList = list.filter((pokemon) => {
		// Filter by name
		if (!pokemon.name.toLowerCase().includes(filter.name.toLowerCase())) {
			return false;
		}

		// Filter by types if any are selected (exclusive - must match ALL selected types)
		if (filter.types && filter.types.length > 0) {
			const pokemonTypes = pokemonWithTypes.get(pokemon.name);
			if (!pokemonTypes) return false; // Still loading
			return filter.types.every((filterType) =>
				pokemonTypes.includes(filterType),
			);
		}

		return true;
	});

	getGetTop(() => filteredList[0]);

	return (
		<ul className="pokemon-list">
			{filteredList.map((pokemon) => {
				const pokemonId = pokemon.url.split("/").slice(-2)[0];
				const isSelected = selected.some((el) => el.id === pokemonId);
				return (
					<div
						key={pokemon.name}
						onClick={() => selectPokemon(pokemon)}
						className={isSelected ? "selected" : ""}
					>
						<PokemonCard
							id={pokemonId}
							name={pokemon.name}
							isSelected={isSelected}
						></PokemonCard>
					</div>
				);
			})}
		</ul>
	);
}

export default PokemonList;
