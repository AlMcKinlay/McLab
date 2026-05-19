import fetch from "node-fetch";

export async function scrapeGOG(gameName) {
	try {
		// GOG API for search
		const searchUrl = `https://www.gog.com/games/ajax/filtered?search=${encodeURIComponent(gameName)}&limit=1`;

		const response = await fetch(searchUrl, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
			},
		});

		if (!response.ok) return null;

		const data = await response.json();

		if (!data.products || data.products.length === 0) return null;

		const product = data.products[0];
		const releaseDate = product.release_date;

		if (!releaseDate) return null;

		return {
			source: "gog",
			date: new Date(releaseDate * 1000).toISOString().split("T")[0],
			url: `https://www.gog.com${product.url}`,
			match: product.title,
		};
	} catch (error) {
		return null;
	}
}
