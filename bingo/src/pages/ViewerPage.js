import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Bingo from "../bingo";
import { getBoardDataFromUrl } from "../utils/boardUtils";

const BingoWrapper = styled.div`
	width: 100%;
	max-width: 900px;
	aspect-ratio: 1;
	margin: 2rem auto;
`;

const ViewerContainer = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 2rem;
	width: 100%;
`;

function ViewerPage() {
	const [boardItems, setBoardItems] = useState(null);
	const [boardName, setBoardName] = useState(null);
	const [completed, setCompleted] = useState({});
	const [boardId, setBoardId] = useState(null);

	// Get board data from URL on mount
	useEffect(() => {
		const data = getBoardDataFromUrl();
		if (data) {
			const items = data.items || data;
			const name = data.name;
			setBoardItems(items);
			setBoardName(name);
			const id = btoa(JSON.stringify(items));
			setBoardId(id);

			// Load saved progress for this board
			const saved = localStorage.getItem(`bingo.board.${id}`);
			if (saved) {
				try {
					setCompleted(JSON.parse(saved));
				} catch (e) {
					console.error("Failed to load board progress:", e);
				}
			}

			// Save this board to the boards list so it appears in history
			const boardsJson = localStorage.getItem("bingo.savedBoards");
			let boards = [];
			if (boardsJson) {
				try {
					boards = JSON.parse(boardsJson);
				} catch (e) {
					console.error("Failed to load saved boards:", e);
				}
			}

			// Check if this board already exists (by comparing items)
			const boardExists = boards.some(
				(b) => JSON.stringify(b.items) === JSON.stringify(items),
			);

			if (!boardExists) {
				const newBoard = {
					id: id,
					name: name,
					items: items,
					createdAt: new Date().toISOString(),
					shareUrl: window.location.href,
				};
				boards.unshift(newBoard);
				localStorage.setItem("bingo.savedBoards", JSON.stringify(boards));
			}
		}
	}, []);

	useEffect(() => {
		if (boardId) {
			localStorage.setItem(`bingo.board.${boardId}`, JSON.stringify(completed));
		}
	}, [completed, boardId]);

	const clearChecked = () => {
		setCompleted({});
	};

	if (!boardItems) {
		return (
			<div className="App">
				<button
					className="theme-toggle"
					id="themeToggle"
					aria-label="Toggle dark mode"
				>
					☀️
				</button>
				<header className="App-header">Bingo</header>
				<ViewerContainer>
					<p>No board found. Share a link to play!</p>
					<a href={window.location.pathname} className="btn btn-primary">
						Create New Board
					</a>
				</ViewerContainer>
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
			<header className="App-header">{boardName || "Bingo"}</header>
			<ViewerContainer>
				<BingoWrapper>
					<Bingo
						args={boardItems}
						completed={completed}
						complete={(index) => setCompleted({ ...completed, [index]: true })}
						clearChecked={clearChecked}
						needMore={false}
						onCreateNew={window.location.pathname}
					></Bingo>
				</BingoWrapper>
			</ViewerContainer>
		</div>
	);
}

export default ViewerPage;
