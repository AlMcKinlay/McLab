import { useCallback, useState } from "react";

export const useSelected = () => {
	const [selected, setSelected] = useState([]);

	const selectPokemon = (pokemon) => {
		const id = pokemon.url.split("/").slice(-2)[0];
		if (selected.some((el) => el.id === id)) {
			// Ensure we don't add duplicates
			return;
		}
		const newSelected = [...selected, { ...pokemon, id }];
		newSelected.sort((a, b) => a.id - b.id);
		setSelected(newSelected);
	};

	const unselectPokemon = (pokemonId) => {
		const newSelected = selected.filter((pokemon) => pokemon.id !== pokemonId);
		setSelected(newSelected);
	};

	const clear = () => {
		setSelected([]);
	};

	const selectManyPokemon = (pokemonList) => {
		if (!Array.isArray(pokemonList) || pokemonList.length === 0) {
			return;
		}

		const existingIds = new Set(selected.map((pokemon) => pokemon.id));
		const merged = [...selected];

		pokemonList.forEach((pokemon) => {
			const id = pokemon.url.split("/").slice(-2)[0];
			if (!existingIds.has(id)) {
				existingIds.add(id);
				merged.push({ ...pokemon, id });
			}
		});

		merged.sort((a, b) => Number(a.id) - Number(b.id));
		setSelected(merged);
	};

	const replaceSelectedPokemon = useCallback((pokemonList) => {
		if (!Array.isArray(pokemonList) || pokemonList.length === 0) {
			setSelected([]);
			return;
		}

		const deduped = [];
		const seenIds = new Set();

		pokemonList.forEach((pokemon) => {
			const id = pokemon.url.split("/").slice(-2)[0];
			if (!seenIds.has(id)) {
				seenIds.add(id);
				deduped.push({ ...pokemon, id });
			}
		});

		deduped.sort((a, b) => Number(a.id) - Number(b.id));
		setSelected(deduped);
	}, []);

	return [
		selected,
		selectPokemon,
		unselectPokemon,
		clear,
		selectManyPokemon,
		replaceSelectedPokemon,
	];
};
