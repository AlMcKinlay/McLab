export const getAllPokemon = () => {
	return fetch("https://pokeapi.co/api/v2/pokemon?offset=0&limit=1025").then(
		(res) => res.json(),
	);
};

export const getPokemonDetails = async (url) => {
	return fetch(url).then((res) => res.json());
};

export const getPokemonSpecies = async (name) => {
	return fetch(`https://pokeapi.co/api/v2/pokemon-species/${name}`).then(
		(res) => res.json(),
	);
};

export const getAllTypes = () => {
	return fetch("https://pokeapi.co/api/v2/type").then((res) => res.json());
};

export const getTypeDetails = (typeName) => {
	return fetch(`https://pokeapi.co/api/v2/type/${typeName}`).then((res) =>
		res.json(),
	);
};

export const getAllVersions = () => {
	return fetch("https://pokeapi.co/api/v2/version?limit=200").then((res) =>
		res.json(),
	);
};

export const getVersion = (versionName) => {
	return fetch(`https://pokeapi.co/api/v2/version/${versionName}`).then((res) =>
		res.json(),
	);
};

export const getVersionGroup = (versionGroupName) => {
	return fetch(
		`https://pokeapi.co/api/v2/version-group/${versionGroupName}`,
	).then((res) => res.json());
};

export const getPokedex = (pokedexName) => {
	return fetch(`https://pokeapi.co/api/v2/pokedex/${pokedexName}`).then((res) =>
		res.json(),
	);
};
