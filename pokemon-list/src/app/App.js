import "./App.css";
import { useSelected } from "./hooks/selected";
import SelectionList from "./components/SelectionList";
import OutputList from "./components/OutputList";
import OutputSettings from "./components/OutputSettings";

function App() {
	const [selected, selectPokemon, unselectPokemon, clear] = useSelected();

	return (
		<div className="App">
			<header className="App-header">Pokemon List Maker</header>
			<main>
				<SelectionList
					selectPokemon={selectPokemon}
					selected={selected}
				></SelectionList>
				<div className="list">
					<OutputSettings clear={clear}></OutputSettings>
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
