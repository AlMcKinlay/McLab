import { useEffect } from "react";
import "./App.css";
import { useSelected } from "./hooks/selected";
import SelectionList from "./components/SelectionList";
import OutputList from "./components/OutputList";
import OutputSettings from "./components/OutputSettings";
import { initializeTheme } from "shared-utils";

function App() {
	const [selected, selectPokemon, unselectPokemon, clear] = useSelected();

	useEffect(() => {
		initializeTheme();
	}, []);

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
					selected={selected}
				></SelectionList>
				<div className="list">
					<OutputSettings clear={clear} selected={selected}></OutputSettings>
					<OutputList
						selected={selected}
						unselectPokemon={unselectPokemon}
					></OutputList>
				</div>
			</main>
		</div>
	);
}

export default App;
