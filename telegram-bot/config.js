export const config = {
	// Get this from BotFather in Telegram
	botToken: process.env.TELEGRAM_BOT_TOKEN || "",

	// Optional: restrict bot to a specific group chat
	// Get the group chat ID by sending a message to the group and checking logs
	groupChatId: process.env.TELEGRAM_GROUP_CHAT_ID || null,

	// Notion token for updating the sheet
	notionToken: process.env.NOTION_TOKEN || "",
};

// Validate configuration
if (!config.botToken) {
	console.error("ERROR: TELEGRAM_BOT_TOKEN environment variable is not set");
	console.error("Get your bot token from BotFather: https://t.me/botfather");
	process.exit(1);
}

if (!config.notionToken) {
	console.error("ERROR: NOTION_TOKEN environment variable is not set");
	process.exit(1);
}
