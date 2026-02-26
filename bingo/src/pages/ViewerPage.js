import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Bingo from "../components/Board";
import {
	getBoardDataFromUrl,
	loadBoardProgress,
	saveBoardProgress,
	addBoardToHistory,
} from "../utils/boardUtils";
import PageHeader from "../components/PageHeader";

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

	useEffect(() => {
		const data = getBoardDataFromUrl();
		if (data) {
			const items = data.items || data;
			const name = data.name;
			setBoardItems(items);
			setBoardName(name);

			const id = btoa(JSON.stringify(items));
			setBoardId(id);

			setCompleted(loadBoardProgress(id));

			addBoardToHistory({
				id: id,
				name: name,
				items: items,
				createdAt: new Date().toISOString(),
				shareUrl: window.location.href,
			});
		}
	}, []);

	useEffect(() => {
		if (boardId) {
			saveBoardProgress(boardId, completed);
		}
	}, [completed, boardId]);

	const clearChecked = () => {
		setCompleted({});
	};

	if (!boardItems) {
		return (
			<div className="App">
				<PageHeader title="Bingo" />
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
			<PageHeader title={boardName || "Bingo"} />
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
