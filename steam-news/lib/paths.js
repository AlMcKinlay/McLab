import path from "node:path";
import { fileURLToPath } from "node:url";

// Shared by the service and the login script, which must work without the
// service's environment variables.
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataDir = path.resolve(root, process.env.STEAM_NEWS_DATA_DIR || "./data");

export const paths = {
	dataDir,
	storeFile: path.join(dataDir, "store.json"),
	localFeedFile: path.join(dataDir, "feed.xml"),
	// Written by scripts/login.js. Absent means "manual App ID list only".
	refreshTokenFile: path.join(dataDir, "refresh-token"),
};
