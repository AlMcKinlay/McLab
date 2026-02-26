// LocalStorage keys
export const STORAGE_KEYS = {
	SAVED_BOARDS: "bingo.savedBoards",
	BOARD_PREFIX: "bingo.board.",
};

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

export const loadBoards = () => {
	const saved = localStorage.getItem(STORAGE_KEYS.SAVED_BOARDS);
	if (saved) {
		try {
			return JSON.parse(saved);
		} catch (e) {
			console.error("Failed to load saved boards:", e);
			return [];
		}
	}
	return [];
};

export const saveBoards = (boards) => {
	localStorage.setItem(STORAGE_KEYS.SAVED_BOARDS, JSON.stringify(boards));
};

export const loadBoardProgress = (boardId) => {
	const saved = localStorage.getItem(`${STORAGE_KEYS.BOARD_PREFIX}${boardId}`);
	if (saved) {
		try {
			return JSON.parse(saved);
		} catch (e) {
			console.error("Failed to load board progress:", e);
			return {};
		}
	}
	return {};
};

export const saveBoardProgress = (boardId, progress) => {
	localStorage.setItem(
		`${STORAGE_KEYS.BOARD_PREFIX}${boardId}`,
		JSON.stringify(progress),
	);
};

export const deleteBoardProgress = (boardId) => {
	localStorage.removeItem(`${STORAGE_KEYS.BOARD_PREFIX}${boardId}`);
};

export const addBoardToHistory = (board) => {
	const boards = loadBoards();
	const boardExists = boards.some(
		(b) => JSON.stringify(b.items) === JSON.stringify(board.items),
	);

	if (!boardExists) {
		boards.unshift(board);
		saveBoards(boards);
	}
};
