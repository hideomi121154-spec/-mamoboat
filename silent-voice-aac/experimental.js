const MP_VERSION = "1.0.1";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const CALIBRATION_KEY = "silentVoiceAAC.calibration.v1";
const CUSTOM_KEY = "silentVoiceAAC.experimentalCandidates.v1";

const CALIBRATION_READINGS = {
  "おはようございます": "おはようございます",
  "今日はいい天気です": "きょうはいいてんきです",
  "水を飲みたいです": "みずをのみたいです",
  "家族に電話してください": "かぞくにでんわしてください",
  "病院に行きたいです": "びょういんにいきたいです",
  "少し痛いです": "すこしいたいです",
  "大丈夫です": "だいじょうぶです",
  "ありがとうございます": "ありがとうございます",
  "もう一度お願いします": "もういちどおねがいします",
  "ゆっくり話してください": "ゆっくりはなしてください",
  "明日の予定を教えてください": "あしたのよていをおしえてください",
  "ここで待っています": "ここでまっています",
};

const PRESET_CANDIDATES = [
  { text: "こんにちは", reading: "こんにちは" },
  { text: "こんばんは", reading: "こんばんは" },
  { text: "帰りたいです", reading: "かえりたいです" },
  { text: "家に帰りたいです", reading: "いえにかえりたいです" },
  { text: "トイレに行きたいです", reading: "といれにいきたいです" },
  { text: "寒いです", reading: "さむいです" },
  { text: "暑いです", reading: "あついです" },
  { text: "眠いです", reading: "ねむいです" },
  { text: "お腹が空きました", reading: "おなかがすきました" },
  { text: "電話してください", reading: "でんわしてください" },
  { text: "先生を呼んでください", reading: "せんせいをよんでください" },
  { text: "ちょっと待ってください", reading: "ちょっとまってください" },
];

const $ = (id) => document.getElementById(id);
const video = $("camera");
const overlay = $("overlay");
const ctx = overlay.getContext("2d");
const statusEl = $("status");
const calibrationEl = $("calibrationStatus");
const modelEl = $("modelStatus");
const startCameraBtn = $("startCamera");
const stopCameraBtn = $("stopCamera");
const testBtn = $("testUnseen");
const resultList = $("results");
const candidateGrid = $("candidateGrid");
const customText = $("customText");
const customReading = $("customReading");
const addCustom = $("addCustom");

let stream = null;
let landmarker = null;
let running = false;
let rafId = null;
let latestFeatures = null;
let lastVideoTime = -1;
let prototypes = new Map();
let candidates = [...PRESET_CANDIDATES, ...loadCustomCandidates()];

function setStatus(text) {
  statusEl.textContent = text;
}

function safeParse(raw) {
  try { return JSON.parse(raw || "{}"); } catch { return {}; }
}

function loadCalibration() {
  const value = safeParse(localStorage.getItem(CALIBRATION_KEY));
  return value && value.samples ? value : { samples: {} };
}

function loadCustomCandidates() {
  const value = safeParse(localStorage.getItem(CUSTOM_KEY));
  return Array.isArray(value) ? value : [];
}

function saveCustomCandidates() {
  const custom = candidates.filter((item) => !PRESET_CANDIDATES.some((preset) => preset.text === item.text));
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom.slice(-20)));
}

function morae(reading) {
  const small = new Set(["ゃ", "ゅ", "ょ", "ぁ", "ぃ", "ぅ", "ぇ", "ぉ", "ゎ"]);
  const clean = String(reading || "").replace(/[\s、。！？!?・]/g, "");
  const out = [];
  for (const ch of [...clean]) {
    if (small.has(ch) && out.length) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

function resample(segment, target = 4) {
  if (!segment?.length) return [];
  if (segment.length === 1) return Array.from({ length: target }, () => [...segment[0]]);
  const out = [];
  for (let i = 0; i < target; i++) {
    const pos = (i * (segment.length - 1)) / Math.max(1, target - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(segment.length - 1, lo + 1);
    const t = pos - lo;
    out.push(segment[lo].map((v, d) => v * (1 - t) + segment[hi][d] * t));
  }
  return out;
}

function splitByMora(sequence, reading) {
  const units = morae(reading);
  if (!units.length || sequence.length < units.length) return [];
  return units.map((mora, index) => {
    const from = Math.floor((index * sequence.length) / units.length);
    const to = Math.max(from + 1, Math.floor(((index + 1) * sequence.length) / units.length));
    return { mora, segment: resample(sequence.slice(from, to), 4) };
  });
}

function flatten(segment) {
  return segment.flat();
}

function segmentDistance(a, b) {
  const aa = flatten(a), bb = flatten(b);
  if (!aa.length || aa.length !== bb.length) return 4;
  let sum = 0;
  for (let i = 0; i < aa.length; i++) sum += (aa[i] - bb[i]) ** 2;
  return Math.sqrt(sum / aa.length);
}

function normalizeRaw(sequence) {
  if (!sequence?.length) return [];
  const dims = sequence[0].length;
  const mean = Array(dims).fill(0);
  const sd = Array(dims).fill(0);
  for (const frame of sequence) for (let d = 0; d < dims; d++) mean[d] += frame[d];
  for (let d = 0; d < dims; d++) mean[d] /= sequence.length;
  for (const frame of sequence) for (let d = 0; d < dims; d++) sd[d] += (frame[d] - mean[d]) ** 2;
  for (let d = 0; d < dims; d++) sd[d] = Math.sqrt(sd[d] / sequence.length) || 1;
  return sequence.map((frame) => frame.map((v, d) => (v - mean[d]) / sd[d]));
}

function buildMoraModel() {
  const calibration = loadCalibration();
  const samples = calibration.samples || {};
  prototypes = new Map();
  let used = 0;
  for (const [prompt, reading] of Object.entries(CALIBRATION_READINGS)) {
    const sample = samples[prompt];
    if (!sample?.sequence?.length) continue;
    used++;
    for (const part of splitByMora(sample.sequence, reading)) {
      if (!prototypes.has(part.mora)) prototypes.set(part.mora, []);
      prototypes.get(part.mora).push(part.segment);
    }
  }
  calibrationEl.textContent = `${used} / ${Object.keys(CALIBRATION_READINGS).length} 文`;
  modelEl.textContent = `${prototypes.size} 音パターン`;
  testBtn.disabled = used < 6 || !running;
  renderCandidates();
  return used;
}

function candidateCoverage(reading) {
  const units = morae(reading);
  if (!units.length) return 0;
  return units.filter((unit) => prototypes.has(unit)).length / units.length;
}

function rankCandidate(rawSequence, candidate) {
  const sequence = normalizeRaw(rawSequence);
  const parts = splitByMora(sequence, candidate.reading);
  if (!parts.length) return { ...candidate, score: 99, coverage: 0 };
  let total = 0;
  let known = 0;
  for (const part of parts) {
    const refs = prototypes.get(part.mora);
    if (!refs?.length) {
      total += 2.8;
      continue;
    }
    known++;
    const distances = refs.map((ref) => segmentDistance(part.segment, ref)).sort((a, b) => a - b);
    total += distances.slice(0, Math.min(3, distances.length)).reduce((a, b) => a + b, 0) / Math.min(3, distances.length);
  }
  const coverage = known / parts.length;
  const score = total / parts.length + (1 - coverage) * 1.8;
  return { ...candidate, score, coverage };
}

function renderCandidates() {
  candidateGrid.innerHTML = candidates.map((item) => {
    const coverage = Math.round(candidateCoverage(item.reading) * 100);
    return `<div class="candidate-chip"><strong>${escapeHtml(item.text)}</strong><span>学習音カバー ${coverage}%</span></div>`;
  }).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function initLandmarker() {
  if (landmarker) return;
  setStatus("読唇エンジン読込中");
  const vision = await import(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/+esm`);
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
  landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });
  setStatus("準備OK");
}

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function extractFeatures(lm) {
  if (!lm || lm.length < 309) return null;
  const left = lm[61], right = lm[291], innerTop = lm[13], innerBottom = lm[14];
  const outerTop = lm[0], outerBottom = lm[17], innerLeft = lm[78], innerRight = lm[308];
  const width = Math.max(dist(left, right), 1e-6), innerWidth = Math.max(dist(innerLeft, innerRight), 1e-6);
  return [
    dist(innerTop, innerBottom) / width,
    dist(outerTop, outerBottom) / width,
    innerWidth / width,
    (innerTop.y + innerBottom.y) / 2 - (left.y + right.y) / 2,
    (innerTop.x + innerBottom.x) / 2 - (left.x + right.x) / 2,
  ];
}

function drawMouth(lm) {
  const w = video.videoWidth || 640, h = video.videoHeight || 480;
  if (overlay.width !== w || overlay.height !== h) { overlay.width = w; overlay.height = h; }
  ctx.clearRect(0, 0, w, h);
  if (!lm) return;
  const ids = [61,40,37,0,267,270,291,321,314,17,84,91,61];
  ctx.strokeStyle = "rgba(81,224,200,.95)";
  ctx.lineWidth = Math.max(3, w / 220);
  ctx.beginPath();
  ids.forEach((id, index) => {
    const p = lm[id], x = p.x * w, y = p.y * h;
    if (!index) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function loop() {
  if (!running) return;
  rafId = requestAnimationFrame(loop);
  if (!landmarker || video.readyState < 2 || video.currentTime === lastVideoTime) return;
  lastVideoTime = video.currentTime;
  const result = landmarker.detectForVideo(video, performance.now());
  const lm = result.faceLandmarks?.[0];
  latestFeatures = extractFeatures(lm);
  drawMouth(lm);
}

async function startCamera() {
  await initLandmarker();
  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
  video.srcObject = stream;
  await video.play();
  running = true;
  startCameraBtn.disabled = true;
  stopCameraBtn.disabled = false;
  loop();
  buildMoraModel();
  setStatus("カメラ準備OK");
}

function stopCamera() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  video.srcObject = null;
  latestFeatures = null;
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  startCameraBtn.disabled = false;
  stopCameraBtn.disabled = true;
  testBtn.disabled = true;
  setStatus("停止中");
}

async function captureRaw(durationMs = 3600) {
  if (!running) throw new Error("先にカメラを開始してください。");
  const sequence = [];
  const start = performance.now();
  while (performance.now() - start < durationMs) {
    if (latestFeatures) sequence.push([...latestFeatures]);
    await new Promise((resolve) => setTimeout(resolve, 45));
  }
  if (sequence.length < 30) throw new Error("口元を十分に検出できませんでした。正面を向いて再試行してください。");
  return sequence;
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 0.92;
  speechSynthesis.speak(utterance);
}

async function testUnseen() {
  if (!prototypes.size) buildMoraModel();
  testBtn.disabled = true;
  resultList.innerHTML = `<div class="result-empty">3.6秒間、候補のどれかを自然に口パクしてください…</div>`;
  setStatus("口パク記録中");
  try {
    const sequence = await captureRaw(3600);
    const ranked = candidates.map((item) => rankCandidate(sequence, item)).sort((a, b) => a.score - b.score).slice(0, 3);
    const best = ranked[0]?.score ?? 1;
    resultList.innerHTML = ranked.map((item, index) => {
      const relative = Math.max(8, Math.min(96, Math.round(96 * Math.exp(-1.6 * Math.max(0, item.score - best)) * (0.65 + item.coverage * 0.35))));
      return `<div class="result-card"><div><span class="rank">${index + 1}</span><strong>${escapeHtml(item.text)}</strong><small>適合度 ${relative}% ・ 学習音カバー ${Math.round(item.coverage * 100)}%</small></div><button type="button" data-speak="${escapeHtml(item.text)}">発声</button></div>`;
    }).join("");
    resultList.querySelectorAll("[data-speak]").forEach((button) => button.addEventListener("click", () => speak(button.dataset.speak)));
    setStatus("判定完了");
  } catch (error) {
    resultList.innerHTML = `<div class="result-empty">${escapeHtml(error.message || "判定に失敗しました")}</div>`;
    setStatus("判定失敗");
  } finally {
    testBtn.disabled = !running || Object.keys(loadCalibration().samples || {}).length < 6;
  }
}

addCustom.addEventListener("click", () => {
  const text = customText.value.trim();
  const reading = customReading.value.trim();
  if (!text || !reading || !/^[ぁ-んー\s]+$/.test(reading)) {
    alert("文章と、ひらがなの読みを入力してください。");
    return;
  }
  if (!candidates.some((item) => item.text === text)) candidates.push({ text: text.slice(0, 40), reading: reading.slice(0, 60) });
  saveCustomCandidates();
  customText.value = "";
  customReading.value = "";
  renderCandidates();
});

startCameraBtn.addEventListener("click", () => startCamera().catch((error) => { console.error(error); setStatus("カメラ失敗"); alert(error.message || "カメラを開始できませんでした"); }));
stopCameraBtn.addEventListener("click", stopCamera);
testBtn.addEventListener("click", testUnseen);

const completed = buildMoraModel();
if (completed < 6) {
  setStatus("キャリブレーション不足");
  $("calibrationHelp").classList.remove("hidden");
} else {
  setStatus(completed === 12 ? "12文学習済み" : `${completed}文学習済み`);
}
