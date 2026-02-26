import React from "react";

function PageHeader({ title }) {
	return (
		<>
			<button
				className="theme-toggle"
				id="themeToggle"
				aria-label="Toggle dark mode"
			>
				☀️
			</button>
			<header className="App-header">{title}</header>
		</>
	);
}

export default PageHeader;
