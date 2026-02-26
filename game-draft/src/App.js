import React, { useState, useEffect } from "react";
import { fetchMetacriticScore } from "./metacritic";
import { encodeToURL, decodeFromURL } from "shared-utils";
import "shared-utils/theme-variables.css";
import "shared-utils/shared-styles.css";
import "./App.css";

function App() {
	const [users, setUsers] = useState([]);
	const [results, setResults] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [shareStatus, setShareStatus] = useState(null);
	const [pendingSharedUsers, setPendingSharedUsers] = useState(null);
	const [savedUsers, setSavedUsers] = useState(null);
	const [showSharePrompt, setShowSharePrompt] = useState(false);
	const [viewOnly, setViewOnly] = useState(false);
	const [theme, setTheme] = useState(() => {
		// Check localStorage first (shared key across all apps)
		const savedTheme = localStorage.getItem("theme");
		if (savedTheme) {
			return savedTheme;
		}
		// Backwards compatibility: check old app-specific key
		const oldSavedTheme = localStorage.getItem("gameDraftTheme");
		if (oldSavedTheme) {
			// Migrate to new shared key
			localStorage.setItem("theme", oldSavedTheme);
			localStorage.removeItem("gameDraftTheme");
			return oldSavedTheme;
		}
		// Otherwise detect system preference
		if (
			window.matchMedia &&
			window.matchMedia("(prefers-color-scheme: dark)").matches
		) {
			return "dark";
		}
		return "light";
	});

	// Load data from URL or localStorage on mount
	useEffect(() => {
		let saved = null;
		const params = new URLSearchParams(window.location.search);
		const sharedData = params.get("data");
		if (sharedData) {
			try {
				const parsed = decodeFromURL(sharedData);
				if (Array.isArray(parsed)) {
					const savedData = localStorage.getItem("gameDraftData");
					if (savedData) {
						try {
							saved = JSON.parse(savedData);
							setSavedUsers(saved);
							setPendingSharedUsers(parsed);
							setShowSharePrompt(true);
						} catch (e) {
							console.error("Error parsing localStorage data:", e);
							setUsers(parsed);
							localStorage.setItem("gameDraftData", JSON.stringify(parsed));
						}
					} else {
						setUsers(parsed);
						localStorage.setItem("gameDraftData", JSON.stringify(parsed));
					}
					const url = new URL(window.location.href);
					url.searchParams.delete("data");
					window.history.replaceState(null, "", url.toString());
					return;
				}
			} catch (e) {
				console.error("Error parsing shared data:", e);
				setError("Shared link data is invalid.");
				const url = new URL(window.location.href);
				url.searchParams.delete("data");
				window.history.replaceState(null, "", url.toString());
			}
		}

		const savedData = localStorage.getItem("gameDraftData");
		if (savedData) {
			try {
				const parsed = JSON.parse(savedData);
				setUsers(parsed);
				setSavedUsers(parsed);
			} catch (e) {
				console.error("Error parsing localStorage data:", e);
			}
		}
	}, []);

	// Save to localStorage whenever users change (but not on initial empty state)
	useEffect(() => {
		if (users.length > 0 && !viewOnly) {
			localStorage.setItem("gameDraftData", JSON.stringify(users));
		}
	}, [users, viewOnly]);

	// Apply theme via data attribute on html (matches shared theme-variables.css)
	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		localStorage.setItem("theme", theme);
	}, [theme]);

	// Toggle between light and dark theme
	const toggleTheme = () => {
		setTheme(theme === "dark" ? "light" : "dark");
	};

	const handleShareLink = async () => {
		setShareStatus(null);
		try {
			const encoded = encodeToURL(users);
			const url = new URL(window.location.href);
			url.searchParams.set("data", encoded);

			await navigator.clipboard.writeText(url.toString());
			setShareStatus("Share link copied to clipboard.");
		} catch (err) {
			console.error("Error creating share link:", err);
			setShareStatus("Share link is ready in your address bar.");
		}
	};

	const handleSharedOverwrite = () => {
		if (pendingSharedUsers) {
			setUsers(pendingSharedUsers);
			setSavedUsers(pendingSharedUsers);
			localStorage.setItem("gameDraftData", JSON.stringify(pendingSharedUsers));
		}
		setViewOnly(false);
		setPendingSharedUsers(null);
		setShowSharePrompt(false);
	};

	const handleSharedViewOnly = () => {
		if (pendingSharedUsers) {
			setUsers(pendingSharedUsers);
		}
		setViewOnly(true);
		setPendingSharedUsers(null);
		setShowSharePrompt(false);
	};

	const handleExitViewOnly = () => {
		if (savedUsers) {
			setUsers(savedUsers);
		}
		setViewOnly(false);
	};

	// Add a new user
	const addUser = () => {
		const newUser = {
			id: Date.now(),
			name: "",
			games: ["", "", "", "", ""],
		};
		setUsers([...users, newUser]);
	};

	// Remove a user
	const removeUser = (id) => {
		setUsers(users.filter((u) => u.id !== id));
	};

	// Update user name
	const updateUserName = (id, name) => {
		setUsers(users.map((u) => (u.id === id ? { ...u, name } : u)));
	};

	// Update a game for a user
	const updateUserGame = (userId, gameIndex, gameName) => {
		setUsers(
			users.map((u) => {
				if (u.id === userId) {
					const newGames = [...u.games];
					newGames[gameIndex] = gameName;
					return { ...u, games: newGames };
				}
				return u;
			}),
		);
	};

	// Fetch all scores and calculate results
	const handleCalculateScores = async () => {
		setError(null);
		setLoading(true);

		try {
			const results = await Promise.all(
				users.map(async (user) => {
					const gameScores = await Promise.all(
						user.games.map(async (gameName) => {
							if (!gameName.trim()) {
								return {
									name: gameName,
									score: 0,
									displayScore: 0,
									fetched: false,
									isTbd: false,
								};
							}
							const result = await fetchMetacriticScore(gameName);
							return {
								name: gameName,
								score: result.score !== null ? result.score : 0,
								displayScore: result.isTbd
									? "TBD"
									: result.score !== null
										? result.score
										: "X",
								fetched: result.score !== null,
								isTbd: result.isTbd,
							};
						}),
					);

					const totalScore = gameScores.reduce((sum, g) => sum + g.score, 0);

					return {
						id: user.id,
						name: user.name,
						games: gameScores,
						totalScore,
					};
				}),
			);

			setResults(results);

			// Count TBD games and failed fetches separately
			const tbdCount = results.reduce(
				(count, user) => count + user.games.filter((g) => g.isTbd).length,
				0,
			);
			const failedCount = results.reduce(
				(count, user) =>
					count +
					user.games.filter((g) => !g.fetched && !g.isTbd && g.name.trim())
						.length,
				0,
			);

			// Build error message
			let errorMessage = "";
			if (tbdCount > 0) {
				errorMessage += `${tbdCount} game(s) marked as TBD. `;
			}
			if (failedCount > 0) {
				errorMessage += `${failedCount} game score(s) could not be fetched from Metacritic. `;
			}
			if (errorMessage) {
				setError(errorMessage);
			}
		} catch (err) {
			setError("Error fetching Metacritic scores. Please try again.");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	// Check if all fields are filled
	const allFieldsFilled = users.every(
		(u) => u.name.trim() && u.games.every((g) => g.trim()),
	);

	return (
		<div className="app-container">
			<button
				className="theme-toggle"
				onClick={toggleTheme}
				aria-label="Toggle theme"
				title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
			>
				{theme === "dark" ? "☀️" : "🌙"}
			</button>

			<h1>Game Draft Scorer</h1>

			{!results && (
				<div className="form-section">
					<h2>Enter Players & Games</h2>

					{showSharePrompt && pendingSharedUsers && (
						<div className="share-prompt">
							<p>
								This link contains shared data. You already have saved data.
								What would you like to do?
							</p>
							<div className="share-prompt-actions">
								<button
									onClick={handleSharedOverwrite}
									className="btn btn-primary"
								>
									Overwrite Saved Data
								</button>
								<button
									onClick={handleSharedViewOnly}
									className="btn btn-secondary"
								>
									View Without Saving
								</button>
							</div>
						</div>
					)}

					{viewOnly && (
						<div className="share-message">
							Viewing shared data. Your saved data has not been changed.
							<button
								onClick={handleExitViewOnly}
								className="btn btn-secondary"
							>
								Exit View-Only
							</button>
						</div>
					)}

					<div className="users-list">
						{users.map((user) => (
							<div key={user.id} className="user-card">
								<div className="user-header">
									<input
										type="text"
										placeholder="Player name"
										value={user.name}
										onChange={(e) => updateUserName(user.id, e.target.value)}
										className="user-name-input"
									/>
									<button
										onClick={() => removeUser(user.id)}
										className="remove-btn"
										aria-label="Remove player"
									>
										✕
									</button>
								</div>

								<div className="games-list">
									{user.games.map((game, idx) => (
										<input
											key={idx}
											type="text"
											placeholder={`Game ${idx + 1}`}
											value={game}
											onChange={(e) =>
												updateUserGame(user.id, idx, e.target.value)
											}
											className="game-input"
										/>
									))}
								</div>
							</div>
						))}
					</div>

					<div className="button-group">
						<button onClick={addUser} className="btn btn-secondary">
							+ Add Player
						</button>

						<button
							onClick={handleShareLink}
							disabled={users.length === 0}
							className="btn btn-secondary"
						>
							Share Link
						</button>

						<button
							onClick={handleCalculateScores}
							disabled={!allFieldsFilled || loading || users.length === 0}
							className="btn btn-primary"
						>
							{loading ? "Calculating..." : "Calculate Scores"}
						</button>
					</div>

					{shareStatus && <div className="share-message">{shareStatus}</div>}

					{error && <div className="error-message">{error}</div>}
				</div>
			)}

			{results && (
				<div className="results-section">
					<h2>Results</h2>

					{error && <div className="error-message">{error}</div>}

					<div className="results-list">
						{results.map((user) => (
							<div key={user.id} className="result-card">
								<h3 title={user.name}>{user.name}</h3>
								<div className="game-scores">
									{user.games.map((game, idx) => (
										<div key={idx} className="game-score-row">
											<span className="game-name" title={game.name}>
												{game.name}
											</span>
											<span className="game-score">
												{game.displayScore !== undefined
													? game.displayScore
													: game.score}
											</span>
										</div>
									))}
								</div>
								<div className="user-total">
									<strong>Total:</strong>
									<strong className="total-score">{user.totalScore}</strong>
								</div>
							</div>
						))}
					</div>

					<button
						onClick={() => {
							setResults(null);
							setError(null);
						}}
						className="btn btn-secondary"
					>
						← Back to Edit
					</button>
				</div>
			)}
		</div>
	);
}

export default App;
