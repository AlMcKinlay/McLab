import { useState } from "react";

function formatDate(timestamp) {
	try {
		return new Date(timestamp).toLocaleString();
	} catch (_error) {
		return "";
	}
}

function SavedListsHome({
	savedLists,
	onCreateNew,
	onOpenList,
	onRenameList,
	onDeleteList,
}) {
	const [editingId, setEditingId] = useState(null);
	const [editingName, setEditingName] = useState("");

	const startEdit = (listId, currentName) => {
		setEditingId(listId);
		setEditingName(currentName || "");
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEditingName("");
	};

	const saveEdit = (listId) => {
		onRenameList(listId, editingName);
		cancelEdit();
	};

	return (
		<div className="saved-home">
			<div className="saved-home-header">
				<h2>Saved Lists</h2>
				<button className="btn btn-primary" onClick={onCreateNew}>
					Create new list
				</button>
			</div>

			{savedLists.length === 0 ? (
				<div className="saved-empty-state">No saved lists yet.</div>
			) : (
				<ul className="saved-list-grid">
					{savedLists.map((list) => {
						const total = list.pokemon.length;
						const complete = (list.checkedIds || []).length;
						const isEditing = editingId === list.id;
						return (
							<li key={list.id} className="saved-list-card">
								{isEditing ? (
									<div className="saved-inline-edit">
										<input
											type="text"
											className="game-input"
											value={editingName}
											onChange={(event) => setEditingName(event.target.value)}
											onKeyDown={(event) => {
												if (event.key === "Enter") {
													saveEdit(list.id);
												}
												if (event.key === "Escape") {
													cancelEdit();
												}
											}}
											autoFocus
										/>
									</div>
								) : (
									<button
										type="button"
										className="saved-list-open"
										onClick={() => onOpenList(list.id)}
									>
										<strong>{list.name}</strong>
										<span>
											{complete}/{total} complete
										</span>
										<small>{formatDate(list.createdAt)}</small>
									</button>
								)}
								<div className="saved-list-actions">
									{isEditing ? (
										<>
											<button
												type="button"
												className="btn btn-primary"
												onClick={() => saveEdit(list.id)}
											>
												Save
											</button>
											<button
												type="button"
												className="btn btn-secondary"
												onClick={cancelEdit}
											>
												Cancel
											</button>
										</>
									) : (
										<button
											type="button"
											className="btn btn-secondary saved-action-muted"
											onClick={() => startEdit(list.id, list.name)}
										>
											Rename
										</button>
									)}
									<button
										type="button"
										className="btn btn-secondary saved-action-muted"
										onClick={() => onDeleteList(list.id)}
									>
										Delete
									</button>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

export default SavedListsHome;
