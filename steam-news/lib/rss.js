// Steam's per-app feeds are simple RSS 2.0 with a fixed set of child tags, so
// a small hand-written extractor is enough and keeps the service free of an
// XML dependency.

const ENTITIES = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

export function decodeEntities(text) {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body) => {
		if (body[0] === "#") {
			const code =
				body[1] === "x" || body[1] === "X"
					? Number.parseInt(body.slice(2), 16)
					: Number.parseInt(body.slice(1), 10);
			return Number.isFinite(code) ? String.fromCodePoint(code) : match;
		}
		return ENTITIES[body.toLowerCase()] ?? match;
	});
}

function textOf(block, tag) {
	const match = block.match(
		new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"),
	);
	if (!match) return null;
	const inner = match[1].trim();
	// Text may mix CDATA sections and escaped text; CDATA content is literal
	// while everything else needs entity decoding.
	const literals = [];
	const escaped = inner.replace(
		/<!\[CDATA\[([\s\S]*?)\]\]>/g,
		(_, content) => `\u0000${literals.push(content) - 1}\u0000`,
	);
	return decodeEntities(escaped).replace(
		/\u0000(\d+)\u0000/g,
		(_, i) => literals[Number(i)],
	);
}

function attrsOf(block, tag) {
	const match = block.match(new RegExp(`<${tag}\\s([^>]*?)/?>`, "i"));
	if (!match) return null;
	const attrs = {};
	for (const [, name, value] of match[1].matchAll(
		/([a-zA-Z:]+)\s*=\s*"([^"]*)"/g,
	)) {
		attrs[name] = decodeEntities(value);
	}
	return attrs;
}

// Steam post URLs end in /view/<post id>. The same announcement cross-posted
// to a base game and its DLC shares that id, so it's the natural dedupe key.
export function postIdFromUrl(url) {
	const match = url?.match(/\/view\/(\d+)/);
	return match ? match[1] : null;
}

export function parseFeedItems(xml) {
	const items = [];
	for (const [, block] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
		const link = textOf(block, "link");
		const guid = textOf(block, "guid");
		const pubDateRaw = textOf(block, "pubDate");
		const pubDate = pubDateRaw ? new Date(pubDateRaw) : null;
		if (!pubDate || Number.isNaN(pubDate.getTime())) continue;
		items.push({
			id: postIdFromUrl(guid) || postIdFromUrl(link) || guid || link,
			title: textOf(block, "title") || "(untitled)",
			link: link || guid,
			description: textOf(block, "description") || "",
			pubDate: pubDate.toISOString(),
			enclosure: attrsOf(block, "enclosure"),
		});
	}
	return items;
}

export function escapeXml(text) {
	return String(text).replace(
		/[<>&"']/g,
		(c) =>
			({
				"<": "&lt;",
				">": "&gt;",
				"&": "&amp;",
				'"': "&quot;",
				"'": "&apos;",
			})[c],
	);
}

// CDATA can't contain "]]>"; split the sequence across two sections.
function cdata(text) {
	return `<![CDATA[${String(text).replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

export function buildFeed({ title, link, description, items }) {
	const lines = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
		"  <channel>",
		`    <title>${escapeXml(title)}</title>`,
		`    <link>${escapeXml(link)}</link>`,
		`    <description>${escapeXml(description)}</description>`,
		`    <atom:link href="${escapeXml(link)}" rel="self" type="application/rss+xml" />`,
		"    <language>en-us</language>",
		`    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
	];
	for (const item of items) {
		lines.push("    <item>");
		lines.push(
			`      <title>${escapeXml(`${item.appName}: ${item.title}`)}</title>`,
		);
		lines.push(`      <link>${escapeXml(item.link)}</link>`);
		lines.push(`      <guid isPermaLink="false">${escapeXml(item.id)}</guid>`);
		lines.push(
			`      <pubDate>${new Date(item.pubDate).toUTCString()}</pubDate>`,
		);
		lines.push(`      <category>${escapeXml(item.appName)}</category>`);
		lines.push(
			`      <source url="${escapeXml(item.sourceUrl)}">${escapeXml(item.appName)}</source>`,
		);
		lines.push(`      <description>${cdata(item.description)}</description>`);
		if (item.enclosure?.url) {
			lines.push(
				`      <enclosure url="${escapeXml(item.enclosure.url)}" length="${escapeXml(item.enclosure.length || "0")}" type="${escapeXml(item.enclosure.type || "image/jpeg")}" />`,
			);
		}
		lines.push("    </item>");
	}
	lines.push("  </channel>", "</rss>", "");
	return lines.join("\n");
}
