# PDF Text Extractor

Reads a CSV of PDF URLs, downloads each PDF, extracts its text, splits long text into 1000-character chunks, and writes the results to JSON and chunked CSV files. Optionally syncs the results to a Synerise catalog.

## Requirements

- Node.js 18+ (uses native `fetch`)
- Python 3.8+ (only for the auxiliary scripts in `output/`)

## Setup

```bash
cd SCRAPER/pdf
npm install
```

Create a `.env` file in the project root (`SCRAPER/pdf/.env`):

```env
SOURCE_FILE=path/to/your/input.csv

# Optional - only needed if syncing to Synerise
SYNERISE_API_KEY=...
SYNERISE_CATALOG_ID=...
SYNERISE_API_BASE_URL=https://api.azu.synerise.com
SYNC_SYNERISE=false
```

## Input CSV format

The source CSV must contain at least these columns:

| Column            | Purpose                                                                 |
|-------------------|-------------------------------------------------------------------------|
| `url`             | URL of the PDF to download                                              |
| `fileName`        | Used as the final `id` in the output                                    |
| `productCategory` | Renamed to `category` in the output (the original column is dropped)    |

Any other columns are passed through to the output unchanged.

## Run

Plain run (writes JSON + CSV parts to `output/`):

```bash
npm start
```

Run and also push results to Synerise:

```bash
npm run start:sync
```

`SYNC_SYNERISE=true` in `.env` works too.

## What it does, step by step

1. Loads `SOURCE_FILE` and **deduplicates** rows by `url` (keeps the first occurrence).
2. For each unique URL: downloads the PDF, extracts text with [`unpdf`](https://github.com/unjs/unpdf), splits into ≤1000-char chunks on word boundaries.
3. Builds output rows where:
   - `content` — the chunk text
   - `itemId` — the URL-derived id (filename without `.pdf`), with `_N` appended when chunked
   - `id` — taken from the source row's `fileName`
   - `title` — the URL-derived id
   - `category` — taken from the source row's `productCategory`
   - all other source columns pass through
4. Saves the full result set to `output/<date>_documentPages.json` via `saveResults`.
5. Calls `exportCsv` which writes the same data as `output/<date>_documentPages_decoded_partN.csv`:
   - URL-decodes `%XX` sequences in every cell except `imageUrl`, `url`, `content`
   - Splits the CSV when a part would exceed 190 MB

If a PDF fails to download / parse, a row is still emitted with `content = "ERROR: <message>"` so failures are visible in the output.

## Output files

```
output/
  <date>_documentPages.json
  <date>_documentPages_decoded_part1.csv
  <date>_documentPages_decoded_part2.csv   (if data exceeds 190 MB)
  ...
```

## Auxiliary Python scripts (`output/`)

These are one-off fixers for CSVs that were produced before a schema change. Each one rewrites files in place via a `.tmp` swap. Default file pattern is set inside each script; pass paths as arguments to override.

- `fix_id_columns.py` — for each row: `itemId = id`, then `id = fileName`. Use on CSVs produced before `index.js` started doing this.
- `remove_category_column.py` — drops the `category` column. Use on CSVs that have a stale `category` column you no longer want.
- `json_to_csv.py`, `decode_percent.py`, `split_csv.py` — the original Python pipeline (JSON → CSV → URL-decoded → chunked). These three are now superseded by [`src/exportCsv.js`](src/exportCsv.js), which runs automatically after each `npm start`.

```bash
python output/fix_id_columns.py
python output/remove_category_column.py
```

## Project layout

```
SCRAPER/pdf/
  src/
    index.js        # entrypoint
    storage.js      # writes the JSON result
    exportCsv.js    # writes the URL-decoded, byte-capped CSV parts
    syne-client.js  # Synerise catalog upload
  config.js         # env loader + exported constants
  output/           # results + Python fixers
  package.json
```
