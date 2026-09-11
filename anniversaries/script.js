import { GAME_SERIES } from "./data.js";

function initializeTheme() {
	const savedTheme = localStorage.getItem("theme");
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
	applyTheme(initialTheme);

	const themeToggle = document.getElementById("themeToggle");
	if (themeToggle) {
		themeToggle.addEventListener("click", toggleTheme);
	}

	window
		.matchMedia("(prefers-color-scheme: dark)")
		.addEventListener("change", (event) => {
			if (!localStorage.getItem("theme")) {
				applyTheme(event.matches ? "dark" : "light");
			}
		});
}

function applyTheme(theme) {
	document.documentElement.setAttribute("data-theme", theme);
	localStorage.setItem("theme", theme);

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

function initializeTabs() {
	const tabButtons = Array.from(document.querySelectorAll(".tab-button"));
	const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

	if (!tabButtons.length || !tabPanels.length) {
		return;
	}

	function activateTab(targetId) {
		for (const button of tabButtons) {
			const isActive = button.dataset.target === targetId;
			button.classList.toggle("active", isActive);
			button.setAttribute("aria-selected", String(isActive));
			button.tabIndex = isActive ? 0 : -1;
		}

		for (const panel of tabPanels) {
			const isActive = panel.id === targetId;
			panel.classList.toggle("active", isActive);
			panel.hidden = !isActive;
		}
	}

	for (const button of tabButtons) {
		button.addEventListener("click", () => {
			activateTab(button.dataset.target);
		});
	}
}

function parseSeriesDate(startedOn) {
	const [year, month, day] = startedOn.split("-").map(Number);
	return { year, month, day };
}

function createOccurrence(entry, year) {
	const parsed = parseSeriesDate(entry.startedOn);
	const anniversary = year - parsed.year;
	if (anniversary <= 0) {
		return null;
	}

	const occurrenceDate = new Date(year, parsed.month - 1, parsed.day);
	return {
		...entry,
		anniversary,
		occurrenceYear: year,
		occurrenceDate,
	};
}

function sortByDate(entries) {
	return entries.sort((a, b) => a.occurrenceDate - b.occurrenceDate);
}

function buildSections(entries, now) {
	const currentYear = now.getFullYear();

	// Range: 1 year ago to end of next calendar year
	const rangeStart = new Date(currentYear - 1, now.getMonth(), now.getDate());
	const rangeEnd = new Date(currentYear + 2, 11, 31); // Dec 31 of next calendar year

	const sections = {
		past: [],
		nextAnniversary: [],
		nextTwoMonths: [],
		otherUpcoming: [],
	};
	const upcoming = [];

	for (const entry of entries) {
		// Check anniversary occurrences in each year of our range
		for (let year = currentYear - 1; year <= currentYear + 1; year++) {
			const occurrence = createOccurrence(entry, year);

			if (!occurrence) continue;
			if (occurrence.anniversary % 5 !== 0) continue; // Only divisible by 5
			if (
				occurrence.occurrenceDate < rangeStart ||
				occurrence.occurrenceDate > rangeEnd
			)
				continue;

			// This occurrence is in our range and divisible by 5
			if (occurrence.occurrenceDate < now) {
				sections.past.push(occurrence);
			} else {
				upcoming.push(occurrence);
			}
		}
	}

	sortByDate(sections.past);
	sortByDate(upcoming);

	// Extract the first upcoming anniversary
	if (upcoming.length > 0) {
		sections.nextAnniversary = [upcoming.shift()];
	}

	for (const occurrence of upcoming) {
		if (occurrence.occurrenceYear === currentYear) {
			sections.nextTwoMonths.push(occurrence);
		} else {
			sections.otherUpcoming.push(occurrence);
		}
	}

	return sections;
}

function formatDate(date) {
	return date.toLocaleDateString(undefined, {
		weekday: "short",
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

function groupByAnniversary(entries) {
	const grouped = {};
	for (const entry of entries) {
		const anniversary = entry.anniversary;
		if (!grouped[anniversary]) {
			grouped[anniversary] = [];
		}
		grouped[anniversary].push(entry);
	}

	const sorted = Object.entries(grouped)
		.sort((a, b) => Number(b[0]) - Number(a[0]))
		.map(([anniversary, items]) => ({
			anniversary: Number(anniversary),
			entries: items.sort((a, b) => a.occurrenceDate - b.occurrenceDate),
		}));

	return sorted;
}

function renderList(targetId, entries) {
	const list = document.getElementById(targetId);

	if (!list) {
		return;
	}

	if (!entries.length) {
		list.innerHTML =
			'<li class="empty-state">No anniversaries in this section.</li>';
		return;
	}

	const grouped = groupByAnniversary(entries);

	list.innerHTML = grouped
		.map((group) => {
			const itemsHtml = group.entries
				.map((entry) => {
					const originalYear = entry.startedOn.split("-")[0];
					const linkedYear = entry.wikiUrl
						? `<a class="year-link" href="${entry.wikiUrl}" target="_blank" rel="noopener noreferrer">${originalYear}</a>`
						: originalYear;
					return `<li class="anniversary-item">
						<p class="series-name">${entry.series}</p>
						<p class="date">${formatDate(entry.occurrenceDate)} (${linkedYear})</p>
					</li>`;
				})
				.join("");

			return `<li class="anniversary-group">
				<h3 class="anniversary-group-header">${group.anniversary}th Anniversary</h3>
				<ul class="anniversary-group-list">
					${itemsHtml}
				</ul>
			</li>`;
		})
		.join("");
}

function renderPage() {
	const now = new Date();
	const sections = buildSections(GAME_SERIES, now);

	const todaySummary = document.getElementById("todaySummary");
	if (todaySummary) {
		todaySummary.textContent = `Today: ${formatDate(now)}`;
	}

	const upcomingHeading = document.getElementById("upcoming-heading");
	if (upcomingHeading) {
		upcomingHeading.textContent = String(now.getFullYear() + 1);
	}

	const upcomingTab = document.getElementById("tab-button-next-year");
	if (upcomingTab) {
		upcomingTab.textContent = String(now.getFullYear() + 1);
	}

	renderList("pastList", sections.past);
	renderList("nextList", sections.nextAnniversary);
	renderList("nextTwoMonthsList", sections.nextTwoMonths);
	renderList("upcomingList", sections.otherUpcoming);
}

document.addEventListener("DOMContentLoaded", () => {
	initializeTheme();
	initializeTabs();
	renderPage();
});
