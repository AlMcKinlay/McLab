import React, { useState, useEffect } from "react";
import "shared-utils/theme-variables.css";
import "shared-utils/shared-styles.css";
import "./App.css";
import Bingo from "./bingo";
import styled from "styled-components";
import { initializeTheme } from "shared-utils";

const BingoWrapper = styled.div`
	width: 100%;
	max-width: 500px;
	aspect-ratio: 1;
`;

const ArgsWrapper = styled.div`
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
`;

const GenerateButton = styled.button``;

const Args = styled.textarea``;

const randomiseArgs = (argsToRandomise) => {
	return argsToRandomise
		.split("\n")
		.filter((line) => line.trim() !== "")
		.sort(() => Math.random() - 0.5);
};

const usePersistedState = (localStorageKey) => {
	const [value, setValue] = useState(
		localStorage.getItem(localStorageKey) || "",
	);

	useEffect(() => {
		localStorage.setItem(localStorageKey, value);
	}, [value, localStorageKey]);

	return [value, setValue];
};

const usePersistedObjectState = (localStorageKey, initialValue) => {
	const [value, setValue] = useState(() => {
		const saved = localStorage.getItem(localStorageKey);
		return saved ? JSON.parse(saved) : initialValue;
	});

	useEffect(() => {
		localStorage.setItem(localStorageKey, JSON.stringify(value));
	}, [value, localStorageKey]);

	return [value, setValue];
};

function App() {
	useEffect(() => {
		initializeTheme();
	}, []);

	const [args, setArgs] = usePersistedState("bingo.args");
	const [bingoEntries, setBingoEntries] = useState(() => {
		const saved = localStorage.getItem("bingo.entries");
		return saved ? JSON.parse(saved) : [];
	});
	const [completed, setCompleted] = usePersistedObjectState(
		"bingo.completed",
		{},
	);

	// Save bingoEntries to localStorage whenever they change
	useEffect(() => {
		localStorage.setItem("bingo.entries", JSON.stringify(bingoEntries));
	}, [bingoEntries]);

	const clearChecked = () => {
		setCompleted({});
	};

	return (
		<div className="App">
			<button
				className="theme-toggle"
				id="themeToggle"
				aria-label="Toggle dark mode"
			>
				☀️
			</button>
			<div className="App-header">
				<div className="bingo-section">
					<BingoWrapper>
						<Bingo
							args={bingoEntries}
							completed={completed}
							complete={(index) =>
								setCompleted({ ...completed, [index]: true })
							}
							clearChecked={clearChecked}
							needMore={
								args.split("\n").filter((arg) => arg !== "").length < 24
							}
						></Bingo>
					</BingoWrapper>
				</div>
				<div className="input-section">
					<h2 style={{ margin: 0 }}>Add Bingo Items</h2>
					<Args
						className="game-input"
						value={args}
						onChange={(event) => setArgs(event.target.value)}
						placeholder="Enter newline separated values"
					></Args>
					<div className="button-container">
						<GenerateButton
							className="btn btn-primary"
							onClick={() => {
								setBingoEntries(randomiseArgs(args));
								setCompleted({});
							}}
						>
							Generate
						</GenerateButton>
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
