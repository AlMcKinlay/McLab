import { Client } from "@notionhq/client";

const PAGE_ID = "2e40a3f50f2380d9bc25cd131c02bcd5";
const COLOR_EXPR = {
	good: "\\color{2E6F40}\\rule{10px}{10px}",
	ok: "\\color{FF8C00}\\rule{10px}{10px}",
	bad: "\\color{9B111E}\\rule{10px}{10px}",
};

// Timeout helper for Notion API calls
function withTimeout(promise, ms, operationName) {
	return Promise.race([
		promise,
		new Promise((_, reject) =>
			setTimeout(
				() => reject(new Error(`${operationName} timed out after ${ms}ms`)),
				ms,
			),
		),
	]);
}

function getTodayIdentifiers() {
	const today = new Date();
	return {
		dayNum: String(today.getDate()),
		monthName: today.toLocaleString("en-US", { month: "long" }).toLowerCase(),
	};
}

async function listTablesIncludingSynced(notion, rootId) {
	const tables = [];
	const pageChildren = await notion.blocks.children.list({
		block_id: rootId,
		page_size: 100,
	});

	for (const block of pageChildren.results) {
		if (block.type === "table") tables.push(block);
		if (block.type === "synced_block") {
			const targetId = block.synced_block.synced_from?.block_id ?? block.id;
			const childList = await notion.blocks.children.list({
				block_id: targetId,
				page_size: 200,
			});
			for (const child of childList.results) {
				if (child.type === "table") tables.push(child);
			}
		}
	}

	return tables;
}

async function fetchTableRows(notion, tableId) {
	const rowsResp = await notion.blocks.children.list({
		block_id: tableId,
		page_size: 200,
	});
	return rowsResp.results.filter((r) => r.type === "table_row");
}

async function selectTrackerTable(notion, tables, dayNum, monthName) {
	for (const table of tables) {
		const rows = await fetchTableRows(notion, table.id);
		if (rows.length === 0) continue;

		const header = rows[0].table_row.cells;
		const dayCol = header.findIndex(
			(cell) => cell[0]?.plain_text?.trim() === dayNum,
		);
		if (dayCol === -1) continue;

		const monthRow = rows.find((row, idx) => {
			if (idx === 0) return false;
			const firstCellText = row.table_row.cells[0][0]?.plain_text
				?.trim()
				.toLowerCase();
			return firstCellText === monthName;
		});
		if (!monthRow) continue;

		return { table, rows, dayCol, monthRow };
	}

	return null;
}

function buildUpdatedCells(monthRow, dayCol, expression) {
	return monthRow.table_row.cells.map((cell, idx) => {
		if (idx !== dayCol) return cell;
		return [
			{
				type: "equation",
				equation: { expression },
			},
		];
	});
}

async function writeRow(notion, rowId, cells) {
	await notion.blocks.update({
		block_id: rowId,
		table_row: { cells },
	});
}

export async function updateNathanSheet(rating) {
	if (!COLOR_EXPR[rating]) {
		throw new Error("Invalid rating. Must be: good, ok, or bad");
	}

	const notion = new Client({ auth: process.env.NOTION_TOKEN });
	const { dayNum, monthName } = getTodayIdentifiers();

	try {
		const tables = await withTimeout(
			listTablesIncludingSynced(notion, PAGE_ID),
			8000,
			"listTablesIncludingSynced",
		);
		if (tables.length === 0)
			throw new Error("No table blocks found on the page");

		const selection = await withTimeout(
			selectTrackerTable(notion, tables, dayNum, monthName),
			5000,
			"selectTrackerTable",
		);
		if (!selection) {
			throw new Error(
				"No table found that matches current month and day; ensure header has day numbers and first column has month names",
			);
		}

		const updatedCells = buildUpdatedCells(
			selection.monthRow,
			selection.dayCol,
			COLOR_EXPR[rating],
		);

		await withTimeout(
			writeRow(notion, selection.monthRow.id, updatedCells),
			5000,
			"writeRow",
		);

		return { success: true, rating, date: `${monthName} day ${dayNum}` };
	} catch (error) {
		console.error(
			`[${new Date().toISOString()}] ✗ updateNathanSheet error: ${
				error.message
			}`,
		);
		throw error;
	}
}

export async function checkTodayFilled() {
	const notion = new Client({ auth: process.env.NOTION_TOKEN });
	const { dayNum, monthName } = getTodayIdentifiers();

	try {
		const tables = await withTimeout(
			listTablesIncludingSynced(notion, PAGE_ID),
			8000,
			"listTablesIncludingSynced",
		);
		if (tables.length === 0) return { filled: false };

		const selection = await withTimeout(
			selectTrackerTable(notion, tables, dayNum, monthName),
			5000,
			"selectTrackerTable",
		);
		if (!selection) return { filled: false };

		const cell = selection.monthRow.table_row.cells[selection.dayCol];
		const hasContent = cell && cell.length > 0 && cell[0]?.equation?.expression;

		return {
			filled: !!hasContent,
			currentRating: hasContent ? cell[0].equation.expression : null,
		};
	} catch (error) {
		console.error(
			`[${new Date().toISOString()}] ✗ checkTodayFilled error: ${error.message}`,
		);
		// Return false (not filled) on timeout to allow retry
		if (error.message.includes("timed out")) {
			return { filled: false, error: "Timeout checking status" };
		}
		throw error;
	}
}
