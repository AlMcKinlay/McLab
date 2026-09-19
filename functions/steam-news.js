import { createHash, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

// Public home of the aggregated Steam news feed. The steam-news service on the
// home server PUTs the XML here with a shared secret; RSS readers GET it.
const STORE_NAME = "steam-news";
const KEY = "feed.xml";

function authorised(req) {
	const secret = process.env.STEAM_NEWS_PUSH_SECRET;
	const header = req.headers.get("authorization") || "";
	if (!secret || !header.startsWith("Bearer ")) return false;
	const digest = (s) => createHash("sha256").update(s).digest();
	return timingSafeEqual(digest(header.slice(7)), digest(secret));
}

// Who fetches the feed, and when, shows up in the Netlify function log. This
// is how we tell a reader's own polling apart from a WebSub hub fetch.
function logRequest(req, status) {
	const ua = req.headers.get("user-agent") || "-";
	console.log(`${req.method} ${status} ua="${ua}"`);
}

export default async (req) => {
	const store = getStore({ name: STORE_NAME, consistency: "strong" });

	if (req.method === "GET" || req.method === "HEAD") {
		const xml = await store.get(KEY);
		if (xml === null) {
			logRequest(req, 404);
			return new Response("Feed not published yet", { status: 404 });
		}
		logRequest(req, 200);
		return new Response(req.method === "HEAD" ? null : xml, {
			headers: {
				"Content-Type": "application/rss+xml; charset=utf-8",
				// Not cached at the edge, so every fetch reaches this function
				// and is logged. The feed is small and rarely fetched.
				"Cache-Control": "no-cache",
			},
		});
	}

	if (req.method === "PUT" || req.method === "POST") {
		if (!authorised(req)) {
			return new Response("Unauthorized", { status: 401 });
		}
		const xml = await req.text();
		if (!xml.includes("<rss")) {
			return new Response("Body is not an RSS document", { status: 400 });
		}
		await store.set(KEY, xml);
		logRequest(req, 204);
		return new Response(null, { status: 204 });
	}

	return new Response("Method not allowed", {
		status: 405,
		headers: { Allow: "GET, HEAD, PUT, POST" },
	});
};

export const config = { path: "/steam-news.xml" };
