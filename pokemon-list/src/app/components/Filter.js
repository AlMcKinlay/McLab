function Filter({ filter, setFilter, selectTop }) {
	const _handleKeyDown = (e) => {
		if (e.key === "Enter") {
			selectTop();
			e.target.select();
		}
	};
	return (
		<>
			<input
				className="game-input"
				placeholder="Name..."
				value={filter.name}
				onKeyDown={_handleKeyDown}
				onChange={(event) => setFilter({ ...filter, name: event.target.value })}
			/>
		</>
	);
}

export default Filter;
