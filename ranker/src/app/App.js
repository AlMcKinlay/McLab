import { useEffect, useMemo, useState } from "react";
import "./App.css";

const SAVED_RESULTS_KEY = "ranker.savedResults.v1";

function App() {
	const [items, setItems] = useState([]);
	const [newItemInput, setNewItemInput] = useState("");
	const [mode, setMode] = useState("input");
	const [rankingSession, setRankingSession] = useState(null);
	const [savedResults, setSavedResults] = useState([]);
	const [viewedResult, setViewedResult] = useState(null);
	const [hasHydratedSavedResults, setHasHydratedSavedResults] = useState(false);

	const totalComparisons = useMemo(
		() => (items.length * (items.length - 1)) / 2,
		[items.length],
	);

	const itemsById = useMemo(() => {
		return Object.fromEntries(items.map((item) => [item.id, item]));
	}, [items]);

	const createSession = (
		orderedIds,
		nextPendingIndex,
		manualComparisons,
		savedResultId = null,
	) => {
		if (nextPendingIndex >= items.length) {
			return {
				orderedIds,
				pendingIndex: nextPendingIndex,
				insertionItemId: null,
				low: 0,
				high: 0,
				compareIndex: -1,
				manualComparisons,
				savedResultId,
				completed: true,
			};
		}

		return {
			orderedIds,
			pendingIndex: nextPendingIndex,
			insertionItemId: items[nextPendingIndex].id,
			low: 0,
			high: orderedIds.length,
			compareIndex: Math.floor(orderedIds.length / 2),
			manualComparisons,
			savedResultId,
			completed: false,
		};
	};

	useEffect(() => {
		try {
			const raw = localStorage.getItem(SAVED_RESULTS_KEY);
			if (!raw) {
				setHasHydratedSavedResults(true);
				return;
			}

			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				setSavedResults(parsed);
			}
			setHasHydratedSavedResults(true);
		} catch {
			setSavedResults([]);
			setHasHydratedSavedResults(true);
		}
	}, []);

	useEffect(() => {
		if (!hasHydratedSavedResults) {
			return;
		}

		localStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(savedResults));
	}, [savedResults, hasHydratedSavedResults]);

	useEffect(() => {
		if (mode === "comparing" && rankingSession?.completed) {
			setMode("results");
		}
	}, [mode, rankingSession]);

	const saveCompletedSession = (session) => {
		if (!session?.completed || session.savedResultId) {
			return session;
		}

		const rankedNames = (session.orderedIds || [])
			.map((id) => itemsById[id]?.name)
			.filter(Boolean);

		if (rankedNames.length === 0) {
			return session;
		}

		const savedId = `result-${Date.now()}`;
		const resultRecord = {
			id: savedId,
			createdAt: new Date().toISOString(),
			totalItems: rankedNames.length,
			manualComparisons: session.manualComparisons,
			totalComparisons,
			items: rankedNames,
		};

		setSavedResults((prev) => [resultRecord, ...prev]);
		return { ...session, savedResultId: savedId };
	};

	const rankedIds = useMemo(
		() => rankingSession?.orderedIds ?? [],
		[rankingSession],
	);
	const currentItem = rankingSession?.insertionItemId
		? itemsById[rankingSession.insertionItemId]
		: null;
	const comparisonTargetId =
		rankingSession && rankingSession.compareIndex >= 0
			? rankingSession.orderedIds[rankingSession.compareIndex]
			: null;
	const comparisonTarget = comparisonTargetId
		? itemsById[comparisonTargetId]
		: null;

	const rankings = useMemo(() => {
		if (mode !== "results") {
			return [];
		}

		return rankedIds.map((id, index) => ({
			rank: index + 1,
			item: itemsById[id],
			wins: items.length - index - 1,
			losses: index,
		}));
	}, [items.length, itemsById, mode, rankedIds]);

	const handleAddItems = () => {
		const lines = newItemInput
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		if (lines.length === 0) {
			return;
		}

		const timestamp = Date.now();
		const newItems = lines.map((name, index) => ({
			id: `item-${timestamp}-${index}`,
			name,
		}));

		setItems([...items, ...newItems]);
		setNewItemInput("");
	};

	const handleRemoveItem = (id) => {
		setItems(items.filter((item) => item.id !== id));
	};

	const handleStartRanking = () => {
		if (items.length < 2) {
			alert("Please add at least 2 items to rank");
			return;
		}

		setRankingSession(createSession([items[0].id], 1, 0));
		setViewedResult(null);
		setMode("comparing");
	};

	const handleComparison = (winnerId) => {
		if (!rankingSession || rankingSession.completed || !comparisonTargetId) {
			return;
		}

		const nextManualComparisons = rankingSession.manualComparisons + 1;
		const currentWins = winnerId === rankingSession.insertionItemId;
		const nextLow = currentWins
			? rankingSession.low
			: rankingSession.compareIndex + 1;
		const nextHigh = currentWins
			? rankingSession.compareIndex
			: rankingSession.high;

		if (nextLow >= nextHigh) {
			const nextOrderedIds = [...rankingSession.orderedIds];
			nextOrderedIds.splice(nextLow, 0, rankingSession.insertionItemId);
			const nextSession = createSession(
				nextOrderedIds,
				rankingSession.pendingIndex + 1,
				nextManualComparisons,
				rankingSession.savedResultId,
			);

			setRankingSession(saveCompletedSession(nextSession));
			return;
		}

		setRankingSession({
			...rankingSession,
			low: nextLow,
			high: nextHigh,
			compareIndex: Math.floor((nextLow + nextHigh) / 2),
			manualComparisons: nextManualComparisons,
		});
	};

	const handleReset = () => {
		setItems([]);
		setNewItemInput("");
		setMode("input");
		setRankingSession(null);
		setViewedResult(null);
	};

	const handleViewSaved = (result) => {
		setViewedResult(result);
		setMode("saved");
	};

	const handleDeleteSaved = (resultId) => {
		setSavedResults((prev) => prev.filter((result) => result.id !== resultId));
		if (viewedResult?.id === resultId) {
			setViewedResult(null);
			setMode("input");
		}
	};

	const inferredComparisons = rankingSession
		? totalComparisons - rankingSession.manualComparisons
		: 0;

	const formatSavedDate = (isoDate) => {
		const date = new Date(isoDate);
		if (Number.isNaN(date.getTime())) {
			return "Unknown date";
		}

		return date.toLocaleString();
	};

	return (
		<div className="ranker-app">
			<button
				className="theme-toggle"
				id="themeToggle"
				aria-label="Toggle dark mode"
			>
				☀️
			</button>
			<header className="ranker-header">
				<h1>Ranker</h1>
				<p className="ranker-subtitle">
					Compare your items to create a complete ranking.
				</p>
			</header>

			<main className="ranker-main">
				{mode === "input" && (
					<div className="ranker-panel">
						<h2>Add Items to Rank</h2>

						<div className="input-group">
							<textarea
								value={newItemInput}
								onChange={(event) => setNewItemInput(event.target.value)}
								placeholder="Enter items, one per line..."
								className="ranker-textarea"
								rows="6"
							/>
							<button
								onClick={handleAddItems}
								className="ranker-button primary"
							>
								Add Items
							</button>
						</div>

						{items.length > 0 && (
							<div className="items-list">
								<h3>Items ({items.length})</h3>
								<ul>
									{items.map((item) => (
										<li key={item.id} className="item-row">
											<span>{item.name}</span>
											<button
												onClick={() => handleRemoveItem(item.id)}
												className="ranker-button danger small"
											>
												Remove
											</button>
										</li>
									))}
								</ul>
							</div>
						)}

						{items.length >= 2 && (
							<button
								onClick={handleStartRanking}
								className="ranker-button primary full-width"
							>
								Start Ranking (up to {totalComparisons} pairings)
							</button>
						)}

						{savedResults.length > 0 && (
							<div className="saved-results">
								<h3>Saved Rankings ({savedResults.length})</h3>
								<ul className="saved-results-list">
									{savedResults.map((result) => (
										<li key={result.id} className="saved-result-row">
											<div className="saved-result-info">
												<div className="saved-result-title">
													{result.items[0]} ({result.totalItems} items)
												</div>
												<div className="saved-result-meta">
													{formatSavedDate(result.createdAt)}
												</div>
											</div>
											<div className="saved-result-actions">
												<button
													onClick={() => handleViewSaved(result)}
													className="ranker-button secondary small"
												>
													View
												</button>
												<button
													onClick={() => handleDeleteSaved(result.id)}
													className="ranker-button danger small"
												>
													Delete
												</button>
											</div>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				)}

				{mode === "comparing" &&
					rankingSession &&
					currentItem &&
					comparisonTarget && (
						<div className="ranker-panel">
							<div className="comparison-header">
								<p className="comparison-progress">
									Manual comparisons: {rankingSession.manualComparisons} of up
									to {totalComparisons}
								</p>
								<p className="comparison-progress">
									Items placed: {rankingSession.orderedIds.length} of{" "}
									{items.length}
								</p>
							</div>

							<p className="comparison-question">Which is better?</p>

							<div className="comparison-container">
								<button
									onClick={() => handleComparison(currentItem.id)}
									className="comparison-option"
								>
									{currentItem.name}
								</button>
								<div className="comparison-divider">vs</div>
								<button
									onClick={() => handleComparison(comparisonTarget.id)}
									className="comparison-option"
								>
									{comparisonTarget.name}
								</button>
							</div>

							<div className="progress-bar">
								<div
									className="progress-fill"
									style={{
										width: `${(rankingSession.orderedIds.length / items.length) * 100}%`,
									}}
								></div>
							</div>
						</div>
					)}

				{mode === "results" && rankingSession && (
					<div className="ranker-panel">
						<h2>Rankings</h2>
						<p className="comparison-progress">
							Manual comparisons: {rankingSession.manualComparisons} of{" "}
							{totalComparisons}
						</p>
						<p className="comparison-progress">
							Skipped via ordering logic: {inferredComparisons}
						</p>
						<p className="comparison-progress">
							Saved to history automatically
						</p>
						<p className="comparison-progress">
							Saved rankings available: {savedResults.length}
						</p>

						<div className="rankings-list">
							{rankings.map((ranking) => (
								<div key={ranking.item.id} className="ranking-item">
									<div className="ranking-position">#{ranking.rank}</div>
									<div className="ranking-info">
										<div className="ranking-name">{ranking.item.name}</div>
										<div className="ranking-stats">
											{ranking.wins} wins, {ranking.losses} losses
										</div>
									</div>
									<div className="ranking-ratio">
										{(
											(ranking.wins / (ranking.wins + ranking.losses || 1)) *
											100
										).toFixed(1)}
										%
									</div>
								</div>
							))}
						</div>

						<button
							onClick={() => {
								setMode("input");
								setViewedResult(null);
							}}
							className="ranker-button secondary full-width"
						>
							View Saved Rankings
						</button>

						<button
							onClick={handleReset}
							className="ranker-button primary full-width"
						>
							Start Over
						</button>
					</div>
				)}

				{mode === "saved" && viewedResult && (
					<div className="ranker-panel">
						<h2>Saved Ranking</h2>
						<p className="comparison-progress">
							{formatSavedDate(viewedResult.createdAt)}
						</p>
						<p className="comparison-progress">
							Manual comparisons: {viewedResult.manualComparisons} of{" "}
							{viewedResult.totalComparisons}
						</p>

						<div className="rankings-list">
							{viewedResult.items.map((itemName, index) => (
								<div
									key={`${viewedResult.id}-${itemName}-${index}`}
									className="ranking-item"
								>
									<div className="ranking-position">#{index + 1}</div>
									<div className="ranking-info">
										<div className="ranking-name">{itemName}</div>
									</div>
								</div>
							))}
						</div>

						<button
							onClick={() => setMode("input")}
							className="ranker-button primary full-width"
						>
							Back to Input
						</button>
					</div>
				)}
			</main>
		</div>
	);
}

export default App;
