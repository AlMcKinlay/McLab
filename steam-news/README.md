# Steam News

Aggregates the Steam news feeds of every game you follow on Steam into one RSS
feed, so a single subscription in your reader (Feedly, Miniflux, etc.) covers
all of them. Follow a game on Steam and its next announcement shows up in your
reader with no further action.

## How it works

Steam only offers news as one RSS feed per game, and your followed list is only
available to a logged-in session. This service runs on the home server and,
every 30 minutes:

1. Mints Steam web cookies from a stored refresh token (see [Login](#2-log-in-to-steam-once)).
2. Reads your followed App IDs from `store.steampowered.com/dynamicstore/userdata/`.
3. Fetches each game's feed, `store.steampowered.com/feeds/news/app/<AppID>`, a few at a time.
4. Merges new posts into a local store, deduplicating announcements that are
   cross-posted to DLC or soundtrack apps.
5. Builds one RSS document, newest first, with the game name prefixed to each
   title, and PUTs it to the Netlify function at [functions/steam-news.js](../functions/steam-news.js).

The store means the feed keeps everything it has seen, even though Steam only
exposes the ten most recent posts per game. If Steam auth breaks, the service
keeps serving news for the last known followed list and tells you on Telegram.

## Setup

### 1. Netlify

1. In the Netlify site settings add an environment variable
   `STEAM_NEWS_PUSH_SECRET` with a long random value:
   ```bash
   openssl rand -hex 32
   ```
2. Deploy. The feed is then served at `https://<site>/steam-news.xml`, and
   returns 404 until the service publishes for the first time.

### 2. Log in to Steam once

Run this on any machine, ideally your own computer so the password never
touches the server:

```bash
cd steam-news
npm install
npm run login
```

You'll be asked for your Steam username and password, then either a Steam
Guard code or approval in the Steam mobile app. Only the resulting **refresh
token** is saved, to `data/refresh-token`, with owner-only permissions. The
password is not stored.

Refresh tokens last months, not forever. The service warns you two weeks before
expiry, and again daily until you repeat this step. Steam does not allow web
refresh tokens to be renewed unattended.

Copy the token to the server if you logged in elsewhere:

```bash
scp data/refresh-token al@tartarus.local:McLab/steam-news/data/refresh-token
ssh al@tartarus.local chmod 600 McLab/steam-news/data/refresh-token
```

The service re-reads the file every poll, so no restart is needed.

### 3. Configure

```bash
cp .env.sample .env
```

| Variable                 | Purpose                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `FEED_URL`               | Public URL of the feed, `https://<site>/steam-news.xml`. Also the push target.                              |
| `FEED_PUSH_SECRET`       | Same value as `STEAM_NEWS_PUSH_SECRET` on Netlify.                                                          |
| `STEAM_EXTRA_APP_IDS`    | Optional comma-separated App IDs to always include. Without a refresh token, these are the only games used. |
| `TELEGRAM_BOT_TOKEN`     | Optional. Same bot token as `telegram-bot`.                                                                 |
| `TELEGRAM_ADMIN_CHAT_ID` | Optional. Your private chat with the bot, see below.                                                        |

Tuning variables and their defaults are listed in [.env.sample](.env.sample).

#### Telegram alerts

Alerts go to you directly rather than the family group. Telegram bots can only
message people who have messaged them first, so:

1. Open a private chat with the bot in Telegram and send it anything.
2. The bot logs every incoming chat ID. On the server:
   ```bash
   sudo journalctl -u kildonan-bot -n 20 | grep "Chat ID"
   ```
3. Put that number in `TELEGRAM_ADMIN_CHAT_ID`.

The service only sends a message when something changes: login broken, login
working again, publishing broken or fixed, and the daily expiry warning.

### 4. Run

Try one poll first:

```bash
npm run once
```

Then check `data/feed.xml` locally and `FEED_URL` in a browser, and subscribe
to `FEED_URL` in your RSS reader.

### 5. Run as a service

```bash
sudo tee /etc/systemd/system/steam-news.service > /dev/null << 'EOF2'
[Unit]
Description=Steam followed-games news feed
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=al
WorkingDirectory=/home/al/McLab/steam-news
ExecStart=/path/to/node --env-file=.env index.js
Restart=always
RestartSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF2
sudo systemctl daemon-reload
sudo systemctl enable --now steam-news
sudo journalctl -u steam-news -f
```

Replace `/path/to/node` with the output of `which node` for the account that
runs it (with nvm this is under `~/.nvm/versions/node/`).

## Behaviour notes

- **Newly followed games** contribute only their three most recent posts, so
  following a ten-year-old game doesn't dump its whole history into the feed.
  `NEW_APP_ITEM_LIMIT` changes this.
- **Unfollowed games** stop being fetched. Their existing posts stay until they
  age out of the store.
- **Publishing** happens only when the set of items changes, so a quiet
  half-hour costs no Netlify write.
- **Everything local** is in `data/`: `store.json` (state), `feed.xml` (last
  build) and `refresh-token`. Delete `store.json` to start the feed afresh.
- `--once` runs a single poll and exits. `--no-publish` skips the Netlify
  push and only writes `data/feed.xml`; `FEED_URL` may then be omitted.

## Development

```bash
npm test
STEAM_EXTRA_APP_IDS=413150 node index.js --once --no-publish
```
