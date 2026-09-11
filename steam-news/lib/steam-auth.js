import { randomBytes } from "node:crypto";
import { EAuthTokenPlatformType, LoginSession } from "steam-session";

export class AuthError extends Error {
	constructor(message, cause) {
		super(message, cause ? { cause } : undefined);
		this.name = "AuthError";
	}
}

// Steam tokens are JWTs; the payload carries a unix `exp`. Returns null if the
// token isn't decodable, so callers fall back to "unknown expiry".
export function tokenExpiry(token) {
	try {
		const payload = token.split(".")[1];
		const json = Buffer.from(payload, "base64url").toString("utf8");
		const exp = JSON.parse(json).exp;
		return typeof exp === "number" ? new Date(exp * 1000) : null;
	} catch {
		return null;
	}
}

// getWebCookies returns Set-Cookie strings for several Steam domains. We only
// talk to the store, so keep the store's cookies and reduce them to a header.
function cookieHeaderFor(setCookies, domain) {
	const jar = new Map();
	for (const raw of setCookies) {
		const [pair, ...attrs] = raw.split(";").map((s) => s.trim());
		const cookieDomain = attrs
			.find((a) => a.toLowerCase().startsWith("domain="))
			?.slice("domain=".length)
			.replace(/^\./, "");
		if (cookieDomain && cookieDomain !== domain) continue;
		const eq = pair.indexOf("=");
		if (eq === -1) continue;
		jar.set(pair.slice(0, eq), pair.slice(eq + 1));
	}
	if (!jar.has("steamLoginSecure")) {
		throw new AuthError(
			`Steam did not issue a steamLoginSecure cookie for ${domain}`,
		);
	}
	if (!jar.has("sessionid")) {
		jar.set("sessionid", randomBytes(12).toString("hex"));
	}
	return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

// Web cookies last about a day, so one set covers many polls. They're minted
// lazily and dropped on demand when a request comes back anonymous.
export class SteamAuth {
	#refreshToken;
	#cookieHeader = null;
	#cookieMintedAt = 0;
	static COOKIE_TTL_MS = 12 * 60 * 60 * 1000;

	constructor(refreshToken) {
		this.#refreshToken = refreshToken;
	}

	get expiry() {
		return tokenExpiry(this.#refreshToken);
	}

	invalidate() {
		this.#cookieHeader = null;
	}

	async cookieHeader() {
		const fresh = Date.now() - this.#cookieMintedAt < SteamAuth.COOKIE_TTL_MS;
		if (this.#cookieHeader && fresh) return this.#cookieHeader;

		const session = new LoginSession(EAuthTokenPlatformType.WebBrowser);
		session.refreshToken = this.#refreshToken;
		let cookies;
		try {
			cookies = await session.getWebCookies();
		} catch (err) {
			throw new AuthError(
				`Steam refused the refresh token: ${err.message}`,
				err,
			);
		}
		this.#cookieHeader = cookieHeaderFor(cookies, "store.steampowered.com");
		this.#cookieMintedAt = Date.now();
		return this.#cookieHeader;
	}
}
