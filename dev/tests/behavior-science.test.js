const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "behavior-science.js"), "utf8");
const storage = new Map();
const window = {
  addEventListener() {},
  crypto: { randomUUID: () => "test-id" },
};
const document = {
  readyState: "loading",
  addEventListener() {},
  body: { dataset: {} },
};
const localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
};

vm.runInNewContext(source, {
  window,
  document,
  localStorage,
  Intl,
  Date,
  Math,
  Number,
  String,
  Object,
  Array,
  Map,
  Set,
  JSON,
  console,
  setInterval() {},
  queueMicrotask() {},
  CustomEvent: class {},
});

const api = window.MAMO_BEHAVIOR_SCIENCE;
assert.equal(api.version, 1);

const base = Date.parse("2026-08-29T03:00:00.000Z");
const iso = (seconds) => new Date(base + seconds * 1000).toISOString();
const events = [
  {
    id: "result-miss", type: "result_seen", at: iso(0), day: "2026-08-29",
    recordId: "miss-1", raceDate: "2026-08-29", venueCode: "07", raceNo: 1,
    payload: { outcome: "miss", stakeB: 100, nextCloseSeconds: 900, openRaceCount: 12 },
  },
  {
    id: "race-after-miss", type: "race_view", at: iso(30), day: "2026-08-29",
    raceDate: "2026-08-29", venueCode: "07", raceNo: 2,
    payload: { selectedCloseSeconds: 600, openRaceCount: 12 },
  },
  {
    id: "air-after-miss", type: "air_bet", at: iso(60), day: "2026-08-29",
    recordId: "next-1", raceDate: "2026-08-29", venueCode: "07", raceNo: 2,
    payload: { stakeB: 300, selectedCloseSeconds: 570 },
  },
  {
    id: "result-hit", type: "result_seen", at: iso(3600), day: "2026-08-29",
    recordId: "hit-1", raceDate: "2026-08-29", venueCode: "07", raceNo: 3,
    payload: { outcome: "hit", stakeB: 200, nextCloseSeconds: 900, openRaceCount: 10 },
  },
  {
    id: "official-hit", type: "official_exit", at: iso(4200), day: "2026-08-29",
    raceDate: "2026-08-29", venueCode: "07", raceNo: 3,
    payload: { destinationKind: "real_intent", selectedCloseSeconds: 600 },
  },
  {
    id: "return-hit", type: "official_return", at: iso(4500), day: "2026-08-29",
    raceDate: "2026-08-29", venueCode: "07", raceNo: 3,
    payload: { exitId: "official-hit", destinationKind: "real_intent", awaySeconds: 300 },
  },
];
const records = [
  { id: "miss-1", status: "miss", stake: 100, time: iso(-600), raceDate: "2026-08-29", venueCode: "07", raceNo: 1 },
  { id: "next-1", status: "pending", stake: 300, time: iso(60), raceDate: "2026-08-29", venueCode: "07", raceNo: 2 },
  { id: "hit-1", status: "hit", stake: 200, time: iso(3000), raceDate: "2026-08-29", venueCode: "07", raceNo: 3 },
];
const intents = {
  "2026-08-29": { value: "none", recordedAt: iso(-300) },
};

const model = api.build({ events, records, intents });
assert.equal(model.episodes.length, 2);
assert.equal(model.miss.nextRaceMedian, 30);
assert.equal(model.miss.nextAirMedian, 60);
assert.equal(model.miss.nextStakeRatioMedian, 3);
assert.equal(model.hit.officialCount, 1);
assert.equal(model.hit.officialAwayMedian, 300);
assert.equal(model.hit.officialRate, 100);
assert.equal(model.plan.none.firstRaceMedian, 330);
assert.equal(model.plan.none.firstAirMedian, 360);
assert.equal(model.plan.none.raceViewsBeforeAirMedian, 1);
assert.equal(model.signals.missTwoFactor.length, 1);
assert.equal(model.signals.hitOfficial.length, 1);
assert.equal(model.signals.noPlanThenAir.length, 1);
assert.equal(model.comparableOpportunity, true);

assert.match(source, /今日、勝負すると決めているレースはありますか？/);
assert.match(source, /直接聞かずに見る3つの材料/);
assert.match(source, /朝の予定から、実際の行動まで/);
assert.match(source, /各n=5までは傾向と呼びません/);
assert.match(source, /診断ではなく/);
assert.doesNotMatch(source, /依存度スコア/);

console.log("Behavior Science links plan, result, next action, stake change, and official return without diagnosing emotion");
