const state = {
  deckPath: "",
  deckName: "",
  cards: [],
  currentIndex: 0,
  revealed: false,
};

const elements = {
  studyView: document.querySelector("#study-view"),
  endView: document.querySelector("#end-view"),
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
  restartButton: document.querySelector("#restart-button"),
  endLoadButton: document.querySelector("#end-load-button"),
};

function showMessage(message) {
  elements.messagePanel.textContent = message;
  elements.messagePanel.classList.remove("hidden");
}

function hideMessage() {
  elements.messagePanel.textContent = "";
  elements.messagePanel.classList.add("hidden");
}

function currentCard() {
  return state.cards[state.currentIndex];
}

function updateProgress() {
  const total = state.cards.length;
  const current = total === 0 ? 0 : Math.min(state.currentIndex + 1, total);
  elements.progressText.textContent = `${current} / ${total}`;
}

function renderCurrentCard() {
  const card = currentCard();
  if (!card) {
    renderEndScreen();
    return;
  }

  state.revealed = false;
  elements.studyView.classList.remove("hidden");
  elements.endView.classList.add("hidden");

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

function renderEndScreen() {
  elements.studyView.classList.add("hidden");
  elements.endView.classList.remove("hidden");
  elements.progressText.textContent = `${state.cards.length} / ${state.cards.length}`;
}

function setDeck(deck) {
  state.deckPath = deck.deckPath;
  state.deckName = deck.deckName;
  state.cards = deck.cards;
  state.currentIndex = 0;
  state.revealed = false;

  elements.deckName.textContent = state.deckName;
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

async function restartDeck() {
  try {
    const deck = await window.flashcards.restartDeck(state.deckPath);
    setDeck(deck);
  } catch (error) {
    showMessage(error.message || "Could not restart the deck.");
  }
}

elements.flashcard.addEventListener("click", revealCurrentCard);
elements.revealButton.addEventListener("click", revealCurrentCard);
elements.nextButton.addEventListener("click", nextCard);
elements.loadDeckButton.addEventListener("click", loadDeckFromDialog);
elements.restartButton.addEventListener("click", restartDeck);
elements.endLoadButton.addEventListener("click", loadDeckFromDialog);

window.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    if (!state.cards.length) {
      return;
    }
    if (state.currentIndex >= state.cards.length) {
      return;
    }
    if (state.revealed) {
      nextCard();
    } else {
      revealCurrentCard();
    }
  }
});

loadDefaultDeck();
