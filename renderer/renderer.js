const RANDOM_SESSION_SIZE = 30;

const state = {
  deckPath: "",
  deckName: "",
  fileType: "",
  allCards: [],
  chapters: [],
  themes: [],
  sessionCards: [],
  currentIndex: 0,
  revealed: false,
  selectedMode: "",
};

const elements = {
  titleView: document.querySelector("#title-view"),
  studyView: document.querySelector("#study-view"),
  messagePanel: document.querySelector("#message-panel"),
  deckName: document.querySelector("#deck-name"),
  progressText: document.querySelector("#progress-text"),
  flashcard: document.querySelector("#flashcard"),
  cardLabel: document.querySelector("#card-label"),
  cardFront: document.querySelector("#card-front"),
  cardBack: document.querySelector("#card-back"),
  cardMeta: document.querySelector("#card-meta"),
  revealButton: document.querySelector("#reveal-button"),
  nextButton: document.querySelector("#next-button"),
  loadDeckButton: document.querySelector("#load-deck-button"),
  startSessionButton: document.querySelector("#start-session-button"),
  selectorPanel: document.querySelector("#selector-panel"),
  modeSelectLabel: document.querySelector("#mode-select-label"),
  modeSelect: document.querySelector("#mode-select"),
  modeCards: [...document.querySelectorAll(".mode-card")],
};

function shuffle(cards) {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function showMessage(message) {
  elements.messagePanel.textContent = message;
  elements.messagePanel.classList.remove("hidden");
}

function hideMessage() {
  elements.messagePanel.textContent = "";
  elements.messagePanel.classList.add("hidden");
}

function currentCard() {
  return state.sessionCards[state.currentIndex];
}

function updateProgress() {
  const total = state.sessionCards.length;
  const current = total === 0 ? 0 : Math.min(state.currentIndex + 1, total);
  elements.progressText.textContent = `${current} / ${total}`;
}

function updateModeSelectionUI() {
  for (const card of elements.modeCards) {
    card.classList.toggle("selected", card.dataset.mode === state.selectedMode);
  }
}

function showSelector(label, options) {
  elements.selectorPanel.classList.remove("hidden");
  elements.modeSelectLabel.textContent = label;
  elements.modeSelect.innerHTML = "";

  for (const option of options) {
    const optionElement = document.createElement("option");
    optionElement.value = option;
    optionElement.textContent = option;
    elements.modeSelect.append(optionElement);
  }
}

function hideSelector() {
  elements.selectorPanel.classList.add("hidden");
  elements.modeSelect.innerHTML = "";
}

function configureMode(mode) {
  state.selectedMode = mode;
  updateModeSelectionUI();

  if (mode === "chapter") {
    if (!state.chapters.length) {
      showMessage("This deck does not include chapter data yet. Try a DOCX file or a TSV with a Chapter column.");
      hideSelector();
      return;
    }
    hideMessage();
    showSelector("Choose hoofdstuk", state.chapters);
    return;
  }

  if (mode === "theme") {
    if (!state.themes.length) {
      showMessage("This deck does not include theme data yet. Try a DOCX file or a TSV with a Group column.");
      hideSelector();
      return;
    }
    hideMessage();
    showSelector("Choose theme", state.themes);
    return;
  }

  hideMessage();
  hideSelector();
}

function renderTitleScreen(message = "") {
  state.sessionCards = [];
  state.currentIndex = 0;
  state.revealed = false;

  elements.studyView.classList.add("hidden");
  elements.titleView.classList.remove("hidden");
  elements.progressText.textContent = "0 / 0";

  if (message) {
    showMessage(message);
  } else {
    hideMessage();
  }

  if (!state.selectedMode) {
    configureMode("all-random");
  } else {
    configureMode(state.selectedMode);
  }
}

function renderCurrentCard() {
  const card = currentCard();
  if (!card) {
    renderTitleScreen("That’s all for today. Pick an approach to start again.");
    return;
  }

  state.revealed = false;
  elements.titleView.classList.add("hidden");
  elements.studyView.classList.remove("hidden");

  elements.cardLabel.textContent = "Click the card to reveal";
  elements.cardFront.textContent = card.front;
  elements.cardBack.textContent = card.back;
  elements.cardBack.classList.add("hidden");
  elements.cardMeta.textContent = [card.group, card.chapter].filter(Boolean).join("  •  ");
  elements.revealButton.classList.remove("hidden");
  elements.nextButton.classList.add("hidden");
  updateProgress();
}

function revealCurrentCard() {
  if (state.revealed) {
    return;
  }

  state.revealed = true;
  elements.cardLabel.textContent = "Definition";
  elements.cardBack.classList.remove("hidden");
  elements.revealButton.classList.add("hidden");
  elements.nextButton.classList.remove("hidden");
}

function setDeck(deck) {
  state.deckPath = deck.deckPath;
  state.deckName = deck.deckName;
  state.fileType = deck.fileType;
  state.allCards = deck.cards;
  state.chapters = deck.chapters;
  state.themes = deck.themes;
  state.selectedMode = "";

  elements.deckName.textContent = `${state.deckName} (${state.allCards.length} words)`;
  renderTitleScreen();
}

function buildSessionCards() {
  if (state.selectedMode === "chapter") {
    const chapter = elements.modeSelect.value;
    return shuffle(state.allCards.filter((card) => card.chapter === chapter));
  }

  if (state.selectedMode === "theme") {
    const theme = elements.modeSelect.value;
    return shuffle(state.allCards.filter((card) => card.group === theme));
  }

  if (state.selectedMode === "random30") {
    return shuffle(state.allCards).slice(0, Math.min(RANDOM_SESSION_SIZE, state.allCards.length));
  }

  return shuffle(state.allCards);
}

function startSession() {
  if (!state.allCards.length) {
    showMessage("Load a vocabulary file first.");
    return;
  }

  if ((state.selectedMode === "chapter" || state.selectedMode === "theme") && !elements.modeSelect.value) {
    showMessage("Choose a specific option before starting the session.");
    return;
  }

  const sessionCards = buildSessionCards();
  if (!sessionCards.length) {
    showMessage("No cards were found for that selection.");
    return;
  }

  state.sessionCards = sessionCards;
  state.currentIndex = 0;
  state.revealed = false;
  hideMessage();
  renderCurrentCard();
}

function nextCard() {
  if (!state.revealed) {
    revealCurrentCard();
    return;
  }

  state.currentIndex += 1;
  renderCurrentCard();
}

async function loadDefaultDeck() {
  try {
    const deck = await window.flashcards.loadDefaultDeck();
    setDeck(deck);
  } catch (error) {
    showMessage(error.message || "Could not load the default deck.");
  }
}

async function loadDeckFromDialog() {
  try {
    const result = await window.flashcards.loadDeckFromDialog();
    if (!result || result.canceled) {
      return;
    }
    setDeck(result);
  } catch (error) {
    showMessage(error.message || "Could not load the selected deck.");
  }
}

elements.flashcard.addEventListener("click", revealCurrentCard);
elements.revealButton.addEventListener("click", revealCurrentCard);
elements.nextButton.addEventListener("click", nextCard);
elements.loadDeckButton.addEventListener("click", loadDeckFromDialog);
elements.startSessionButton.addEventListener("click", startSession);
elements.modeCards.forEach((modeCard) => {
  modeCard.addEventListener("click", () => configureMode(modeCard.dataset.mode));
});

window.addEventListener("keydown", (event) => {
  if (event.key !== " " && event.key !== "Enter") {
    return;
  }

  if (!state.sessionCards.length || elements.studyView.classList.contains("hidden")) {
    return;
  }

  event.preventDefault();
  if (state.revealed) {
    nextCard();
  } else {
    revealCurrentCard();
  }
});

loadDefaultDeck();
