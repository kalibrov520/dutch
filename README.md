# Dutch Flashcards Desktop App

Minimal Electron app for studying TSV-based vocabulary decks.

## Run

```bash
npm install
npm start
```

## TSV format

The app expects a tab-separated file with at least these columns:

```text
Front    Back
```

It also understands optional `Group` and `Chapter` columns and shows them under the card when present.

By default, the app opens:

`output/flashcards/dutch_english_flashcards.tsv`

You can load another `.tsv` deck at any time from the app window.
