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
			<header className="App-header">
				<a
					href={window.location.pathname}
					style={{ color: "inherit", textDecoration: "none" }}
				>
					{title}
				</a>
			</header>
		</>
	);
}

export default PageHeader;
