import { Client } from "@notionhq/client";
import { config } from "../config.js";

// Property names in the Nathan Tracker database. The title holds the ISO date
// so rows read sensibly in Notion; "Day" is the real date property used for
// every filter so we never have to parse titles.
const PROPS = {
	title: "Date",
	day: "Day",
	status: "Status",
	setBy: "Set by",
};

const RATING_TO_OPTION = { good: "Good", ok: "OK", bad: "Bad" };

const REQUEST_TIMEOUT_MS = 10000;

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

function getClient() {
	return new Client({ auth: config.notionToken });
}

// Local-time YYYY-MM-DD. toISOString() would shift to UTC and flip the day
// around midnight, which is exactly when the 9pm prompt logic runs.
export function toDateKey(date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function optionToRating(optionName) {
	if (!optionName) return null;
	const match = Object.entries(RATING_TO_OPTION).find(
		([, name]) => name.toLowerCase() === optionName.toLowerCase(),
	);
	return match ? match[0] : "unknown";
}

function pageToEntry(page) {
	const dateKey = page.properties[PROPS.day]?.date?.start ?? null;
	const optionName = page.properties[PROPS.status]?.select?.name ?? null;
	return {
		pageId: page.id,
		dateKey,
		optionName,
		rating: optionToRating(optionName),
		lastEdited: page.last_edited_time,
	};
}

// Returns a Map of dateKey -> entry for every row whose Day falls in the
// inclusive range. If a date somehow has two rows, the most recently edited
// one wins so a stray duplicate can't hide a real update.
async function queryRange(notion, fromKey, toKey) {
	const entries = new Map();
	let cursor;
	do {
		const response = await notion.dataSources.query({
			data_source_id: config.trackerDataSourceId,
			filter: {
				and: [
					{ property: PROPS.day, date: { on_or_after: fromKey } },
					{ property: PROPS.day, date: { on_or_before: toKey } },
				],
			},
			sorts: [{ property: PROPS.day, direction: "ascending" }],
			page_size: 100,
			start_cursor: cursor,
		});

		for (const page of response.results) {
			const entry = pageToEntry(page);
			if (!entry.dateKey) continue;
			const existing = entries.get(entry.dateKey);
			if (!existing || existing.lastEdited < entry.lastEdited) {
				entries.set(entry.dateKey, entry);
			}
		}

		cursor = response.has_more ? response.next_cursor : undefined;
	} while (cursor);

	return entries;
}

async function findEntry(notion, dateKey) {
	const entries = await queryRange(notion, dateKey, dateKey);
	return entries.get(dateKey) ?? null;
}

function buildProperties({ dateKey, rating, userName }) {
	return {
		[PROPS.title]: { title: [{ text: { content: dateKey } }] },
		[PROPS.day]: { date: { start: dateKey } },
		[PROPS.status]: { select: { name: RATING_TO_OPTION[rating] } },
		[PROPS.setBy]: {
			rich_text: userName ? [{ text: { content: userName } }] : [],
		},
	};
}

export async function updateNathanSheet(rating, userName = null) {
	if (!RATING_TO_OPTION[rating]) {
		throw new Error("Invalid rating. Must be: good, ok, or bad");
	}

	const notion = getClient();
	const dateKey = toDateKey(new Date());

	try {
		const existing = await withTimeout(
			findEntry(notion, dateKey),
			REQUEST_TIMEOUT_MS,
			"findEntry",
		);

		const properties = buildProperties({ dateKey, rating, userName });

		if (existing) {
			await withTimeout(
				notion.pages.update({ page_id: existing.pageId, properties }),
				REQUEST_TIMEOUT_MS,
				"pages.update",
			);
		} else {
			await withTimeout(
				notion.pages.create({
					parent: {
						type: "data_source_id",
						data_source_id: config.trackerDataSourceId,
					},
					properties,
				}),
				REQUEST_TIMEOUT_MS,
				"pages.create",
			);
		}

		return { success: true, rating, date: dateKey };
	} catch (error) {
		console.error(
			`[${new Date().toISOString()}] ✗ updateNathanSheet error: ${error.message}`,
		);
		throw error;
	}
}

export async function checkTodayFilled() {
	const notion = getClient();
	const dateKey = toDateKey(new Date());

	try {
		const entry = await withTimeout(
			findEntry(notion, dateKey),
			REQUEST_TIMEOUT_MS,
			"findEntry",
		);
		const filled = !!entry?.optionName;
		return { filled, currentRating: filled ? entry.rating : null };
	} catch (error) {
		console.error(
			`[${new Date().toISOString()}] ✗ checkTodayFilled error: ${error.message}`,
		);
		// Treat a timeout as "not filled" so the caller can prompt and retry
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

	const notion = getClient();
	const today = new Date();
	const start = new Date(today);
	start.setDate(today.getDate() - (days - 1));

	try {
		const entries = await withTimeout(
			queryRange(notion, toDateKey(start), toDateKey(today)),
			REQUEST_TIMEOUT_MS,
			"queryRange",
		);

		const results = [];
		for (let i = 0; i < days; i++) {
			const date = new Date(start);
			date.setDate(start.getDate() + i);
			const entry = entries.get(toDateKey(date));
			results.push({ date: date.toISOString(), rating: entry?.rating ?? null });
		}
		return results;
	} catch (error) {
		console.error(
			`[${new Date().toISOString()}] ✗ getLastNDaysStatuses error: ${error.message}`,
		);
		throw error;
	}
}

export async function getMonthStatuses(date = new Date()) {
	const notion = getClient();
	const year = date.getFullYear();
	const monthIndex = date.getMonth();
	const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
	const monthLabel = date.toLocaleString("en-US", {
		month: "long",
		year: "numeric",
	});

	try {
		const entries = await withTimeout(
			queryRange(
				notion,
				toDateKey(new Date(year, monthIndex, 1)),
				toDateKey(new Date(year, monthIndex, daysInMonth)),
			),
			REQUEST_TIMEOUT_MS,
			"queryRange",
		);

		const statuses = [];
		for (let day = 1; day <= daysInMonth; day++) {
			const entry = entries.get(toDateKey(new Date(year, monthIndex, day)));
			statuses.push({ day, rating: entry?.rating ?? null });
		}

		return { monthLabel, monthIndex, year, daysInMonth, statuses };
	} catch (error) {
		console.error(
			`[${new Date().toISOString()}] ✗ getMonthStatuses error: ${error.message}`,
		);
		throw error;
	}
}

const MONTH_NAMES = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
];

// Whole-year view for the Home Assistant grid. Days after today in the
// current year are marked "future" so the card can leave them blank rather
// than showing them as missing.
export async function getYearStatuses(year) {
	const notion = getClient();
	const todayKey = toDateKey(new Date());

	try {
		const entries = await withTimeout(
			queryRange(notion, `${year}-01-01`, `${year}-12-31`),
			REQUEST_TIMEOUT_MS,
			"queryRange",
		);

		const counts = { good: 0, ok: 0, bad: 0 };
		const months = MONTH_NAMES.map((name, monthIndex) => {
			const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
			const days = [];
			for (let day = 1; day <= daysInMonth; day++) {
				const key = toDateKey(new Date(year, monthIndex, day));
				if (key > todayKey) {
					days.push("future");
					continue;
				}
				const rating = entries.get(key)?.rating ?? null;
				if (rating in counts) counts[rating]++;
				days.push(rating);
			}
			return { name, days };
		});

		return { year, months, counts, tracked: entries.size };
	} catch (error) {
		console.error(
			`[${new Date().toISOString()}] ✗ getYearStatuses error: ${error.message}`,
		);
		throw error;
	}
}

export async function getFirstTrackedYear() {
	const notion = getClient();
	try {
		const response = await withTimeout(
			notion.dataSources.query({
				data_source_id: config.trackerDataSourceId,
				sorts: [{ property: PROPS.day, direction: "ascending" }],
				page_size: 1,
			}),
			REQUEST_TIMEOUT_MS,
			"dataSources.query",
		);
		const first = response.results[0]?.properties[PROPS.day]?.date?.start;
		return first ? Number(first.slice(0, 4)) : new Date().getFullYear();
	} catch (error) {
		console.error(
			`[${new Date().toISOString()}] ✗ getFirstTrackedYear error: ${error.message}`,
		);
		throw error;
	}
}
