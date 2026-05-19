import fs from "fs";
import { parse } from "csv-parse/sync";

export async function parseCSV(filePath) {
	try {
		const content = fs.readFileSync(filePath, "utf-8");
		const lines = content
			.split("\n")
			.map((l) => l.trim())
			.filter(Boolean);

		// Detect common header rows like: name,date or game,existingDate.
		const firstCells = (lines[0] || "")
			.split(",")
			.map((cell) => cell.trim().toLowerCase());
		const hasHeader = firstCells.some((cell) =>
			[
				"name",
				"game",
				"title",
				"existingdate",
				"date",
				"currentdate",
				"knowndate",
			].includes(cell),
		);

		const records = parse(content, {
			columns: hasHeader,
			skip_empty_lines: true,
		});

		if (hasHeader) {
			return records
				.map((record) => {
					const firstKey = Object.keys(record)[0];
					const secondKey = Object.keys(record)[1];
					return {
						name: (record.name || record.game || record[firstKey] || "").trim(),
						existingDate: (
							record.existingDate ||
							record.date ||
							record.currentDate ||
							record[secondKey] ||
							""
						)
							.toString()
							.trim(),
					};
				})
				.filter((row) => row.name);
		}

		// No header: treat column 1 as game name and column 2 as existing date (optional)
		return records
			.map((row) => {
				if (Array.isArray(row)) {
					return {
						name: (row[0] || "").toString().trim(),
						existingDate: (row[1] || "").toString().trim(),
					};
				}

				return {
					name: (row || "").toString().trim(),
					existingDate: "",
				};
			})
			.filter((row) => row.name);
	} catch (error) {
		throw new Error(`Failed to parse CSV: ${error.message}`);
	}
}
