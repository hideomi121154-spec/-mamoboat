import { LipEngine, PHRASES } from "./lip-engine.js";

const $ = (id) => document.getElementById(id);
const video = $("camera");
const canvas = $("overlay");
const engineStatus = $("engineStatus");
const startCamera = $("startCamera");
const stopCamera = $("stopCamera");
const cameraPlaceholder = $("cameraPlaceholder");
const cameraHint = $("cameraHint");
const trainingPhrase = $("trainingPhrase");
const trainButton = $("trainButton");
const recognizeButton = $("recognizeButton");
const recordingBadge = $("recordingBadge");
const trainingCount = $("trainingCount");
const phraseProgress = $("phraseProgress");
const clearTraining = $("clearTraining");
const candidateList = $("candidateList");
const recognitionEmpty = $("recognitionEmpty");
const freeText = $("freeText");
const speakText = $("speakText");
const stopSpeak = $("stopSpeak");

let cameraStarted = false;
let engineReady = false;
let busy = false;

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

function updateProgress() {
  const counts = engine.counts();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  trainingCount.textContent = `${total} / 15`;
  phraseProgress.innerHTML = PHRASES.map((phrase) => `
    <div class="progress-item">
      <strong>${escapeHtml(shortLabel(phrase))}</strong>
      ${counts[phrase]} / 3
    </div>
  `).join("");
  recognizeButton.disabled = !cameraStarted || Object.values(counts).filter((n) => n > 0).length < 2 || busy;
}

function shortLabel(phrase) {
  if (phrase.length <= 5) return phrase;
  return phrase.replace("です", "");
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
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

async function initialize() {
  engineReady = await engine.init();
  updateProgress();
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

trainButton.addEventListener("click", async () => {
  if (busy) return;
  const phrase = trainingPhrase.value;
  try {
    setBusy(true, `「${phrase}」を記録中`);
    cameraHint.textContent = `声を出さず「${phrase}」と自然に口を動かしてください。`;
    const seq = await engine.capture(2200);
    engine.addTemplate(phrase, seq);
    cameraHint.textContent = `「${phrase}」を登録しました。あと${Math.max(0, 3 - (engine.counts()[phrase] || 0))}回が目安です。`;
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
    cameraHint.textContent = "伝えたい登録フレーズを口パクしてください。";
    const seq = await engine.capture(2200);
    const results = engine.classify(seq);
    renderCandidates(results);
    cameraHint.textContent = "候補をタップすると読み上げます。候補が違う場合はもう一度試してください。";
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
    const button = document.createElement("button");
    button.type = "button";
    button.className = "candidate";
    button.innerHTML = `<strong>${index + 1}. ${escapeHtml(result.phrase)}</strong><span>一致度目安 ${result.confidence}%</span>`;
    button.addEventListener("click", () => speak(result.phrase));
    candidateList.appendChild(button);
  });
}

clearTraining.addEventListener("click", () => {
  if (!confirm("端末内に保存した口パク学習データをすべて削除しますか？")) return;
  engine.clearTemplates();
  candidateList.innerHTML = "";
  recognitionEmpty.classList.remove("hidden");
  recognitionEmpty.textContent = "学習後に口パクすると、ここに候補が表示されます。";
  updateProgress();
});

document.querySelectorAll("[data-speak]").forEach((button) => {
  button.addEventListener("click", () => speak(button.dataset.speak));
});

speakText.addEventListener("click", () => speak(freeText.value));
stopSpeak.addEventListener("click", () => window.speechSynthesis?.cancel());

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("SW registration failed", error));
}

updateProgress();
initialize();
