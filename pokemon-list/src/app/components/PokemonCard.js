function PokemonCard({ id, name, isSelected }) {
	return (
		<div className="pokemon-card">
			{isSelected && <div className="pokemon-card-check">✓</div>}
			<img
				alt={`Sprite for ${name}`}
				src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`}
			/>
			<br />
			{name} ({id})
		</div>
	);
}

export default PokemonCard;
