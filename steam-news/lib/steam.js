import { AuthError } from "./steam-auth.js";

const USER_AGENT =
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const STORE = "https://store.steampowered.com";
const REQUEST_TIMEOUT_MS = 20_000;

async function get(url, headers = {}) {
	return fetch(url, {
		headers: { "User-Agent": USER_AGENT, ...headers },
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
}

export function feedUrlFor(appId) {
	return `${STORE}/feeds/news/app/${appId}`;
}

export function newsUrlFor(appId) {
	return `${STORE}/news/app/${appId}/`;
}

// The userdata endpoint never errors for a logged-out session; it just returns
// empty arrays. A real account owns at least one app, so "owns nothing and
// follows nothing" is the tell that the cookies weren't accepted.
export async function fetchFollowedApps(cookieHeader) {
	const res = await get(`${STORE}/dynamicstore/userdata/?t=${Date.now()}`, {
		Cookie: cookieHeader,
		Accept: "application/json",
	});
	if (!res.ok) {
		throw new Error(`userdata returned HTTP ${res.status}`);
	}
	const data = await res.json();
	const followed = data.rgFollowedApps;
	if (!Array.isArray(followed)) {
		throw new Error("userdata response has no rgFollowedApps array");
	}
	const owned = Array.isArray(data.rgOwnedApps) ? data.rgOwnedApps : [];
	if (followed.length === 0 && owned.length === 0) {
		throw new AuthError("Steam treated the request as logged out");
	}
	return followed.filter((id) => Number.isInteger(id) && id > 0);
}

// Returns null when Steam doesn't know the app; callers keep a placeholder so
// the lookup isn't retried every poll.
export async function fetchAppName(appId) {
	const res = await get(
		`${STORE}/api/appdetails?appids=${appId}&filters=basic`,
	);
	if (res.status === 429) {
		throw new Error("appdetails rate limited");
	}
	if (!res.ok) return null;
	const data = await res.json();
	const entry = data?.[String(appId)];
	return entry?.success && entry.data?.name ? entry.data.name : null;
}

export async function fetchAppFeed(appId) {
	const res = await get(feedUrlFor(appId));
	if (!res.ok) {
		throw new Error(`feed for app ${appId} returned HTTP ${res.status}`);
	}
	const xml = await res.text();
	if (!xml.includes("<rss")) {
		throw new Error(`feed for app ${appId} was not RSS`);
	}
	return xml;
}

export async function mapWithConcurrency(items, limit, fn) {
	const results = new Array(items.length);
	let next = 0;
	async function worker() {
		while (next < items.length) {
			const i = next++;
			results[i] = await fn(items[i], i);
		}
	}
	const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
	await Promise.all(workers);
	return results;
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
