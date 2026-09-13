import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeAppItems } from "../lib/merge.js";
import { pruneStore, sortedItems } from "../lib/store.js";

const NOW = "2026-09-13T10:00:00.000Z";
const post = (id, day) => ({
	id: String(id),
	title: `Post ${id}`,
	link: `https://store.steampowered.com/news/app/1/view/${id}`,
	description: "",
	pubDate: `2026-09-${String(day).padStart(2, "0")}T00:00:00.000Z`,
	enclosure: null,
});
const feed = (count) =>
	Array.from({ length: count }, (_, i) => post(i + 1, i + 1));
const emptyStore = () => ({ apps: {}, items: {} });

test("first sight of a game publishes the newest posts and hides the rest", () => {
	const store = emptyStore();
	const added = mergeAppItems(store, 1, feed(10), NOW, { newAppItemLimit: 3 });
	assert.equal(added, 3);
	assert.equal(Object.keys(store.items).length, 10);
	assert.deepEqual(
		sortedItems(store).map((i) => i.id),
		["10", "9", "8"],
	);
	assert.equal(store.items["1"].hidden, true);
	assert.equal(store.items["1"].title, undefined);
	assert.equal(store.apps[1].newsSeenAt, NOW);
});

test("the second poll only adds posts that were never recorded", () => {
	const store = emptyStore();
	mergeAppItems(store, 1, feed(10), NOW, { newAppItemLimit: 3 });
	const later = [...feed(10).slice(1), post(11, 11)];
	const added = mergeAppItems(store, 1, later, NOW, { newAppItemLimit: 3 });
	assert.equal(added, 1);
	assert.deepEqual(
		sortedItems(store).map((i) => i.id),
		["11", "10", "9", "8"],
	);
});

test("catch-up records everything as seen without publishing", () => {
	const store = emptyStore();
	mergeAppItems(store, 1, feed(5), NOW, { newAppItemLimit: 3 });
	const added = mergeAppItems(store, 1, feed(8), NOW, {
		newAppItemLimit: 3,
		catchUp: true,
	});
	assert.equal(added, 0);
	assert.deepEqual(
		sortedItems(store).map((i) => i.id),
		["5", "4", "3"],
	);
	assert.equal(store.items["8"].hidden, true);
});

test("cross-posted announcements are recorded once, under the first app", () => {
	const store = emptyStore();
	mergeAppItems(store, 1, feed(2), NOW, { newAppItemLimit: 3 });
	const added = mergeAppItems(store, 2, feed(2), NOW, { newAppItemLimit: 3 });
	assert.equal(added, 0);
	assert.equal(store.items["2"].appId, 1);
});

test("pruning protects each followed game's newest posts, however old", () => {
	const store = emptyStore();
	// A quiet game whose posts are all years old...
	const old = feed(10).map((p) => ({
		...p,
		id: `q${p.id}`,
		pubDate: p.pubDate.replace("2026", "2019"),
	}));
	mergeAppItems(store, 1, old, NOW, { newAppItemLimit: 3 });
	// ...and an active game with many recent posts.
	mergeAppItems(store, 2, feed(10), NOW, { newAppItemLimit: 3 });
	pruneStore(store, { keepPerApp: 20, apps: new Set([1, 2]) });
	assert.equal(Object.keys(store.items).length, 20);
	assert.ok(store.items.q1, "quiet game's oldest post survives");
});

test("pruning keeps each game's newest posts and nothing older", () => {
	const store = emptyStore();
	mergeAppItems(store, 1, feed(10), NOW, { newAppItemLimit: 3 });
	pruneStore(store, { keepPerApp: 4, apps: new Set([1]) });
	assert.deepEqual(
		Object.keys(store.items).sort((a, b) => Number(b) - Number(a)),
		["10", "9", "8", "7"],
	);
});

test("cross-posts are protected while any listing app is followed", () => {
	const store = emptyStore();
	// Base game posts 25 times; the first post was also cross-posted to a DLC.
	mergeAppItems(store, 1, feed(1), NOW, { newAppItemLimit: 3 });
	mergeAppItems(store, 2, feed(1), NOW, { newAppItemLimit: 3 });
	mergeAppItems(
		store,
		1,
		Array.from({ length: 24 }, (_, i) => post(i + 2, i + 2)),
		NOW,
		{ newAppItemLimit: 3 },
	);
	assert.deepEqual(store.items["1"].alsoIn, [2]);
	pruneStore(store, { keepPerApp: 20, apps: new Set([1, 2]) });
	assert.ok(store.items["1"], "still listed by the DLC feed");
	assert.equal(store.items["2"], undefined, "outside every window");
});

test("unfollowing drops a game entirely, so re-following is a first sight", () => {
	const store = emptyStore();
	mergeAppItems(store, 1, feed(10), NOW, { newAppItemLimit: 3 });
	pruneStore(store, { keepPerApp: 20, apps: new Set() });
	assert.deepEqual(store.items, {});
	assert.deepEqual(store.apps, {});
	const added = mergeAppItems(store, 1, feed(10), NOW, { newAppItemLimit: 3 });
	assert.equal(added, 3);
});
