const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const modulePath = path.join(root, "dev/mamo-quant-analysis-basic.js");
const source = fs.readFileSync(modulePath, "utf8");
const shell = fs.readFileSync(path.join(root, "dev/mamo-quant-analysis-shell.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "dev/sw.js"), "utf8");
const api = require(modulePath);

const metrics = api.calculate({
  coins: 98700,
  records: [
    { status: "hit", stake: 100 },
    { status: "miss", stake: 300 },
    { status: "refunded", stake: 500 },
    { status: "pending", stake: 1000 },
  ],
});
assert.equal(metrics.balance, 98700);
assert.equal(metrics.recordCount, 4);
assert.equal(metrics.decidedCount, 2);
assert.equal(metrics.hitCount, 1);
assert.equal(metrics.missCount, 1);
assert.equal(metrics.hitRate, 50);
assert.equal(metrics.averageStake, 475);

assert.equal(api.recordStake({ lines: [{ stake: 100 }, { stake: 200 }] }), 300);
assert.equal(api.calculate({ coins: 100000, records: [] }).hitRate, null);

const now = "2026-09-12T08:00:00+09:00";
const records = [
  { raceDate: "2026-09-12", status: "hit", stake: 100 },
  { raceDate: "2026-09-11", status: "miss", stake: 200 },
  { raceDate: "2026-09-07", status: "miss", stake: 300 },
  { raceDate: "2026-09-06", status: "hit", stake: 400 },
  { raceDate: "2026-09-01", status: "miss", stake: 500 },
  { raceDate: "2026-08-31", status: "hit", stake: 600 },
  { time: "2026-09-11T23:30:00Z", status: "miss", stake: 700 },
];

assert.equal(api.filterRecords(records, "all", now).length, 7);
assert.equal(api.filterRecords(records, "today", now).length, 2);
assert.equal(api.filterRecords(records, "yesterday", now).length, 1);
assert.equal(api.filterRecords(records, "last7", now).length, 5);
assert.equal(api.filterRecords(records, "thisWeek", now).length, 4);
assert.equal(api.filterRecords(records, "thisMonth", now).length, 6);
assert.deepEqual(api.periodBounds("yesterday", now), { from: "2026-09-11", to: "2026-09-11" });
assert.deepEqual(api.periodBounds("thisWeek", now), { from: "2026-09-07", to: "2026-09-12" });
assert.deepEqual(api.periodBounds("thisMonth", now), { from: "2026-09-01", to: "2026-09-12" });
assert.equal(api.recordDateKey({ time: "2026-09-11T23:30:00Z" }), "2026-09-12");
assert.equal(api.filterRecords([{ status: "miss" }], "today", now).length, 0);

let writes = 0;
const storage = {
  getItem(key) {
    assert.equal(key, "mamoboat_v40_personal");
    return JSON.stringify({ coins: 123456, records: [{ status: "miss", stake: 200 }] });
  },
  setItem() { writes += 1; },
  removeItem() { writes += 1; },
};
const snapshot = api.readSnapshot(storage);
assert.equal(snapshot.coins, 123456);
assert.equal(snapshot.records.length, 1);
assert.equal(writes, 0);

assert.deepEqual(api.PERIODS.map((item) => item.key), ["all", "today", "yesterday", "last7", "thisWeek", "thisMonth"]);
assert.match(source, /STEP 2\.5/);
assert.match(source, /B残高だけは期間に関係なく現在値/);
assert.doesNotMatch(source, /\.setItem\s*\(|\.removeItem\s*\(|\.clear\s*\(/);
assert.doesNotMatch(source, /setTimeout|setInterval|requestAnimationFrame|MutationObserver|visualViewport|scrollTo|scrollBy/);
assert.doesNotMatch(source, /window\.(?:placeBet|updateReviewLineStake|removeReviewLine)\s*=|MAMO_AIR_BET_DRAFT|\.coins\s*=|\.records\s*=|\.pressroom\s*=/);
assert.match(shell, /mamoQuantAnalysisBasic/);
assert.match(shell, /MAMO_QUANT_ANALYSIS_BASIC\?\.render/);
assert.match(shell, /mamo-quant-analysis-basic\.js\?v=20260912-3/);
assert.match(sw, /mamoboat-v515-quant-analysis-basic-step2-dev/);

console.log("quant analysis step 2.5 read-only period checks passed");
