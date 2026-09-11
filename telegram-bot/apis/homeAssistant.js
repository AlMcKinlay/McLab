import { config } from "../config.js";
import {
	checkTodayFilled,
	getFirstTrackedYear,
	getLastNDaysStatuses,
	getMonthStatuses,
	getYearStatuses,
	toDateKey,
} from "./notion.js";

// Pushes tracker state into Home Assistant over its REST API. States set this
// way are not persisted across a Home Assistant restart, so pastYears "missing"
// re-pushes any year sensor that has disappeared without hitting Notion for
// the ones that are still there.
const HA_TIMEOUT_MS = 5000;
const TODAY_ENTITY = "sensor.nathan_tracker";

export function isHomeAssistantEnabled() {
	return Boolean(config.homeAssistantUrl && config.homeAssistantToken);
}

function yearEntityId(year) {
	return `sensor.nathan_tracker_${year}`;
}

async function haRequest(path, init = {}) {
	const response = await fetch(`${config.homeAssistantUrl}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${config.homeAssistantToken}`,
			"Content-Type": "application/json",
			...init.headers,
		},
		signal: AbortSignal.timeout(HA_TIMEOUT_MS),
	});
	return response;
}

async function setState(entityId, state, attributes) {
	const response = await haRequest(`/api/states/${entityId}`, {
		method: "POST",
		body: JSON.stringify({ state, attributes }),
	});
	if (!response.ok) {
		throw new Error(
			`Home Assistant returned ${response.status} for ${entityId}`,
		);
	}
}

async function hasEntity(entityId) {
	const response = await haRequest(`/api/states/${entityId}`);
	if (response.status === 404) return false;
	if (!response.ok) {
		throw new Error(
			`Home Assistant returned ${response.status} for ${entityId}`,
		);
	}
	return true;
}

async function pushYear(year) {
	const data = await getYearStatuses(year);
	await setState(yearEntityId(year), String(year), {
		friendly_name: `Nathan Tracker ${year}`,
		icon: "mdi:calendar-month",
		year,
		complete: year < new Date().getFullYear(),
		months: data.months,
		counts: data.counts,
		tracked_days: data.tracked,
		updated_at: new Date().toISOString(),
	});
}

async function pushToday(years) {
	const [today, lastWeek, month] = await Promise.all([
		checkTodayFilled(),
		getLastNDaysStatuses(7),
		getMonthStatuses(),
	]);
	await setState(TODAY_ENTITY, today.filled ? today.currentRating : "unset", {
		friendly_name: "Nathan Tracker",
		icon: "mdi:emoticon-outline",
		date: toDateKey(new Date()),
		last_7_days: lastWeek.map((entry) => ({
			date: entry.date.slice(0, 10),
			rating: entry.rating,
		})),
		month: {
			label: month.monthLabel,
			days: month.statuses.map((entry) => entry.rating),
		},
		years,
		updated_at: new Date().toISOString(),
	});
}

// pastYears: "skip" after a rating update, "missing" on the daily tick,
// "force" at startup. Never throws; a Home Assistant outage must not affect
// the chat flow.
export async function syncHomeAssistant({ pastYears = "skip" } = {}) {
	if (!isHomeAssistantEnabled()) return;
	const stamp = () => new Date().toISOString();

	try {
		const currentYear = new Date().getFullYear();
		const firstYear = await getFirstTrackedYear();
		const years = [];
		for (let year = currentYear; year >= firstYear; year--) years.push(year);

		await pushToday(years);
		await pushYear(currentYear);

		if (pastYears !== "skip") {
			for (const year of years.slice(1)) {
				if (pastYears === "force" || !(await hasEntity(yearEntityId(year)))) {
					await pushYear(year);
					console.log(`[${stamp()}] 🏠 Pushed ${year} to Home Assistant`);
				}
			}
		}

		console.log(`[${stamp()}] 🏠 Home Assistant updated`);
	} catch (error) {
		console.error(
			`[${stamp()}] ✗ Home Assistant sync failed: ${error.message}`,
		);
	}
}
