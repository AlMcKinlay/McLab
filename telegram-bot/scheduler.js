import { checkTodayFilled } from "./apis/notion.js";
import { syncHomeAssistant } from "./apis/homeAssistant.js";
import { config } from "./config.js";

// Track whether we've already prompted today
let lastPromptDate = null;

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

function hasAlreadyPromptedToday() {
	const today = new Date();
	const todayDateString = today.toDateString();

	if (lastPromptDate === todayDateString) {
		return true;
	}

	return false;
}

function setPromptedToday() {
	lastPromptDate = new Date().toDateString();
}

function getTimeUntilNext(hour, minute) {
	const now = new Date();
	const next = new Date();
	next.setHours(hour, minute, 0, 0);

	// If that time has already passed today, schedule for tomorrow
	if (now > next) {
		next.setDate(next.getDate() + 1);
	}

	return next.getTime() - now.getTime();
}

function scheduleDaily(hour, minute, label, task) {
	function scheduleNext() {
		const timeUntil = getTimeUntilNext(hour, minute);
		const next = new Date(Date.now() + timeUntil);

		console.log(
			`[${new Date().toISOString()}] ⏰ Next ${label} scheduled for ${next.toLocaleString()}`,
		);

		setTimeout(async () => {
			await task();
			scheduleNext();
		}, timeUntil);
	}

	scheduleNext();
}

export async function initializeScheduler(bot) {
	scheduleDaily(21, 0, "daily status prompt", () => sendDailyPrompt(bot));

	// Shortly after midnight the "today" sensor must reset to unset, and any
	// year sensor Home Assistant has dropped gets re-pushed. On 1 January this
	// is also what publishes the newly completed year.
	scheduleDaily(0, 5, "Home Assistant refresh", () =>
		syncHomeAssistant({ pastYears: "missing" }),
	);
}

async function sendDailyPrompt(bot) {
	if (hasAlreadyPromptedToday()) {
		console.log(
			`[${new Date().toISOString()}] ℹ️ Already prompted today, skipping`,
		);
		return;
	}

	if (!config.groupChatId) {
		console.log(
			`[${new Date().toISOString()}] ⚠️ groupChatId not configured, skipping daily prompt`,
		);
		return;
	}

	try {
		const todayFilled = await withTimeout(
			checkTodayFilled(),
			10000,
			"checkTodayFilled",
		);

		if (todayFilled.filled) {
			console.log(
				`[${new Date().toISOString()}] ✓ Today's status already filled, no prompt needed`,
			);
			setPromptedToday();
			return;
		}

		// Send the daily prompt with rating buttons
		await withTimeout(
			bot.telegram.sendMessage(
				config.groupChatId,
				`🌙 <b>Don't forget to track today's status!</b>`,
				{
					parse_mode: "HTML",
					reply_markup: {
						inline_keyboard: [
							[
								{ text: "😊 Good", callback_data: "rating_good" },
								{ text: "😐 OK", callback_data: "rating_ok" },
								{ text: "😞 Bad", callback_data: "rating_bad" },
							],
						],
					},
				},
			),
			5000,
			"sendMessage",
		);

		setPromptedToday();
		console.log(
			`[${new Date().toISOString()}] ✓ Daily status prompt sent to group`,
		);
	} catch (error) {
		console.error(
			`[${new Date().toISOString()}] ✗ Failed to send daily prompt: ${error.message}`,
		);
	}
}
