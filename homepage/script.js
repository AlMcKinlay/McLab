// ============================================================================
// THEME MANAGEMENT
// ============================================================================

function initializeTheme() {
	// Check if user has a saved theme preference
	const savedTheme = localStorage.getItem("theme");

	// Check if system prefers dark mode
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

	// Determine the initial theme
	const initialTheme = savedTheme || (prefersDark ? "dark" : "light");

	// Apply the theme
	applyTheme(initialTheme);

	// Set up the theme toggle button
	const themeToggle = document.getElementById("themeToggle");
	if (themeToggle) {
		themeToggle.addEventListener("click", toggleTheme);
	}

	// Listen for system theme changes
	window
		.matchMedia("(prefers-color-scheme: dark)")
		.addEventListener("change", (e) => {
			if (!localStorage.getItem("theme")) {
				applyTheme(e.matches ? "dark" : "light");
			}
		});
}

function applyTheme(theme) {
	document.documentElement.setAttribute("data-theme", theme);
	localStorage.setItem("theme", theme);

	// Update the toggle button emoji
	// Show opposite icon: in dark mode, show sun (to switch to light); in light mode, show moon (to switch to dark)
	const themeToggle = document.getElementById("themeToggle");
	if (themeToggle) {
		themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
	}
}

function toggleTheme() {
	const currentTheme =
		document.documentElement.getAttribute("data-theme") || "light";
	const newTheme = currentTheme === "light" ? "dark" : "light";
	applyTheme(newTheme);
}

// ============================================================================
// APP CONFIGURATION & RENDERING
// ============================================================================

// App configuration - add new apps here
const apps = [
	{
		id: "pokemon-list",
		title: "Pokemon List",
		description: "Browse and search Pokemon",
		url: "/pokemon-list",
		thumbnail: "./pokemon-thumbnail.png",
	},
	{
		id: "switch",
		title: "Switch",
		description: "Nintendo Switch game tracker",
		url: "/switch",
		thumbnail: "./switch-thumbnail.png",
	},
	{
		id: "bingo",
		title: "Bingo",
		description: "Interactive bingo game",
		url: "/bingo",
		thumbnail: "./bingo-thumbnail.png",
	},
	{
		id: "game-draft",
		title: "Game Draft",
		description: "Track Metacritic scores for your fantasy game draft",
		url: "/game-draft",
		thumbnail: "./game-draft-thumbnail.png",
	},
];

// DOM Elements
const appsGrid = document.getElementById("appsGrid");

// Initialize the homepage
function initializeHomepage() {
	initializeTheme();
	renderApps();
}

// Render all app cards
function renderApps() {
	appsGrid.innerHTML = apps.map((app) => createAppCard(app)).join("");
}

// Create a single app card
function createAppCard(app) {
	const thumbnailHtml = app.thumbnailFallback
		? `<div class="app-thumbnail" style="display: flex; align-items: center; justify-content: center;">
             <span style="color: white; font-size: 2rem; font-weight: bold;">${app.title.charAt(
								0,
							)}</span>
           </div>`
		: `<div class="app-thumbnail">
             <img src="${app.thumbnail}" alt="${app.title}" onerror="this.parentElement.style.display='flex'; this.style.display='none';">
           </div>`;

	return `
        <a href="${app.url}" class="app-card">
            ${thumbnailHtml}
            <div class="app-info">
                <h2 class="app-title">${app.title}</h2>
                <p class="app-description">${app.description}</p>
                <button class="app-link">Open App →</button>
            </div>
        </a>
    `;
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initializeHomepage);
