const RANDOM_SESSION_SIZE = 30;
const IRREGULAR_CHECK_SIZE = 30;
const IRREGULAR_LEARN_PAGE_SIZE = 30;

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
  irregularLearnPage: 0,
  irregularFilter: "",
  irregularQuizCards: [],
  irregularQuizIndex: 0,
  irregularAdvanceTimeout: null,
  starredWords: new Set(),
  currentBrowseGroup: null,
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
  irregularFilterInput: document.querySelector("#irregular-filter-input"),
  irregularPrevPageButton: document.querySelector("#irregular-prev-page-button"),
  irregularNextPageButton: document.querySelector("#irregular-next-page-button"),
  irregularPageInfo: document.querySelector("#irregular-page-info"),
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
  studyBackHomeButton: document.querySelector("#study-back-home-button"),
  studyStarButton: document.querySelector("#star-button"),
};

function shuffle(cards) {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function cardId(card) {
  return `${card.front}|${card.back}`;
}

function loadStarredWords() {
  try {
    const stored = localStorage.getItem("dutch-flashcards-starred");
    if (stored) {
      state.starredWords = new Set(JSON.parse(stored));
    }
  } catch {
    state.starredWords = new Set();
  }
}

function saveStarredWords() {
  localStorage.setItem("dutch-flashcards-starred", JSON.stringify([...state.starredWords]));
}

function toggleCardStar(card) {
  const id = cardId(card);
  if (state.starredWords.has(id)) {
    state.starredWords.delete(id);
  } else {
    state.starredWords.add(id);
  }
  saveStarredWords();
}

function updateStarButtonState() {
  const card = currentCard();
  if (!card) return;
  const starred = state.starredWords.has(cardId(card));
  elements.studyStarButton.textContent = starred ? "★" : "☆";
  elements.studyStarButton.setAttribute("aria-label", starred ? "Unstar this word" : "Star this word");
  elements.studyStarButton.classList.toggle("starred", starred);
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
  updateStarButtonState();
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
  state.irregularLearnPage = 0;
  state.irregularFilter = "";
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
  state.currentBrowseGroup = group;
  clearIrregularAdvanceTimeout();
  hideAllViews();
  elements.browseDetailView.classList.remove("hidden");
  elements.progressText.textContent = `${group.cards.length} words`;
  elements.browseDetailTitle.textContent = group.name;
  hideMessage();

  const sortedCards = [...group.cards].sort((a, b) => {
    const aStarred = state.starredWords.has(cardId(a));
    const bStarred = state.starredWords.has(cardId(b));
    if (aStarred === bStarred) return 0;
    return aStarred ? -1 : 1;
  });

  elements.browseDetailList.innerHTML = "";
  for (const card of sortedCards) {
    const starred = state.starredWords.has(cardId(card));
    const row = document.createElement("article");
    row.className = starred ? "browse-row starred" : "browse-row";

    const front = document.createElement("p");
    front.className = "browse-front";
    front.textContent = card.front;

    const back = document.createElement("p");
    back.className = "browse-back";
    back.textContent = card.back;

    const starBtn = document.createElement("button");
    starBtn.type = "button";
    starBtn.className = starred ? "star-button browse-star-button starred" : "star-button browse-star-button";
    starBtn.textContent = starred ? "★" : "☆";
    starBtn.setAttribute("aria-label", starred ? "Unstar this word" : "Star this word");
    starBtn.addEventListener("click", () => {
      toggleCardStar(card);
      renderBrowseDetailView(group);
    });

    row.append(front, back, starBtn);
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

function irregularLearnPageCount() {
  return Math.max(1, Math.ceil(filteredIrregularCards().length / IRREGULAR_LEARN_PAGE_SIZE));
}

function filteredIrregularCards() {
  const query = state.irregularFilter.trim().toLowerCase();
  if (!query) {
    return state.irregularCards;
  }

  return state.irregularCards.filter((card) =>
    [card.infinitief, card.imperfectum, card.perfectum, card.english]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query))
  );
}

function renderIrregularLearnView() {
  if (!state.irregularCards.length) {
    renderTitleScreen("Irregular verbs are not available yet.");
    return;
  }

  clearIrregularAdvanceTimeout();
  hideAllViews();
  elements.irregularLearnView.classList.remove("hidden");
  elements.irregularFilterInput.value = state.irregularFilter;
  hideMessage();

  const filteredCards = filteredIrregularCards();
  elements.progressText.textContent = `${filteredCards.length} verbs`;
  elements.irregularLearnList.innerHTML = "";
  const totalPages = irregularLearnPageCount();
  state.irregularLearnPage = Math.min(state.irregularLearnPage, totalPages - 1);

  const start = state.irregularLearnPage * IRREGULAR_LEARN_PAGE_SIZE;
  const pageCards = filteredCards.slice(start, start + IRREGULAR_LEARN_PAGE_SIZE);

  for (const card of pageCards) {
    const row = document.createElement("tr");

    const infinitief = document.createElement("td");
    infinitief.className = "irregular-cell irregular-infinitief";
    infinitief.textContent = card.infinitief;

    const imperfectum = document.createElement("td");
    imperfectum.className = "irregular-cell";
    imperfectum.textContent = card.imperfectum;

    const perfectum = document.createElement("td");
    perfectum.className = "irregular-cell";
    perfectum.textContent = card.perfectum;

    const english = document.createElement("td");
    english.className = "irregular-cell irregular-english";
    english.textContent = card.english;

    row.append(infinitief, imperfectum, perfectum, english);
    elements.irregularLearnList.append(row);
  }

  if (!filteredCards.length) {
    const row = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = 4;
    emptyCell.className = "irregular-empty";
    emptyCell.textContent = "No verbs match the current filter.";
    row.append(emptyCell);
    elements.irregularLearnList.append(row);
  }

  elements.irregularPageInfo.textContent = `Page ${state.irregularLearnPage + 1} of ${totalPages}`;
  elements.irregularPrevPageButton.disabled = state.irregularLearnPage === 0;
  elements.irregularNextPageButton.disabled = state.irregularLearnPage >= totalPages - 1;
}

function goToPreviousIrregularPage() {
  if (state.irregularLearnPage === 0) {
    return;
  }
  state.irregularLearnPage -= 1;
  renderIrregularLearnView();
}

function goToNextIrregularPage() {
  if (state.irregularLearnPage >= irregularLearnPageCount() - 1) {
    return;
  }
  state.irregularLearnPage += 1;
  renderIrregularLearnView();
}

function updateIrregularFilter(value) {
  state.irregularFilter = value;
  state.irregularLearnPage = 0;
  renderIrregularLearnView();
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
elements.irregularFilterInput.addEventListener("input", (event) => updateIrregularFilter(event.target.value));
elements.irregularPrevPageButton.addEventListener("click", goToPreviousIrregularPage);
elements.irregularNextPageButton.addEventListener("click", goToNextIrregularPage);
elements.irregularCheckBackButton.addEventListener("click", () => renderTitleScreen());
elements.studyBackHomeButton.addEventListener("click", () => renderTitleScreen());
elements.studyStarButton.addEventListener("click", () => {
  const card = currentCard();
  if (!card) return;
  toggleCardStar(card);
  updateStarButtonState();
});
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

loadStarredWords();
Promise.all([loadDefaultDeck(), loadDefaultIrregularDeck()]);
