export async function sendTelegram(botToken, chatId, text) {
	const res = await fetch(
		`https://api.telegram.org/bot${botToken}/sendMessage`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ chat_id: chatId, text }),
			signal: AbortSignal.timeout(15_000),
		},
	);
	if (!res.ok) {
		throw new Error(`Telegram returned HTTP ${res.status}`);
	}
}

// Sends one message when a named problem starts and one when it clears, with
// optional daily repeats for problems that need nagging (an expiring token).
// State lives in the store so a service restart doesn't re-announce.
export class Alerter {
	#send;
	#state;

	constructor(send, state) {
		this.#send = send;
		this.#state = state;
	}

	async fail(key, message, { repeatEveryMs = 0 } = {}) {
		const now = Date.now();
		const current = this.#state[key];
		const due =
			!current ||
			(repeatEveryMs > 0 && now - current.lastSentAt >= repeatEveryMs);
		if (!due) return;
		this.#state[key] = { since: current?.since ?? now, lastSentAt: now };
		await this.#deliver(`⚠️ Steam news: ${message}`);
	}

	async ok(key, message) {
		if (!this.#state[key]) return;
		delete this.#state[key];
		await this.#deliver(`✅ Steam news: ${message}`);
	}

	async #deliver(text) {
		console.log(`[${new Date().toISOString()}] ${text}`);
		if (!this.#send) return;
		try {
			await this.#send(text);
		} catch (err) {
			console.error(
				`[${new Date().toISOString()}] Telegram alert failed: ${err.message}`,
			);
		}
	}
}
