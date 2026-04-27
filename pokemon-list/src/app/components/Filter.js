import { useState, useEffect } from "react";
import { getAllTypes, getAllVersions } from "../api/getPokemon";

const DLC_SEPARATOR = "__with_dlc__";

const GAME_DLC_COMBINATIONS = [
	{
		base: "legends-za",
		dlcVersions: ["mega-dimension"],
		label: "Legends Z-A + DLC",
	},
	{
		base: "scarlet",
		dlcVersions: ["the-teal-mask", "the-indigo-disk"],
		label: "Scarlet + DLC",
	},
	{
		base: "violet",
		dlcVersions: ["the-teal-mask", "the-indigo-disk"],
		label: "Violet + DLC",
	},
	{
		base: "sword",
		dlcVersions: ["the-isle-of-armor", "the-crown-tundra"],
		label: "Sword + DLC",
	},
	{
		base: "shield",
		dlcVersions: ["the-isle-of-armor", "the-crown-tundra"],
		label: "Shield + DLC",
	},
];

const DLC_ONLY_VERSIONS = new Set(
	GAME_DLC_COMBINATIONS.flatMap((entry) => entry.dlcVersions),
);

const JAPAN_SPECIFIC_VERSIONS = new Set([
	"red-japan",
	"green-japan",
	"blue-japan",
]);

const formatGameName = (game) =>
	game
		.split("-")
		.map((part) =>
			part.length > 0
				? part.length === 1
					? part.toUpperCase()
					: part === "za"
						? "Z-A"
						: part.charAt(0).toUpperCase() + part.slice(1)
				: part,
		)
		.join(" ");

const getVersionIdFromUrl = (url) => {
	const match = url.match(/\/version\/(\d+)\/?$/);
	return match ? Number(match[1]) : -1;
};

function Filter({
	mode,
	filter,
	setFilter,
	gameFilter,
	setGameFilter,
	selectTop,
	selectAllVisible,
}) {
	const [types, setTypes] = useState([]);
	const [gameOptions, setGameOptions] = useState([]);

	useEffect(() => {
		getAllTypes().then((res) => {
			// Filter out special types and sort alphabetically
			const pokemonTypes = res.results
				.filter((type) => !["unknown", "shadow"].includes(type.name))
				.sort((a, b) => a.name.localeCompare(b.name));
			setTypes(pokemonTypes);
		});
	}, []);

	useEffect(() => {
		getAllVersions().then((res) => {
			const sortedVersions = [...res.results].sort((a, b) => {
				const aId = getVersionIdFromUrl(a.url);
				const bId = getVersionIdFromUrl(b.url);
				return bId - aId;
			});

			const options = [];
			sortedVersions.forEach((version) => {
				if (
					DLC_ONLY_VERSIONS.has(version.name) ||
					JAPAN_SPECIFIC_VERSIONS.has(version.name)
				) {
					return;
				}

				const combo = GAME_DLC_COMBINATIONS.find(
					(entry) => entry.base === version.name,
				);

				if (combo) {
					options.push({
						value: [combo.base, ...combo.dlcVersions].join(DLC_SEPARATOR),
						label: combo.label,
					});
				}

				options.push({
					value: version.name,
					label: formatGameName(version.name),
				});
			});

			setGameOptions(options);
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

	if (mode === "game") {
		return (
			<div className="filter-control">
				<label>Game:</label>
				<select
					className="game-input"
					value={gameFilter?.game || ""}
					onChange={(event) => setGameFilter({ game: event.target.value })}
				>
					<option value="">Select a game</option>
					{gameOptions.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</div>
		);
	}

	return (
		<>
			<div className="filter-actions">
				<button className="btn btn-secondary" onClick={selectAllVisible}>
					Select all visible
				</button>
			</div>
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
