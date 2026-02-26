export const encodeBoardData = (items, name) => {
	const data = name ? { name, items } : items;
	const json = JSON.stringify(data);
	return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
};

export const decodeBoardData = (encoded) => {
	try {
		const padding = "=".repeat((4 - (encoded.length % 4)) % 4);
		const standardBase64 = (encoded + padding)
			.replace(/-/g, "+")
			.replace(/_/g, "/");
		const json = atob(standardBase64);
		const parsed = JSON.parse(json);
		// Handle both old format (array) and new format (object with name and items)
		if (Array.isArray(parsed)) {
			return { items: parsed, name: null };
		}
		return parsed;
	} catch (error) {
		console.error("Failed to decode board data:", error);
		return null;
	}
};

export const generateBoardId = () => {
	return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const getBoardDataFromUrl = () => {
	const params = new URLSearchParams(window.location.search);
	const boardData = params.get("board");
	if (boardData) {
		return decodeBoardData(boardData);
	}
	return null;
};

export const createShareUrl = (items, name) => {
	const encoded = encodeBoardData(items, name);
	const baseUrl = window.location.origin + window.location.pathname;
	return `${baseUrl}?board=${encoded}`;
};
