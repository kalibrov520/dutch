const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_DECK_PATH = path.join(
  __dirname,
  "output",
  "flashcards",
  "dutch_english_flashcards.tsv"
);

function parseTsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split("\t");
  const frontIndex = headers.indexOf("Front");
  const backIndex = headers.indexOf("Back");
  const groupIndex = headers.indexOf("Group");
  const chapterIndex = headers.indexOf("Chapter");

  if (frontIndex === -1 || backIndex === -1) {
    throw new Error('TSV must include "Front" and "Back" columns.');
  }

  return lines.slice(1).map((line, index) => {
    const cells = line.split("\t");
    return {
      id: `${index + 1}`,
      front: cells[frontIndex] || "",
      back: cells[backIndex] || "",
      group: groupIndex >= 0 ? cells[groupIndex] || "" : "",
      chapter: chapterIndex >= 0 ? cells[chapterIndex] || "" : "",
    };
  });
}

function shuffle(cards) {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function loadDeckFromPath(deckPath) {
  const content = await fs.readFile(deckPath, "utf-8");
  const cards = parseTsv(content).filter((card) => card.front && card.back);
  if (!cards.length) {
    throw new Error("No cards found in the selected deck.");
  }

  return {
    deckPath,
    deckName: path.basename(deckPath),
    cards: shuffle(cards),
  };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 760,
    minWidth: 820,
    minHeight: 620,
    backgroundColor: "#f3efe4",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

ipcMain.handle("deck:load-default", async () => loadDeckFromPath(DEFAULT_DECK_PATH));

ipcMain.handle("deck:load-from-dialog", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Choose a TSV deck",
    filters: [{ name: "TSV files", extensions: ["tsv"] }],
    properties: ["openFile"],
  });

  if (canceled || !filePaths[0]) {
    return { canceled: true };
  }

  const deck = await loadDeckFromPath(filePaths[0]);
  return { canceled: false, ...deck };
});

ipcMain.handle("deck:restart", async (_event, deckPath) => loadDeckFromPath(deckPath || DEFAULT_DECK_PATH));

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
