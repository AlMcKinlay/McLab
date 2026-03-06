import { useEffect } from "react";
import { useState } from "react";
import "./App.css";
import { useSelected } from "./hooks/selected";
import SelectionList from "./components/SelectionList";
import OutputList from "./components/OutputList";
import OutputSettings from "./components/OutputSettings";
import { initializeTheme } from "shared-utils";

function App() {
	const [
		selected,
		selectPokemon,
		unselectPokemon,
		clear,
		selectManyPokemon,
		replaceSelectedPokemon,
	] = useSelected();
	const [groupByBox, setGroupByBox] = useState(true);
	const [sortMode, setSortMode] = useState("national");
	const [selectedGame, setSelectedGame] = useState("");
	const [regionalDexMap, setRegionalDexMap] = useState(new Map());
	const [isGameLoading, setIsGameLoading] = useState(false);

	const sortedSelected = [...selected].sort((a, b) => {
		if (sortMode === "regional" && selectedGame) {
			const aRegional = regionalDexMap.get(a.name);
			const bRegional = regionalDexMap.get(b.name);
			const aGroupValue =
				typeof aRegional?.groupIndex === "number"
					? aRegional.groupIndex
					: Number.MAX_SAFE_INTEGER;
			const bGroupValue =
				typeof bRegional?.groupIndex === "number"
					? bRegional.groupIndex
					: Number.MAX_SAFE_INTEGER;

			if (aGroupValue !== bGroupValue) {
				return aGroupValue - bGroupValue;
			}

			const aRegionalValue =
				typeof aRegional?.entryNumber === "number"
					? aRegional.entryNumber
					: Number.MAX_SAFE_INTEGER;
			const bRegionalValue =
				typeof bRegional?.entryNumber === "number"
					? bRegional.entryNumber
					: Number.MAX_SAFE_INTEGER;

			if (aRegionalValue !== bRegionalValue) {
				return aRegionalValue - bRegionalValue;
			}
		}

		return Number(a.id) - Number(b.id);
	});

	useEffect(() => {
		initializeTheme();
	}, []);

	useEffect(() => {
		if (selectedGame && sortMode === "national") {
			setSortMode("regional");
		}

		if (!selectedGame && sortMode === "regional") {
			setSortMode("national");
		}
	}, [selectedGame, sortMode]);

	return (
		<div className="App">
			<button
				className="theme-toggle"
				id="themeToggle"
				aria-label="Toggle dark mode"
			>
				☀️
			</button>
			<header className="App-header">Pokemon List Maker</header>
			<main>
				<SelectionList
					selectPokemon={selectPokemon}
					selectManyPokemon={selectManyPokemon}
					replaceSelectedPokemon={replaceSelectedPokemon}
					selected={selected}
					onGameChange={setSelectedGame}
					onRegionalDexMapChange={setRegionalDexMap}
					onGameLoadingChange={setIsGameLoading}
				></SelectionList>
				<div className="list output-panel">
					<OutputSettings
						clear={clear}
						selected={sortedSelected}
						groupByBox={groupByBox}
						onToggleGroupByBox={() => setGroupByBox((prev) => !prev)}
						sortMode={sortMode}
						onSortModeChange={setSortMode}
						hasRegionalDex={Boolean(selectedGame)}
						regionalDexMap={regionalDexMap}
					></OutputSettings>
					<div className="output-content-wrap">
						<OutputList
							selected={sortedSelected}
							groupByBox={groupByBox}
							unselectPokemon={unselectPokemon}
							sortMode={sortMode}
							regionalDexMap={regionalDexMap}
						></OutputList>
					</div>
					{isGameLoading ? (
						<div className="output-loading-overlay" aria-live="polite">
							<span className="spinner" aria-hidden="true" />
							Loading game dex…
						</div>
					) : null}
				</div>
			</main>
		</div>
	);
}

export default App;
