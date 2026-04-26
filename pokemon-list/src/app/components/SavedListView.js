import { useState } from "react";
import PokemonCard from "./PokemonCard";

const formatDexName = (dexName) =>
	(dexName || "regional-dex")
		.split("-")
		.map((part) =>
			part.length > 0
				? part.length === 1
					? part.toUpperCase()
					: part.charAt(0).toUpperCase() + part.slice(1)
				: part,
		)
		.join(" ");

function SavedListView({
	list,
	onBack,
	onToggleChecked,
	onSetAllChecked,
	onSetBoxView,
	onRenameList,
	onDeleteList,
}) {
	const [isEditingName, setIsEditingName] = useState(false);
	const [editingName, setEditingName] = useState("");

	const chunkIntoRows = (items, rowSize) => {
		const rows = [];
		for (let i = 0; i < items.length; i += rowSize) {
			rows.push(items.slice(i, i + rowSize));
		}
		return rows;
	};

	const startRename = () => {
		setEditingName(list?.name || "");
		setIsEditingName(true);
	};

	const cancelRename = () => {
		setIsEditingName(false);
		setEditingName("");
	};

	const saveRename = () => {
		onRenameList(list.id, editingName);
		cancelRename();
	};

	if (!list) {
		return (
			<div className="saved-detail">
				<div className="saved-home-header">
					<h2>List not found</h2>
					<button className="btn btn-secondary" onClick={onBack}>
						Back to lists
					</button>
				</div>
			</div>
		);
	}

	const checkedIds = new Set(list.checkedIds || []);
	const isBoxView = list.boxView !== false;
	const complete = checkedIds.size;
	const total = list.pokemon.length;
	const hasAnyChecked = complete > 0;
	const percent = total > 0 ? Math.round((complete / total) * 100) : 0;
	const hasRegionalGroups =
		list.sortMode === "regional" &&
		list.pokemon.some((pokemon) => Boolean(pokemon.dexGroupName));

	return (
		<div className="saved-detail">
			<div className="saved-home-header">
				<div>
					{isEditingName ? (
						<input
							type="text"
							className="game-input"
							value={editingName}
							onChange={(event) => setEditingName(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									saveRename();
								}
								if (event.key === "Escape") {
									cancelRename();
								}
							}}
							autoFocus
						/>
					) : (
						<h2>{list.name}</h2>
					)}
					<p className="saved-progress-label">
						{complete}/{total} complete ({percent}%)
					</p>
				</div>
				<div className="saved-list-actions">
					{isEditingName ? (
						<>
							<button className="btn btn-primary" onClick={saveRename}>
								Save
							</button>
							<button className="btn btn-secondary" onClick={cancelRename}>
								Cancel
							</button>
						</>
					) : (
						<button className="btn btn-secondary" onClick={startRename}>
							Rename
						</button>
					)}
					<button
						className="btn btn-secondary saved-action-muted"
						onClick={() => onDeleteList(list.id)}
					>
						Delete
					</button>
					<button className="btn btn-secondary" onClick={onBack}>
						Back to lists
					</button>
				</div>
			</div>

			<div className="saved-list-toolbar">
				<label className="box-toggle-label">
					<input
						type="checkbox"
						checked={isBoxView}
						onChange={() => onSetBoxView(list.id, !isBoxView)}
					/>
					Show box view
				</label>
				<div className="saved-list-actions">
					<button
						className="btn btn-secondary"
						onClick={() => onSetAllChecked(list.id, true)}
					>
						Select all
					</button>
					<button
						className="btn btn-secondary"
						onClick={() => onSetAllChecked(list.id, false)}
						disabled={!hasAnyChecked}
					>
						Clear all
					</button>
				</div>
			</div>

			<div className="saved-progress-panel">
				<div className="saved-progress-heading">
					<strong>Progress</strong>
					<span>{percent}%</span>
				</div>
				<div
					className="saved-progress-track"
					role="progressbar"
					aria-valuenow={percent}
					aria-valuemin={0}
					aria-valuemax={100}
				>
					<div
						className="saved-progress-fill"
						style={{ width: `${percent}%` }}
					/>
				</div>
				<div className="saved-progress-meta">
					<span>{complete} completed</span>
					<span>{Math.max(total - complete, 0)} remaining</span>
				</div>
			</div>

			{isBoxView ? (
				<div className="box-list">
					{hasRegionalGroups
						? (() => {
								const groupedByDex = list.pokemon.reduce((acc, pokemon) => {
									const dexName = pokemon.dexGroupName || "regional-dex";
									if (!acc[dexName]) {
										acc[dexName] = [];
									}
									acc[dexName].push(pokemon);
									return acc;
								}, {});

								const dexGroupOrder = [];
								list.pokemon.forEach((pokemon) => {
									const dexName = pokemon.dexGroupName || "regional-dex";
									if (!dexGroupOrder.includes(dexName)) {
										dexGroupOrder.push(dexName);
									}
								});

								return dexGroupOrder.flatMap((dexName) => {
									const dexPokemon = groupedByDex[dexName] || [];
									const dexBoxes = dexPokemon.reduce(
										(grouped, pokemon, index) => {
											const boxNumber = Math.floor(index / 30) + 1;
											if (!grouped[boxNumber]) {
												grouped[boxNumber] = [];
											}
											grouped[boxNumber].push(pokemon);
											return grouped;
										},
										{},
									);

									const sortedBoxNumbers = Object.keys(dexBoxes)
										.map((value) => Number(value))
										.sort((a, b) => a - b);

									return sortedBoxNumbers.map((boxNumber) => (
										<section
											key={`${dexName}-${boxNumber}`}
											className="box-section"
										>
											<h3 className="box-title">
												{formatDexName(dexName)} {boxNumber}
											</h3>
											<div className="box-grid" role="list">
												{chunkIntoRows(dexBoxes[boxNumber], 6).map(
													(row, rowIndex) => (
														<div
															className="box-row"
															key={`${dexName}-${boxNumber}-${rowIndex}`}
														>
															{row.map((pokemon) => {
																const isChecked = checkedIds.has(
																	String(pokemon.id),
																);
																return (
																	<div
																		key={pokemon.id}
																		className={`box-cell saved-box-cell ${isChecked ? "done" : ""}`}
																	>
																		<label>
																			<input
																				type="checkbox"
																				checked={isChecked}
																				onChange={() =>
																					onToggleChecked(
																						list.id,
																						String(pokemon.id),
																					)
																				}
																			/>
																			<PokemonCard
																				id={pokemon.id}
																				name={pokemon.name}
																				displayNumber={
																					pokemon.number ?? pokemon.id
																				}
																			/>
																		</label>
																	</div>
																);
															})}
															{Array.from({ length: 6 - row.length }).map(
																(_, idx) => (
																	<div
																		key={`empty-${dexName}-${boxNumber}-${rowIndex}-${idx}`}
																		className="box-cell box-cell-empty"
																	/>
																),
															)}
														</div>
													),
												)}
											</div>
										</section>
									));
								});
							})()
						: Array.from({ length: Math.ceil(list.pokemon.length / 30) }).map(
								(_, boxIndex) => {
									const boxNumber = boxIndex + 1;
									const boxPokemon = list.pokemon.slice(
										boxIndex * 30,
										boxIndex * 30 + 30,
									);
									return (
										<section key={boxNumber} className="box-section">
											<h3 className="box-title">Box {boxNumber}</h3>
											<div className="box-grid" role="list">
												{chunkIntoRows(boxPokemon, 6).map((row, rowIndex) => (
													<div
														className="box-row"
														key={`${boxNumber}-${rowIndex}`}
													>
														{row.map((pokemon) => {
															const isChecked = checkedIds.has(
																String(pokemon.id),
															);
															return (
																<div
																	key={pokemon.id}
																	className={`box-cell saved-box-cell ${isChecked ? "done" : ""}`}
																>
																	<label>
																		<input
																			type="checkbox"
																			checked={isChecked}
																			onChange={() =>
																				onToggleChecked(
																					list.id,
																					String(pokemon.id),
																				)
																			}
																		/>
																		<PokemonCard
																			id={pokemon.id}
																			name={pokemon.name}
																			displayNumber={
																				pokemon.number ?? pokemon.id
																			}
																		/>
																	</label>
																</div>
															);
														})}
														{Array.from({ length: 6 - row.length }).map(
															(_, idx) => (
																<div
																	key={`empty-${boxNumber}-${rowIndex}-${idx}`}
																	className="box-cell box-cell-empty"
																/>
															),
														)}
													</div>
												))}
											</div>
										</section>
									);
								},
							)}
				</div>
			) : (
				<ul className="saved-checklist">
					{list.pokemon.map((pokemon) => {
						const isChecked = checkedIds.has(String(pokemon.id));
						return (
							<li
								key={pokemon.id}
								className={`saved-check-item ${isChecked ? "done" : ""}`}
							>
								<label>
									<input
										type="checkbox"
										checked={isChecked}
										onChange={() =>
											onToggleChecked(list.id, String(pokemon.id))
										}
									/>
									<PokemonCard
										id={pokemon.id}
										name={pokemon.name}
										displayNumber={pokemon.number ?? pokemon.id}
									/>
								</label>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

export default SavedListView;
