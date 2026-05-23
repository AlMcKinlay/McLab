import fetch from "node-fetch";
import * as cheerio from "cheerio";

export async function scrapeStream(gameName) {
	try {
		// Use the Steam store search page
		const searchUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(gameName)}&category1=998`;

		const response = await fetch(searchUrl, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
			},
		});

		if (!response.ok) return null;

		const html = await response.text();
		const $ = cheerio.load(html);

		// Look for the first app result
		const appLink = $("a.search_result_row").first();
		if (appLink.length === 0) return null;

		const appUrl = appLink.attr("href");
		if (!appUrl) return null;

		const title = appLink.find(".title").text().trim();

		// Release date is shown directly in search results
		const releaseDateText = appLink.find(".search_released").text().trim();

		// Extract app ID from URL for the store link
		const appMatch = appUrl.match(/\/app\/(\d+)/);
		if (!appMatch) return null;
		const appId = appMatch[1];

		// If we have a date from search results, use it directly
		if (releaseDateText) {
			return {
				source: "steam",
				date: releaseDateText,
				url: `https://store.steampowered.com/app/${appId}`,
				match: title,
			};
		}

		// Fall back to the API for more detail
		const apiUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
		const apiResponse = await fetch(apiUrl, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
			},
		});
		if (!apiResponse.ok) return null;

		const data = await apiResponse.json();
		const appData = data[appId];

		if (!appData || !appData.data) return null;

		const releaseDate = appData.data.release_date?.date;
		if (!releaseDate) return null;

		return {
			source: "steam",
			date: releaseDate,
			url: `https://store.steampowered.com/app/${appId}`,
			match: appData.data.name,
		};
	} catch (error) {
		return null;
	}
}
