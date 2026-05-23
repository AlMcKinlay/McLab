#!/usr/bin/env node

import fs from "fs";
import { parseCSV } from "./src/utils/parser.js";
import { scrapeGame } from "./src/scraper.js";
import { formatDate } from "./src/utils/formatDate.js";

async function main() {
	const args = process.argv.slice(2);

	const debug = args.includes("--debug");
	const positional = args.filter((a) => !a.startsWith("--"));

	if (positional.length === 0) {
		console.log("Usage: node index.js <input-file> [output-file] [--debug]");
		console.log("\nSupported input formats:");
		console.log("  - CSV file with 'name' column");
		console.log(
			"  - JSON file with array or array of objects with 'name' property",
		);
		console.log("\nOptions:");
		console.log("  --debug    Include full source data in output");
		console.log("\nExamples:");
		console.log("  node index.js games.csv");
		console.log(
			"  node index.js games.csv results.json   # CSV can include existing date in col 2",
		);
		console.log("  node index.js games.csv results.json");
		console.log("  node index.js games.json results.json --debug");
		process.exit(1);
	}

	const inputFile = positional[0];
	const outputFile = positional[1] || "results.json";

	if (!fs.existsSync(inputFile)) {
		console.error(`Error: Input file not found: ${inputFile}`);
		process.exit(1);
	}

	try {
		console.log(`📂 Reading input file: ${inputFile}`);
		let gameInputs = [];

		if (inputFile.endsWith(".csv")) {
			gameInputs = await parseCSV(inputFile);
		} else if (inputFile.endsWith(".json")) {
			const content = fs.readFileSync(inputFile, "utf-8");
			const parsed = JSON.parse(content);
			if (Array.isArray(parsed)) {
				gameInputs = parsed.map((item) => {
					if (typeof item === "string") {
						return { name: item, existingDate: "" };
					}

					return {
						name: (item.name || "").toString(),
						existingDate: (item.existingDate || item.date || "").toString(),
					};
				});
			} else {
				gameInputs = [
					{
						name: (parsed.name || parsed || "").toString(),
						existingDate: (parsed.existingDate || parsed.date || "").toString(),
					},
				];
			}
		} else {
			console.error("Error: Input file must be .csv or .json");
			process.exit(1);
		}

		gameInputs = gameInputs
			.map((row) => ({
				name: (row.name || "").trim(),
				existingDate: (row.existingDate || "").trim(),
			}))
			.filter((row) => row.name);

		const beforeIgnoredFilter = gameInputs.length;
		gameInputs = gameInputs.filter(
			(row) => !isIgnoredInputExistingDate(row.existingDate),
		);
		const ignoredCount = beforeIgnoredFilter - gameInputs.length;
		if (ignoredCount > 0) {
			console.log(
				`⏭️  Ignored ${ignoredCount} game(s) with existing date \"1.0 TBA\"`,
			);
		}

		console.log(`🎮 Found ${gameInputs.length} games to search\n`);

		const results = [];

		for (let i = 0; i < gameInputs.length; i++) {
			const input = gameInputs[i];
			console.log(
				`[${i + 1}/${gameInputs.length}] Searching for: ${input.name}`,
			);

			const result = await scrapeGame(input.name);
			results.push({ ...result, existingDate: input.existingDate });

			// Add delay to avoid rate limiting
			if (i < gameInputs.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		}

		const filtered = results.filter(shouldIncludeResult);

		const output = debug
			? filtered
			: filtered.map(({ name, releaseDate, sourceUrl }) => ({
					name,
					releaseDate,
					sourceUrl: sourceUrl || null,
				}));

		console.log(`\n✅ Scraping complete. Writing results to: ${outputFile}`);
		fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

		console.log("\n📊 Summary:");
		const found = results.filter((r) => r.releaseDate).length;
		console.log(`  Found: ${found}/${results.length}`);
		console.log(`  Changed: ${filtered.length}/${results.length}`);
		const sources = [
			"steam",
			"igdb",
			"metacritic",
			"gog",
			"epicgames",
			"wikipedia",
		];
		sources.forEach((source) => {
			const count = results.filter(
				(r) => r.sources && r.sources[source],
			).length;
			if (count > 0) console.log(`    ${source}: ${count}`);
		});
	} catch (error) {
		console.error("Error:", error.message);
		process.exit(1);
	}
}

const SPECIAL_EXISTING = new Set(["tba", "1.0 tba", "abandoned?"]);
const NON_DATE_FOUND_VALUES = new Set([
	"coming soon",
	"to be announced",
	"tba",
	"to be confirmed",
	"yet to be announced",
	"release date to be announced",
]);

function shouldIncludeResult(result) {
	const foundDate = (result.releaseDate || "").trim();
	const existingDate = (result.existingDate || "").trim();

	// No new info found, never include.
	if (!foundDate) return false;

	// Non-date placeholders from sources should not be treated as useful updates.
	if (isNonDateFoundValue(foundDate)) return false;

	// For special placeholder statuses, include only when we have information.
	if (SPECIAL_EXISTING.has(existingDate.toLowerCase())) {
		return true;
	}

	// If no known date exists yet, include when we found one.
	if (!existingDate) return true;

	const foundComparable = toComparableDate(foundDate);
	const existingComparable = toComparableDate(existingDate);

	// Skip exact matches.
	if (foundComparable === existingComparable) return false;

	// Include if the new date is more detailed for the same year.
	if (isMoreDetailed(foundComparable, existingComparable)) return true;

	// Include any other meaningful difference.
	return true;
}

function toComparableDate(raw) {
	const value = (raw || "").trim();
	if (!value) return "";

	const lower = value.toLowerCase();
	if (SPECIAL_EXISTING.has(lower)) return lower;

	const formatted = formatDate(value);
	return formatted.toLowerCase();
}

function isMoreDetailed(foundComparable, existingComparable) {
	const yearOnly = /^\d{4}$/;
	const fullDate = /^[a-z]{3}\s+\d{1,2},\s+\d{4}$/;

	if (yearOnly.test(existingComparable) && fullDate.test(foundComparable)) {
		return foundComparable.endsWith(existingComparable);
	}

	return false;
}

function isIgnoredInputExistingDate(existingDate) {
	return normalizeLoose(existingDate) === "1.0 tba";
}

function isNonDateFoundValue(foundDate) {
	const normalized = normalizeLoose(foundDate);
	if (NON_DATE_FOUND_VALUES.has(normalized)) return true;

	// Catch phrasing variants like "Release date: to be announced".
	return /(to be announced|\btba\b|to be confirmed|yet to be announced)/.test(
		normalized,
	);
}

function normalizeLoose(value) {
	return (value || "")
		.toLowerCase()
		.replace(/[^a-z0-9.?\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

main();
