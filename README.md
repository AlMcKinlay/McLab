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

## Shared resources

All apps have access to shared resources in the `/shared` directory:

- **`shared/theme-variables.css`** - Consistent theme colors (dark/light navy professional)
- **`shared/utils.js`** - Shared utilities (theme functions, URL encoding/decoding)
- **`shared/package.json`** - Publishes `shared-utils` as a local package for CRA/React apps

### Using shared utilities in React apps

**For JavaScript utilities:**

```javascript
import { encodeToURL, decodeFromURL } from "shared-utils";
import { initializeTheme, applyTheme, toggleTheme } from "shared-utils";
```

**For CSS:**

Import in your `src/App.js` or main entry point:

```javascript
import "shared-utils/theme-variables.css";
```

This approach works because the `/shared` directory is registered as a local package in `package.json`:

```json
"shared-utils": "file:../shared"
```

Then CSS is imported from the JavaScript entry point, allowing webpack to properly resolve the node_modules path.

### Using shared utilities in static HTML/JS apps

**For CSS:**

Add a link tag to your HTML:

```html
<link rel="stylesheet" href="../shared/theme-variables.css" />
```

**For JavaScript:**

```javascript
import { initializeTheme, toggleTheme } from "../shared/utils.js";
```

## Conventions

- Naming: folder name = subpath = homepage entry slug (e.g., `pokemon-list` → `/pokemon-list`).
- Formatting: always run Prettier (tabs, tabWidth 2) and keep formatting consistent across apps.
- Linting/testing: keep basic linting and tests enabled where available; CSS linting via `npm run lint:css`.
- Homepage cards use screenshots/thumbnails stored alongside the homepage assets.
- Thumbnail naming convention: `homepage/<app>-thumbnail.png` (match the app slug).
- **CSS imports:** For React apps, import shared CSS from JavaScript (not CSS @import) to avoid CRA path restrictions.

## App structure template

For consistency, new React apps should follow this structure:

```
my-app/
├── package.json            (includes: "shared-utils": "file:../shared")
├── public/
│   ├── index.html          (add: <meta name="color-scheme" content="light dark" />)
│   └── ...
├── src/
│   ├── App.css             (imports shared-styles, app-specific)
│   ├── App.js              (imports shared CSS and utilities)
│   ├── app-specific.css    (component-specific styles)
│   ├── shared-styles.css   (optional: reusable component styles)
│   ├── index.css           (global resets, body styles)
│   ├── index.js            (entry point)
│   └── ...
├── README.md
└── ...
```

### CSS organization in App.css

```css@import url("../../shared/theme-variables.css");
@import url("./shared-styles.css"); /* Optional: shared components */
@import url("./app-specific.css"); /* App-specific styling */
```

## Routing and Netlify notes

- If an app uses client-side routing, ensure deep links work on Netlify (e.g., add a redirect rule or set a basename).
- For CRA apps under subpaths, keep the `homepage` field aligned with the deployed path so asset URLs are correct.
- Redirect rules are not currently committed; if needed, add `netlify.toml` at repo root or `_redirects` in `homepage/` (copied into `build/`).

## CSS and Theme System

All projects use a **shared navy professional dark/light theme system** for consistency.

### Architecture

Apps are styled using modular CSS files:

1. **theme-variables.css** - CSS custom properties for dark/light themes (colors, gradients, shadows)
2. **shared-styles.css** - Reusable base styles (typography, layout, forms, buttons)
3. **app-specific.css** - App-specific components
4. **Main CSS file** - Imports the three modules above

See `CSS_SYSTEM.md` for detailed documentation.

### Using the theme system in a new app

1. Copy the theme variable definitions from an existing app (e.g., `game-draft/src/theme-variables.css`)
2. Create/organize your CSS using the modular approach above
3. Add the theme toggle button and script logic (see `homepage/script.js` for reference)
4. Always use CSS variables (e.g., `var(--bg-card)`, `var(--text-primary)`) instead of hard-coded colors

### Key implementation details

- **CSS selectors**: Use `html[data-theme="dark"]` and `html[data-theme="light"]`, NOT `body[data-theme]` (avoids cascade issues)
- **Theme toggle icon**: Show the _opposite_ icon to indicate what clicking will do (☀️ in dark mode, 🌙 in light mode)
- **Theme detection hierarchy**:
  1. Saved preference (localStorage)
  2. System preference (`prefers-color-scheme` media query)
  3. Default (light theme)
- **Meta tags**: Add `<meta name="color-scheme" content="light dark" />` for browser/extension compatibility

### Color palette (Navy Professional)

**Dark Theme:**

- Background: `#0a1128` → `#1c2541`
- Text: `#c9d1d9` (primary) → `#e6edf3` (headings)
- Accent: `#79c0ff` (blue), `#238636` (success)

**Light Theme:**

- Background: `#e6f0ff` → `#f0f4ff`
- Text: `#24292f` (primary) → `#0a1128` (headings)
- Accent: `#0969da` (blue), `#1a7f37` (success)

## Environment/config expectations

- No secrets are committed to the repo. Runtime secrets live in Netlify env vars (functions) or on the Pi for the Telegram bot.
- `functions/bin` expects `API_TOKEN` (Pushbullet) configured in Netlify env vars.
- `telegram-bot` runs on a home Raspberry Pi and expects `TELEGRAM_BOT_TOKEN` and `NOTION_TOKEN` in a local `.env` on that machine.

## Netlify Serverless Functions

Apps can use Netlify Functions (in `functions/`) to solve server-side problems like CORS proxying.

### Pattern: CORS proxy

If a front-end app needs to fetch from an external API that doesn't allow cross-origin requests:

1. Create a function in `functions/<app-name>/` that accepts the request parameters
2. Have the function fetch the external API server-side (no CORS issues)
3. Return the data to the client
4. Call the function from the client via `/.netlify/functions/<app-name>`

Example: `game-draft` uses `metacritic-proxy` to fetch game scores from Metacritic without CORS errors.

## Data persistence patterns

Apps use different persistence strategies depending on use case:

- **localStorage**: User's personal data that should persist across sessions (e.g., draft scores, preferences)
- **URL query params**: Data to be shared with others (can be encoded/decoded for complex objects)
- **Combination**: Save to localStorage for primary persistence, allow sharing via URL params with a prompt to merge or overwrite

Example: `game-draft` lets users save scores locally, but also generate shareable links that encode the entire draft state in the URL.

### Encoding complex data in URLs

For complex objects, use base64 URL-safe encoding:

```javascript
// Encode
const encoded = btoa(JSON.stringify(data))
	.replace(/\+/g, "-")
	.replace(/\//g, "_")
	.replace(/=/g, "");

// Decode
const decoded = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")));
```

## App-specific notes: Game Draft

`game-draft/` is a fantasy draft scoring tool with these features:

- **Metacritic integration**: Fetches game scores via the `metacritic-proxy` Netlify function
- **Shareable drafts**: Encodes the entire draft state in the URL (base64 encoded JSON)
- **View-only mode**: Shared links can be view-only (read-only state, no localStorage writes) or overwrite mode (asks user to confirm before replacing their data)
- **Dark/light theme**: Full dark mode support with system preference detection and manual toggle
- **Error handling**: Graceful fallback if Metacritic fetches fail; user can enter scores manually

Key files:

- `src/App.js`: Main component with state management
- `src/metacritic.js`: API integration
- `src/theme-variables.css`, `shared-styles.css`, `app-specific.css`: Modular CSS
- `public/index.html`: Includes color-scheme meta tag

## Potential improvements for future work

These are structural changes that would reduce duplication and improve consistency:

### 1. Centralized CSS System

Currently theme variables are duplicated in each app. Better approach:

- Create a `shared/` directory at the root with `theme.css` (or `theme-variables.css`)
- Have all apps import from this single source
- Prevents drift and makes color changes easier

Benefit: One place to update colors instead of multiple files.

### 2. Shared utilities library

Both homepage and game-draft have duplicate code:

- `initializeTheme()` and related functions (theme detection, toggle logic)
- URL encoding/decoding functions
- App card rendering logic

Better: Extract into `shared/utils.js` or similar that apps can import.

Benefit: DRY principle, easier to maintain, consistent behavior across apps.

### 3. Homepage field standardization

`game-draft/package.json` uses `"homepage": "https://lab.yamanickill.com/game-draft"` but should use relative path `/game-draft` to match other apps.

Benefit: Works consistently in both local dev and production; Netlify can handle the domain.

### 4. CSS linting

Add `stylelint` to Prettier pipeline or as separate check to enforce CSS conventions:

- Consistent selector format (e.g., always use `html[data-theme]`, never `body[data-theme]`)
- Variable naming standards
- Color consistency

Benefit: Prevents the CSS selector bug we hit (body vs html); improves code quality.

### 5. Consistent app structure

Not critical but could standardize:

- All apps use `src/` for source files
- All apps export main CSS as `App.css` that imports theme and shared styles
- Create a template/boilerplate for new apps

Benefit: Faster onboarding, less decision-making for new projects.

## Adding a new app (quick checklist)

1. **Create the app** (React preferred unless requested otherwise)
2. **Follow the app structure template** (see "App structure template" section above)
3. **Set `homepage`** in `package.json` to relative path (e.g., `/my-app`)
4. **Import shared theme** in your main CSS: `@import url('../../shared/theme-variables.css');`
5. **Add to homepage** in `homepage/script.js` (card definition + thumbnail image)
6. **Add build target** to root `Makefile` and update `copyBuilds` step
7. **Add color-scheme meta tag** to `public/index.html`: `<meta name="color-scheme" content="light dark" />`
8. **Add theme toggle button** (optional): `<button class="theme-toggle" id="themeToggle">☀️</button>`
9. **Initialize theme** in your JS if you added the toggle button (see `homepage/script.js` for example)
10. **Run CSS linter** before committing: `npm run lint:css`

## Gaps / unknowns

- None noted currently.
