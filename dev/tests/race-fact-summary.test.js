const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
global.window = {};
require(path.join(root, "race-fact-summary.js"));

const api = global.window.MAMO_RACE_FACT_SUMMARY;
assert.ok(api && typeof api.render === "function");

const entries = [
  { boatNumber: 1, name: "A", class: "A1", motorNumber: 11, localWinRate: 7.21, averageStart: 0.14, flyingCount: 0, lateCount: 0, motor2Rate: 30.0, motor3Rate: 45.0, exhibitionTime: 6.72 },
  { boatNumber: 2, name: "B", class: "A2", motorNumber: 22, localWinRate: 5.10, averageStart: 0.16, flyingCount: 1, lateCount: 0, motor2Rate: 28.0, motor3Rate: 44.0, exhibitionTime: 6.75 },
  { boatNumber: 3, name: "C", class: "B1", motorNumber: 33, localWinRate: 4.90, averageStart: 0.12, flyingCount: 0, lateCount: 0, motor2Rate: 31.0, motor3Rate: 46.0, exhibitionTime: 6.70 },
  { boatNumber: 4, name: "D", class: "A2", motorNumber: 44, localWinRate: 5.80, averageStart: 0.15, flyingCount: 0, lateCount: 0, motor2Rate: 35.0, motor3Rate: 50.0, exhibitionTime: 6.69 },
  { boatNumber: 5, name: "E", class: "B1", motorNumber: 55, localWinRate: 4.20, averageStart: 0.18, flyingCount: 0, lateCount: 0, motor2Rate: 25.0, motor3Rate: 40.0, exhibitionTime: 6.80 },
  { boatNumber: 6, name: "F", class: "A1", motorNumber: 66, localWinRate: 6.00, averageStart: 0.13, flyingCount: 0, lateCount: 0, motor2Rate: 41.8, motor3Rate: 55.0, exhibitionTime: 6.71 },
];

const html = api.render({
  venueCode: "13",
  venueName: "尼崎",
  raceNumber: 4,
  entries,
  environment: { weather: "曇", windDirection: "北", windSpeed: 2, waveHeight: 1 },
  carteSource: { previewParsedRacers: 6, previewFetchedAt: "2026-09-29T12:00:00+09:00" },
});

assert.match(html, /事実まとめ/);
assert.match(html, /選手情報/);
assert.match(html, /場所の特徴/);
assert.match(html, /モーター/);
assert.match(html, /展示/);
assert.match(html, /当地勝率 1号艇 7\.21/);
assert.match(html, /モーター2連率 6号艇 41\.8%/);
assert.match(html, /展示 4号艇 6\.69/);
assert.match(html, /F1/);
assert.match(html, /尼崎/);
assert.match(html, /北2m/);
assert.match(html, /波/);
assert.match(html, /1cm/);
assert.doesNotMatch(html, /本命|おすすめ|買うべき|狙い目/);

const pendingEntries = entries.map(({ exhibitionTime, ...entry }) => entry);
const pending = api.render({
  venueName: "尼崎",
  entries: pendingEntries,
  environment: {},
  carteSource: {},
});
assert.match(pending, /展示/);
assert.match(pending, /直前データ待ち/);
assert.match(pending, /展示航走後に公式データが公開されてから反映/);

const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "race-fact-summary.css"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

assert.match(app, /MAMO_RACE_FACT_SUMMARY\?\.render/);
assert.match(app, /environment:\s*raceItem\.environment/);
assert.match(app, /carteSource:\s*raceItem\.carteSource/);
assert.match(app, /race-racer-details race-racer-details-source/);
assert.match(app, /factSummary \? `\$\{factSummary\}\$\{legacyEntries\}` : legacyEntries/);
assert.match(css, /\.race-racer-details-source\s*\{[\s\S]{0,80}display:\s*none !important/);
assert.match(css, /#raceView\.mamo-odds-active \.race-fact-card\s*\{[\s\S]{0,80}display:\s*none !important/);
assert.match(index, /race-fact-summary\.css\?v=20260929-2/);
assert.match(index, /race-fact-summary\.js\?v=20260929-3/);
assert.match(index, /race-fact-summary\.js\?v=20260929-3[\s\S]*app\.js\?v=20260929-1/);
assert.match(sw, /mamoboat-v540-race-fact-summary-final-dev/);
assert.match(sw, /race-fact-summary\.css\?v=20260929-2/);
assert.match(sw, /race-fact-summary\.js\?v=20260929-3/);

console.log("race fact summary regression contract: OK");
