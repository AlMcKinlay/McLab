import { scrapeStream } from "./sources/steam.js";
import { scrapeIGDB } from "./sources/igdb.js";
import { formatDate } from "./utils/formatDate.js";
import { scrapeMetacritic } from "./sources/metacritic.js";
import { scrapeGOG } from "./sources/gog.js";
import { scrapeEpicGames } from "./sources/epicgames.js";
import { scrapeWikipedia } from "./sources/wikipedia.js";

const TITLE_SIMILARITY_THRESHOLD = 0.68;

export async function scrapeGame(gameName) {
	const result = {
		name: gameName,
		releaseDate: null,
		sources: {},
		allMatches: [],
	};

	// Scrape all sources in parallel with timeout
	const scrapers = [
		scrapeWithTimeout("steam", scrapeStream(gameName), 5000),
		scrapeWithTimeout("igdb", scrapeIGDB(gameName), 5000),
		scrapeWithTimeout("metacritic", scrapeMetacritic(gameName), 5000),
		scrapeWithTimeout("gog", scrapeGOG(gameName), 5000),
		scrapeWithTimeout("epicgames", scrapeEpicGames(gameName), 5000),
		scrapeWithTimeout("wikipedia", scrapeWikipedia(gameName), 5000),
	];

	const scrapedResults = await Promise.allSettled(scrapers);

	// Process results
	for (const scrapedResult of scrapedResults) {
		if (
			scrapedResult.status === "fulfilled" &&
			scrapedResult.value &&
			scrapedResult.value.source
		) {
			const { source, date, url, match } = scrapedResult.value;

			const confidence = similarityScore(gameName, match || gameName);
			if (!isAcceptableMatch(gameName, match || gameName, confidence)) {
				continue;
			}

			result.sources[source] = { date, url, match, confidence };

			if (date) {
				result.allMatches.push({ source, date, url, match, confidence });
			}
		}
	}

	// Use the most recent/complete date found
	if (result.allMatches.length > 0) {
		result.allMatches.sort((a, b) => {
			const aDate = new Date(a.date);
			const bDate = new Date(b.date);
			return aDate - bDate;
		});
		result.releaseDate = formatDate(result.allMatches[0].date);
		result.primarySource = result.allMatches[0].source;
		result.sourceUrl = result.allMatches[0].url;
	}

	return result;
}

function scrapeWithTimeout(source, promise, timeoutMs) {
	return Promise.race([
		promise,
		new Promise((_, reject) =>
			setTimeout(() => reject(new Error(`${source} timeout`)), timeoutMs),
		),
	]).catch((error) => {
		console.log(`    ⚠️  ${source} failed: ${error.message}`);
		return null;
	});
}

function isAcceptableMatch(inputName, matchedName, confidence) {
	if (!matchedName || !matchedName.trim()) return true;

	const input = normalize(inputName);
	const matched = normalize(matchedName);

	if (!input || !matched) return false;
	if (input === matched) return true;
	if (matched.includes(input) || input.includes(matched)) return true;

	const inputTokens = tokenSet(input);
	const matchedTokens = tokenSet(matched);
	const overlap = tokenOverlap(inputTokens, matchedTokens);

	// Accept high overlap and decent fuzzy similarity.
	if (overlap >= 0.75 && confidence >= 0.55) return true;

	return confidence >= TITLE_SIMILARITY_THRESHOLD;
}

function similarityScore(a, b) {
	const aNorm = normalize(a);
	const bNorm = normalize(b);

	if (!aNorm || !bNorm) return 0;
	if (aNorm === bNorm) return 1;

	const aBigrams = bigrams(aNorm);
	const bBigrams = bigrams(bNorm);

	if (aBigrams.length === 0 || bBigrams.length === 0) return 0;

	let intersection = 0;
	const bCounts = new Map();
	for (const bg of bBigrams) {
		bCounts.set(bg, (bCounts.get(bg) || 0) + 1);
	}

	for (const bg of aBigrams) {
		const count = bCounts.get(bg) || 0;
		if (count > 0) {
			intersection += 1;
			bCounts.set(bg, count - 1);
		}
	}

	return (2 * intersection) / (aBigrams.length + bBigrams.length);
}

function normalize(value) {
	return (value || "")
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(
			/\b(the|a|an|game|edition|definitive|ultimate|remastered|version)\b/g,
			" ",
		)
		.replace(/\s+/g, " ")
		.trim();
}

function tokenSet(value) {
	return new Set(value.split(" ").filter(Boolean));
}

function tokenOverlap(aSet, bSet) {
	if (aSet.size === 0 || bSet.size === 0) return 0;

	let intersection = 0;
	for (const token of aSet) {
		if (bSet.has(token)) intersection += 1;
	}

	return intersection / Math.max(aSet.size, bSet.size);
}

function bigrams(value) {
	const padded = ` ${value} `;
	const grams = [];
	for (let i = 0; i < padded.length - 1; i++) {
		grams.push(padded.slice(i, i + 2));
	}
	return grams;
}
