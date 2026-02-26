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
		const items = randomiseArgs(args);
		if (items.length < 24) {
			setNotification({
				message: "You need at least 24 items to generate a bingo board",
				type: "error",
			});
			setTimeout(() => setNotification(null), 3000);
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
