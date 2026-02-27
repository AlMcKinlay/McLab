import React, { useState, useEffect } from "react";
import styled from "styled-components";
import {
	generateBoardId,
	createShareUrl,
	loadBoards,
	saveBoards,
	deleteBoardProgress,
} from "../utils/boardUtils";
import PageHeader from "../components/PageHeader";
import Notification from "../components/Notification";
import BoardItemComponent from "../components/BoardItem";

const Args = styled.textarea``;

const BoardHistory = styled.div`
	margin-top: 2rem;
	border-top: 1px solid var(--border-primary);
	padding-top: 2rem;
`;

const randomiseArgs = (argsToRandomise) => {
	return argsToRandomise
		.split("\n")
		.filter((line) => line.trim() !== "")
		.sort(() => Math.random() - 0.5);
};

function GeneratorPage() {
	const [args, setArgs] = useState("");
	const [name, setName] = useState("");
	const [quantity, setQuantity] = useState(1);
	const [freeSpaceText, setFreeSpaceText] = useState("Free space");
	const [boards, setBoards] = useState([]);
	const [editingId, setEditingId] = useState(null);
	const [editingName, setEditingName] = useState("");
	const [notification, setNotification] = useState(null);

	useEffect(() => {
		setBoards(loadBoards());
	}, []);

	useEffect(() => {
		saveBoards(boards);
	}, [boards]);

	const handleGenerateBoard = () => {
		if (args.split("\n").filter((line) => line.trim() !== "").length < 24) {
			setNotification({
				message: "You need at least 24 items to generate a bingo board",
				type: "error",
			});
			setTimeout(() => setNotification(null), 3000);
			return;
		}

		const baseName = name.trim() || "Board";
		const newBoards = [];

		for (let i = 0; i < quantity; i++) {
			const existingNumbers = boards
				.filter((b) => b.name?.startsWith(baseName))
				.map((b) => {
					const match = b.name.match(new RegExp(`^${baseName}\\s+(\\d+)$`));
					return match ? parseInt(match[1], 10) : 0;
				})
				.filter((n) => !isNaN(n));

			const nextNumber =
				existingNumbers.length > 0
					? Math.max(...existingNumbers) + 1 + i
					: 1 + i;
			const boardName = `${baseName} ${nextNumber}`;

			const boardId = generateBoardId();
			const items = randomiseArgs(args);
			const newBoard = {
				id: boardId,
				name: boardName,
				items: items.slice(0, 24),
				freeSpaceText: freeSpaceText.trim() || "Free space",
				createdAt: new Date().toISOString(),
				shareUrl: createShareUrl(
					items.slice(0, 24),
					boardName,
					freeSpaceText.trim() || "Free space",
				),
			};
			newBoards.push(newBoard);
		}

		setBoards([...newBoards, ...boards]);
	};

	const handleDeleteBoard = (boardId) => {
		setBoards(boards.filter((b) => b.id !== boardId));
		deleteBoardProgress(boardId);
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
								shareUrl: createShareUrl(
									b.items,
									editingName.trim(),
									b.freeSpaceText,
								),
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
				setNotification({
					message: "Share URL copied to clipboard!",
					type: "success",
				});
				setTimeout(() => setNotification(null), 3000);
			},
			(err) => {
				console.error("Failed to copy:", err);
			},
		);
	};

	return (
		<div className="App">
			<Notification message={notification?.message} type={notification?.type} />
			<PageHeader title="Bingo Generator" />
			<div className="input-section">
				<h2 style={{ margin: 0 }}>Create Bingo Boards</h2>
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
				<div style={{ display: "flex", gap: "1rem" }}>
					<div style={{ flex: 1 }}>
						<label
							htmlFor="quantity"
							style={{
								display: "block",
								marginBottom: "0.5rem",
								fontWeight: "600",
							}}
						>
							Quantity:
						</label>
						<input
							id="quantity"
							type="number"
							min="1"
							max="10"
							className="game-input"
							value={quantity}
							onChange={(event) =>
								setQuantity(Math.max(1, parseInt(event.target.value) || 1))
							}
							style={{ width: "100%" }}
						/>
					</div>
				</div>
				<div style={{ display: "flex", gap: "1rem" }}>
					<div style={{ flex: 1 }}>
						<label
							htmlFor="free-space"
							style={{
								display: "block",
								marginBottom: "0.5rem",
								fontWeight: "600",
							}}
						>
							Free Space Text:
						</label>
						<input
							id="free-space"
							type="text"
							className="game-input"
							value={freeSpaceText}
							onChange={(event) => setFreeSpaceText(event.target.value)}
							placeholder="Free space"
							style={{ width: "100%" }}
						/>
					</div>
				</div>
				<div>
					<label
						htmlFor="args"
						style={{
							display: "block",
							marginBottom: "0.5rem",
							fontWeight: "600",
						}}
					>
						Bingo Items:
					</label>
					<Args
						id="args"
						className="game-input"
						value={args}
						onChange={(event) => setArgs(event.target.value)}
						placeholder="Enter newline separated values"
					></Args>
				</div>
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
						<BoardItemComponent
							key={board.id}
							board={board}
							isEditing={editingId === board.id}
							editingName={editingName}
							onEditStart={handleRenameBoard}
							onEditChange={setEditingName}
							onEditSave={handleSaveRename}
							onEditCancel={handleCancelRename}
							onRename={handleRenameBoard}
							onShare={handleCopyShareUrl}
							onDelete={handleDeleteBoard}
						/>
					))}
				</BoardHistory>
			)}
		</div>
	);
}

export default GeneratorPage;
