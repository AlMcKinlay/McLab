import fs from "node:fs";
import { paths } from "./lib/paths.js";

function intEnv(name, fallback) {
	const raw = process.env[name];
	if (raw === undefined || raw === "") return fallback;
	const value = Number.parseInt(raw, 10);
	if (!Number.isFinite(value) || value <= 0) {
		console.error(`ERROR: ${name} must be a positive integer, got "${raw}"`);
		process.exit(1);
	}
	return value;
}

function appIdList(raw) {
	return (raw || "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean)
		.map((s) => Number.parseInt(s, 10))
		.filter((n) => Number.isInteger(n) && n > 0);
}

export const config = {
	...paths,

	feedUrl: process.env.FEED_URL || "",
	feedPushSecret: process.env.FEED_PUSH_SECRET || "",

	extraAppIds: appIdList(process.env.STEAM_EXTRA_APP_IDS),

	telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
	telegramAdminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "",

	pollIntervalMs: intEnv("POLL_INTERVAL_MINUTES", 30) * 60 * 1000,
	maxFeedItems: intEnv("MAX_FEED_ITEMS", 500),
	maxStoredItems: intEnv("MAX_STORED_ITEMS", 1500),
	// How many existing posts to import when a game is followed for the first
	// time, so following an old game doesn't flood the feed with its history.
	newAppItemLimit: intEnv("NEW_APP_ITEM_LIMIT", 3),
	feedConcurrency: intEnv("FEED_CONCURRENCY", 5),

	// Steam refresh tokens can't be renewed for the web platform, so we warn
	// ahead of expiry instead. Warnings repeat daily until a new login is done.
	tokenExpiryWarningMs: 14 * 24 * 60 * 60 * 1000,
};

export function hasRefreshToken() {
	return fs.existsSync(config.refreshTokenFile);
}

export function readRefreshToken() {
	return fs.readFileSync(config.refreshTokenFile, "utf8").trim();
}

if (!config.feedUrl && !process.argv.includes("--no-publish")) {
	console.error("ERROR: FEED_URL environment variable is not set");
	console.error("Pass --no-publish to only write data/feed.xml locally");
	process.exit(1);
}

if (config.feedUrl && !config.feedPushSecret) {
	console.error("ERROR: FEED_PUSH_SECRET environment variable is not set");
	process.exit(1);
}

if (!hasRefreshToken() && config.extraAppIds.length === 0) {
	console.error(
		`ERROR: no Steam login found at ${config.refreshTokenFile} and STEAM_EXTRA_APP_IDS is empty`,
	);
	console.error(
		"Run `npm run login` to log in to Steam, or set STEAM_EXTRA_APP_IDS",
	);
	process.exit(1);
}
