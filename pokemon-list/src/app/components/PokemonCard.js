import { useEffect, useRef } from "react";

// Cache for preloaded images
const imageCache = new Map();

function PokemonCard({ id, name, isSelected }) {
	const imgRef = useRef(null);

	useEffect(() => {
		const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

		// Check if image is already cached
		if (imageCache.has(imageUrl)) {
			if (imgRef.current) {
				imgRef.current.src = imageUrl;
			}
			return;
		}

		// Preload and cache the image
		const img = new Image();
		img.src = imageUrl;
		img.onload = () => {
			imageCache.set(imageUrl, true);
			if (imgRef.current) {
				imgRef.current.src = imageUrl;
			}
		};
	}, [id]);

	return (
		<div className="pokemon-card">
			{isSelected && <div className="pokemon-card-check">✓</div>}
			<img ref={imgRef} alt={`Sprite for ${name}`} loading="lazy" />
			<br />
			{name} ({id})
		</div>
	);
}

export default PokemonCard;
