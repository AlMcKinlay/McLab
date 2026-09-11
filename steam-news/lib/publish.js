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
