import { useEffect, useState } from "react";

import PokemonList from "./PokemonList";
import Filter from "./Filter";

function SelectionList({
	selectPokemon,
	selectManyPokemon,
	selected,
	onGameChange,
	onRegionalDexMapChange,
}) {
	const [filter, setFilter] = useState({
		name: "",
		types: [],
		generation: "all",
		game: "",
	});
	const [bulkText, setBulkText] = useState("");
	const [bulkMessage, setBulkMessage] = useState("");
	let getTop = () => {};
	let getFiltered = () => [];
	let getAll = () => [];
	const getGetTop = (func) => {
		getTop = func;
	};
	const getGetFiltered = (func) => {
		getFiltered = func;
	};
	const getGetAll = (func) => {
		getAll = func;
	};

	useEffect(() => {
		onGameChange(filter.game || "");
	}, [filter.game, onGameChange]);
	const selectTop = () => {
		selectPokemon(getTop());
	};

	const selectAllVisible = () => {
		const visiblePokemon = getFiltered();
		selectManyPokemon(visiblePokemon);
	};

	const handleBulkImport = () => {
		const allPokemon = getAll();
		if (!allPokemon || allPokemon.length === 0) {
			setBulkMessage("Pokémon list is still loading.");
			return;
		}

		const tokens = bulkText
			.split(/[\n,]+/)
			.map((entry) => entry.trim().toLowerCase())
			.filter(Boolean);

		if (tokens.length === 0) {
			setBulkMessage("Nothing to import.");
			return;
		}

		const pokemonByName = new Map(
			allPokemon.map((pokemon) => [pokemon.name.toLowerCase(), pokemon]),
		);
		const matches = [];
		const notFound = [];

		tokens.forEach((name) => {
			const match = pokemonByName.get(name);
			if (match) {
				matches.push(match);
			} else {
				notFound.push(name);
			}
		});

		selectManyPokemon(matches);

		if (notFound.length > 0) {
			setBulkMessage(
				`Imported ${matches.length}. Not found: ${notFound.slice(0, 5).join(", ")}${notFound.length > 5 ? "..." : ""}`,
			);
			return;
		}

		setBulkMessage(`Imported ${matches.length} Pokémon.`);
	};

	return (
		<div className="list">
			<Filter
				filter={filter}
				setFilter={setFilter}
				selectTop={selectTop}
				selectAllVisible={selectAllVisible}
			></Filter>
			<div className="bulk-import-panel">
				<textarea
					className="bulk-import-textarea"
					placeholder="Paste Pokémon names (one per line or comma separated)"
					value={bulkText}
					onChange={(event) => setBulkText(event.target.value)}
				/>
				<button className="btn btn-secondary" onClick={handleBulkImport}>
					Import names
				</button>
				{bulkMessage ? <small>{bulkMessage}</small> : null}
			</div>
			<PokemonList
				filter={filter}
				selectPokemon={selectPokemon}
				getGetTop={getGetTop}
				getGetFiltered={getGetFiltered}
				getGetAll={getGetAll}
				onRegionalDexMapChange={onRegionalDexMapChange}
				selected={selected}
			></PokemonList>
		</div>
	);
}

export default SelectionList;
