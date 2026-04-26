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

const currentTheme = localStorage.getItem("theme") || "light";
if (currentTheme === "dark") {
	htmlElement.classList.add("dark-mode");
	themeToggle.textContent = "🌙";
}

themeToggle?.addEventListener("click", () => {
	const isDark = htmlElement.classList.toggle("dark-mode");
	localStorage.setItem("theme", isDark ? "dark" : "light");
	themeToggle.textContent = isDark ? "🌙" : "☀️";
});

reportWebVitals();
