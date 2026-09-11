import fs from "node:fs";
import { createHash } from "node:crypto";
import { config, hasRefreshToken, readRefreshToken } from "./config.js";
import { loadStore, pruneItems, saveStore, sortedItems } from "./lib/store.js";
import { AuthError, SteamAuth } from "./lib/steam-auth.js";
import {
	fetchAppFeed,
	fetchAppName,
	fetchFollowedApps,
	mapWithConcurrency,
	newsUrlFor,
	sleep,
} from "./lib/steam.js";
import { buildFeed, parseFeedItems } from "./lib/rss.js";
import { publishFeed } from "./lib/publish.js";
import { Alerter, sendTelegram } from "./lib/telegram.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const NAME_RETRY_MS = 7 * DAY_MS;
const APPDETAILS_DELAY_MS = 300;

const runOnce = process.argv.includes("--once");
const noPublish = process.argv.includes("--no-publish");

const stamp = () => `[${new Date().toISOString()}]`;
const log = (msg) => console.log(`${stamp()} ${msg}`);
const logError = (msg) => console.error(`${stamp()} ❌ ${msg}`);

process.on("unhandledRejection", (reason) =>
	logError(`Unhandled rejection: ${reason?.stack || reason}`),
);
process.on("uncaughtException", (err) =>
	logError(`Uncaught exception: ${err.stack}`),
);

const store = loadStore(config.storeFile);

const telegramEnabled = Boolean(
	config.telegramBotToken && config.telegramAdminChatId,
);
const alerter = new Alerter(
	telegramEnabled
		? (text) =>
				sendTelegram(config.telegramBotToken, config.telegramAdminChatId, text)
		: null,
	store.alerts,
);

const fallbackName = (appId) => `Steam app ${appId}`;

// The token file is re-read every poll so a fresh `npm run login` takes
// effect without restarting the service.
let auth = null;
let authToken = null;
function currentAuth() {
	if (!hasRefreshToken()) return null;
	const token = readRefreshToken();
	if (token !== authToken) {
		auth = new SteamAuth(token);
		authToken = token;
	}
	return auth;
}

async function checkTokenExpiry(steamAuth) {
	const expiry = steamAuth.expiry;
	if (!expiry) return;
	const remaining = expiry.getTime() - Date.now();
	if (remaining > config.tokenExpiryWarningMs) {
		await alerter.ok("token-expiry", "Steam login has been renewed.");
		return;
	}
	const days = Math.max(0, Math.floor(remaining / DAY_MS));
	await alerter.fail(
		"token-expiry",
		`Steam login expires in ${days} day(s), on ${expiry.toISOString().slice(0, 10)}. Run \`npm run login\` in steam-news and copy the new token to the server.`,
		{ repeatEveryMs: DAY_MS },
	);
}

async function refreshFollowedList(steamAuth) {
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const followed = await fetchFollowedApps(await steamAuth.cookieHeader());
			store.followedApps = followed;
			store.followedUpdatedAt = new Date().toISOString();
			await alerter.ok("auth", "Steam login is working again.");
			return;
		} catch (err) {
			if (err instanceof AuthError && attempt === 0) {
				// Cookies may simply have expired; mint new ones and try again.
				steamAuth.invalidate();
				continue;
			}
			if (err instanceof AuthError) {
				await alerter.fail(
					"auth",
					`Steam login failed (${err.message}). Still serving news for the last known ${store.followedApps.length} games, but new follows won't appear. Run \`npm run login\` in steam-news and copy the new token to the server.`,
				);
			} else {
				logError(`Could not fetch followed apps: ${err.message}`);
			}
			return;
		}
	}
}

async function ensureAppNames(appIds) {
	const now = Date.now();
	const pending = appIds.filter((id) => {
		const app = store.apps[id];
		if (!app) return true;
		if (app.nameKnown) return false;
		return now - Date.parse(app.nameCheckedAt || 0) > NAME_RETRY_MS;
	});
	for (const id of pending) {
		let name = null;
		try {
			name = await fetchAppName(id);
		} catch (err) {
			logError(`App name lookup stopped: ${err.message}`);
			break;
		}
		store.apps[id] = {
			...store.apps[id],
			name: name || store.apps[id]?.name || fallbackName(id),
			nameKnown: Boolean(name),
			nameCheckedAt: new Date().toISOString(),
		};
		await sleep(APPDETAILS_DELAY_MS);
	}
}

async function fetchNews(appIds) {
	let added = 0;
	let failed = 0;
	const now = new Date().toISOString();
	await mapWithConcurrency(appIds, config.feedConcurrency, async (appId) => {
		let xml;
		try {
			xml = await fetchAppFeed(appId);
		} catch (err) {
			failed++;
			logError(err.message);
			return;
		}
		const unseen = parseFeedItems(xml)
			.sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))
			.filter((item) => !store.items[item.id]);
		const firstTime = !store.apps[appId]?.newsSeenAt;
		const toAdd = firstTime ? unseen.slice(0, config.newAppItemLimit) : unseen;
		for (const item of toAdd) {
			store.items[item.id] = { ...item, appId, addedAt: now };
			added++;
		}
		store.apps[appId] = {
			name: fallbackName(appId),
			nameKnown: false,
			...store.apps[appId],
			newsSeenAt: now,
		};
	});
	return { added, failed };
}

function buildXml(appCount) {
	const items = sortedItems(store)
		.slice(0, config.maxFeedItems)
		.map((item) => ({
			...item,
			appName: store.apps[item.appId]?.name || fallbackName(item.appId),
			sourceUrl: newsUrlFor(item.appId),
		}));
	const xml = buildFeed({
		title: "Steam news for followed games",
		link: config.feedUrl || "https://store.steampowered.com/news/",
		description: `Events and announcements for ${appCount} followed Steam games`,
		items,
	});
	// The build date changes every run, so change detection hashes the item
	// list rather than the document.
	const hash = createHash("sha1")
		.update(items.map((item) => item.id).join(","))
		.digest("hex");
	return { xml, hash };
}

async function publish(xml, hash) {
	fs.mkdirSync(config.dataDir, { recursive: true });
	fs.writeFileSync(config.localFeedFile, xml);
	if (noPublish || !config.feedUrl) return false;
	if (store.publishedHash === hash) return false;
	try {
		await publishFeed(config.feedUrl, config.feedPushSecret, xml);
		store.publishedHash = hash;
		await alerter.ok("publish", "Feed publishing is working again.");
		return true;
	} catch (err) {
		await alerter.fail(
			"publish",
			`Could not publish the feed to ${config.feedUrl} (${err.message}).`,
			{ repeatEveryMs: DAY_MS },
		);
		return false;
	}
}

async function poll() {
	const started = Date.now();
	try {
		const steamAuth = currentAuth();
		if (steamAuth) {
			await checkTokenExpiry(steamAuth);
			await refreshFollowedList(steamAuth);
		}
		const appIds = [...new Set([...store.followedApps, ...config.extraAppIds])];
		await ensureAppNames(appIds);
		const { added, failed } = await fetchNews(appIds);
		pruneItems(store, config.maxStoredItems);
		const { xml, hash } = buildXml(appIds.length);
		const published = await publish(xml, hash);
		log(
			`Poll done: ${appIds.length} games, ${added} new items, ${failed} feed errors, ${Object.keys(store.items).length} stored, ${published ? "published" : "not published"} (${Date.now() - started}ms)`,
		);
	} catch (err) {
		logError(`Poll failed: ${err.stack}`);
	} finally {
		saveStore(config.storeFile, store);
	}
}

let polling = false;
async function pollGuarded() {
	if (polling) {
		log("Previous poll still running, skipping this one");
		return;
	}
	polling = true;
	try {
		await poll();
	} finally {
		polling = false;
	}
}

log(
	`Starting: ${hasRefreshToken() ? "Steam login found" : "no Steam login, manual App IDs only"}, ${config.extraAppIds.length} extra apps, Telegram alerts ${telegramEnabled ? "on" : "off"}, publishing ${noPublish || !config.feedUrl ? "off" : `to ${config.feedUrl}`}`,
);

await pollGuarded();

if (runOnce) {
	process.exit(0);
}

const timer = setInterval(pollGuarded, config.pollIntervalMs);
log(`Polling every ${config.pollIntervalMs / 60000} minutes`);

for (const signal of ["SIGINT", "SIGTERM"]) {
	process.on(signal, () => {
		log(`${signal} received, shutting down`);
		clearInterval(timer);
		process.exit(0);
	});
}
