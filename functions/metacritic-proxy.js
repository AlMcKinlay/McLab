export const handler = async (event) => {
	try {
		const game = event.queryStringParameters?.game;
		if (!game || !game.trim()) {
			return {
				statusCode: 400,
				headers: {
					"Access-Control-Allow-Origin": "*",
				},
				body: "Missing game parameter",
			};
		}

		const searchUrl = `https://www.metacritic.com/search/${encodeURIComponent(game)}/`;

		const response = await fetch(searchUrl, {
			headers: {
				Accept: "text/html",
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			},
		});

		if (!response.ok) {
			return {
				statusCode: response.status,
				headers: {
					"Access-Control-Allow-Origin": "*",
				},
				body: `Upstream error: ${response.status}`,
			};
		}

		const html = await response.text();

		return {
			statusCode: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Content-Type": "text/html; charset=utf-8",
				"Cache-Control": "public, max-age=300",
			},
			body: html,
		};
	} catch (error) {
		console.error("metacritic-proxy error:", error);
		return {
			statusCode: 500,
			headers: {
				"Access-Control-Allow-Origin": "*",
			},
			body: "Proxy error",
		};
	}
};
