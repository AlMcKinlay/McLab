function OutputSettings({ clear, selected }) {
	const copyToClipboard = () => {
		const text = selected
			.map((pokemon) => `${pokemon.name} (${pokemon.id})`)
			.join("\n");

		navigator.clipboard.writeText(text).then(
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
