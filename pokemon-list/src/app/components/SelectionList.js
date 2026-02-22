import { useState } from "react";

import PokemonList from "./PokemonList";
import Filter from "./Filter";

function SelectionList({ selectPokemon, selected }) {
	const [filter, setFilter] = useState({ name: "" });
	let getTop = () => {};
	const getGetTop = (func) => {
		getTop = func;
	};
	const selectTop = () => {
		selectPokemon(getTop());
	};

	return (
		<div className="list">
			<Filter
				filter={filter}
				setFilter={setFilter}
				selectTop={selectTop}
			></Filter>
			<PokemonList
				filter={filter}
				selectPokemon={selectPokemon}
				getGetTop={getGetTop}
				selected={selected}
			></PokemonList>
		</div>
	);
}

export default SelectionList;
