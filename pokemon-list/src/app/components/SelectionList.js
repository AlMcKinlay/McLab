import { useEffect, useRef, useState } from "react";

import PokemonList from "./PokemonList";
import Filter from "./Filter";

function SelectionList({
	selectPokemon,
	selectManyPokemon,
	replaceSelectedPokemon,
	selected,
	onGameChange,
	onRegionalDexMapChange,
	onGameLoadingChange,
}) {
	const [activeTab, setActiveTab] = useState("game");
	const [gameFilter, setGameFilter] = useState({ game: "" });
	const [manualFilter, setManualFilter] = useState({ name: "", types: [] });
	const [manualTopPokemon, setManualTopPokemon] = useState(null);
	const [manualFilteredPokemon, setManualFilteredPokemon] = useState([]);
	const [allPokemon, setAllPokemon] = useState([]);
	const [isGameLoading, setIsGameLoading] = useState(false);
	const gameLoadingStartRef = useRef(0);
	const [bulkText, setBulkText] = useState("");
	const [bulkMessage, setBulkMessage] = useState("");

	const finishGameLoading = () => {
		const elapsed = Date.now() - gameLoadingStartRef.current;
		const minimumVisibleMs = 350;
		if (elapsed >= minimumVisibleMs) {
			setIsGameLoading(false);
			return;
		}

		setTimeout(() => {
			setIsGameLoading(false);
		}, minimumVisibleMs - elapsed);
	};

	useEffect(() => {
		const activeGame = activeTab === "game" ? gameFilter.game || "" : "";
		onGameChange(activeGame);

		if (activeTab === "game" && gameFilter.game) {
			gameLoadingStartRef.current = Date.now();
			setIsGameLoading(true);
		} else {
			setIsGameLoading(false);
		}

		if (activeTab === "game" && !gameFilter.game) {
			replaceSelectedPokemon([]);
		}
	}, [gameFilter.game, onGameChange, activeTab, replaceSelectedPokemon]);

	useEffect(() => {
		onGameLoadingChange?.(isGameLoading);
	}, [isGameLoading, onGameLoadingChange]);

	const selectTop = () => {
		if (manualTopPokemon) {
			selectPokemon(manualTopPokemon);
		}
	};

	const selectAllVisible = () => {
		selectManyPokemon(manualFilteredPokemon);
	};

	const handleBulkImport = () => {
		if (!allPokemon || allPokemon.length === 0) {
			setBulkMessage("Pokémon list is still loading.");
			return;
		}

		const tokens = bulkText
			.split(/[\n,]+/)
			.map((entry) => entry.trim())
			.filter(Boolean);

		if (tokens.length === 0) {
			setBulkMessage("Nothing to import.");
			return;
		}

		const pokemonByName = new Map(
			allPokemon.map((pokemon) => [pokemon.name.toLowerCase(), pokemon]),
		);

		const resolvePokemonFromToken = (rawToken) => {
			const cleaned = rawToken.trim().toLowerCase();
			if (!cleaned) {
				return { match: null, skip: true, normalized: "" };
			}

			let candidate = cleaned.replace(/^[-*]\s*/, "");

			if (candidate.includes("|")) {
				candidate = candidate.split("|")[0].trim();
			}

			candidate = candidate.replace(/\s*\(\d+\)\s*$/, "").trim();

			const directMatch = pokemonByName.get(candidate);
			if (directMatch) {
				return { match: directMatch, skip: false, normalized: candidate };
			}

			const hyphenMatch = pokemonByName.get(candidate.replace(/\s+/g, "-"));
			if (hyphenMatch) {
				return { match: hyphenMatch, skip: false, normalized: candidate };
			}

			if (/^(box\s+\d+|[a-z\-\s]+\s+\d+)$/i.test(candidate)) {
				return { match: null, skip: true, normalized: candidate };
			}

			return { match: null, skip: false, normalized: candidate };
		};

		const matches = [];
		const notFound = [];

		tokens.forEach((token) => {
			const { match, skip, normalized } = resolvePokemonFromToken(token);
			if (skip) {
				return;
			}

			if (match) {
				matches.push(match);
				return;
			}

			notFound.push(normalized);
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
		<div className="list editor-panel">
			<div className="editor-tabs">
				<button
					type="button"
					className={`tab-btn ${activeTab === "game" ? "active" : ""}`}
					onClick={() => setActiveTab("game")}
				>
					Game
				</button>
				<button
					type="button"
					className={`tab-btn ${activeTab === "manual" ? "active" : ""}`}
					onClick={() => setActiveTab("manual")}
				>
					Manual
				</button>
				<button
					type="button"
					className={`tab-btn ${activeTab === "text" ? "active" : ""}`}
					onClick={() => setActiveTab("text")}
				>
					Text
				</button>
			</div>

			{activeTab === "game" ? (
				<>
					<Filter
						mode="game"
						gameFilter={gameFilter}
						setGameFilter={setGameFilter}
					></Filter>
					{isGameLoading ? (
						<div className="game-loading" aria-live="polite">
							<span className="spinner" aria-hidden="true" />
							Loading game dex…
						</div>
					) : null}
				</>
			) : null}

			{activeTab === "manual" ? (
				<>
					<Filter
						mode="manual"
						filter={manualFilter}
						setFilter={setManualFilter}
						selectTop={selectTop}
						selectAllVisible={selectAllVisible}
					></Filter>
					<PokemonList
						filter={{ ...manualFilter, game: "" }}
						selectPokemon={selectPokemon}
						onTopPokemonChange={setManualTopPokemon}
						onFilteredListChange={setManualFilteredPokemon}
						onAllPokemonChange={setAllPokemon}
						selected={selected}
					></PokemonList>
				</>
			) : null}

			{activeTab === "text" ? (
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
			) : null}

			{activeTab === "game" ? (
				<PokemonList
					filter={{ name: "", types: [], game: gameFilter.game }}
					selectPokemon={() => {}}
					onFilteredListChange={(filteredList, meta) => {
						if ((meta?.game || "") === gameFilter.game && meta?.gameReady) {
							replaceSelectedPokemon(filteredList);
							finishGameLoading();
						}
					}}
					onAllPokemonChange={setAllPokemon}
					onRegionalDexMapChange={onRegionalDexMapChange}
					selected={selected}
					showList={false}
				></PokemonList>
			) : null}
		</div>
	);
}

export default SelectionList;
