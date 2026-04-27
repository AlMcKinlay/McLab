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

function OutputList({
	selected,
	unselectPokemon,
	groupByBox,
	sortMode,
	regionalDexMap,
}) {
	const chunkIntoRows = (items, rowSize) => {
		const rows = [];
		for (let i = 0; i < items.length; i += rowSize) {
			rows.push(items.slice(i, i + rowSize));
		}
		return rows;
	};

	const getDisplayNumber = (pokemon) => {
		if (sortMode === "regional") {
			const regionalEntry = regionalDexMap.get(pokemon.name);
			if (typeof regionalEntry?.entryNumber === "number") {
				return regionalEntry.entryNumber;
			}
		}

		return pokemon.id;
	};

	if (groupByBox) {
		if (sortMode === "regional") {
			const groupedByDex = selected.reduce((acc, pokemon) => {
				const dexName =
					regionalDexMap.get(pokemon.name)?.groupName || "regional-dex";
				if (!acc[dexName]) {
					acc[dexName] = [];
				}
				acc[dexName].push(pokemon);
				return acc;
			}, {});

			const dexGroupOrder = [];
			selected.forEach((pokemon) => {
				const dexName =
					regionalDexMap.get(pokemon.name)?.groupName || "regional-dex";
				if (!dexGroupOrder.includes(dexName)) {
					dexGroupOrder.push(dexName);
				}
			});

			return (
				<div className="box-list">
					{dexGroupOrder.map((dexName) => {
						const dexPokemon = groupedByDex[dexName] || [];
						const dexBoxes = dexPokemon.reduce((grouped, pokemon, index) => {
							const boxNumber = Math.floor(index / 30) + 1;
							if (!grouped[boxNumber]) {
								grouped[boxNumber] = [];
							}
							grouped[boxNumber].push(pokemon);
							return grouped;
						}, {});

						const sortedBoxNumbers = Object.keys(dexBoxes)
							.map((value) => Number(value))
							.sort((a, b) => a - b);

						return sortedBoxNumbers.map((boxNumber) => (
							<section key={`${dexName}-${boxNumber}`} className="box-section">
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
												{row.map((pokemon) => (
													<button
														type="button"
														key={pokemon.id}
														className="box-cell"
														onClick={() => unselectPokemon(pokemon.id)}
													>
														<PokemonCard
															id={pokemon.id}
															name={pokemon.name}
															displayNumber={getDisplayNumber(pokemon)}
														></PokemonCard>
													</button>
												))}
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
					})}
				</div>
			);
		}

		const boxes = selected.reduce((grouped, pokemon, index) => {
			const boxNumber = Math.floor(index / 30) + 1;
			if (!grouped[boxNumber]) {
				grouped[boxNumber] = [];
			}
			grouped[boxNumber].push(pokemon);
			return grouped;
		}, {});

		const sortedBoxNumbers = Object.keys(boxes)
			.map((value) => Number(value))
			.sort((a, b) => a - b);

		return (
			<div className="box-list">
				{sortedBoxNumbers.map((boxNumber) => (
					<section key={boxNumber} className="box-section">
						<h3 className="box-title">Box {boxNumber}</h3>
						<div className="box-grid" role="list">
							{chunkIntoRows(boxes[boxNumber], 6).map((row, rowIndex) => (
								<div className="box-row" key={`${boxNumber}-${rowIndex}`}>
									{row.map((pokemon) => (
										<button
											type="button"
											key={pokemon.id}
											className="box-cell"
											onClick={() => unselectPokemon(pokemon.id)}
										>
											<PokemonCard
												id={pokemon.id}
												name={pokemon.name}
												displayNumber={getDisplayNumber(pokemon)}
											></PokemonCard>
										</button>
									))}
									{Array.from({ length: 6 - row.length }).map((_, idx) => (
										<div
											key={`empty-${boxNumber}-${rowIndex}-${idx}`}
											className="box-cell box-cell-empty"
										/>
									))}
								</div>
							))}
						</div>
					</section>
				))}
			</div>
		);
	}

	return (
		<ul className="pokemon-list">
			{selected.map((pokemon) => (
				<li
					key={pokemon.id}
					className="pokemon-grid-item"
					onClick={() => unselectPokemon(pokemon.id)}
				>
					<PokemonCard
						id={pokemon.id}
						name={pokemon.name}
						displayNumber={getDisplayNumber(pokemon)}
					></PokemonCard>
				</li>
			))}
		</ul>
	);
}

export default OutputList;
