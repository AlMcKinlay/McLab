// Steam's per-app feed only ever shows its most recent posts, so "new" has to
// mean "never recorded", not "absent from the feed we publish". Posts we
// choose not to publish are therefore still recorded, as hidden stubs, or
// they'd come back as new on the next poll.
export const STEAM_FEED_WINDOW = 10;

function stub(item, appId, now) {
	return {
		id: item.id,
		appId,
		pubDate: item.pubDate,
		addedAt: now,
		hidden: true,
	};
}

// Returns how many items were added to the published feed.
export function mergeAppItems(
	store,
	appId,
	items,
	now,
	{ newAppItemLimit, catchUp = false },
) {
	const sorted = items
		.slice()
		.sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate));
	const unseen = [];
	for (const item of sorted) {
		const existing = store.items[item.id];
		if (!existing) {
			unseen.push(item);
			continue;
		}
		// A cross-posted announcement stays under the app that saw it first,
		// but remembers every app whose feed lists it so pruning can protect it
		// for as long as any of them still does.
		if (existing.appId !== appId && !existing.alsoIn?.includes(appId)) {
			existing.alsoIn = [...(existing.alsoIn ?? []), appId];
		}
	}

	const firstTime = !store.apps[appId]?.newsSeenAt;
	const publishCount = catchUp
		? 0
		: firstTime
			? newAppItemLimit
			: unseen.length;

	unseen.forEach((item, i) => {
		store.items[item.id] =
			i < publishCount
				? { ...item, appId, addedAt: now }
				: stub(item, appId, now);
	});
	store.apps[appId] = {
		name: `Steam app ${appId}`,
		nameKnown: false,
		...store.apps[appId],
		newsSeenAt: now,
	};
	return Math.min(publishCount, unseen.length);
}
