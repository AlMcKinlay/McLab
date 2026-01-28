import { message } from "telegraf/filters";
import { updateNathanSheet, checkTodayFilled } from "../apis/notion.js";

const pendingConfirmations = new Map();

// Local timeout helper for UI-level operations
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

async function performUpdate(ctx, rating, userName, editMessage = false) {
	try {
		await withTimeout(updateNathanSheet(rating), 10000, "updateNathanSheet");
		const emoji = rating === "good" ? "😊" : rating === "ok" ? "😐" : "😞";
		const message = `${emoji} **${userName}** rated today as **${rating.toUpperCase()}**\n\n✓ Successfully updated in Notion!`;

		if (editMessage) {
			try {
				await withTimeout(
					ctx.editMessageText(message, { parse_mode: "HTML" }),
					5000,
					"editMessageText",
				);
			} catch (e) {
				await withTimeout(
					ctx.reply(message, { parse_mode: "HTML" }),
					5000,
					"reply_fallback",
				);
			}
		} else {
			await withTimeout(
				ctx.reply(message, { parse_mode: "HTML" }),
				5000,
				"reply",
			);
		}

		console.log(
			`[${new Date().toISOString()}] ✓ ${userName} updated nathan sheet: ${rating}`,
		);
	} catch (err) {
		console.error(
			`[${new Date().toISOString()}] ✗ Update failed for ${userName}: ${err.message}`,
		);
		throw err;
	}
}

export function registerNathanCommands(bot) {
	// Helper function to show rating buttons
	async function showRatingButtons(ctx) {
		await ctx.reply(`What's your rating for today?`, {
			reply_markup: {
				inline_keyboard: [
					[
						{ text: "😊 Good", callback_data: "rating_good" },
						{ text: "😐 OK", callback_data: "rating_ok" },
						{ text: "😞 Bad", callback_data: "rating_bad" },
					],
				],
			},
		});
	}

	// Handle keyboard button - using exact match
	bot.hears("📊 Set Nathan Status", async (ctx) => {
		await showRatingButtons(ctx);
	});

	// /nathan command
	bot.command("nathan", async (ctx) => {
		await showRatingButtons(ctx);
	});

	// Rating button clicks
	bot.action(/^rating_(good|ok|bad)$/, async (ctx) => {
		const userName = ctx.from?.first_name || ctx.from?.username || "Unknown";
		const rating = ctx.match[1];

		try {
			await withTimeout(ctx.sendChatAction("typing"), 5000, "sendChatAction");
			const check = await withTimeout(
				checkTodayFilled(),
				10000,
				"checkTodayFilled",
			);

			if (check.filled) {
				const emoji = rating === "good" ? "😊" : rating === "ok" ? "😐" : "😞";
				await withTimeout(
					ctx.editMessageText(
						`⚠️ Today is already filled in!\n\nDo you want to overwrite it with ${emoji} **${rating.toUpperCase()}**?`,
						{
							parse_mode: "HTML",
							reply_markup: {
								inline_keyboard: [
									[
										{
											text: "✓ Yes, overwrite",
											callback_data: `confirm_${rating}_yes`,
										},
										{
											text: "✗ No, cancel",
											callback_data: `confirm_${rating}_no`,
										},
									],
								],
							},
						},
					),
					5000,
					"editMessageText",
				);

				pendingConfirmations.set(ctx.from.id, { rating, userName });
			} else {
				await performUpdate(ctx, rating, userName, true);
			}
			await withTimeout(ctx.answerCbQuery(), 5000, "answerCbQuery");
		} catch (error) {
			const errorMsg = error.message || "Unknown error";
			console.error(
				`[${new Date().toISOString()}] ✗ Error for ${userName}: ${errorMsg}`,
			);
			try {
				await withTimeout(
					ctx.answerCbQuery(`❌ Error: ${errorMsg}`, { show_alert: true }),
					5000,
					"answerCbQuery_error",
				);
			} catch (e) {
				console.error("Failed to answer callback query:", e.message);
			}
			try {
				await ctx.editMessageText(`❌ Error: ${errorMsg}`, {
					parse_mode: "HTML",
				});
			} catch (e) {
				// message may have been deleted
			}
		}
	});

	// Confirmation callbacks
	bot.action(/confirm_(.+)_(yes|no)/, async (ctx) => {
		const [, rating, action] = ctx.match;
		const userId = ctx.from.id;
		const pending = pendingConfirmations.get(userId);
		const userName = pending?.userName || "Unknown";

		if (!pending || pending.rating !== rating) {
			await ctx.answerCbQuery("This confirmation has expired", {
				show_alert: true,
			});
			return;
		}

		pendingConfirmations.delete(userId);

		if (action === "no") {
			try {
				await ctx.editMessageText("Cancelled ✗");
				await ctx.answerCbQuery();
			} catch (e) {
				console.error("Error during cancellation:", e.message);
				await ctx
					.answerCbQuery("Cancelled", { show_alert: false })
					.catch(() => {});
			}
			return;
		}

		try {
			await ctx.sendChatAction("typing");
			await performUpdate(ctx, rating, userName, false);
			await ctx.answerCbQuery("Updated successfully", { show_alert: false });
		} catch (error) {
			const errorMsg = error.message || "Unknown error";
			console.error(
				`[${new Date().toISOString()}] ✗ Confirmation error for ${userName}: ${errorMsg}`,
			);
			try {
				await ctx.editMessageText(`❌ Error: ${errorMsg}`);
			} catch (e) {
				// message may have been deleted
			}
			await ctx
				.answerCbQuery(`Error: ${errorMsg}`, { show_alert: true })
				.catch(() => {});
		}
	});
}
