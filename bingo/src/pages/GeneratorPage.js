import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { generateBoardId, createShareUrl } from "../utils/boardUtils";

const Args = styled.textarea``;

const BoardHistory = styled.div`
	margin-top: 2rem;
	border-top: 1px solid var(--border-primary);
	padding-top: 2rem;
`;

const BoardItem = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 1rem;
	margin-bottom: 0.5rem;
	border: 1px solid var(--border-primary);
	border-radius: 4px;
	background: var(--bg-secondary);
`;

const randomiseArgs = (argsToRandomise) => {
	return argsToRandomise
		.split("\n")
		.filter((line) => line.trim() !== "")
		.sort(() => Math.random() - 0.5);
};

function GeneratorPage() {
	const [args, setArgs] = useState("");
	const [name, setName] = useState("Board");
	const [boards, setBoards] = useState([]);
	const [editingId, setEditingId] = useState(null);
	const [editingName, setEditingName] = useState("");
	const [notification, setNotification] = useState(null);

	// Load boards from localStorage on mount
	useEffect(() => {
		const saved = localStorage.getItem("bingo.savedBoards");
		if (saved) {
			try {
				setBoards(JSON.parse(saved));
			} catch (e) {
				console.error("Failed to load saved boards:", e);
			}
		}
	}, []);

	// Save boards to localStorage whenever they change
	useEffect(() => {
		localStorage.setItem("bingo.savedBoards", JSON.stringify(boards));
	}, [boards]);

	const handleGenerateBoard = () => {
		const items = randomiseArgs(args);
		if (items.length < 24) {
			alert("You need at least 24 items to generate a bingo board");
			return;
		}

		// Find the next number for boards with this base name
		const baseName = name.trim() || "Board";
		const existingNumbers = boards
			.filter((b) => b.name?.startsWith(baseName))
			.map((b) => {
				const match = b.name.match(new RegExp(`^${baseName}\\s+(\\d+)$`));
				return match ? parseInt(match[1], 10) : 0;
			})
			.filter((n) => !isNaN(n));

		const nextNumber =
			existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
		const boardName = `${baseName} ${nextNumber}`;

		const boardId = generateBoardId();
		const newBoard = {
			id: boardId,
			name: boardName,
			items: items.slice(0, 24),
			createdAt: new Date().toISOString(),
			shareUrl: createShareUrl(items.slice(0, 24), boardName),
		};

		setBoards([newBoard, ...boards]);
	};

	const handleDeleteBoard = (boardId) => {
		setBoards(boards.filter((b) => b.id !== boardId));
		localStorage.removeItem(`bingo.board.${boardId}`);
	};

	const handleRenameBoard = (boardId, currentName) => {
		setEditingId(boardId);
		setEditingName(currentName);
	};

	const handleSaveRename = (boardId) => {
		if (editingName.trim()) {
			setBoards(
				boards.map((b) =>
					b.id === boardId
						? {
								...b,
								name: editingName.trim(),
								shareUrl: createShareUrl(b.items, editingName.trim()),
							}
						: b,
				),
			);
		}
		setEditingId(null);
		setEditingName("");
	};

	const handleCancelRename = () => {
		setEditingId(null);
		setEditingName("");
	};

	const handleCopyShareUrl = (shareUrl) => {
		navigator.clipboard.writeText(shareUrl).then(
			() => {
				setNotification("Share URL copied to clipboard!");
				setTimeout(() => setNotification(null), 3000);
			},
			(err) => {
				console.error("Failed to copy:", err);
			},
		);
	};

	return (
		<div className="App">
			{notification && (
				<div
					style={{
						position: "fixed",
						top: "2rem",
						left: "50%",
						transform: "translateX(-50%)",
						backgroundColor: "var(--color-success)",
						color: "var(--text-contrast)",
						padding: "1rem 1.5rem",
						borderRadius: "8px",
						boxShadow: "var(--shadow-lg)",
						zIndex: 1000,
						animation: "slideDown 0.3s ease-out",
					}}
				>
					{notification}
				</div>
			)}
			<button
				className="theme-toggle"
				id="themeToggle"
				aria-label="Toggle dark mode"
			>
				☀️
			</button>
			<header className="App-header">Bingo Generator</header>
			<div className="input-section">
				<h2 style={{ margin: 0 }}>Add Bingo Items</h2>
				<div>
					<label
						htmlFor="board-name"
						style={{
							display: "block",
							marginBottom: "0.5rem",
							fontWeight: "600",
						}}
					>
						Board Name:
					</label>
					<input
						id="board-name"
						type="text"
						className="game-input"
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder="Board"
						style={{ width: "100%" }}
					/>
				</div>
				<Args
					className="game-input"
					value={args}
					onChange={(event) => setArgs(event.target.value)}
					placeholder="Enter newline separated values"
				></Args>
				<div className="button-container">
					<button className="btn btn-primary" onClick={handleGenerateBoard}>
						Generate Board
					</button>
				</div>
			</div>

			{boards.length > 0 && (
				<BoardHistory>
					<h2>Recent Boards</h2>
					{boards.map((board) => (
						<BoardItem key={board.id}>
							<div>
								{editingId === board.id ? (
									<div
										style={{
											display: "flex",
											gap: "0.5rem",
											alignItems: "center",
										}}
									>
										<input
											type="text"
											value={editingName}
											onChange={(e) => setEditingName(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") handleSaveRename(board.id);
												if (e.key === "Escape") handleCancelRename();
											}}
											autoFocus
											style={{
												padding: "0.5rem",
												border: "1px solid var(--border-primary)",
												borderRadius: "4px",
												backgroundColor: "var(--bg-input)",
												color: "var(--text-primary)",
												flexGrow: 1,
											}}
										/>
										<button
											className="btn btn-primary"
											onClick={() => handleSaveRename(board.id)}
											style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
										>
											Save
										</button>
										<button
											className="btn btn-secondary"
											onClick={handleCancelRename}
											style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
										>
											Cancel
										</button>
									</div>
								) : (
									<>
										<div style={{ fontWeight: "600" }}>
											{board.name || "Untitled Board"}
										</div>
										<div
											style={{
												fontSize: "0.875rem",
												color: "var(--text-secondary)",
											}}
										>
											{new Date(board.createdAt).toLocaleString()} •{" "}
											{board.items.length} items
										</div>
									</>
								)}
							</div>
							<div style={{ display: "flex", gap: "0.5rem" }}>
								<a
									href={board.shareUrl}
									className="btn btn-primary"
									style={{
										fontSize: "0.875rem",
										padding: "0.5rem 1rem",
										textDecoration: "none",
									}}
								>
									Open
								</a>
								<button
									className="btn btn-secondary"
									onClick={() => handleRenameBoard(board.id, board.name)}
									style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
								>
									Rename
								</button>
								<button
									className="btn btn-secondary"
									onClick={() => handleCopyShareUrl(board.shareUrl)}
									style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
								>
									Share
								</button>
								<button
									className="btn btn-danger"
									onClick={() => handleDeleteBoard(board.id)}
									style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
								>
									Delete
								</button>
							</div>
						</BoardItem>
					))}
				</BoardHistory>
			)}
		</div>
	);
}

export default GeneratorPage;
