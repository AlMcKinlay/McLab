# Game Draft Scorer

A web app for tracking Metacritic scores in a fantasy game draft.

## Features

- Add multiple players with 5 games each
- Automatically fetch Metacritic scores for games
- Calculate total scores for each player
- All data persists in browser localStorage
- **4 visual themes to choose from:**
  - **Classic Purple**: Original gradient purple design with smooth shadows
  - **Clean Minimal**: Light, minimalist design with subtle borders
  - **Dark Mode**: Dark background with cyan accents and glowing effects
  - **Neon Gaming**: Bold, cyberpunk-inspired theme with neon colors

## Usage

1. Click "Add Player" to add players to the draft
2. Enter player names and their 5 game choices
3. Click "Calculate Scores" to fetch Metacritic scores
4. If any scores couldn't be fetched (showing as 0), manually edit them in the results view
5. View total scores for each player
6. Click "Back to Edit" to modify players/games

## Development

```bash
npm install
npm start
```

## Build

```bash
npm run build
```

## Notes

- Metacritic scores are fetched using a CORS proxy (corsproxy.io)
- Some games may not be found automatically - you can manually enter scores
- Data is saved to browser localStorage automatically
