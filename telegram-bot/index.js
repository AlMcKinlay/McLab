import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { config } from "./config.js";
import { registerNathanCommands } from "./commands/nathan.js";
import { initializeScheduler } from "./scheduler.js";

const bot = new Telegraf(config.botToken);

// Timeout helper for Telegram API calls
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

// Global error handler for unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
	console.error(
		`[${new Date().toISOString()}] ❌ Unhandled Rejection at:`,
		promise,
		"reason:",
		reason,
	);
});

// Global error handler for uncaught exceptions
process.on("uncaughtException", (error) => {
	console.error(`[${new Date().toISOString()}] ❌ Uncaught Exception:`, error);
});

// Middleware to log messages and handle any errors
bot.use((ctx, next) => {
	const timestamp = new Date().toISOString();
	const userName = ctx.from?.first_name || "Unknown";
	const chatInfo = ctx.chat?.title || ctx.chat?.type;
	const msgInfo =
		ctx.message?.text ||
		ctx.message?.type ||
		ctx.callbackQuery?.data ||
		"unknown";

	console.log(`[${timestamp}] 📨 ${userName} in ${chatInfo}: ${msgInfo}`);
	console.log(`Chat ID: ${ctx.chat.id}`);

	return next().catch((error) => {
		console.error(
			`[${timestamp}] ❌ Middleware error for ${userName}: ${error.message}`,
		);
		// Try to notify user if this is a callback query
		if (ctx.callbackQuery) {
			ctx
				.answerCbQuery?.(`Error: ${error.message}`, { show_alert: true })
				.catch((err) => {
					console.error(
						`[${timestamp}] ❌ Failed to answer callback query: ${err.message}`,
					);
				});
		}
	});
});

// Start command
bot.command("start", (ctx) => {
	ctx.reply(
		`👋 Hello! I'm the Nathan Sheet bot.\n\n` +
			`/help - Show available commands`,
		{
			reply_markup: {
				keyboard: [
					[{ text: "📊 Set Nathan Status" }],
					[{ text: "🗓️ Last 7 Days" }],
					[{ text: "🗓️ This Month" }],
					[{ text: "🗓️ Last Month" }],
				],
				resize_keyboard: true,
				one_time_keyboard: false,
			},
		},
	);
});

// Help command
bot.command("help", (ctx) => {
	ctx.reply(`📋 **Available Commands:**\n\n` + `/help - Show this message`, {
		parse_mode: "HTML",
		reply_markup: {
			keyboard: [
				[{ text: "📊 Set Nathan Status" }],
				[{ text: "🗓️ Last 7 Days" }],
				[{ text: "🗓️ This Month" }],
				[{ text: "🗓️ Last Month" }],
			],
			resize_keyboard: true,
			one_time_keyboard: false,
		},
	});
});

// Register command handlers
registerNathanCommands(bot);

// No catch-all handler - bot only responds to explicit commands and buttons

// Error handling - catch Telegram errors
bot.catch((err, ctx) => {
	const timestamp = new Date().toISOString();
	const userName = ctx.from?.first_name || "Unknown";
	console.error(
		`[${timestamp}] ❌ Telegraf error for ${userName}: ${err.message}`,
	);
	console.error(`[${timestamp}] Error details:`, err);

	// Try to send error response, but don't hang if it fails
	Promise.race([
		ctx
			.reply("❌ An error occurred. Please try again later.")
			.catch((replyErr) => {
				console.error(
					`[${timestamp}] Failed to send error reply: ${replyErr.message}`,
				);
			}),
		new Promise((_, reject) =>
			setTimeout(() => reject(new Error("Error reply timeout")), 5000),
		),
	]).catch((timeoutErr) => {
		console.error(
			`[${timestamp}] Error response timed out: ${timeoutErr.message}`,
		);
	});
});

// Start the bot with error handling and retry logic
async function startBot() {
	const maxRetries = 5;
	let retries = 0;

	while (retries < maxRetries) {
		try {
			await bot.launch(async () => {
				console.log(
					`[${new Date().toISOString()}] ✅ Bot successfully connected to Telegram API`,
				);

				// Set up menu commands after successful launch
				try {
					await bot.telegram.setMyCommands([
						{ command: "help", description: "Show available commands" },
					]);

					// Set menu button for all chats (global)
					await bot.telegram.setChatMenuButton({
						menu_button: {
							type: "commands",
						},
					});

					console.log(
						`[${new Date().toISOString()}] ✅ Menu button set to show commands`,
					);
				} catch (error) {
					console.error(
						`[${new Date().toISOString()}] ⚠️  Failed to set menu commands: ${
							error.message
						}`,
					);
					// This is not critical, bot can still function
				}

				// Initialize daily scheduler
				initializeScheduler(bot);
			});
			break;
		} catch (error) {
			retries++;
			const waitTime = Math.min(1000 * Math.pow(2, retries - 1), 30000);
			console.error(
				`[${new Date().toISOString()}] ❌ Failed to start bot (attempt ${retries}/${maxRetries}): ${
					error.message
				}`,
			);
			console.error(
				`[${new Date().toISOString()}] Error details: ${error.code || "N/A"} - ${error.errno || "N/A"}`,
			);

			if (retries < maxRetries) {
				console.log(
					`[${new Date().toISOString()}] ⏳ Retrying in ${waitTime}ms...`,
				);
				await new Promise((resolve) => setTimeout(resolve, waitTime));
			} else {
				console.error(
					`[${new Date().toISOString()}] 💥 Failed to start bot after ${maxRetries} attempts. Exiting.`,
				);
				process.exit(1);
			}
		}
	}
}

// Start the bot
startBot();

console.log(
	`[${new Date().toISOString()}] 🤖 Nathan Sheet Telegram bot started`,
);

// Watchdog timer to detect hanging
let lastActivity = Date.now();
let isProcessing = false;

bot.use(async (ctx, next) => {
	isProcessing = true;
	lastActivity = Date.now();
	try {
		await next();
	} finally {
		isProcessing = false;
		lastActivity = Date.now();
	}
});

// Check bot health every 30 seconds
setInterval(() => {
	const timeSinceLastActivity = Date.now() - lastActivity;
	const isHanging = isProcessing && timeSinceLastActivity > 15000; // 15 second timeout

	if (isHanging) {
		console.warn(
			`[${new Date().toISOString()}] ⚠️  Bot appears to be hanging (processing for ${(
				timeSinceLastActivity / 1000
			).toFixed(1)}s)`,
		);
	}
}, 1000);

// Handle graceful shutdown
process.once("SIGINT", () => {
	console.log(`[${new Date().toISOString()}] 🛑 Stopping bot on SIGINT...`);
	bot.stop("SIGINT");
	process.exit(0);
});
process.once("SIGTERM", () => {
	console.log(`[${new Date().toISOString()}] 🛑 Stopping bot on SIGTERM...`);
	bot.stop("SIGTERM");
	process.exit(0);
});
