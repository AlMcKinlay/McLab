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

export function sortedItems(store, { includeHidden = false } = {}) {
	return Object.values(store.items)
		.filter((item) => includeHidden || !item.hidden)
		.sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate));
}

// Forgetting a post Steam still lists would make it look new again on the
// next poll, so each followed app's newest posts are kept however old they
// are. Nothing else needs keeping: readers hold their own copies of what
// they've fetched. Unfollowed apps are dropped entirely, so re-following one
// later counts as a first sight again.
export function pruneStore(store, { keepPerApp, apps }) {
	const counts = new Map();
	const kept = {};
	for (const item of sortedItems(store, { includeHidden: true })) {
		for (const app of [item.appId, ...(item.alsoIn ?? [])]) {
			if (!apps.has(app)) continue;
			const seen = counts.get(app) ?? 0;
			if (seen >= keepPerApp) continue;
			counts.set(app, seen + 1);
			kept[item.id] = item;
		}
	}
	store.items = kept;
	store.apps = Object.fromEntries(
		Object.entries(store.apps).filter(([id]) => apps.has(Number(id))),
	);
}
