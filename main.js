const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { XMLParser } = require("fast-xml-parser");
const yauzl = require("yauzl-promise");

const DEFAULT_DECK_PATH = path.join(__dirname, "Woordenlijst_Dutch_English.docx");
const DEFAULT_IRREGULAR_DECK_PATH = path.join(
  __dirname,
  "output",
  "flashcards",
  "onregelmatige_werkwoorden.tsv"
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
  const deckTypeIndex = headers.indexOf("DeckType");
  const infinitiefIndex = headers.indexOf("Infinitief");
  const imperfectumIndex = headers.indexOf("Imperfectum");
  const perfectumIndex = headers.indexOf("Perfectum");
  const englishIndex = headers.indexOf("English");

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
      deckType: deckTypeIndex >= 0 ? cells[deckTypeIndex] || "" : "",
      infinitief: infinitiefIndex >= 0 ? cells[infinitiefIndex] || "" : "",
      imperfectum: imperfectumIndex >= 0 ? cells[imperfectumIndex] || "" : "",
      perfectum: perfectumIndex >= 0 ? cells[perfectumIndex] || "" : "",
      english: englishIndex >= 0 ? cells[englishIndex] || "" : "",
    };
  });
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [value];
}

function extractText(node) {
  if (!node) {
    return "";
  }

  if (typeof node === "string") {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map(extractText).join(" ").trim();
  }

  const textParts = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === "#text") {
      textParts.push(value);
      continue;
    }

    if (key.startsWith("@_")) {
      continue;
    }

    textParts.push(extractText(value));
  }

  return textParts.join(" ").replace(/\s+/g, " ").trim();
}

async function readZipEntry(zipPath, entryName) {
  const zip = await yauzl.open(zipPath);
  try {
    let entry = null;
    for await (const candidate of zip) {
      if (candidate.filename === entryName) {
        entry = candidate;
        break;
      }
    }

    if (!entry) {
      throw new Error(`Could not find ${entryName} in the selected DOCX file.`);
    }

    const stream = await entry.openReadStream();
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally {
    await zip.close();
  }
}

function looksLikeIdiom(text) {
  const normalized = text.toLowerCase();
  if (normalized.endsWith(", de") || normalized.endsWith(", het")) {
    return false;
  }

  const idiomMarkers = [
    " – ",
    "(",
    ")",
    "geen ",
    "het komt",
    "er is",
    "dan wordt",
    "van – tot",
    "uit de –",
    "met alle",
    "onder – of banken",
    "voor het –",
  ];

  return text.includes(",") || idiomMarkers.some((marker) => normalized.includes(marker));
}

function chooseGroup(dutch, english) {
  const englishLower = english.toLowerCase();

  const connectorWords = [
    "since",
    "because",
    "therefore",
    "after that",
    "provided",
    "unless",
    "although",
    "meanwhile",
    "so that",
    "as long as",
    "by the way",
    "moreover",
    "for the sake of",
    "thanks to",
    "hence",
    "at all times",
    "as one goes",
    "if / in case",
    "especially",
    "in particular",
  ];
  if (connectorWords.some((word) => englishLower.includes(word))) {
    return "Connectors and framing";
  }

  if (looksLikeIdiom(dutch)) {
    return "Idioms and fixed expressions";
  }

  const mindWords = [
    "mind",
    "spirit",
    "emotion",
    "feeling",
    "sensitive",
    "tense",
    "surprise",
    "annoy",
    "confus",
    "hope",
    "conviction",
    "belief",
    "worry",
    "concern",
    "moved",
    "speechless",
    "hesitat",
    "addicted",
    "reason",
    "sense",
  ];
  if (mindWords.some((word) => englishLower.includes(word))) {
    return "Mind, emotion, and reaction";
  }

  const communicationWords = [
    "claim",
    "assert",
    "suggest",
    "expression",
    "utterance",
    "reply",
    "counterargument",
    "convince",
    "persuade",
    "interpret",
    "view",
    "opinion",
    "discuss",
    "talk",
    "mention",
    "appeal",
    "call upon",
    "tone",
    "jargon",
    "say",
    "scrutinize",
    "emphasize",
  ];
  if (communicationWords.some((word) => englishLower.includes(word))) {
    return "Communication and ideas";
  }

  const societyWords = [
    "market",
    "manager",
    "leadership",
    "majority",
    "countryside",
    "purchase",
    "acquisition",
    "maintenance",
    "support",
    "requirement",
    "demand",
    "priority",
    "resistance",
    "achievement",
    "performance",
    "appointment",
    "guide",
    "preschooler",
    "group",
    "circle",
    "work",
    "effort",
    "commitment",
    "approach",
    "setup",
  ];
  if (societyWords.some((word) => englishLower.includes(word))) {
    return "Society, work, and structure";
  }

  const actionWords = [
    "to ",
    "reduce",
    "increase",
    "invent",
    "observe",
    "perceive",
    "create",
    "deviate",
    "control",
    "throw",
    "pile",
    "roll up",
    "handle",
    "promote",
    "furnish",
    "set up",
    "maintain",
    "devote",
    "conquer",
    "weaken",
    "demonstrate",
    "complete",
    "expose",
    "take over",
    "consider",
    "remove",
    "continue",
    "devour",
    "perform",
  ];
  if (actionWords.some((word) => englishLower.includes(word))) {
    return "Actions and change";
  }

  return "Things, qualities, and descriptions";
}

async function parseDocx(docxPath) {
  const xml = await readZipEntry(docxPath, "word/document.xml");
  const parser = new XMLParser({
    ignoreAttributes: false,
    preserveOrder: false,
    trimValues: true,
  });
  const document = parser.parse(xml);
  const body = document?.["w:document"]?.["w:body"];
  const table = asArray(body?.["w:tbl"])[0];
  const rows = asArray(table?.["w:tr"]);

  if (!rows.length) {
    throw new Error("No vocabulary table found in the selected DOCX file.");
  }

  const cards = [];
  let chapter = "";

  for (const row of rows) {
    const cells = asArray(row?.["w:tc"]).map((cell) => extractText(cell).trim()).filter(Boolean);

    if (cells.length === 1 && cells[0].startsWith("Hoofdstuk ")) {
      chapter = cells[0];
      continue;
    }

    if (cells.length < 2) {
      continue;
    }

    const [left, right] = cells;
    if (!left || !right) {
      continue;
    }
    if (left === "Nederlands" && right === "English") {
      continue;
    }
    if (left.startsWith("Hoofdstuk ")) {
      chapter = left;
      continue;
    }

    cards.push({
      id: `${cards.length + 1}`,
      front: left,
      back: right,
      chapter: chapter || "",
      group: chooseGroup(left, right),
    });
  }

  return cards;
}

function normalizeCards(cards) {
  const filtered = cards.filter((card) => card.front && card.back);
  if (!filtered.length) {
    throw new Error("No cards found in the selected deck.");
  }

  return filtered.map((card, index) => ({
    id: card.id || `${index + 1}`,
    front: card.front,
    back: card.back,
    chapter: card.chapter || "",
    group: card.group || "",
    deckType: card.deckType || "",
    infinitief: card.infinitief || "",
    imperfectum: card.imperfectum || "",
    perfectum: card.perfectum || "",
    english: card.english || "",
  }));
}

async function loadDeckFromPath(deckPath) {
  const extension = path.extname(deckPath).toLowerCase();
  let cards;

  if (extension === ".tsv") {
    const content = await fs.readFile(deckPath, "utf-8");
    cards = parseTsv(content);
  } else if (extension === ".docx") {
    cards = await parseDocx(deckPath);
  } else {
    throw new Error("Please choose a .tsv or .docx file.");
  }

  const normalizedCards = normalizeCards(cards);
  const chapters = [...new Set(normalizedCards.map((card) => card.chapter).filter(Boolean))];
  const themes = [...new Set(normalizedCards.map((card) => card.group).filter(Boolean))];

  return {
    deckPath,
    deckName: path.basename(deckPath),
    fileType: extension.replace(".", ""),
    cards: normalizedCards,
    chapters,
    themes,
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
ipcMain.handle("irregular:load-default", async () => loadDeckFromPath(DEFAULT_IRREGULAR_DECK_PATH));

ipcMain.handle("deck:load-from-dialog", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Choose a vocabulary file",
    filters: [
      { name: "Vocabulary files", extensions: ["docx", "tsv"] },
      { name: "DOCX files", extensions: ["docx"] },
      { name: "TSV files", extensions: ["tsv"] },
    ],
    properties: ["openFile"],
  });

  if (canceled || !filePaths[0]) {
    return { canceled: true };
  }

  const deck = await loadDeckFromPath(filePaths[0]);
  return { canceled: false, ...deck };
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
