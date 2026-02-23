export const getAllPokemon = () => {
	return fetch("https://pokeapi.co/api/v2/pokemon?offset=0&limit=1025").then(
		(res) => res.json(),
	);
};

export const getPokemonDetails = async (url) => {
	return fetch(url).then((res) => res.json());
};

export const getAllTypes = () => {
	return fetch("https://pokeapi.co/api/v2/type").then((res) => res.json());
};
