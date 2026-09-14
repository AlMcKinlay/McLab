export async function publishFeed(url, secret, xml) {
	const res = await fetch(url, {
		method: "PUT",
		headers: {
			Authorization: `Bearer ${secret}`,
			"Content-Type": "application/rss+xml; charset=utf-8",
		},
		body: xml,
		signal: AbortSignal.timeout(30_000),
	});
	if (!res.ok) {
		const body = (await res.text()).slice(0, 200);
		throw new Error(`publish returned HTTP ${res.status}: ${body}`);
	}
}

// Tells the WebSub hub the feed changed; the hub then fetches it and pushes
// the new content to every subscribed reader.
export async function pingHub(hub, feedUrl) {
	const res = await fetch(hub, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({ "hub.mode": "publish", "hub.url": feedUrl }),
		signal: AbortSignal.timeout(15_000),
	});
	if (!res.ok) {
		const body = (await res.text()).slice(0, 200);
		throw new Error(`hub returned HTTP ${res.status}: ${body}`);
	}
}
