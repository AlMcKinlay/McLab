// Normalize a string for comparison (remove accents, lowercase, remove punctuation)
const normalizeString = (str) => {
	return str
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "") // Remove accents
		.replace(/[^\w\s]/g, "") // Remove punctuation
		.replace(/\s+/g, " ") // Normalize whitespace
		.trim();
};

const extractYears = (name) => {
	const matches = name.match(/\b(?:19|20)\d{2}\b/g);
	return new Set(matches || []);
};

// Check if two game names match closely enough
const namesMatch = (searchName, foundName) => {
	const normalizedSearch = normalizeString(searchName);
	const normalizedFound = normalizeString(foundName);
	const searchYears = extractYears(normalizedSearch);
	const foundYears = extractYears(normalizedFound);

	// If the user provided a year, require the candidate to contain the same year.
	if (searchYears.size > 0) {
		const hasMatchingYear = [...searchYears].every((year) =>
			foundYears.has(year),
		);
		if (!hasMatchingYear) {
			return false;
		}
	}

	// Exact match after normalization
	if (normalizedSearch === normalizedFound) {
		return true;
	}

	// Check if one contains the other (for cases like "Pokemon" vs "Pokemon Red")
	if (
		normalizedFound.includes(normalizedSearch) ||
		normalizedSearch.includes(normalizedFound)
	) {
		return true;
	}

	return false;
};

// Fetch Metacritic score for a game
// Uses Netlify function proxy to avoid CORS restrictions in production
// Returns an object with { score: number|null, isTbd: boolean }
export const fetchMetacriticScore = async (gameName) => {
	try {
		const functionsBase = process.env.REACT_APP_FUNCTIONS_BASE || "";
		const proxyUrl = `${functionsBase}/.netlify/functions/metacritic-proxy?game=${encodeURIComponent(gameName)}`;

		const response = await fetch(proxyUrl, {
			headers: {
				Accept: "text/html",
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const html = await response.text();

		// Parse the HTML to find the first game result
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, "text/html");

		// Try multiple selectors for the score
		let score = null;
		let isTbd = false;
		let foundMatchingGame = false;
		let matchingResultCard = null;

		console.log(`Searching for: "${gameName}"`);

		// Find the search results container (Metacritic has changed this markup over time)
		const resultsContainer = doc.querySelector(
			".c-search-results, .c-pageSiteSearch-results",
		);
		if (!resultsContainer) {
			console.log("Results container not found");
			return { score: null, isTbd: false };
		}

		// Look for game links within the results container
		const gameLinks = resultsContainer.querySelectorAll('a[href*="/game/"]');
		console.log(`Found ${gameLinks.length} game links to check`);

		if (gameLinks.length === 0) {
			console.log("No game links found in results");
			return { score: null, isTbd: false };
		}

		// Check each game link to find a matching title
		for (let i = 0; i < gameLinks.length; i++) {
			const gameLink = gameLinks[i];
			const titleElement = gameLink.querySelector(
				".c-search-item__title, [class*='search-item__title']",
			);
			const foundTitle = (
				titleElement?.textContent || gameLink.textContent
			).trim();

			if (foundTitle) {
				console.log(`Result ${i + 1}: "${foundTitle}"`);

				// Check if this game matches what we searched for
				if (namesMatch(gameName, foundTitle)) {
					foundMatchingGame = true;
					// Get the closest parent card/container
					matchingResultCard = gameLink.closest(
						"[data-testid='search-item'], .search-item, .c-search-item, [class*='c-productCard'], [class*='product_item'], [class*='search-result'], div",
					);
					console.log(`✓ Match found at position ${i + 1}: "${foundTitle}"`);
					break; // Found a match, stop looking
				}
			}
		}

		if (!foundMatchingGame) {
			console.log(`No matching game found in ${gameLinks.length} results`);
		}

		// Look for score in the matching result card with broader selectors
		let scoreElement = null;

		if (matchingResultCard) {
			console.log(`Searching for score in matching card...`);
			// Try multiple selector strategies to find the score
			const scoreSelectors = [
				// New search UI
				'.c-search-item__score [title*="Metascore"] span',
				'.c-search-item__score [aria-label*="Metascore"] span',
				".c-search-item__score span",
				// Older layouts / fallbacks
				".c-siteReviewScore",
				'[data-testid="product-metascore"]',
				'[data-type="metascore"]',
				'[class*="metascore"]',
				'span[class*="score"]',
				'div[class*="rating"]',
				'[class*="score"]',
			];

			for (const selector of scoreSelectors) {
				scoreElement = matchingResultCard.querySelector(selector);
				if (scoreElement) {
					console.log(`Found score element with selector: ${selector}`);
					break;
				}
			}

			// If still not found, log the HTML structure for debugging
			if (!scoreElement) {
				console.log(
					`No score element found. Card structure:`,
					matchingResultCard.innerHTML.substring(0, 500),
				);

				// Try searching for any element containing just numbers or "tbd"
				const allElements = matchingResultCard.querySelectorAll("*");
				for (const el of allElements) {
					const text = el.textContent.trim().toLowerCase();
					// Match just numbers (score) or "tbd"
					if (/^(\d+|tbd)$/.test(text) && text.length <= 3) {
						scoreElement = el;
						console.log(
							`Found potential score element by text content: "${text}"`,
						);
						break;
					}
				}
			}
		}

		console.log(`Found score element:`, scoreElement ? "yes" : "no");

		if (scoreElement) {
			const scoreText = scoreElement.textContent.trim().toLowerCase();
			console.log(`Score text: "${scoreText}"`);

			// Check if Metacritic shows "tbd" as the score
			if (scoreText === "tbd") {
				isTbd = true;
				console.log(`✓ Score is TBD`);
			} else {
				const parsedScore = parseInt(scoreText, 10);
				if (!isNaN(parsedScore)) {
					score = parsedScore;
					console.log(`✓ Score found: ${score}`);
				}
			}
		}

		// Fallback: some cards only expose score in title/aria-label attributes
		if (score === null && !isTbd && matchingResultCard) {
			const labeledScoreElement = matchingResultCard.querySelector(
				'[title*="Metascore"], [aria-label*="Metascore"]',
			);

			if (labeledScoreElement) {
				const scoreLabel =
					labeledScoreElement.getAttribute("title") ||
					labeledScoreElement.getAttribute("aria-label") ||
					"";
				const scoreMatch = scoreLabel.match(/metascore\s+(\d+|tbd)\b/i);

				if (scoreMatch) {
					const value = scoreMatch[1].toLowerCase();
					if (value === "tbd") {
						isTbd = true;
					} else {
						const parsedScore = parseInt(value, 10);
						if (!isNaN(parsedScore)) {
							score = parsedScore;
						}
					}
				}
			}
		}

		return { score, isTbd };
	} catch (error) {
		console.error(`Error fetching Metacritic score for "${gameName}":`, error);
		return { score: null, isTbd: false };
	}
};
