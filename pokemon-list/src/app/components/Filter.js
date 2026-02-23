import { useState, useEffect } from "react";
import { getAllTypes } from "../api/getPokemon";

function Filter({ filter, setFilter, selectTop }) {
	const [types, setTypes] = useState([]);

	useEffect(() => {
		getAllTypes().then((res) => {
			// Filter out special types and sort alphabetically
			const pokemonTypes = res.results
				.filter((type) => !["unknown", "shadow"].includes(type.name))
				.sort((a, b) => a.name.localeCompare(b.name));
			setTypes(pokemonTypes);
		});
	}, []);

	const _handleKeyDown = (e) => {
		if (e.key === "Enter") {
			selectTop();
			e.target.select();
		}
	};

	const handleTypeToggle = (typeName) => {
		const currentTypes = filter.types || [];
		const newTypes = currentTypes.includes(typeName)
			? currentTypes.filter((t) => t !== typeName)
			: [...currentTypes, typeName];
		setFilter({ ...filter, types: newTypes });
	};

	return (
		<>
			<input
				className="game-input"
				placeholder="Name..."
				value={filter.name}
				onKeyDown={_handleKeyDown}
				onChange={(event) => setFilter({ ...filter, name: event.target.value })}
			/>
			<div className="type-filter">
				<label
					style={{
						fontWeight: "600",
						marginBottom: "0.5rem",
						display: "block",
					}}
				>
					Filter by Type:
				</label>
				<div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
					{types.map((type) => {
						const isSelected = (filter.types || []).includes(type.name);
						return (
							<button
								key={type.name}
								onClick={() => handleTypeToggle(type.name)}
								className={`type-badge ${isSelected ? "selected" : ""}`}
								style={{
									padding: "0.25rem 0.5rem",
									borderRadius: "4px",
									border: isSelected
										? "2px solid var(--action-primary)"
										: "1px solid var(--border-primary)",
									background: isSelected
										? "var(--action-primary)"
										: "var(--bg-card)",
									color: isSelected
										? "var(--text-contrast)"
										: "var(--text-primary)",
									cursor: "pointer",
									fontSize: "0.875rem",
									textTransform: "capitalize",
								}}
							>
								{type.name}
							</button>
						);
					})}
				</div>
			</div>
		</>
	);
}

export default Filter;
