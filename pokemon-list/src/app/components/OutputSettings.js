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

function OutputSettings({
	clear,
	selected,
	groupByBox,
	onToggleGroupByBox,
	sortMode,
	onSortModeChange,
	hasRegionalDex,
	regionalDexMap,
}) {
	const getDisplayNumber = (pokemon) => {
		if (sortMode === "regional") {
			const regionalEntry = regionalDexMap.get(pokemon.name);
			if (typeof regionalEntry?.entryNumber === "number") {
				return regionalEntry.entryNumber;
			}
		}

		return pokemon.id;
	};

	const copyToClipboard = () => {
		if (groupByBox && sortMode === "regional") {
			const groupedByDex = selected.reduce((acc, pokemon) => {
				const dexName =
					regionalDexMap.get(pokemon.name)?.groupName || "regional-dex";
				if (!acc[dexName]) {
					acc[dexName] = [];
				}
				acc[dexName].push(`${pokemon.name} (${getDisplayNumber(pokemon)})`);
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

			const formattedText = dexGroupOrder
				.map((dexName) => {
					const lines = groupedByDex[dexName] || [];
					const chunks = [];
					for (let i = 0; i < lines.length; i += 30) {
						chunks.push(lines.slice(i, i + 30));
					}

					return chunks
						.map(
							(chunk, index) =>
								`${formatDexName(dexName)} ${index + 1}\n${chunk.join("\n")}`,
						)
						.join("\n\n");
				})
				.join("\n\n");

			navigator.clipboard.writeText(formattedText).then(
				() => {
					console.log("Copied to clipboard!");
				},
				(err) => {
					console.error("Failed to copy: ", err);
				},
			);
			return;
		}

		const text = groupByBox
			? selected.reduce((output, pokemon, index) => {
					const boxNumber = Math.floor(index / 30) + 1;
					if (!output[boxNumber]) {
						output[boxNumber] = [];
					}
					output[boxNumber].push(
						`${pokemon.name} (${getDisplayNumber(pokemon)})`,
					);
					return output;
				}, {})
			: selected
					.map((pokemon) => `${pokemon.name} (${getDisplayNumber(pokemon)})`)
					.join("\n");

		const formattedText =
			typeof text === "string"
				? text
				: Object.entries(text)
						.map(([boxNumber, pokemonLines]) => {
							return `Box ${boxNumber}\n${pokemonLines.join("\n")}`;
						})
						.join("\n\n");

		navigator.clipboard.writeText(formattedText).then(
			() => {
				// Could add a success message here if desired
				console.log("Copied to clipboard!");
			},
			(err) => {
				console.error("Failed to copy: ", err);
			},
		);
	};

	return (
		<>
			<div className="filter-control">
				<label>Sort output:</label>
				<select
					className="game-input"
					value={sortMode}
					onChange={(event) => onSortModeChange(event.target.value)}
				>
					<option value="national">National dex</option>
					<option value="regional" disabled={!hasRegionalDex}>
						Regional dex
					</option>
				</select>
			</div>
			<label className="box-toggle-label">
				<input
					type="checkbox"
					checked={groupByBox}
					onChange={onToggleGroupByBox}
				/>
				Group by box
			</label>
			<button className="btn btn-primary" onClick={clear}>
				Clear
			</button>
			<button className="btn btn-secondary" onClick={copyToClipboard}>
				Copy
			</button>
		</>
	);
}

export default OutputSettings;
