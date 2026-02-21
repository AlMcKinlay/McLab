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

// Check if two game names match closely enough
const namesMatch = (searchName, foundName) => {
	const normalizedSearch = normalizeString(searchName);
	const normalizedFound = normalizeString(foundName);

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

		// Look for all game result cards - try multiple selector strategies
		let resultCards = doc.querySelectorAll(
			'[class*="search-result"], [class*="product_item"], [class*="c-finderProductCard"], [class*="c-productCard"], .search_result',
		);

		// If no result cards found, try looking for any links to game pages
		if (resultCards.length === 0) {
			console.log(`No result cards found, trying alternative selectors`);
			const gameLinks = doc.querySelectorAll('a[href*="/game/"]');
			console.log(`Found ${gameLinks.length} game links`);

			// For each game link, find its parent container
			resultCards = Array.from(gameLinks).map((link) => {
				// Walk up the DOM to find a likely container
				let parent = link.parentElement;
				let depth = 0;
				while (parent && depth < 5) {
					if (parent.classList.length > 0) {
						return parent;
					}
					parent = parent.parentElement;
					depth++;
				}
				return link;
			});
		}

		console.log(`Found ${resultCards.length} result cards to check`);

		// Check each result card to find a matching title
		for (let i = 0; i < resultCards.length; i++) {
			const resultCard = resultCards[i];

			// Try multiple ways to extract the title
			let foundTitle = null;

			// Method 1: Look for title elements within this card
			const titleElement = resultCard.querySelector(
				'h3, h2, h1, [class*="title"], [class*="productTitle"], [class*="name"], [class*="productName"]',
			);

			if (titleElement) {
				foundTitle = titleElement.textContent.trim();
			} else {
				// Method 2: Look for link text
				const linkElement = resultCard.querySelector('a[href*="/game/"]');
				if (linkElement) {
					foundTitle = linkElement.textContent.trim();
				}
			}

			if (foundTitle) {
				console.log(`Result ${i + 1}: "${foundTitle}"`);

				// Check if this game matches what we searched for
				if (namesMatch(gameName, foundTitle)) {
					foundMatchingGame = true;
					matchingResultCard = resultCard;
					console.log(`✓ Match found at position ${i + 1}: "${foundTitle}"`);
					break; // Found a match, stop looking
				}
			} else {
				console.log(`Result ${i + 1}: Could not extract title`);
			}
		}

		if (!foundMatchingGame) {
			console.log(`No matching game found in ${resultCards.length} results`);
		}

		// Look for metascore in various formats
		const scoreElement = matchingResultCard
			? matchingResultCard.querySelector(
					'.c-siteReviewScore, .metascore_w, [class*="metascore"], [class*="score"]',
				)
			: doc.querySelector(
					'.c-siteReviewScore, .metascore_w, [class*="metascore"], [class*="score"]',
				);

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
					// Only return a numeric score if we verified the game title matches
					if (!foundMatchingGame) {
						console.log(`Found score but no title match - rejecting`);
						return { score: null, isTbd: false };
					}
					score = parsedScore;
				}
			}
		}

		// Try to find score in JSON-LD data (only if we haven't found a score or TBD yet)
		if (score === null && !isTbd) {
			const scriptTags = doc.querySelectorAll(
				'script[type="application/ld+json"]',
			);
			for (const script of scriptTags) {
				try {
					const data = JSON.parse(script.textContent);
					if (data.aggregateRating?.ratingValue) {
						score = Math.round(data.aggregateRating.ratingValue);
						break;
					}
				} catch (e) {
					// Continue to next script tag
				}
			}
		}

		return { score, isTbd };
	} catch (error) {
		console.error(`Error fetching Metacritic score for "${gameName}":`, error);
		return { score: null, isTbd: false };
	}
};
