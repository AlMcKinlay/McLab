import fetch from "node-fetch";
import * as cheerio from "cheerio";

export async function scrapeWikipedia(gameName) {
	try {
		// Append 'video game' to improve result relevance for indie/upcoming titles
		const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(gameName + " video game")}&format=json`;

		const response = await fetch(searchUrl, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
			},
		});

		if (!response.ok) return null;

		const data = await response.json();

		if (!data.query || data.query.search.length === 0) return null;

		const searchResult = data.query.search[0];
		const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(searchResult.title)}`;

		// Fetch the actual page
		const pageResponse = await fetch(pageUrl, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
			},
		});

		if (!pageResponse.ok) return null;

		const html = await pageResponse.text();
		const $ = cheerio.load(html);

		// Guard against non-game pages (films, books, etc.) that can match title text.
		const pageText = $("#mw-content-text").text().toLowerCase();
		const infoboxText = $(".infobox").text().toLowerCase();
		const looksLikeGamePage =
			pageText.includes("video game") ||
			infoboxText.includes("developer") ||
			infoboxText.includes("publisher") ||
			infoboxText.includes("platform") ||
			infoboxText.includes("genre");

		if (!looksLikeGamePage) return null;

		// Look for release date in infobox - try different selectors
		let releaseDate = null;

		// Try to find "Released" or "Release date" row
		const infoboxRows = $(".infobox tr");

		for (let i = 0; i < infoboxRows.length; i++) {
			const $row = $(infoboxRows[i]);
			const label = $row.find("th").text().toLowerCase();

			if (
				(label.includes("released") || label.includes("release")) &&
				!label.includes("developer")
			) {
				const $td = $row.find("td");

				// Each date/platform is in a <li> - find first li that looks like a date
				const datePatterns = [
					/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i,
					/\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i,
				];

				$td.find("li").each((j, li) => {
					const text = $(li)
						.text()
						.replace(/\[\d+\]/g, "")
						.trim();
					for (const pattern of datePatterns) {
						const match = text.match(pattern);
						if (match) {
							releaseDate = match[0];
							return false; // break
						}
					}
					if (releaseDate) return false;
				});

				if (releaseDate) break;
			}
		}

		if (!releaseDate) return null;

		return {
			source: "wikipedia",
			date: releaseDate,
			url: pageUrl,
			match: searchResult.title,
		};
	} catch (error) {
		return null;
	}
}
