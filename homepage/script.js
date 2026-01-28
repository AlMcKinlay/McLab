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
];

// DOM Elements
const appsGrid = document.getElementById("appsGrid");

// Initialize the homepage
function initializeHomepage() {
	renderApps();
}

// Render all app cards
function renderApps() {
	appsGrid.innerHTML = apps.map((app) => createAppCard(app)).join("");
}

// Create a single app card
function createAppCard(app) {
	const thumbnailHtml = app.thumbnailFallback
		? `<div class="app-thumbnail" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center;">
             <span style="color: white; font-size: 2rem; font-weight: bold;">${app.title.charAt(
								0,
							)}</span>
           </div>`
		: `<div class="app-thumbnail">
             <img src="${app.thumbnail}" alt="${app.title}" onerror="this.parentElement.style.backgroundImage='linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; this.style.display='none';">
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
