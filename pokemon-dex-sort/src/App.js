import React, { useEffect, useMemo, useState } from "react";
import "shared-utils/theme-variables.css";
import "shared-utils/shared-styles.css";
import "./App.css";
import { initializeTheme } from "shared-utils";

const POKEMON_LIST_URL =
	"https://pokeapi.co/api/v2/pokemon?offset=0&limit=1025";

function normalizeName(name) {
	return name.trim().toLowerCase().replace(/[’']/g, "").replace(/\s+/g, "-");
}

function App() {
	const [input, setInput] = useState("");
	const [output, setOutput] = useState("");
	const [unknownNames, setUnknownNames] = useState([]);
	const [status, setStatus] = useState({ loading: true, error: null });
	const [nameToDex, setNameToDex] = useState(new Map());

	useEffect(() => {
		initializeTheme();
	}, []);

	useEffect(() => {
		let isMounted = true;

		fetch(POKEMON_LIST_URL)
			.then((response) => {
				if (!response.ok) {
					throw new Error("Failed to load Pokémon list from PokeAPI");
				}
				return response.json();
			})
			.then((data) => {
				if (!isMounted) return;
				const map = new Map();
				data.results.forEach((pokemon, index) => {
					map.set(normalizeName(pokemon.name), index + 1);
				});
				setNameToDex(map);
				setStatus({ loading: false, error: null });
			})
			.catch(() => {
				if (!isMounted) return;
				setStatus({
					loading: false,
					error: "Could not load Pokémon data. Please refresh and try again.",
				});
			});

		return () => {
			isMounted = false;
		};
	}, []);

	const totalInputCount = useMemo(() => {
		return input
			.split("\n")
			.map((name) => name.trim())
			.filter(Boolean).length;
	}, [input]);

	const handleSort = () => {
		if (status.loading || status.error) return;

		const inputNames = input
			.split("\n")
			.map((name) => name.trim())
			.filter(Boolean);

		const known = [];
		const unknown = [];

		inputNames.forEach((rawName, originalIndex) => {
			const dexNumber = nameToDex.get(normalizeName(rawName));
			if (dexNumber) {
				known.push({ rawName, dexNumber, originalIndex });
			} else {
				unknown.push(rawName);
			}
		});

		known.sort(
			(a, b) => a.dexNumber - b.dexNumber || a.originalIndex - b.originalIndex,
		);

		setOutput(
			known
				.map((entry) => {
					const boxNumber = Math.ceil(entry.dexNumber / 30);
					return `${entry.rawName} | dex: ${entry.dexNumber} | box: ${boxNumber}`;
				})
				.join("\n"),
		);
		setUnknownNames(unknown);
	};

	const handleClear = () => {
		setInput("");
		setOutput("");
		setUnknownNames([]);
	};

	const handleCopy = async () => {
		if (!output) return;
		await navigator.clipboard.writeText(output);
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
			<header className="App-header">Pokémon Dex Sort</header>

			<main className="main">
				<p className="small">
					Paste Pokémon names (one per line), then sort by National Dex order.
				</p>

				{status.error && <div className="message error">{status.error}</div>}
				{status.loading && !status.error && (
					<div className="message">Loading Pokémon dataset…</div>
				)}

				<div className="input-grid">
					<section className="panel">
						<label htmlFor="pokemon-input">Input Names</label>
						<textarea
							id="pokemon-input"
							className="game-input"
							placeholder="pikachu&#10;bulbasaur&#10;mew"
							value={input}
							onChange={(event) => setInput(event.target.value)}
						/>
					</section>

					<section className="panel">
						<label htmlFor="pokemon-output">Sorted Output</label>
						<textarea
							id="pokemon-output"
							className="game-input"
							value={output}
							readOnly
							placeholder="name | dex: # | box: #"
						/>
					</section>
				</div>

				<div className="actions">
					<button
						type="button"
						className="btn btn-primary"
						onClick={handleSort}
						disabled={status.loading || !input.trim()}
					>
						Sort by National Dex
					</button>
					<button
						type="button"
						className="btn btn-secondary"
						onClick={handleCopy}
						disabled={!output}
					>
						Copy Output
					</button>
					<button
						type="button"
						className="btn btn-secondary"
						onClick={handleClear}
					>
						Clear
					</button>
				</div>

				<div className="small">Input entries: {totalInputCount}</div>

				{unknownNames.length > 0 && (
					<div className="message error">
						Unknown names ({unknownNames.length}): {unknownNames.join(", ")}
					</div>
				)}
			</main>
		</div>
	);
}

export default App;
