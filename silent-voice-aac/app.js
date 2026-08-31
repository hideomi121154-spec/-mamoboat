import { LipEngine } from "./lip-engine.js";

const $ = (id) => document.getElementById(id);
const video = $("camera");
const canvas = $("overlay");
const engineStatus = $("engineStatus");
const startCamera = $("startCamera");
const stopCamera = $("stopCamera");
const cameraPlaceholder = $("cameraPlaceholder");
const cameraHint = $("cameraHint");
const trainingPhrase = $("trainingPhrase");
const customPhrase = $("customPhrase");
const addPhrase = $("addPhrase");
const trainButton = $("trainButton");
const recognizeButton = $("recognizeButton");
const recordingBadge = $("recordingBadge");
const trainingCount = $("trainingCount");
const phraseProgress = $("phraseProgress");
const clearTraining = $("clearTraining");
const candidateList = $("candidateList");
const recognitionEmpty = $("recognitionEmpty");
const conversationText = $("conversationText");
const undoConversation = $("undoConversation");
const addPeriod = $("addPeriod");
const clearConversation = $("clearConversation");
const speakConversation = $("speakConversation");
const freeText = $("freeText");
const speakText = $("speakText");
const stopSpeak = $("stopSpeak");

let cameraStarted = false;
let engineReady = false;
let busy = false;
let conversationHistory = [];

function setStatus(text) {
  engineStatus.textContent = text;
}

const engine = new LipEngine({
  video,
  canvas,
  onStatus: setStatus,
  onFrame: ({ hasFace }) => {
    if (!cameraStarted || busy) return;
    cameraHint.textContent = hasFace
      ? "顔を検出しています。口元の線が表示されれば準備OKです。"
      : "顔が見つかりません。正面を向き、明るい場所で試してください。";
  },
});

function speak(text) {
  const value = String(text || "").trim();
  if (!value) return;
  if (!("speechSynthesis" in window)) {
    alert("このブラウザでは音声読み上げを利用できません。");
    return;
  }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(value);
  utterance.lang = "ja-JP";
  utterance.rate = 0.92;
  speechSynthesis.speak(utterance);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}

function shortLabel(phrase) {
  return phrase.length <= 10 ? phrase : `${phrase.slice(0, 9)}…`;
}

function renderPhraseOptions(selected = trainingPhrase.value) {
  const phrases = engine.phrases();
  trainingPhrase.innerHTML = phrases.map((phrase) => `<option value="${escapeHtml(phrase)}">${escapeHtml(phrase)}</option>`).join("");
  if (phrases.includes(selected)) trainingPhrase.value = selected;
}

function updateProgress() {
  const counts = engine.counts();
  const phrases = engine.phrases();
  const totalSamples = Object.values(counts).reduce((a, b) => a + b, 0);
  const trainedPhrases = Object.values(counts).filter((n) => n > 0).length;
  trainingCount.textContent = `${trainedPhrases}語 / ${totalSamples}回`;

  phraseProgress.innerHTML = phrases.map((phrase) => `
    <button class="progress-item ${counts[phrase] ? "trained" : ""}" type="button" data-select-phrase="${escapeHtml(phrase)}">
      <strong>${escapeHtml(shortLabel(phrase))}</strong>
      ${counts[phrase]} / 3
    </button>
  `).join("");

  phraseProgress.querySelectorAll("[data-select-phrase]").forEach((button) => {
    button.addEventListener("click", () => {
      trainingPhrase.value = button.dataset.selectPhrase;
      trainingPhrase.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  recognizeButton.disabled = !cameraStarted || trainedPhrases < 2 || busy;
}

function setBusy(value, badgeText = "口パク記録中") {
  busy = value;
  recordingBadge.textContent = badgeText;
  recordingBadge.classList.toggle("hidden", !value);
  trainButton.disabled = !cameraStarted || !engineReady || value;
  startCamera.disabled = cameraStarted || value;
  stopCamera.disabled = !cameraStarted || value;
  updateProgress();
}

function pushConversationSnapshot() {
  conversationHistory.push(conversationText.value);
  if (conversationHistory.length > 30) conversationHistory = conversationHistory.slice(-30);
  updateConversationButtons();
}

function isSentenceEnding(text) {
  return /(?:です|ます|ません|ください|でした|ました|ありがとう|大丈夫|わかりません|痛い|苦しい)[。！？!?]?$/.test(text.trim());
}

function appendToConversation(phrase) {
  const unit = String(phrase || "").trim();
  if (!unit) return;

  pushConversationSnapshot();
  const current = conversationText.value.trimEnd();
  if (!current) {
    conversationText.value = unit;
  } else {
    const needsPeriod = !/[。！？!?]$/.test(current) && isSentenceEnding(current);
    conversationText.value = `${current}${needsPeriod ? "。" : ""}${unit}`;
  }
  conversationText.focus();
  conversationText.setSelectionRange(conversationText.value.length, conversationText.value.length);
  updateConversationButtons();
  cameraHint.textContent = "文章に追加しました。続けて「口パクを読み取る」を押すと、次の言葉を足せます。";
}

function updateConversationButtons() {
  const hasText = Boolean(conversationText.value.trim());
  undoConversation.disabled = conversationHistory.length === 0;
  addPeriod.disabled = !hasText;
  clearConversation.disabled = !hasText;
  speakConversation.disabled = !hasText;
}

async function initialize() {
  renderPhraseOptions();
  engineReady = await engine.init();
  updateProgress();
  updateConversationButtons();
  if (!engineReady) {
    cameraHint.textContent = "読唇AIの読み込みに失敗しました。通信状態を確認して再読み込みしてください。読み上げ機能は利用できます。";
  }
}

startCamera.addEventListener("click", async () => {
  try {
    startCamera.disabled = true;
    setStatus("カメラ起動中");
    await engine.startCamera();
    cameraStarted = true;
    cameraPlaceholder.classList.add("hidden");
    stopCamera.disabled = false;
    trainButton.disabled = !engineReady;
    setStatus(engineReady ? "認識準備OK" : "カメラのみ");
    updateProgress();
  } catch (error) {
    console.error(error);
    startCamera.disabled = false;
    setStatus("カメラ失敗");
    cameraHint.textContent = error.message || "カメラを開始できませんでした。";
  }
});

stopCamera.addEventListener("click", () => {
  engine.stopCamera();
  cameraStarted = false;
  cameraPlaceholder.classList.remove("hidden");
  startCamera.disabled = false;
  stopCamera.disabled = true;
  trainButton.disabled = true;
  recognizeButton.disabled = true;
  setStatus(engineReady ? "AI準備OK" : "AI読込失敗");
});

addPhrase.addEventListener("click", () => {
  try {
    const phrase = engine.ensurePhrase(customPhrase.value);
    renderPhraseOptions(phrase);
    customPhrase.value = "";
    updateProgress();
    cameraHint.textContent = `「${phrase}」を追加しました。次に口パクを3回ほど登録してください。`;
  } catch (error) {
    alert(error.message || "言葉を追加できませんでした。");
  }
});

customPhrase.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addPhrase.click();
  }
});

trainButton.addEventListener("click", async () => {
  if (busy) return;
  const phrase = trainingPhrase.value;
  try {
    setBusy(true, `「${phrase}」を記録中`);
    cameraHint.textContent = `声を出さず「${phrase}」と自然に口を動かしてください。`;
    const seq = await engine.capture(2200);
    engine.addTemplate(phrase, seq);
    const count = engine.counts()[phrase] || 0;
    cameraHint.textContent = `「${phrase}」を登録しました。あと${Math.max(0, 3 - count)}回が目安です。`;
  } catch (error) {
    alert(error.message || "登録に失敗しました。");
  } finally {
    setBusy(false);
    updateProgress();
  }
});

recognizeButton.addEventListener("click", async () => {
  if (busy) return;
  try {
    setBusy(true, "認識用の口パクを記録中");
    cameraHint.textContent = "文章に足したい登録語を口パクしてください。";
    const seq = await engine.capture(2200);
    const results = engine.classify(seq);
    renderCandidates(results);
    cameraHint.textContent = "候補の「文章に追加」を押し、続けて次の口パクを入力できます。";
  } catch (error) {
    alert(error.message || "認識に失敗しました。");
  } finally {
    setBusy(false);
  }
});

function renderCandidates(results) {
  candidateList.innerHTML = "";
  recognitionEmpty.classList.toggle("hidden", results.length > 0);
  if (!results.length) {
    recognitionEmpty.textContent = "学習データが不足しています。2つ以上の言葉を登録してください。";
    return;
  }

  results.forEach((result, index) => {
    const card = document.createElement("div");
    card.className = "candidate-card";
    card.innerHTML = `
      <div class="candidate-copy">
        <strong>${index + 1}. ${escapeHtml(result.phrase)}</strong>
        <span>一致度目安 ${result.confidence}%</span>
      </div>
      <div class="candidate-actions">
        <button class="mini-btn mini-btn-primary" type="button" data-add-candidate>文章に追加</button>
        <button class="mini-btn" type="button" data-speak-candidate>今すぐ発声</button>
      </div>
    `;
    card.querySelector("[data-add-candidate]").addEventListener("click", () => appendToConversation(result.phrase));
    card.querySelector("[data-speak-candidate]").addEventListener("click", () => speak(result.phrase));
    candidateList.appendChild(card);
  });
}

undoConversation.addEventListener("click", () => {
  if (!conversationHistory.length) return;
  conversationText.value = conversationHistory.pop();
  updateConversationButtons();
});

addPeriod.addEventListener("click", () => {
  if (!conversationText.value.trim()) return;
  pushConversationSnapshot();
  conversationText.value = conversationText.value.trimEnd().replace(/[。！？!?]+$/, "") + "。";
  updateConversationButtons();
});

clearConversation.addEventListener("click", () => {
  if (!conversationText.value.trim()) return;
  pushConversationSnapshot();
  conversationText.value = "";
  updateConversationButtons();
});

speakConversation.addEventListener("click", () => speak(conversationText.value));
conversationText.addEventListener("input", updateConversationButtons);

clearTraining.addEventListener("click", () => {
  if (!confirm("端末内に保存した口パク学習データをすべて削除しますか？追加した言葉の一覧は残ります。")) return;
  engine.clearTemplates();
  candidateList.innerHTML = "";
  recognitionEmpty.classList.remove("hidden");
  recognitionEmpty.textContent = "学習後に口パクすると、ここに候補が表示されます。";
  updateProgress();
});

document.querySelectorAll("[data-speak]").forEach((button) => {
  button.addEventListener("click", () => speak(button.dataset.speak));
});

document.querySelectorAll("[data-append]").forEach((button) => {
  button.addEventListener("click", () => appendToConversation(button.dataset.append));
});

speakText.addEventListener("click", () => speak(freeText.value));
stopSpeak.addEventListener("click", () => window.speechSynthesis?.cancel());

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("SW registration failed", error));
}

initialize();
