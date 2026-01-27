import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { config } from "./config.js";
import { registerNathanCommands } from "./commands/nathan.js";

const bot = new Telegraf(config.botToken);

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

	return next().catch((error) => {
		console.error(
			`[${timestamp}] ❌ Middleware error for ${userName}: ${error.message}`,
		);
		// Try to notify user if possible
		ctx
			.answerCbQuery?.(`Error: ${error.message}`, { show_alert: true })
			.catch(() => {});
	});
});

// Start command
bot.command("start", (ctx) => {
	ctx.reply(
		`👋 Hello! I'm the Nathan Sheet bot.\n\n` +
			`Available commands:\n` +
			`/nathan - Rate your day\n` +
			`/help - Show available commands`,
		{
			reply_markup: {
				keyboard: [[{ text: "📊 Set Nathan Status" }]],
				resize_keyboard: true,
				one_time_keyboard: false,
			},
		},
	);
});

// Help command
bot.command("help", (ctx) => {
	ctx.reply(
		`📋 **Available Commands:**\n\n` +
			`/nathan - Rate your day\n` +
			`/help - Show this message`,
		{
			parse_mode: "HTML",
			reply_markup: {
				keyboard: [[{ text: "📊 Set Nathan Status" }]],
				resize_keyboard: true,
				one_time_keyboard: false,
			},
		},
	);
});

// Register command handlers
registerNathanCommands(bot);

// Handle any other messages
bot.on(message(), (ctx) => {
	ctx.reply(`I don't understand that command. Try /help to see what I can do!`);
});

// Error handling
bot.catch((err, ctx) => {
	console.error(`[${new Date().toISOString()}] Telegraf error:`, err);
	ctx.reply("❌ An error occurred. Please try again later.").catch(() => {});
});

// Start the bot with error handling and retry logic
async function startBot() {
	const maxRetries = 3;
	let retries = 0;

	while (retries < maxRetries) {
		try {
			await bot.launch();
			console.log(
				`[${new Date().toISOString()}] ✅ Bot successfully connected to Telegram API`,
			);
			break;
		} catch (error) {
			retries++;
			const waitTime = Math.min(1000 * Math.pow(2, retries - 1), 10000);
			console.error(
				`[${new Date().toISOString()}] ❌ Failed to start bot (attempt ${retries}/${maxRetries}): ${
					error.message
				}`,
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

	// Set up menu commands after successful launch
	try {
		await bot.telegram.setMyCommands([
			{ command: "nathan", description: "Rate your day" },
			{ command: "help", description: "Show available commands" },
		]);

		await bot.telegram.setChatMenuButton({
			menu_button: {
				type: "commands",
			},
		});
	} catch (error) {
		console.error(
			`[${new Date().toISOString()}] ⚠️  Failed to set menu commands: ${
				error.message
			}`,
		);
		// This is not critical, bot can still function
	}
}

// Start the bot
startBot();

console.log(
	`[${new Date().toISOString()}] 🤖 Nathan Sheet Telegram bot started`,
);
console.log(`Bot ready to respond to /nathan command for rating updates.`);

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
}, 30000);

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
