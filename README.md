# McLab repo context and build assumptions

## Purpose (high level)

A mono-repo of small web apps/experiments plus a static homepage that links to them, plus a Telegram bot and a Netlify serverless function. The root build produces a single static `build/` folder containing the homepage and each app’s compiled assets.

## Hosting

- Static site is hosted on Netlify.
- Netlify is configured as repo → site and runs `npm run build`, serving the `build/` directory.
- Subpath deployments are intentional and preferred.

## What’s in the repo

- `homepage/`: static landing page that lists apps (data is hard-coded in JS).
- `bingo/`, `pokemon-list/`, `switch/`: React apps built as static bundles (CRA at the moment).
- `build/`: compiled output (generated; ignored by git).
- `functions/bin/`: a Netlify Function for bin collection notifications.
- `telegram-bot/`: a Node.js Telegram bot (with Notion integration) intended to run on a server or Raspberry Pi.
- Root `Makefile`: orchestrates building apps and assembling `build/` output.

## Tooling and conventions

- Node version: see `.node-version` (currently 24, newest LTS).
- Formatting: Prettier uses tabs with `tabWidth: 2` (see `.prettierrc`).
- Package manager: npm (via `npm install`, `npm run build`).
- Git ignores: `node_modules`, `build/`, Netlify folder, etc.
- Renovate is configured to auto-merge non-major updates.

## Root scripts (package.json)

- `npm run dev`: runs `make build` then serves `build/` on http://localhost:8080 (no cache).
- `npm run homepage:dev`: serves the homepage only (http://localhost:8080).
- `npm run telegram:dev`: runs the Telegram bot locally using `.env` in `telegram-bot/`.
- `npm run telegram:install`: installs Telegram bot dependencies.

## Build pipeline (Makefile)

The `make build` target is canonical (CI runs it) and does the following:

1. Build each app (`bingo`, `pokemon-list`, `switch`).
2. Install dependencies for `functions/bin` (no build step; just install).
3. Assemble `build/`:
   - Move each app build into `build/<app-name>`.
   - Copy `homepage/*` into `build/` root.

Assumptions implied by this pipeline:

- Each app is deployed at a subpath (e.g., `/bingo`, `/pokemon-list`, `/switch`).
- App `package.json` includes the `homepage` field matching that subpath.
- The homepage app list links to those subpaths.

## Individual apps

### bingo/

- React app with `react`, `react-dom`, `react-scripts` and `styled-components`.
- `homepage` is set to `https://lab.yamanickill.com/bingo`.

### pokemon-list/

- React app with testing libs and `web-vitals`.
- `homepage` field is present (matches a subpath in production).

### switch/

- React app with `cheerio` and `fetch-jsonp`.
- `homepage` is set to `https://lab.yamanickill.com/switch`.

## Homepage

- Static HTML/CSS/JS in `homepage/`.
- App list is defined in `homepage/script.js` as a `const apps` array.
- App thumbnails are local files referenced by relative path.

## Functions (Netlify)

- `functions/bin/bin.js` uses `node-fetch` and expects `API_TOKEN` in environment.
- Fetches bin collection data from Fife Council APIs.
- Pushes a notification via Pushbullet.

Assumption:

- This is deployed as a Netlify Function, with env vars configured in Netlify.

## Telegram bot

- Runs separately from Netlify (typically on a home Raspberry Pi).
- Purpose: a Telegram bot for the McKinlays that records day ratings to Notion.
- Full bot setup and operation details are in [telegram-bot/README.md](telegram-bot/README.md).

## Adding a new app (expected pattern)

If you add a new app, you’ll likely want to:

1. Create a new subfolder (React preferred unless requested otherwise).
2. Add a build target in the root `Makefile` (install + `npm run build`).
3. Update `copyBuilds` to move the new app’s `build/` into `build/<app-name>`.
4. Set the app `homepage` field in `package.json` to match the deployed subpath.
5. Add the app entry in `homepage/script.js` so it appears on the homepage.
6. If the app needs server-side logic, add a new Netlify function under `functions/`.

## Assumptions I will follow when adding or updating things

- Prefer React for new front-end tools unless requested otherwise (CRA is optional; use what fits best).
- Keep apps deployable under subpaths and update `homepage` accordingly.
- Keep formatting with tabs (Prettier default in this repo).
- Use npm, not yarn/pnpm, unless requested.
- Keep `build/` generated and never commit it.
- If a change affects build assembly, update the root `Makefile`.
- Netlify is the host for static apps and serverless functions.
- Avoid introducing TypeScript unless explicitly requested (existing apps are JS).

## Conventions

- Naming: folder name = subpath = homepage entry slug (e.g., `pokemon-list` → `/pokemon-list`).
- Formatting: always run Prettier (tabs, tabWidth 2) and keep formatting consistent across apps.
- Linting/testing: keep basic linting and tests enabled where available; no strict policy beyond that.
- Homepage cards use screenshots/thumbnails stored alongside the homepage assets.
- Thumbnail naming convention: `homepage/<app>-thumbnail.png` (match the app slug).

## Routing and Netlify notes

- If an app uses client-side routing, ensure deep links work on Netlify (e.g., add a redirect rule or set a basename).
- For CRA apps under subpaths, keep the `homepage` field aligned with the deployed path so asset URLs are correct.
- Redirect rules are not currently committed; if needed, add `netlify.toml` at repo root or `_redirects` in `homepage/` (copied into `build/`).

## Environment/config expectations

- No secrets are committed to the repo. Runtime secrets live in Netlify env vars (functions) or on the Pi for the Telegram bot.
- `functions/bin` expects `API_TOKEN` (Pushbullet) configured in Netlify env vars.
- `telegram-bot` runs on a home Raspberry Pi and expects `TELEGRAM_BOT_TOKEN` and `NOTION_TOKEN` in a local `.env` on that machine.

## Adding a new app (quick checklist)

- Create the app (React preferred unless requested otherwise).
- Set `homepage` in the app’s `package.json` to the Netlify subpath.
- Add a build target in the root `Makefile` and update `copyBuilds`.
- Add the app to `homepage/script.js` (card + thumbnail).
- If client-side routing is used, add a Netlify redirect for the subpath.

## Gaps / unknowns

- None noted currently.
