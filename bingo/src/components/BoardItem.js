import React from "react";
import styled from "styled-components";

const BoardItemContainer = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 1rem;
	margin-bottom: 0.5rem;
	border: 1px solid var(--border-primary);
	border-radius: 4px;
	background: var(--bg-secondary);
`;

const BoardInfo = styled.div`
	display: flex;
	flex-direction: column;
	text-align: left;
`;

const BoardName = styled.div`
	font-weight: 600;
`;

const BoardMeta = styled.div`
	font-size: 0.875rem;
	color: var(--text-secondary);
`;

const ButtonGroup = styled.div`
	display: flex;
	gap: 0.5rem;
`;

const EditInput = styled.input`
	padding: 0.5rem;
	border: 1px solid var(--border-primary);
	border-radius: 4px;
	background-color: var(--bg-input);
	color: var(--text-primary);
	flex-grow: 1;
	min-width: 150px;
`;

const EditContainer = styled.div`
	display: flex;
	gap: 0.5rem;
	align-items: center;
	flex: 1;
`;

function BoardItem({
	board,
	isEditing,
	editingName,
	onEditStart,
	onEditChange,
	onEditSave,
	onEditCancel,
	onOpen,
	onRename,
	onShare,
	onDelete,
}) {
	return (
		<BoardItemContainer>
			<BoardInfo style={{ flex: 1 }}>
				{isEditing ? (
					<EditContainer>
						<EditInput
							type="text"
							value={editingName}
							onChange={(e) => onEditChange(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") onEditSave(board.id);
								if (e.key === "Escape") onEditCancel();
							}}
							autoFocus
						/>
					</EditContainer>
				) : (
					<>
						<BoardName>{board.name || "Untitled Board"}</BoardName>
						<BoardMeta>
							{new Date(board.createdAt).toLocaleString()} •{" "}
							{board.items.length} items
						</BoardMeta>
					</>
				)}
			</BoardInfo>

			<ButtonGroup>
				{isEditing ? (
					<>
						<button
							className="btn btn-primary"
							onClick={() => onEditSave(board.id)}
							style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
						>
							Save
						</button>
						<button
							className="btn btn-secondary"
							onClick={onEditCancel}
							style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
						>
							Cancel
						</button>
					</>
				) : (
					<>
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
							onClick={() => onRename(board.id, board.name)}
							style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
						>
							Rename
						</button>
						<button
							className="btn btn-secondary"
							onClick={() => onShare(board.shareUrl)}
							style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
						>
							Share
						</button>
						<button
							className="btn btn-danger"
							onClick={() => onDelete(board.id)}
							style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
						>
							Delete
						</button>
					</>
				)}
			</ButtonGroup>
		</BoardItemContainer>
	);
}

export default BoardItem;
