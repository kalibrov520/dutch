# Dutch Flashcards Desktop App

Minimal Electron app for studying vocabulary from `.docx` or `.tsv` decks.

## Run

```bash
npm install
npm start
```

## Supported input

The app can load:

- `.docx` vocabulary lists like `Woordenlijst_Dutch_English.docx`
- `.tsv` decks with at least these columns:

```text
Front    Back
```

It also understands optional `Group` and `Chapter` columns and shows them under the card when present.

By default, the app opens:

`Woordenlijst_Dutch_English.docx`

## Study modes

After loading a file, the title screen lets you start a session:

- By Hoofdstuk
- By Theme
- Random Selection of 30 Words
- All words in random order

When a session ends, the app returns to the title screen so you can choose a new approach right away.
