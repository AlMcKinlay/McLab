#!/usr/bin/env node
// One-time interactive Steam login. Stores only the long-lived refresh token,
// which the service uses to mint web cookies; the password is never written.
//
// Usage (from steam-news/): npm run login
// Then copy data/refresh-token to the same path on the server.

import fs from "node:fs";
import readline from "node:readline";
import { Writable } from "node:stream";
import {
	EAuthSessionGuardType,
	EAuthTokenPlatformType,
	EResult,
	LoginSession,
} from "steam-session";
import { paths } from "../lib/paths.js";
import { tokenExpiry } from "../lib/steam-auth.js";

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function prompt(question, { hidden = false } = {}) {
	let muted = false;
	const output = new Writable({
		write(chunk, _encoding, callback) {
			if (!muted) process.stdout.write(chunk);
			callback();
		},
	});
	const rl = readline.createInterface({
		input: process.stdin,
		output,
		terminal: true,
	});
	const answer = new Promise((resolve) => {
		rl.question(question, (text) => {
			muted = false;
			if (hidden) process.stdout.write("\n");
			rl.close();
			resolve(text.trim());
		});
		muted = hidden;
	});
	return { answer, close: () => rl.close() };
}

async function codeLoop(session, action, authenticated) {
	const label =
		action.type === EAuthSessionGuardType.EmailCode
			? `Steam Guard code emailed to ${action.detail}`
			: "Steam Guard mobile authenticator code";
	while (true) {
		const input = prompt(
			`${label} (or press Enter after approving on your phone): `,
		);
		const result = await Promise.race([
			authenticated.then(() => ({ done: true })),
			input.answer.then((code) => ({ code })),
		]);
		if (result.done) {
			input.close();
			return;
		}
		if (!result.code) {
			const settled = await Promise.race([
				authenticated.then(() => true),
				sleep(15_000).then(() => false),
			]);
			if (settled) return;
			console.log("Not approved yet.");
			continue;
		}
		try {
			await session.submitSteamGuardCode(result.code);
			return;
		} catch (err) {
			if (err.eresult === EResult.TwoFactorCodeMismatch) {
				console.log("Incorrect code, try again.");
				continue;
			}
			throw err;
		}
	}
}

async function main() {
	const accountName = await prompt("Steam username: ").answer;
	const password = await prompt("Steam password: ", { hidden: true }).answer;

	const session = new LoginSession(EAuthTokenPlatformType.WebBrowser);
	session.loginTimeout = LOGIN_TIMEOUT_MS;

	const authenticated = new Promise((resolve, reject) => {
		session.once("authenticated", resolve);
		session.once("timeout", () => reject(new Error("Login timed out")));
		session.once("error", reject);
	});
	// Surfaced through the race below; avoid an unhandled rejection meanwhile.
	authenticated.catch(() => {});

	const start = await session.startWithCredentials({ accountName, password });

	if (start.actionRequired) {
		const types = start.validActions.map((a) => a.type);
		if (types.includes(EAuthSessionGuardType.DeviceConfirmation)) {
			console.log(
				"Steam has sent an approval prompt to your Steam mobile app.",
			);
		}
		if (types.includes(EAuthSessionGuardType.EmailConfirmation)) {
			console.log("Steam has sent an approval link to your email.");
		}
		const codeAction = start.validActions.find((a) =>
			[
				EAuthSessionGuardType.DeviceCode,
				EAuthSessionGuardType.EmailCode,
			].includes(a.type),
		);
		if (codeAction) {
			await codeLoop(session, codeAction, authenticated);
		} else {
			console.log("Waiting for approval...");
		}
	}

	await authenticated;

	fs.mkdirSync(paths.dataDir, { recursive: true });
	fs.writeFileSync(paths.refreshTokenFile, `${session.refreshToken}\n`, {
		mode: 0o600,
	});
	fs.chmodSync(paths.refreshTokenFile, 0o600);

	const expiry = tokenExpiry(session.refreshToken);
	console.log(`\nLogged in as ${session.accountName} (${session.steamID}).`);
	console.log(`Refresh token saved to ${paths.refreshTokenFile}`);
	console.log(
		`It expires ${expiry ? expiry.toISOString().slice(0, 10) : "at an unknown date"}; the service will warn you two weeks before.`,
	);
	console.log(
		"If the service runs elsewhere, copy that file to the same path there (scp, then chmod 600).",
	);
	process.exit(0);
}

main().catch((err) => {
	console.error(`Login failed: ${err.message}`);
	process.exit(1);
});
