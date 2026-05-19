import fetch from "node-fetch";
import * as cheerio from "cheerio";

export async function scrapeMetacritic(gameName) {
	try {
		const searchUrl = `https://www.metacritic.com/search/${encodeURIComponent(gameName)}/`;

		const response = await fetch(searchUrl, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
			},
		});

		if (!response.ok) return null;

		const html = await response.text();
		const $ = cheerio.load(html);

		// Look for game results
		const firstResult = $("div.result_body").first();
		if (firstResult.length === 0) return null;

		const titleLink = firstResult.find("a").first();
		const gameUrl = titleLink.attr("href");

		if (!gameUrl) return null;

		// Fetch the game page to get release date
		const gameResponse = await fetch(`https://www.metacritic.com${gameUrl}`, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
			},
		});

		if (!gameResponse.ok) return null;

		const gameHtml = await gameResponse.text();
		const $game = cheerio.load(gameHtml);

		const releaseDate = $game(
			"div.details_section:contains('Release Dates') dd",
		)
			.first()
			.text()
			.trim();

		if (!releaseDate) return null;

		return {
			source: "metacritic",
			date: releaseDate,
			url: `https://www.metacritic.com${gameUrl}`,
			match: titleLink.text().trim(),
		};
	} catch (error) {
		return null;
	}
}
