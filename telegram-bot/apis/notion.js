import { Client } from "@notionhq/client";

const PAGE_ID = "2e40a3f50f2380d9bc25cd131c02bcd5";
const COLOR_EXPR = {
	good: "\\color{2E6F40}\\rule{10px}{10px}",
	ok: "\\color{FF8C00}\\rule{10px}{10px}",
	bad: "\\color{9B111E}\\rule{10px}{10px}",
};
const EXPRESSION_TO_RATING = Object.entries(COLOR_EXPR).reduce(
	(acc, [rating, expression]) => {
		acc[expression] = rating;
		return acc;
	},
	{},
);

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

function getDateIdentifiers(date) {
	return {
		dayNum: String(date.getDate()),
		monthName: date.toLocaleString("en-US", { month: "long" }).toLowerCase(),
	};
}

function getMonthContext(date = new Date()) {
	return {
		monthName: date.toLocaleString("en-US", { month: "long" }).toLowerCase(),
		monthLabel: date.toLocaleString("en-US", {
			month: "long",
			year: "numeric",
		}),
		monthIndex: date.getMonth(),
		year: date.getFullYear(),
		daysInMonth: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
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

async function buildTablesWithRows(notion) {
	const tables = await withTimeout(
		listTablesIncludingSynced(notion, PAGE_ID),
		8000,
		"listTablesIncludingSynced",
	);

	const tablesWithRows = [];
	for (const table of tables) {
		const rows = await withTimeout(
			fetchTableRows(notion, table.id),
			5000,
			"fetchTableRows",
		);
		if (rows.length > 0) {
			tablesWithRows.push({ table, rows });
		}
	}

	return tablesWithRows;
}

function findMonthRow(rows, monthName) {
	return rows.find((row, idx) => {
		if (idx === 0) return false;
		const firstCellText = row.table_row.cells[0][0]?.plain_text
			?.trim()
			.toLowerCase();
		return firstCellText === monthName;
	});
}

function buildDayColumnMap(headerCells) {
	const map = new Map();
	for (let i = 0; i < headerCells.length; i++) {
		const text = headerCells[i][0]?.plain_text?.trim();
		if (!text) continue;
		const dayNum = Number(text);
		if (Number.isInteger(dayNum) && dayNum > 0) {
			map.set(dayNum, i);
		}
	}
	return map;
}

function getCellExpression(monthRow, dayCol) {
	if (!monthRow || dayCol == null) return null;
	const cell = monthRow.table_row.cells[dayCol];
	return cell && cell.length > 0 ? cell[0]?.equation?.expression || null : null;
}

function findExpressionForDate(tablesWithRows, dayNum, monthName) {
	for (const { rows } of tablesWithRows) {
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

		const cell = monthRow.table_row.cells[dayCol];
		return cell && cell.length > 0
			? cell[0]?.equation?.expression || null
			: null;
	}

	return null;
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

export async function getLastNDaysStatuses(days = 7) {
	if (!Number.isInteger(days) || days < 1) {
		throw new Error("Days must be a positive integer");
	}

	const notion = new Client({ auth: process.env.NOTION_TOKEN });

	try {
		const tablesWithRows = await buildTablesWithRows(notion);
		if (tablesWithRows.length === 0) return [];

		const results = [];
		const today = new Date();

		for (let i = 0; i < days; i++) {
			const date = new Date(today);
			date.setDate(today.getDate() - i);
			const { dayNum, monthName } = getDateIdentifiers(date);
			const expression = findExpressionForDate(
				tablesWithRows,
				dayNum,
				monthName,
			);
			const rating = expression
				? EXPRESSION_TO_RATING[expression] || "unknown"
				: null;

			results.push({
				date: date.toISOString(),
				rating,
				expression,
			});
		}

		return results.reverse();
	} catch (error) {
		console.error(
			`[${new Date().toISOString()}] ✗ getLastNDaysStatuses error: ${
				error.message
			}`,
		);
		throw error;
	}
}

export async function getMonthStatuses(date = new Date()) {
	const notion = new Client({ auth: process.env.NOTION_TOKEN });
	const { monthName, monthLabel, monthIndex, year, daysInMonth } =
		getMonthContext(date);

	try {
		const tablesWithRows = await buildTablesWithRows(notion);
		if (tablesWithRows.length === 0) return null;

		let monthRow = null;
		let dayColumnMap = null;

		for (const { rows } of tablesWithRows) {
			const headerCells = rows[0]?.table_row?.cells;
			if (!headerCells || headerCells.length === 0) continue;
			const candidateMonthRow = findMonthRow(rows, monthName);
			if (!candidateMonthRow) continue;

			monthRow = candidateMonthRow;
			dayColumnMap = buildDayColumnMap(headerCells);
			break;
		}

		if (!monthRow || !dayColumnMap) return null;

		const statuses = [];
		for (let day = 1; day <= daysInMonth; day++) {
			const dayCol = dayColumnMap.get(day);
			const expression = getCellExpression(monthRow, dayCol);
			const rating = expression
				? EXPRESSION_TO_RATING[expression] || "unknown"
				: null;
			statuses.push({ day, rating, expression });
		}

		return {
			monthName,
			monthLabel,
			monthIndex,
			year,
			daysInMonth,
			statuses,
		};
	} catch (error) {
		console.error(
			`[${new Date().toISOString()}] ✗ getMonthStatuses error: ${
				error.message
			}`,
		);
		throw error;
	}
}
