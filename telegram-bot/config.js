export const config = {
	// Get this from BotFather in Telegram
	botToken: process.env.TELEGRAM_BOT_TOKEN || "",

	// Optional: restrict bot to a specific group chat
	// Get the group chat ID by sending a message to the group and checking logs
	groupChatId: process.env.TELEGRAM_GROUP_CHAT_ID || null,

	// Notion token for updating the tracker
	notionToken: process.env.NOTION_TOKEN || "",

	// Data source ID of the Nathan Tracker database. Printed by
	// scripts/migrate-tracker-to-database.mjs when it creates the database.
	trackerDataSourceId: process.env.NOTION_TRACKER_DATA_SOURCE_ID || "",

	// Optional: push tracker state to Home Assistant. Both must be set to enable.
	// Create the token under your Home Assistant profile > Long-lived access tokens.
	homeAssistantUrl: (process.env.HOME_ASSISTANT_URL || "").replace(/\/+$/, ""),
	homeAssistantToken: process.env.HOME_ASSISTANT_TOKEN || "",
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

if (!config.trackerDataSourceId) {
	console.error(
		"ERROR: NOTION_TRACKER_DATA_SOURCE_ID environment variable is not set",
	);
	console.error(
		"Run scripts/migrate-tracker-to-database.mjs to create the database and get its data source ID",
	);
	process.exit(1);
}
