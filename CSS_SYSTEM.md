# Navy Professional Theme System

## Overview

The CSS styling has been refactored into a modular, reusable system using a navy professional dark/light theme. This system is designed to be used across all McLab projects.

## Files Structure

### Game Draft App

```
game-draft/src/
├── App.css                    # Main file - imports all modules
├── theme-variables.css        # Color and theme variables (dark/light)
├── shared-styles.css          # Reusable base styles
└── app-specific.css           # Game-draft specific components
```

### Homepage

```
homepage/
├── index.html                 # Updated with theme toggle button
├── styles.css                 # Navy professional theme variables + app styles
└── script.js                  # Theme initialization and toggle logic
```

## CSS Architecture

### 1. Theme Variables (`theme-variables.css`)

Defines CSS custom properties (variables) for both dark and light themes:

**Dark Theme:** Navy blues with light text

- Background: `#0a1128` (primary) → `#1c2541` (secondary)
- Text: `#c9d1d9` (primary) → `#e6edf3` (headings)
- Accent: `#79c0ff` (blue)
- Success: `#238636` (green)

**Light Theme:** Light backgrounds with dark text

- Background: `#e6f0ff` (primary) → `#f0f4ff` (secondary)
- Text: `#24292f` (primary) → `#0a1128` (headings)
- Accent: `#0969da` (blue)
- Success: `#1a7f37` (green)

**Variables included:**

- Background colors (primary, secondary, tertiary, card, input)
- Text colors (primary, heading, secondary, accent)
- Border colors (primary, secondary)
- Action colors (success, danger, info)
- Gradients (background, card)
- Shadows (sm, md, lg, hover)
- Focus rings

### 2. Shared Base Styles (`shared-styles.css`)

Reusable styles that work across all projects:

- **Reset & Root:** Global defaults
- **Typography:** Heading and text styles
- **Layout:** Container styles
- **Form Elements:** Inputs, buttons, cards
- **Messages & Alerts:** Error/success messages
- **Responsive Design:** Mobile breakpoints

All colors use CSS variables, so they automatically adapt to the theme.

### 3. App-Specific Styles (`app-specific.css`)

Game-draft specific components:

- Theme toggle button (fixed position)
- User list grid layout
- Results section and cards
- Game scores display
- User totals
- Responsive adjustments

## How to Use This System

### Applying to New Projects

1. **Copy the theme variables:**

   ```css
   /* Add to your styles.css or import theme-variables.css */
   body[data-theme="dark"] {
   	/* variables */
   }
   body[data-theme="light"] {
   	/* variables */
   }
   body {
   	/* default variables */
   }
   ```

2. **Use CSS variables in your styles:**

   ```css
   .my-element {
   	background: var(--bg-card);
   	color: var(--text-primary);
   	border: 1px solid var(--border-primary);
   	box-shadow: var(--shadow-lg);
   }
   ```

3. **Add theme toggle button (optional):**

   ```html
   <button class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode">
   	☀️
   </button>
   ```

4. **Initialize theme detection (optional):**
   ```javascript
   function initializeTheme() {
   	const savedTheme = localStorage.getItem("theme");
   	const prefersDark = window.matchMedia(
   		"(prefers-color-scheme: dark)",
   	).matches;
   	const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
   	document.documentElement.setAttribute("data-theme", initialTheme);
   }
   ```

### Customizing Colors

Edit `theme-variables.css` to customize any color:

```css
body[data-theme="dark"] {
	--color-success: #238636; /* Change this value */
}
```

All elements using `var(--color-success)` will automatically update.

## Browser Support

- Modern browsers with CSS custom properties support
- Dark mode detection via `prefers-color-scheme` media query
- Color scheme meta tag for browser/extension compatibility

## Responsive Design

Both apps include responsive breakpoints at `768px`:

- Container padding reduces on mobile
- Typography sizes adjust
- Grid layouts become single column
- Buttons full-width on small screens

## Theme Detection

The system respects user preferences in this order:

1. **Saved preference** (localStorage) - persists across sessions
2. **System preference** (`prefers-color-scheme`) - respects OS settings
3. **Default** (light theme) - fallback

## Files Modified

### Game Draft

- `App.css` - Replaced with modular imports (13 lines → 3 lines with imports)
- Created `theme-variables.css` (106 lines)
- Created `shared-styles.css` (209 lines)
- Created `app-specific.css` (169 lines)

### Homepage

- `index.html` - Added color-scheme meta tag and theme toggle button
- `styles.css` - Replaced with navy professional theme (149 lines, organized by sections)
- `script.js` - Added theme initialization and toggle functionality

## Benefits

✅ **Consistent Branding:** Same professional navy theme across all apps
✅ **Maintainable:** Colors defined in one place, easy to update
✅ **Reusable:** Copy theme variables to new projects
✅ **Accessible:** High contrast colors, focus states
✅ **Performant:** CSS variables are native browser feature
✅ **User Preference:** Respects system dark mode settings
✅ **Readable:** Well-organized, commented code

## Example: Adding a New Styled Component

```css
/* In your app's CSS file */
@import url("./theme-variables.css");
@import url("./shared-styles.css");

.custom-card {
	padding: 1.5rem;
	background: var(--bg-card);
	color: var(--text-primary);
	border: 1px solid var(--border-primary);
	border-radius: 8px;
	box-shadow: var(--shadow-lg);
	transition: all 0.2s;
}

.custom-card:hover {
	border-color: var(--text-accent);
	box-shadow: var(--shadow-hover);
}
```

The component will automatically support both light and dark themes!
