const questions = window.QUESTION_BANK || [];
const ranks = ["青铜", "白银", "黄金", "铂金", "钻石", "星耀", "王者"];
const stateKey = "pm-ranked-review-v1";

const els = {
  rankBadge: document.querySelector("#rankBadge"),
  stars: document.querySelector("#stars"),
  progressFill: document.querySelector("#progressFill"),
  doneCount: document.querySelector("#doneCount"),
  accuracy: document.querySelector("#accuracy"),
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
};

let state = loadState();
let current = pickQuestion();
let answered = false;

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

function pickQuestion() {
  const wrongSet = new Set(state.wrongIds);
  const unseen = questions.filter((q) => !state.seenIds.includes(q.id));
  const pool = unseen.length ? unseen : questions;
  const weighted = pool.flatMap((q) => (wrongSet.has(q.id) ? [q, q, q] : [q]));
  return weighted[Math.floor(Math.random() * weighted.length)] || questions[0];
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
  els.fillRow.classList.toggle("active", current.mode === "fill");
  els.reciteActions.classList.toggle("active", current.mode === "recite");
  els.options.style.display = current.mode === "choice" ? "grid" : "none";
  els.questionType.textContent = current.type;
  els.questionIndex.textContent = `${current.id} / ${questions.length}`;
  els.questionStem.textContent = current.stem;

  if (current.mode === "choice") {
    current.options.forEach((option) => {
      const button = document.createElement("button");
      button.className = "option";
      button.type = "button";
      button.innerHTML = `<strong>${option.key}</strong><span>${option.text}</span>`;
      button.addEventListener("click", () => gradeChoice(option.key));
      els.options.appendChild(button);
    });
  }
}

function showAnswer() {
  els.answerText.textContent = current.answer || "未提取到答案";
  els.knowledge.textContent = current.knowledge ? `知识点：${current.knowledge}` : "";
  els.answerPanel.classList.add("active");
}

function recordResult(isCorrect) {
  if (answered) return;
  answered = true;
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
}

function gradeChoice(key) {
  const correct = key === current.answerKey;
  document.querySelectorAll(".option").forEach((button) => {
    const buttonKey = button.querySelector("strong").textContent;
    if (buttonKey === current.answerKey) button.classList.add("correct");
    if (buttonKey === key && !correct) button.classList.add("wrong");
  });
  els.result.textContent = correct ? "胜利" : "败方 MVP";
  els.result.classList.add(correct ? "good" : "bad");
  showAnswer();
  recordResult(correct);
}

function gradeFill() {
  const guess = normalize(els.fillInput.value);
  const answer = normalize(current.answerText || current.answer);
  const correct = answer && (guess === answer || guess.includes(answer) || answer.includes(guess));
  els.result.textContent = correct ? "胜利" : "回城复盘";
  els.result.classList.add(correct ? "good" : "bad");
  showAnswer();
  recordResult(correct);
}

function nextQuestion() {
  current = pickQuestion();
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
  };
  saveState();
  current = pickQuestion();
  renderProgress();
  renderQuestion();
  renderWrongList();
}

function renderWrongList() {
  const wrong = questions.filter((q) => state.wrongIds.includes(q.id));
  renderList(els.wrongList, wrong, "暂无错题");
}

function renderBank() {
  const keyword = normalize(els.searchInput.value);
  const type = els.typeFilter.value;
  const filtered = questions.filter((q) => {
    const text = normalize(`${q.stem}${q.answer}${q.knowledge}`);
    return (!type || q.type === type) && (!keyword || text.includes(keyword));
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
    item.innerHTML = `
      <header><span>${q.id}. ${q.type}</span><span>${q.knowledge || ""}</span></header>
      <p>${escapeHtml(q.stem)}</p>
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
  [...new Set(questions.map((q) => q.type))].forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    els.typeFilter.appendChild(option);
  });
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
  els.result.textContent = "胜利";
  els.result.classList.add("good");
  showAnswer();
  recordResult(true);
});
els.markWrong.addEventListener("click", () => {
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

setupBankTools();
renderProgress();
renderQuestion();
renderWrongList();
renderBank();
