const RANDOM_SESSION_SIZE = 30;
const IRREGULAR_CHECK_SIZE = 30;

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
  selectedBrowseMode: "",
  irregularDeckName: "",
  irregularCards: [],
  irregularQuizCards: [],
  irregularQuizIndex: 0,
  irregularAdvanceTimeout: null,
};

const elements = {
  titleView: document.querySelector("#title-view"),
  studyView: document.querySelector("#study-view"),
  browseSelectView: document.querySelector("#browse-select-view"),
  browseDetailView: document.querySelector("#browse-detail-view"),
  irregularLearnView: document.querySelector("#irregular-learn-view"),
  irregularCheckView: document.querySelector("#irregular-check-view"),
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
  modeCards: [...document.querySelectorAll(".mode-card[data-mode]")],
  browseCards: [...document.querySelectorAll(".browse-card")],
  browseSelectTitle: document.querySelector("#browse-select-title"),
  browseSelectList: document.querySelector("#browse-select-list"),
  browseSelectBackHomeButton: document.querySelector("#browse-select-back-home-button"),
  browseDetailTitle: document.querySelector("#browse-detail-title"),
  browseDetailList: document.querySelector("#browse-detail-list"),
  browseDetailBackButton: document.querySelector("#browse-detail-back-button"),
  browseDetailHomeButton: document.querySelector("#browse-detail-home-button"),
  irregularLearnButton: document.querySelector("#irregular-learn-button"),
  irregularCheckButton: document.querySelector("#irregular-check-button"),
  irregularLearnBackButton: document.querySelector("#irregular-learn-back-button"),
  irregularLearnList: document.querySelector("#irregular-learn-list"),
  irregularCheckBackButton: document.querySelector("#irregular-check-back-button"),
  irregularPrompt: document.querySelector("#irregular-check-prompt"),
  irregularCheckProgress: document.querySelector("#irregular-check-progress"),
  irregularTranslationInput: document.querySelector("#irregular-translation-input"),
  irregularImperfectumInput: document.querySelector("#irregular-imperfectum-input"),
  irregularPerfectumInput: document.querySelector("#irregular-perfectum-input"),
  irregularTranslationHint: document.querySelector("#irregular-translation-hint"),
  irregularImperfectumHint: document.querySelector("#irregular-imperfectum-hint"),
  irregularPerfectumHint: document.querySelector("#irregular-perfectum-hint"),
  irregularCheckFeedback: document.querySelector("#irregular-check-feedback"),
  irregularCheckSubmitButton: document.querySelector("#irregular-check-submit-button"),
};

function shuffle(cards) {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function clearIrregularAdvanceTimeout() {
  if (state.irregularAdvanceTimeout) {
    window.clearTimeout(state.irregularAdvanceTimeout);
    state.irregularAdvanceTimeout = null;
  }
}

function hideAllViews() {
  elements.titleView.classList.add("hidden");
  elements.studyView.classList.add("hidden");
  elements.browseSelectView.classList.add("hidden");
  elements.browseDetailView.classList.add("hidden");
  elements.irregularLearnView.classList.add("hidden");
  elements.irregularCheckView.classList.add("hidden");
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
  clearIrregularAdvanceTimeout();
  state.sessionCards = [];
  state.currentIndex = 0;
  state.revealed = false;

  hideAllViews();
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

  clearIrregularAdvanceTimeout();
  state.revealed = false;
  hideAllViews();
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
  state.selectedBrowseMode = "";

  elements.deckName.textContent = `${state.deckName} (${state.allCards.length} words)`;
  renderTitleScreen();
}

function setIrregularDeck(deck) {
  state.irregularDeckName = deck.deckName;
  state.irregularCards = deck.cards.filter((card) => card.deckType === "irregular-verbs");
}

function browseOptionsForMode(mode) {
  if (mode === "chapter") {
    return state.chapters.map((chapter) => ({
      name: chapter,
      cards: state.allCards.filter((card) => card.chapter === chapter),
    }));
  }

  if (mode === "theme") {
    return state.themes.map((theme) => ({
      name: theme,
      cards: state.allCards.filter((card) => card.group === theme),
    }));
  }

  return [];
}

function renderBrowseSelectionView(mode) {
  if (mode === "chapter" && !state.chapters.length) {
    renderTitleScreen("This deck does not include chapter data yet.");
    return;
  }

  if (mode === "theme" && !state.themes.length) {
    renderTitleScreen("This deck does not include theme data yet.");
    return;
  }

  clearIrregularAdvanceTimeout();
  state.selectedBrowseMode = mode;
  hideAllViews();
  elements.browseSelectView.classList.remove("hidden");
  elements.progressText.textContent = "Choose category";
  elements.browseSelectTitle.textContent = mode === "chapter" ? "Choose a hoofdstuk" : "Choose a theme";
  hideMessage();

  const groups = browseOptionsForMode(mode);
  elements.browseSelectList.innerHTML = "";

  for (const group of groups) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "browse-option-card";
    button.addEventListener("click", () => renderBrowseDetailView(group));

    const name = document.createElement("span");
    name.className = "browse-option-title";
    name.textContent = group.name;

    const count = document.createElement("span");
    count.className = "browse-option-count";
    count.textContent = `${group.cards.length} words`;

    button.append(name, count);
    elements.browseSelectList.append(button);
  }
}

function renderBrowseDetailView(group) {
  clearIrregularAdvanceTimeout();
  hideAllViews();
  elements.browseDetailView.classList.remove("hidden");
  elements.progressText.textContent = `${group.cards.length} words`;
  elements.browseDetailTitle.textContent = group.name;
  hideMessage();

  elements.browseDetailList.innerHTML = "";
  for (const card of group.cards) {
    const row = document.createElement("article");
    row.className = "browse-row";

    const front = document.createElement("p");
    front.className = "browse-front";
    front.textContent = card.front;

    const back = document.createElement("p");
    back.className = "browse-back";
    back.textContent = card.back;

    row.append(front, back);
    elements.browseDetailList.append(row);
  }
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

function renderIrregularLearnView() {
  if (!state.irregularCards.length) {
    renderTitleScreen("Irregular verbs are not available yet.");
    return;
  }

  clearIrregularAdvanceTimeout();
  hideAllViews();
  elements.irregularLearnView.classList.remove("hidden");
  elements.progressText.textContent = `${state.irregularCards.length} verbs`;
  hideMessage();

  elements.irregularLearnList.innerHTML = "";
  for (const card of state.irregularCards) {
    const row = document.createElement("article");
    row.className = "irregular-learn-row";

    const infinitief = document.createElement("p");
    infinitief.className = "browse-front";
    infinitief.textContent = card.infinitief;

    const imperfectum = document.createElement("p");
    imperfectum.className = "irregular-learn-field";
    imperfectum.textContent = `Imperfectum: ${card.imperfectum}`;

    const perfectum = document.createElement("p");
    perfectum.className = "irregular-learn-field";
    perfectum.textContent = `Perfectum: ${card.perfectum}`;

    const english = document.createElement("p");
    english.className = "irregular-learn-field irregular-learn-english";
    english.textContent = `English: ${card.english}`;

    row.append(infinitief, imperfectum, perfectum, english);
    elements.irregularLearnList.append(row);
  }
}

function normalizeBase(text) {
  return text
    .toLowerCase()
    .replace(/[–-]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*\/\s*/g, " / ")
    .trim();
}

function acceptableDutchAnswers(value) {
  const answers = new Set();
  const normalized = normalizeBase(value);
  answers.add(normalized);

  for (const variant of normalized.split(" / ")) {
    answers.add(variant.trim());
    if (variant.startsWith("(is) ")) {
      answers.add(variant.replace("(is) ", "is ").trim());
      answers.add(variant.replace("(is) ", "").trim());
    }
    if (variant.startsWith("is ")) {
      answers.add(variant.replace("is ", "").trim());
    }
  }

  return answers;
}

function acceptableEnglishAnswers(value) {
  const answers = new Set();
  const normalized = normalizeBase(value);
  answers.add(normalized);

  for (const variant of normalized.split(",")) {
    const trimmed = variant.trim();
    if (!trimmed) {
      continue;
    }
    answers.add(trimmed);
    answers.add(trimmed.replace(/^to /, "").trim());
  }

  return answers;
}

function setFieldState(input, hint, isValid, expected) {
  input.classList.toggle("invalid", !isValid);
  hint.textContent = isValid ? "" : `Expected: ${expected}`;
}

function clearCheckFeedback() {
  elements.irregularCheckFeedback.textContent = "";
  elements.irregularCheckFeedback.className = "check-feedback";
  [
    [elements.irregularTranslationInput, elements.irregularTranslationHint],
    [elements.irregularImperfectumInput, elements.irregularImperfectumHint],
    [elements.irregularPerfectumInput, elements.irregularPerfectumHint],
  ].forEach(([input, hint]) => {
    input.classList.remove("invalid");
    hint.textContent = "";
  });
}

function currentIrregularQuizCard() {
  return state.irregularQuizCards[state.irregularQuizIndex];
}

function renderIrregularCheckCard() {
  const card = currentIrregularQuizCard();
  if (!card) {
    renderTitleScreen("Irregular verbs check complete. Pick your next session when you are ready.");
    return;
  }

  clearIrregularAdvanceTimeout();
  hideAllViews();
  elements.irregularCheckView.classList.remove("hidden");
  elements.progressText.textContent = `${state.irregularQuizIndex + 1} / ${state.irregularQuizCards.length}`;
  elements.irregularCheckProgress.textContent = `Verb ${state.irregularQuizIndex + 1} of ${state.irregularQuizCards.length}`;
  elements.irregularPrompt.textContent = card.infinitief;
  elements.irregularTranslationInput.value = "";
  elements.irregularImperfectumInput.value = "";
  elements.irregularPerfectumInput.value = "";
  clearCheckFeedback();
  hideMessage();
  elements.irregularTranslationInput.focus();
}

function startIrregularCheck() {
  if (!state.irregularCards.length) {
    renderTitleScreen("Irregular verbs are not available yet.");
    return;
  }

  state.irregularQuizCards = shuffle(state.irregularCards).slice(
    0,
    Math.min(IRREGULAR_CHECK_SIZE, state.irregularCards.length)
  );
  state.irregularQuizIndex = 0;
  renderIrregularCheckCard();
}

function submitIrregularCheck() {
  const card = currentIrregularQuizCard();
  if (!card) {
    return;
  }

  const translationAnswer = normalizeBase(elements.irregularTranslationInput.value);
  const imperfectumAnswer = normalizeBase(elements.irregularImperfectumInput.value);
  const perfectumAnswer = normalizeBase(elements.irregularPerfectumInput.value);

  const translationOk = acceptableEnglishAnswers(card.english).has(translationAnswer);
  const imperfectumOk = acceptableDutchAnswers(card.imperfectum).has(imperfectumAnswer);
  const perfectumOk = acceptableDutchAnswers(card.perfectum).has(perfectumAnswer);

  setFieldState(elements.irregularTranslationInput, elements.irregularTranslationHint, translationOk, card.english);
  setFieldState(elements.irregularImperfectumInput, elements.irregularImperfectumHint, imperfectumOk, card.imperfectum);
  setFieldState(elements.irregularPerfectumInput, elements.irregularPerfectumHint, perfectumOk, card.perfectum);

  if (translationOk && imperfectumOk && perfectumOk) {
    elements.irregularCheckFeedback.textContent = "Correct. Moving to the next verb...";
    elements.irregularCheckFeedback.className = "check-feedback success";
    clearIrregularAdvanceTimeout();
    state.irregularAdvanceTimeout = window.setTimeout(() => {
      state.irregularQuizIndex += 1;
      renderIrregularCheckCard();
    }, 900);
    return;
  }

  elements.irregularCheckFeedback.textContent = "Not quite yet. The highlighted fields still need work.";
  elements.irregularCheckFeedback.className = "check-feedback error";
}

async function loadDefaultDeck() {
  try {
    const deck = await window.flashcards.loadDefaultDeck();
    setDeck(deck);
  } catch (error) {
    showMessage(error.message || "Could not load the default deck.");
  }
}

async function loadDefaultIrregularDeck() {
  try {
    const deck = await window.flashcards.loadDefaultIrregularDeck();
    setIrregularDeck(deck);
  } catch (error) {
    showMessage(error.message || "Could not load the irregular verbs deck.");
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
elements.browseCards.forEach((browseCard) => {
  browseCard.addEventListener("click", () => renderBrowseSelectionView(browseCard.dataset.browseMode));
});
elements.browseSelectBackHomeButton.addEventListener("click", () => renderTitleScreen());
elements.browseDetailBackButton.addEventListener("click", () => renderBrowseSelectionView(state.selectedBrowseMode));
elements.browseDetailHomeButton.addEventListener("click", () => renderTitleScreen());
elements.irregularLearnButton.addEventListener("click", renderIrregularLearnView);
elements.irregularCheckButton.addEventListener("click", startIrregularCheck);
elements.irregularLearnBackButton.addEventListener("click", () => renderTitleScreen());
elements.irregularCheckBackButton.addEventListener("click", () => renderTitleScreen());
elements.irregularCheckSubmitButton.addEventListener("click", submitIrregularCheck);

window.addEventListener("keydown", (event) => {
  if (event.key !== " " && event.key !== "Enter") {
    return;
  }

  if (!elements.studyView.classList.contains("hidden")) {
    event.preventDefault();
    if (state.revealed) {
      nextCard();
    } else {
      revealCurrentCard();
    }
    return;
  }

  if (!elements.irregularCheckView.classList.contains("hidden") && event.key === "Enter") {
    event.preventDefault();
    submitIrregularCheck();
  }
});

Promise.all([loadDefaultDeck(), loadDefaultIrregularDeck()]);
