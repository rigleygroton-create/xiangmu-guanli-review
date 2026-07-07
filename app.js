const questions = window.QUESTION_BANK || [];
const ranks = ["青铜", "白银", "黄金", "铂金", "钻石", "星耀", "王者"];
const stateKey = "pm-ranked-review-v1";

const els = {
  rankBadge: document.querySelector("#rankBadge"),
  stars: document.querySelector("#stars"),
  progressFill: document.querySelector("#progressFill"),
  doneCount: document.querySelector("#doneCount"),
  accuracy: document.querySelector("#accuracy"),
  wrongCount: document.querySelector("#wrongCount"),
  streak: document.querySelector("#streak"),
  questionType: document.querySelector("#questionType"),
  questionIndex: document.querySelector("#questionIndex"),
  questionStem: document.querySelector("#questionStem"),
  options: document.querySelector("#options"),
  fillRow: document.querySelector("#fillRow"),
  fillInput: document.querySelector("#fillInput"),
  submitFill: document.querySelector("#submitFill"),
  reciteActions: document.querySelector("#reciteActions"),
  showAnswer: document.querySelector("#showAnswer"),
  markKnown: document.querySelector("#markKnown"),
  markWrong: document.querySelector("#markWrong"),
  result: document.querySelector("#result"),
  answerPanel: document.querySelector("#answerPanel"),
  answerText: document.querySelector("#answerText"),
  knowledge: document.querySelector("#knowledge"),
  nextQuestion: document.querySelector("#nextQuestion"),
  resetProgress: document.querySelector("#resetProgress"),
  wrongList: document.querySelector("#wrongList"),
  clearWrong: document.querySelector("#clearWrong"),
  bankList: document.querySelector("#bankList"),
  searchInput: document.querySelector("#searchInput"),
  typeFilter: document.querySelector("#typeFilter"),
  sourceFilter: document.querySelector("#sourceFilter"),
  battleTypeFilter: document.querySelector("#battleTypeFilter"),
  roundModal: document.querySelector("#roundModal"),
  roundTitle: document.querySelector("#roundTitle"),
  roundSummary: document.querySelector("#roundSummary"),
  restartRound: document.querySelector("#restartRound"),
  finishRound: document.querySelector("#finishRound"),
};

let state = loadState();
let round = createRound();
let current = getCurrentQuestion();
let answered = false;
let renderedOptions = [];

function loadState() {
  const saved = JSON.parse(localStorage.getItem(stateKey) || "{}");
  return {
    done: saved.done || 0,
    correct: saved.correct || 0,
    streak: saved.streak || 0,
    stars: saved.stars || 0,
    rank: saved.rank || 0,
    wrongIds: saved.wrongIds || [],
    seenIds: saved.seenIds || [],
    practiceMode: saved.practiceMode || "order",
    battleType: saved.battleType || "单选题",
    battleSource: saved.battleSource || "all",
  };
}

function saveState() {
  localStorage.setItem(stateKey, JSON.stringify(state));
}

function normalize(value) {
  return String(value)
    .replace(/\s+/g, "")
    .replace(/[，,。.;；:：]/g, "")
    .toLowerCase();
}

function getCorrectOption(question, options = question.options || []) {
  const answerKey = normalize(question.answerKey);
  const answerText = normalize(question.answerText || question.answer);
  return (
    options.find((option) => normalize(option.key) === answerKey) ||
    options.find((option) => normalize(option.text) === answerKey) ||
    options.find((option) => normalize(option.text) === answerText) ||
    null
  );
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getQuestionPool() {
  let pool = questions.filter((q) => q.type === state.battleType);
  if (state.battleSource !== "all") {
    pool = pool.filter((q) => (q.source || "学习通原题库") === state.battleSource);
  }
  if (state.practiceMode === "wrong") {
    return pool.filter((q) => state.wrongIds.includes(q.id));
  }
  return pool;
}

function createRound() {
  const pool = getQuestionPool();
  let ids = pool.map((q) => q.id);
  if (state.practiceMode === "random") {
    ids = shuffle(ids);
  }
  return {
    ids,
    index: 0,
    answered: 0,
    correct: 0,
    type: state.battleType,
    mode: state.practiceMode,
  };
}

function getCurrentQuestion() {
  if (!round.ids.length) return null;
  return questions.find((q) => q.id === round.ids[round.index]) || null;
}

function startRound() {
  round = createRound();
  current = getCurrentQuestion();
  hideRoundReport();
  renderQuestion();
}

function renderProgress() {
  const rankName = ranks[Math.min(state.rank, ranks.length - 1)];
  els.rankBadge.textContent = rankName;
  els.stars.innerHTML = "";
  for (let i = 0; i < 5; i += 1) {
    const star = document.createElement("span");
    star.className = `star ${i < state.stars ? "filled" : ""}`;
    els.stars.appendChild(star);
  }
  els.doneCount.textContent = state.done;
  els.accuracy.textContent = state.done ? `${Math.round((state.correct / state.done) * 100)}%` : "0%";
  els.wrongCount.textContent = state.wrongIds.length;
  els.streak.textContent = state.streak;
  els.progressFill.style.width = `${Math.min(100, (state.seenIds.length / questions.length) * 100)}%`;
}

function renderQuestion() {
  answered = false;
  els.result.textContent = "";
  els.result.className = "result";
  els.answerPanel.classList.remove("active");
  els.options.innerHTML = "";
  els.fillInput.value = "";
  if (!current) {
    els.fillRow.classList.remove("active");
    els.reciteActions.classList.remove("active");
    els.options.style.display = "none";
    els.questionType.textContent = `${state.battleType} · ${modeLabel()}`;
    els.questionIndex.textContent = `0 / 0`;
    els.questionStem.textContent = state.practiceMode === "wrong" ? "当前题型暂无错题。" : "当前题型暂无题目。";
    els.nextQuestion.textContent = "再来一轮";
    return;
  }
  renderedOptions = [];
  els.fillRow.classList.toggle("active", current.mode === "fill");
  els.reciteActions.classList.toggle("active", current.mode === "recite");
  els.options.style.display = current.mode === "choice" ? "grid" : "none";
  const source = current.source || "学习通原题库";
  const sourceNo = current.sourceNo ? `第${current.sourceNo}题` : `第${current.id}题`;
  els.questionType.textContent = `${current.type} · ${source} · ${sourceNo}`;
  els.questionIndex.textContent = `${round.index + 1} / ${round.ids.length}`;
  els.questionStem.textContent = current.stem;
  els.nextQuestion.textContent = round.index === round.ids.length - 1 ? "查看汇报" : "下一题";

  if (current.mode === "choice") {
    const letters = ["A", "B", "C", "D", "E", "F"];
    renderedOptions = shuffle(current.options).map((option, index) => ({
      ...option,
      displayKey: letters[index],
    }));
    renderedOptions.forEach((option) => {
      const button = document.createElement("button");
      button.className = "option";
      button.type = "button";
      button.dataset.optionKey = option.key;
      button.dataset.displayKey = option.displayKey;
      button.innerHTML = `<strong>${option.displayKey}</strong><span>${option.text}</span>`;
      button.addEventListener("click", () => gradeChoice(option.displayKey));
      els.options.appendChild(button);
    });
  }
}

function showAnswer() {
  if (current.mode === "choice" && renderedOptions.length) {
    const correctOption = getCorrectOption(current, renderedOptions);
    els.answerText.textContent = correctOption
      ? `${correctOption.displayKey}: ${correctOption.text}`
      : current.answer || "未提取到答案";
  } else {
    els.answerText.textContent = current.answer || "未提取到答案";
  }
  els.knowledge.textContent = current.knowledge ? `知识点：${current.knowledge}` : "";
  els.answerPanel.classList.add("active");
}

function recordResult(isCorrect) {
  if (answered) return false;
  answered = true;
  round.answered += 1;
  round.correct += isCorrect ? 1 : 0;
  state.done += 1;
  state.correct += isCorrect ? 1 : 0;
  state.streak = isCorrect ? state.streak + 1 : 0;
  if (!state.seenIds.includes(current.id)) state.seenIds.push(current.id);

  if (isCorrect) {
    state.wrongIds = state.wrongIds.filter((id) => id !== current.id);
    state.stars += state.streak >= 3 ? 2 : 1;
    while (state.stars >= 5 && state.rank < ranks.length - 1) {
      state.stars -= 5;
      state.rank += 1;
    }
  } else {
    if (!state.wrongIds.includes(current.id)) state.wrongIds.push(current.id);
    state.streak = 0;
    if (state.stars > 0) state.stars -= 1;
  }
  saveState();
  renderProgress();
  renderWrongList();
  if (round.answered >= round.ids.length) {
    window.setTimeout(showRoundReport, 250);
  }
  return true;
}

function gradeChoice(key) {
  if (answered) return;
  const selected = renderedOptions.find((option) => option.displayKey === key);
  const correctOption = getCorrectOption(current, renderedOptions);
  const correct = Boolean(selected && correctOption && selected.key === correctOption.key);
  document.querySelectorAll(".option").forEach((button) => {
    const buttonKey = button.dataset.optionKey;
    if (correctOption && buttonKey === correctOption.key) button.classList.add("correct");
    if (button.dataset.displayKey === key && !correct) button.classList.add("wrong");
  });
  els.result.textContent = correct ? "胜利" : "败方 MVP";
  els.result.classList.add(correct ? "good" : "bad");
  showAnswer();
  recordResult(correct);
}

function gradeFill() {
  if (answered) return;
  const guess = normalize(els.fillInput.value);
  const answer = normalize(current.answerText || current.answer);
  const correct = Boolean(guess && answer && (guess === answer || guess.includes(answer) || answer.includes(guess)));
  els.result.textContent = correct ? "胜利" : "回城复盘";
  els.result.classList.add(correct ? "good" : "bad");
  showAnswer();
  recordResult(correct);
}

function nextQuestion() {
  if (!current || round.index >= round.ids.length - 1) {
    showRoundReport();
    return;
  }
  round.index += 1;
  current = getCurrentQuestion();
  renderQuestion();
}

function resetProgress() {
  state = {
    done: 0,
    correct: 0,
    streak: 0,
    stars: 0,
    rank: 0,
    wrongIds: [],
    seenIds: [],
    practiceMode: state.practiceMode,
    battleType: state.battleType,
    battleSource: state.battleSource,
  };
  saveState();
  startRound();
  renderProgress();
  renderWrongList();
}

function renderWrongList() {
  const wrong = questions.filter((q) => state.wrongIds.includes(q.id));
  renderList(els.wrongList, wrong, "暂无错题");
}

function renderBank() {
  const keyword = normalize(els.searchInput.value);
  const type = els.typeFilter.value;
  const source = els.sourceFilter.value;
  const filtered = questions.filter((q) => {
    const questionSource = q.source || "学习通原题库";
    const text = normalize(`${q.stem}${q.answer}${q.knowledge}${questionSource}`);
    return (!type || q.type === type) && (!source || questionSource === source) && (!keyword || text.includes(keyword));
  });
  renderList(els.bankList, filtered, "没有匹配题目");
}

function renderList(container, items, emptyText) {
  container.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "knowledge";
    empty.textContent = emptyText;
    container.appendChild(empty);
    return;
  }
  items.forEach((q) => {
    const item = document.createElement("article");
    item.className = "q-item";
    const source = q.source || "学习通原题库";
    const sourceNo = q.sourceNo ? `第${q.sourceNo}题` : `第${q.id}题`;
    item.innerHTML = `
      <header><span>${q.id}. ${q.type}</span><span class="source-pill">${source} · ${sourceNo}</span></header>
      <p>${escapeHtml(q.stem)}</p>
      ${q.knowledge ? `<p class="knowledge">${escapeHtml(q.knowledge)}</p>` : ""}
      <pre class="answer">${escapeHtml(q.answer)}</pre>
    `;
    container.appendChild(item);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setupBankTools() {
  els.battleTypeFilter.innerHTML = "";
  [...new Set(questions.map((q) => q.type))].forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    els.typeFilter.appendChild(option);
  });
  [...new Set(questions.map((q) => q.source || "学习通原题库"))].forEach((source) => {
    const option = document.createElement("option");
    option.value = source;
    option.textContent = source;
    els.sourceFilter.appendChild(option);
  });
  [...new Set(questions.map((q) => q.type))].forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    els.battleTypeFilter.appendChild(option);
  });
  els.battleTypeFilter.value = state.battleType;
  document.querySelectorAll(".mode-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.practiceMode);
  });
  document.querySelectorAll(".source-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.source === state.battleSource);
  });
}

function modeLabel() {
  if (state.practiceMode === "random") return "随机刷题";
  if (state.practiceMode === "wrong") return "只刷错题";
  return "顺序刷题";
}

function sourceLabel() {
  if (state.battleSource === "all") return "全部题库";
  return state.battleSource;
}

function showRoundReport() {
  const total = round.ids.length;
  const wrong = Math.max(0, round.answered - round.correct);
  els.roundTitle.textContent = total ? "本轮完成" : "暂无可刷题目";
  els.roundSummary.textContent = total
    ? `${sourceLabel()} · ${modeLabel()} · ${state.battleType}：本轮作答 ${round.answered} 题，答对 ${round.correct} 题，答错 ${wrong} 题。`
    : `${sourceLabel()} · ${modeLabel()} · ${state.battleType}：没有可刷题目。`;
  els.roundModal.classList.add("active");
  els.roundModal.setAttribute("aria-hidden", "false");
}

function hideRoundReport() {
  els.roundModal.classList.remove("active");
  els.roundModal.setAttribute("aria-hidden", "true");
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.view}View`).classList.add("active");
    renderWrongList();
    renderBank();
  });
});

els.submitFill.addEventListener("click", gradeFill);
els.fillInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") gradeFill();
});
els.showAnswer.addEventListener("click", showAnswer);
els.markKnown.addEventListener("click", () => {
  if (answered) return;
  els.result.textContent = "胜利";
  els.result.classList.add("good");
  showAnswer();
  recordResult(true);
});
els.markWrong.addEventListener("click", () => {
  if (answered) return;
  els.result.textContent = "回城复盘";
  els.result.classList.add("bad");
  showAnswer();
  recordResult(false);
});
els.nextQuestion.addEventListener("click", nextQuestion);
els.resetProgress.addEventListener("click", resetProgress);
els.clearWrong.addEventListener("click", () => {
  state.wrongIds = [];
  saveState();
  renderWrongList();
});
els.searchInput.addEventListener("input", renderBank);
els.typeFilter.addEventListener("change", renderBank);
els.sourceFilter.addEventListener("change", renderBank);
els.battleTypeFilter.addEventListener("change", () => {
  state.battleType = els.battleTypeFilter.value;
  saveState();
  startRound();
});
document.querySelectorAll(".mode-btn").forEach((button) => {
  button.addEventListener("click", () => {
    state.practiceMode = button.dataset.mode;
    document.querySelectorAll(".mode-btn").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    saveState();
    startRound();
  });
});
document.querySelectorAll(".source-btn").forEach((button) => {
  button.addEventListener("click", () => {
    state.battleSource = button.dataset.source;
    document.querySelectorAll(".source-btn").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    saveState();
    startRound();
  });
});
els.restartRound.addEventListener("click", startRound);
els.finishRound.addEventListener("click", hideRoundReport);

setupBankTools();
renderProgress();
renderQuestion();
renderWrongList();
renderBank();
