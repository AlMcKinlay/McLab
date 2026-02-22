import { useState, useEffect } from "react";
import { getAllPokemon } from "../api/getPokemon";
import PokemonCard from "./PokemonCard";

function PokemonList({ filter, selectPokemon, getGetTop, selected }) {
	const [list, setList] = useState([]);
	useEffect(() => {
		getAllPokemon().then((res) => setList(res.results));
	}, [setList]);

	const filteredList = list.filter((pokemon) =>
		pokemon.name.toLowerCase().includes(filter.name.toLowerCase()),
	);
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
