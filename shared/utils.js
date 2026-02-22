/**
 * Shared utility functions for all McLab apps
 * Includes: theme management, URL encoding/decoding
 */

/* ============================================================================
   THEME MANAGEMENT
   ============================================================================ */

/**
 * Initialize theme on page load
 * Detects system preference, checks localStorage, applies theme
 */
export function initializeTheme() {
	// Check if user has a saved theme preference
	const savedTheme = localStorage.getItem("theme");

	// Check if system prefers dark mode
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

	// Determine the initial theme
	const initialTheme = savedTheme || (prefersDark ? "dark" : "light");

	// Apply the theme
	applyTheme(initialTheme);

	// Set up the theme toggle button if it exists
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

/**
 * Apply theme to the document
 * @param {string} theme - "dark" or "light"
 */
export function applyTheme(theme) {
	document.documentElement.setAttribute("data-theme", theme);
	localStorage.setItem("theme", theme);

	// Update the toggle button emoji if it exists
	// Show opposite icon: in dark mode, show sun (to switch to light); in light mode, show moon (to switch to dark)
	const themeToggle = document.getElementById("themeToggle");
	if (themeToggle) {
		themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
	}
}

/**
 * Toggle between light and dark theme
 */
export function toggleTheme() {
	const currentTheme =
		document.documentElement.getAttribute("data-theme") || "light";
	const newTheme = currentTheme === "light" ? "dark" : "light";
	applyTheme(newTheme);
}

/* ============================================================================
   URL ENCODING / DECODING
   ============================================================================ */

/**
 * Encode an object to a URL-safe base64 string
 * @param {Object} data - The object to encode
 * @returns {string} URL-safe base64 encoded string
 */
export function encodeToURL(data) {
	const json = JSON.stringify(data);
	return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Decode a URL-safe base64 string back to an object
 * @param {string} encoded - The encoded string to decode
 * @returns {Object|null} The decoded object, or null if decoding fails
 */
export function decodeFromURL(encoded) {
	try {
		// Add back padding and convert from URL-safe to standard base64
		const padding = "=".repeat((4 - (encoded.length % 4)) % 4);
		const standardBase64 = (encoded + padding)
			.replace(/-/g, "+")
			.replace(/_/g, "/");
		const json = atob(standardBase64);
		return JSON.parse(json);
	} catch (error) {
		console.error("Failed to decode URL data:", error);
		return null;
	}
}
