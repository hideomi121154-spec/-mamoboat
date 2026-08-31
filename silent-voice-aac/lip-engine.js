const MP_VERSION = "1.0.1";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const PHRASES = ["はい", "いいえ", "ありがとう", "水が欲しいです", "痛いです"];
const STORAGE_KEY = "silentVoiceAAC.templates.v1";

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function extractFeatures(lm) {
  if (!lm || lm.length < 309) return null;

  const left = lm[61];
  const right = lm[291];
  const innerTop = lm[13];
  const innerBottom = lm[14];
  const outerTop = lm[0];
  const outerBottom = lm[17];
  const innerLeft = lm[78];
  const innerRight = lm[308];

  const width = Math.max(dist(left, right), 1e-6);
  const innerWidth = Math.max(dist(innerLeft, innerRight), 1e-6);

  return [
    dist(innerTop, innerBottom) / width,
    dist(outerTop, outerBottom) / width,
    innerWidth / width,
    (innerTop.y + innerBottom.y) / 2 - (left.y + right.y) / 2,
    (innerTop.x + innerBottom.x) / 2 - (left.x + right.x) / 2,
  ];
}

function normalizeSequence(seq, targetLength = 30) {
  if (!seq || seq.length < 4) return [];

  const source = seq.slice(2, -2);
  if (source.length < 2) return seq;

  const dims = source[0].length;
  const out = [];
  for (let i = 0; i < targetLength; i++) {
    const pos = (i * (source.length - 1)) / (targetLength - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(source.length - 1, lo + 1);
    const t = pos - lo;
    const frame = [];
    for (let d = 0; d < dims; d++) {
      frame.push(source[lo][d] * (1 - t) + source[hi][d] * t);
    }
    out.push(frame);
  }

  for (let d = 0; d < dims; d++) {
    const vals = out.map((f) => f[d]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    const sd = Math.sqrt(variance) || 1;
    for (const frame of out) frame[d] = (frame[d] - mean) / sd;
  }
  return out;
}

function frameDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum / a.length);
}

function dtwDistance(a, b) {
  const n = a.length;
  const m = b.length;
  if (!n || !m) return Infinity;

  const prev = new Float64Array(m + 1).fill(Infinity);
  const curr = new Float64Array(m + 1).fill(Infinity);
  prev[0] = 0;

  for (let i = 1; i <= n; i++) {
    curr.fill(Infinity);
    for (let j = 1; j <= m; j++) {
      const cost = frameDistance(a[i - 1], b[j - 1]);
      curr[j] = cost + Math.min(curr[j - 1], prev[j], prev[j - 1]);
    }
    prev.set(curr);
  }
  return prev[m] / (n + m);
}

function loadTemplates() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    for (const phrase of PHRASES) {
      if (!Array.isArray(parsed[phrase])) parsed[phrase] = [];
    }
    return parsed;
  } catch {
    return Object.fromEntries(PHRASES.map((p) => [p, []]));
  }
}

function saveTemplates(templates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export class LipEngine {
  constructor({ video, canvas, onStatus, onFrame }) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onStatus = onStatus || (() => {});
    this.onFrame = onFrame || (() => {});
    this.faceLandmarker = null;
    this.stream = null;
    this.running = false;
    this.lastVideoTime = -1;
    this.latestFeatures = null;
    this.rafId = null;
    this.templates = loadTemplates();
  }

  async init() {
    this.onStatus("AI読込中");
    try {
      const vision = await import(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/+esm`);
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
      this.faceLandmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
      this.onStatus("AI準備OK");
      return true;
    } catch (error) {
      console.error(error);
      this.onStatus("AI読込失敗");
      return false;
    }
  }

  async startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("このブラウザはカメラ入力に対応していません。");
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 960 },
      },
      audio: false,
    });
    this.video.srcObject = this.stream;
    await this.video.play();
    this.running = true;
    this.renderLoop();
  }

  stopCamera() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.stream) this.stream.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.latestFeatures = null;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderLoop() {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(() => this.renderLoop());
    if (!this.faceLandmarker || this.video.readyState < 2 || this.video.currentTime === this.lastVideoTime) return;

    this.lastVideoTime = this.video.currentTime;
    const w = this.video.videoWidth || 640;
    const h = this.video.videoHeight || 480;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    const result = this.faceLandmarker.detectForVideo(this.video, performance.now());
    const lm = result.faceLandmarks?.[0];
    this.latestFeatures = extractFeatures(lm);
    this.drawMouth(lm, w, h);
    this.onFrame({ hasFace: Boolean(lm), features: this.latestFeatures });
  }

  drawMouth(lm, w, h) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);
    if (!lm) return;

    const ids = [61, 40, 37, 0, 267, 270, 291, 321, 314, 17, 84, 91, 61];
    ctx.strokeStyle = "rgba(81, 224, 200, 0.95)";
    ctx.lineWidth = Math.max(3, w / 220);
    ctx.beginPath();
    ids.forEach((id, index) => {
      const p = lm[id];
      const x = p.x * w;
      const y = p.y * h;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  async capture(durationMs = 2200) {
    if (!this.running) throw new Error("先にカメラを開始してください。");
    const seq = [];
    const start = performance.now();
    while (performance.now() - start < durationMs) {
      if (this.latestFeatures) seq.push([...this.latestFeatures]);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const normalized = normalizeSequence(seq);
    if (normalized.length < 10) throw new Error("口元を十分に検出できませんでした。顔を正面に近づけて再試行してください。");
    return normalized;
  }

  addTemplate(phrase, sequence) {
    if (!PHRASES.includes(phrase)) throw new Error("未対応のフレーズです。");
    this.templates[phrase] ||= [];
    this.templates[phrase].push(sequence);
    if (this.templates[phrase].length > 5) this.templates[phrase] = this.templates[phrase].slice(-5);
    saveTemplates(this.templates);
  }

  clearTemplates() {
    this.templates = Object.fromEntries(PHRASES.map((p) => [p, []]));
    saveTemplates(this.templates);
  }

  counts() {
    return Object.fromEntries(PHRASES.map((p) => [p, this.templates[p]?.length || 0]));
  }

  classify(sequence) {
    const scored = [];
    for (const phrase of PHRASES) {
      const templates = this.templates[phrase] || [];
      if (!templates.length) continue;
      const distances = templates.map((t) => dtwDistance(sequence, t)).sort((a, b) => a - b);
      const bestTwo = distances.slice(0, Math.min(2, distances.length));
      const score = bestTwo.reduce((a, b) => a + b, 0) / bestTwo.length;
      scored.push({ phrase, distance: score });
    }
    scored.sort((a, b) => a.distance - b.distance);
    if (!scored.length) return [];

    const best = scored[0].distance;
    return scored.slice(0, 3).map((item) => ({
      phrase: item.phrase,
      distance: item.distance,
      confidence: Math.round(clamp(100 * Math.exp(-2.8 * Math.max(0, item.distance - best + 0.04)), 8, 96)),
    }));
  }
}

export { PHRASES };
