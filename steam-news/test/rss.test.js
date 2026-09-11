import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import {
	buildFeed,
	decodeEntities,
	parseFeedItems,
	postIdFromUrl,
} from "../lib/rss.js";

const fixture = fs.readFileSync(
	new URL("./fixtures/feed.xml", import.meta.url),
	"utf8",
);

test("parses items, skipping ones without a usable pubDate", () => {
	const items = parseFeedItems(fixture);
	assert.equal(items.length, 2);
	const [first, second] = items;
	assert.equal(first.id, "516361985249509911");
	assert.equal(first.title, 'Patch 1.6.15 & "hotfix" — notes');
	assert.equal(
		first.description,
		'<p class="bb_paragraph">Fixes &amp; tweaks.</p>',
	);
	assert.equal(
		first.link,
		"https://store.steampowered.com/news/app/413150/view/516361985249509911",
	);
	assert.equal(first.pubDate, "2026-02-26T23:40:00.000Z");
	assert.deepEqual(first.enclosure, {
		url: "https://clan.fastly.steamstatic.com/images/11170746/80df16c8.png",
		length: "0",
		type: "image/png",
	});
	assert.equal(second.enclosure, null);
	assert.equal(second.description, "<p>Contains a ]]> sequence</p>");
});

test("post id is shared by cross-posted announcements", () => {
	assert.equal(
		postIdFromUrl(
			"https://store.steampowered.com/news/app/440820/view/516361985249509911",
		),
		postIdFromUrl(
			"https://store.steampowered.com/news/app/413150/view/516361985249509911",
		),
	);
	assert.equal(postIdFromUrl("https://example.com/"), null);
	assert.equal(postIdFromUrl(null), null);
});

test("decodes named, decimal and hex entities", () => {
	assert.equal(
		decodeEntities("a &lt;b&gt; &amp; &#65;&#x42; &unknown;"),
		"a <b> & AB &unknown;",
	);
});

test("builds a feed with escaped text and safe CDATA", () => {
	const items = parseFeedItems(fixture).map((item) => ({
		...item,
		appName: "Stardew <Valley>",
		sourceUrl: "https://store.steampowered.com/news/app/413150/",
	}));
	const xml = buildFeed({
		title: "Test & feed",
		link: "https://example.com/feed.xml",
		description: "desc",
		items,
	});
	assert.match(xml, /<title>Test &amp; feed<\/title>/);
	assert.match(
		xml,
		/<title>Stardew &lt;Valley&gt;: Patch 1.6.15 &amp; &quot;hotfix&quot; — notes<\/title>/,
	);
	assert.match(xml, /<guid isPermaLink="false">516361985249509911<\/guid>/);
	assert.match(xml, /<pubDate>Thu, 26 Feb 2026 23:40:00 GMT<\/pubDate>/);
	assert.match(
		xml,
		/<enclosure url="https:\/\/clan.fastly.steamstatic.com\/images\/11170746\/80df16c8.png" length="0" type="image\/png" \/>/,
	);
	assert.match(
		xml,
		/<!\[CDATA\[<p>Contains a \]\]\]\]><!\[CDATA\[> sequence<\/p>\]\]>/,
	);
	assert.equal((xml.match(/<item>/g) || []).length, 2);
	// Round-trips through the same parser as a sanity check on well-formedness.
	const reparsed = parseFeedItems(xml);
	assert.equal(reparsed.length, 2);
	assert.equal(reparsed[1].description, "<p>Contains a ]]> sequence</p>");
});
