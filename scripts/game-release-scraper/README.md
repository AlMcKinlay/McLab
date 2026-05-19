# Game Release Date Scraper

Scrapes release dates for games from multiple sources: Steam, IGDB, Metacritic, GOG, Epic Games, and Wikipedia.

## Installation

```bash
npm install
```

## Usage

### Command Line

```bash
# From CSV
node index.js games.csv

# From JSON
node index.js games.json

# With custom output file
node index.js games.csv results.json
```

### Input Formats

#### CSV

```csv
name
The Legend of Zelda: Breath of the Wild
Elden Ring
Baldur's Gate 3
```

#### JSON (Array of strings)

```json
["The Legend of Zelda: Breath of the Wild", "Elden Ring", "Baldur's Gate 3"]
```

#### JSON (Array of objects)

```json
[
	{ "name": "The Legend of Zelda: Breath of the Wild" },
	{ "name": "Elden Ring" },
	{ "name": "Baldur's Gate 3" }
]
```

## Output

The script generates a JSON file with results:

```json
[
	{
		"name": "The Legend of Zelda: Breath of the Wild",
		"releaseDate": "2017-03-03",
		"primarySource": "steam",
		"sources": {
			"steam": {
				"date": "2017-03-03",
				"url": "https://store.steampowered.com/app/..."
			},
			"metacritic": {
				"date": "Mar 03, 2017",
				"url": "https://www.metacritic.com/..."
			}
		},
		"allMatches": [
			{
				"source": "steam",
				"date": "2017-03-03",
				"url": "https://store.steampowered.com/app/...",
				"match": "The Legend of Zelda: Breath of the Wild"
			}
		]
	}
]
```

## Features

- **Multiple Sources**: Checks Steam, IGDB, Metacritic, GOG, Epic Games, and Wikipedia
- **Parallel Scraping**: Queries multiple sources simultaneously (with timeouts)
- **Flexible Input**: Supports both CSV and JSON formats
- **Detailed Output**: Returns all matched sources and dates found
- **Rate Limiting**: Includes delays between requests to avoid blocking
- **Error Handling**: Gracefully handles timeouts and scraping failures

## Configuration

### API Keys (Optional)

For IGDB, you can provide authentication by setting environment variables:

```bash
export IGDB_CLIENT_ID=your_client_id
export IGDB_ACCESS_TOKEN=your_access_token
```

## Development

```bash
npm run dev  # Run with watch mode
```

## Notes

- Steam may require the game to be available on their platform
- Metacritic works best for well-known games
- Wikipedia is most reliable for classic/historical games
- Epic Games API is unofficial and may change
- GOG API search works well for games in their catalog
- Results are sorted by date (earliest first in `allMatches`)
- Each source query has a 5-second timeout to prevent hanging

## Limitations

- Some games may not be available on all platforms
- Release dates may vary by region (typically uses first worldwide release)
- Scrapers respect general rate limiting practices but may rate-limit if called too frequently
- Website HTML/API changes may break scrapers periodically
