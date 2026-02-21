import { checkTodayFilled } from "./apis/notion.js";
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

function getTimeUntilNext9pm() {
	const now = new Date();
	const next9pm = new Date();
	next9pm.setHours(21, 0, 0, 0);

	// If it's already past 9pm today, schedule for tomorrow
	if (now > next9pm) {
		next9pm.setDate(next9pm.getDate() + 1);
	}

	return next9pm.getTime() - now.getTime();
}

export async function initializeScheduler(bot) {
	function scheduleNext9pmPrompt() {
		const timeUntil = getTimeUntilNext9pm();
		const next9pm = new Date(Date.now() + timeUntil);

		console.log(
			`[${new Date().toISOString()}] ⏰ Next daily status prompt scheduled for ${next9pm.toLocaleString()}`,
		);

		setTimeout(async () => {
			await sendDailyPrompt(bot);
			scheduleNext9pmPrompt();
		}, timeUntil);
	}

	scheduleNext9pmPrompt();
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
