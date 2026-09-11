import fs from "node:fs";
import path from "node:path";

// Everything the service remembers between polls lives in one JSON file:
// the last known followed list (so the feed keeps working when Steam auth
// breaks), cached game names, every news item seen, and alert state.
const EMPTY = {
	followedApps: [],
	followedUpdatedAt: null,
	apps: {},
	items: {},
	alerts: {},
};

export function loadStore(file) {
	if (!fs.existsSync(file)) return structuredClone(EMPTY);
	const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
	return { ...structuredClone(EMPTY), ...parsed };
}

export function saveStore(file, store) {
	fs.mkdirSync(path.dirname(file), { recursive: true });
	// Write-then-rename so a crash mid-write can't leave a truncated store.
	const tmp = `${file}.tmp`;
	fs.writeFileSync(tmp, JSON.stringify(store));
	fs.renameSync(tmp, file);
}

export function sortedItems(store) {
	return Object.values(store.items).sort(
		(a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate),
	);
}

export function pruneItems(store, max) {
	const keep = sortedItems(store).slice(0, max);
	store.items = Object.fromEntries(keep.map((item) => [item.id, item]));
}
