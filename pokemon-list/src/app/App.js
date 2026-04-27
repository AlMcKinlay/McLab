import { useEffect } from "react";
import { useState } from "react";
import "./App.css";
import { useSelected } from "./hooks/selected";
import SelectionList from "./components/SelectionList";
import OutputList from "./components/OutputList";
import OutputSettings from "./components/OutputSettings";
import SavedListsHome from "./components/SavedListsHome";
import SavedListView from "./components/SavedListView";
import { initializeTheme } from "shared-utils";

const SAVED_LISTS_STORAGE_KEY = "pokemon-list-maker.saved-lists.v1";

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
	const [savedLists, setSavedLists] = useState([]);
	const [hasHydratedSavedLists, setHasHydratedSavedLists] = useState(false);
	const [activeView, setActiveView] = useState({ type: "home", listId: null });

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
		try {
			const raw = localStorage.getItem(SAVED_LISTS_STORAGE_KEY);
			if (!raw) {
				setSavedLists([]);
				setHasHydratedSavedLists(true);
				return;
			}

			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				setSavedLists(parsed);
			}
			setHasHydratedSavedLists(true);
		} catch (_error) {
			setSavedLists([]);
			setHasHydratedSavedLists(true);
		}
	}, []);

	useEffect(() => {
		if (!hasHydratedSavedLists) {
			return;
		}

		localStorage.setItem(SAVED_LISTS_STORAGE_KEY, JSON.stringify(savedLists));
	}, [savedLists, hasHydratedSavedLists]);

	useEffect(() => {
		if (selectedGame && sortMode === "national") {
			setSortMode("regional");
		}

		if (!selectedGame && sortMode === "regional") {
			setSortMode("national");
		}
	}, [selectedGame, sortMode]);

	const getDisplayNumber = (pokemon) => {
		if (sortMode === "regional" && selectedGame) {
			const regionalEntry = regionalDexMap.get(pokemon.name);
			if (typeof regionalEntry?.entryNumber === "number") {
				return regionalEntry.entryNumber;
			}
		}

		return Number(pokemon.id);
	};

	const saveCurrentList = (inputName) => {
		if (sortedSelected.length === 0) {
			return;
		}

		const defaultName = `List ${savedLists.length + 1}`;
		const name = (inputName || "").trim() || defaultName;
		const now = Date.now();
		const nextList = {
			id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
			name,
			createdAt: now,
			boxView: true,
			sortMode,
			pokemon: sortedSelected.map((pokemon) => {
				const regionalEntry = regionalDexMap.get(pokemon.name);
				return {
					id: String(pokemon.id),
					name: pokemon.name,
					number: getDisplayNumber(pokemon),
					dexGroupName: regionalEntry?.groupName || null,
				};
			}),
			checkedIds: [],
		};

		setSavedLists((prev) => [nextList, ...prev]);
		setActiveView({ type: "home", listId: null });
	};

	const toggleSavedPokemonChecked = (listId, pokemonId) => {
		setSavedLists((prev) =>
			prev.map((list) => {
				if (list.id !== listId) {
					return list;
				}

				const checkedSet = new Set(list.checkedIds || []);
				if (checkedSet.has(pokemonId)) {
					checkedSet.delete(pokemonId);
				} else {
					checkedSet.add(pokemonId);
				}

				return {
					...list,
					checkedIds: Array.from(checkedSet),
				};
			}),
		);
	};

	const setAllSavedPokemonChecked = (listId, shouldCheck) => {
		setSavedLists((prev) =>
			prev.map((list) => {
				if (list.id !== listId) {
					return list;
				}

				return {
					...list,
					checkedIds: shouldCheck
						? list.pokemon.map((pokemon) => String(pokemon.id))
						: [],
				};
			}),
		);
	};

	const setSavedListBoxView = (listId, nextBoxView) => {
		setSavedLists((prev) =>
			prev.map((list) =>
				list.id === listId
					? {
							...list,
							boxView: Boolean(nextBoxView),
						}
					: list,
			),
		);
	};

	const renameSavedList = (listId, inputName) => {
		const target = savedLists.find((list) => list.id === listId);
		if (!target) {
			return;
		}

		const nextName = (inputName || "").trim() || target.name;
		setSavedLists((prev) =>
			prev.map((list) =>
				list.id === listId
					? {
							...list,
							name: nextName,
						}
					: list,
			),
		);
	};

	const deleteSavedList = (listId) => {
		const target = savedLists.find((list) => list.id === listId);
		if (!target) {
			return;
		}

		const confirmed = window.confirm(`Delete "${target.name}"?`);
		if (!confirmed) {
			return;
		}

		setSavedLists((prev) => prev.filter((list) => list.id !== listId));

		if (activeView.type === "saved" && activeView.listId === listId) {
			setActiveView({ type: "home", listId: null });
		}
	};

	const activeSavedList =
		activeView.type === "saved"
			? savedLists.find((list) => list.id === activeView.listId)
			: null;

	if (activeView.type === "home") {
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
				<main className="home-main">
					<div className="list">
						<SavedListsHome
							savedLists={savedLists}
							onCreateNew={() =>
								setActiveView({ type: "builder", listId: null })
							}
							onOpenList={(listId) => setActiveView({ type: "saved", listId })}
							onRenameList={renameSavedList}
							onDeleteList={deleteSavedList}
						/>
					</div>
				</main>
			</div>
		);
	}

	if (activeView.type === "saved") {
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
				<main className="home-main">
					<div className="list">
						<SavedListView
							list={activeSavedList}
							onBack={() => setActiveView({ type: "home", listId: null })}
							onToggleChecked={toggleSavedPokemonChecked}
							onSetAllChecked={setAllSavedPokemonChecked}
							onSetBoxView={setSavedListBoxView}
							onRenameList={renameSavedList}
							onDeleteList={deleteSavedList}
						/>
					</div>
				</main>
			</div>
		);
	}

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
			<div className="builder-nav">
				<button
					className="btn btn-secondary"
					onClick={() => setActiveView({ type: "home", listId: null })}
				>
					Back to saved lists
				</button>
			</div>
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
						onSaveList={saveCurrentList}
						defaultSaveName={`List ${savedLists.length + 1}`}
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
