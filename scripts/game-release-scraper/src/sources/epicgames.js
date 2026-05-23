import fetch from "node-fetch";

export async function scrapeEpicGames(gameName) {
	try {
		// Epic Games Catalog API
		const searchUrl = `https://catalog-service.unrealengine.com/api/v2/catalog/surfacing/products?keyword=${encodeURIComponent(gameName)}&limit=1`;

		const response = await fetch(searchUrl, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
			},
		});

		if (!response.ok) return null;

		const data = await response.json();

		if (!data.elements || data.elements.length === 0) return null;

		const product = data.elements[0];
		const releaseDate = product.releaseDate;

		if (!releaseDate) return null;

		return {
			source: "epicgames",
			date: releaseDate.split("T")[0],
			url: `https://www.epicgames.com/store/en-US/p/${product.productSlug}`,
			match: product.title,
		};
	} catch (error) {
		return null;
	}
}
