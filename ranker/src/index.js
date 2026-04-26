import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./app/App";
import reportWebVitals from "./reportWebVitals";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);

// Handle theme toggle
const htmlElement = document.documentElement;
const themeToggle = document.getElementById("themeToggle");

let currentTheme = "light";
try {
	currentTheme = localStorage.getItem("theme") || "light";
} catch {
	currentTheme = "light";
}

if (currentTheme === "dark") {
	htmlElement.classList.add("dark-mode");
}

if (themeToggle) {
	themeToggle.textContent = currentTheme === "dark" ? "🌙" : "☀️";
	themeToggle.addEventListener("click", () => {
		const isDark = htmlElement.classList.toggle("dark-mode");
		try {
			localStorage.setItem("theme", isDark ? "dark" : "light");
		} catch {
			// Ignore storage failures and keep UI responsive.
		}
		themeToggle.textContent = isDark ? "🌙" : "☀️";
	});
}

reportWebVitals();
