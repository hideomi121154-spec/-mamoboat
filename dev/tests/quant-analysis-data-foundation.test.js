const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const modulePath = path.join(root, "dev/mamo-quant-analysis-data-foundation.js");
const source = fs.readFileSync(modulePath, "utf8");
const api = require(modulePath);

assert.equal(api.recordStake({ stake: 1200 }), 1200);
assert.equal(api.recordStake({ lines: [{ stake: 300 }, { stake: 700 }] }), 1000);
assert.equal(api.spanDays("2026-09-01", "2026-09-01"), 1);
assert.equal(api.spanDays("2026-09-01", "2026-09-03"), 3);
assert.equal(api.spanDays(null, "2026-09-03"), 0);
assert.equal(api.dateKey({ raceDate: "2026-09-12" }), "2026-09-12");

const metrics = api.calculate({
  records: [
    { status: "hit", stake: 1000, raceDate: "2026-09-10" },
    { status: "miss", lines: [{ stake: 500 }, { stake: 500 }], raceDate: "2026-09-10" },
    { status: "refunded", stake: 800, raceDate: "2026-09-12" },
    { status: "pending", stake: 9000, raceDate: "2026-09-12" },
    { status: "miss", stake: 0, createdAt: "2026-09-13T02:00:00+09:00" },
  ],
});
assert.equal(metrics.settledCount, 4);
assert.equal(metrics.decidedCount, 3);
assert.equal(metrics.stakeDataCount, 3);
assert.equal(metrics.stakeCoverageRate, 75);
assert.equal(metrics.datedCount, 4);
assert.equal(metrics.dateCoverageRate, 100);
assert.equal(metrics.observedDays, 3);
assert.equal(metrics.firstDate, "2026-09-10");
assert.equal(metrics.lastDate, "2026-09-13");
assert.equal(metrics.calendarSpanDays, 4);
assert.equal(metrics.recordsPerObservedDay, 4 / 3);
assert.equal(metrics.singleRecordShare, 25);

const empty = api.calculate({ records: [] });
assert.equal(empty.settledCount, 0);
assert.equal(empty.observedDays, 0);
assert.equal(empty.calendarSpanDays, 0);
assert.equal(empty.stakeCoverageRate, null);
assert.equal(empty.dateCoverageRate, null);
assert.equal(empty.singleRecordShare, null);

let writes = 0;
const storage = {
  getItem(key) {
    assert.equal(key, "mamoboat_v40_personal");
    return JSON.stringify({ records: [{ status: "hit", stake: 500, raceDate: "2026-09-12" }] });
  },
  setItem() { writes += 1; },
  removeItem() { writes += 1; },
  clear() { writes += 1; },
};
const snapshot = api.readSnapshot(storage);
assert.equal(snapshot.records.length, 1);
assert.equal(writes, 0);

assert.match(source, /STEP 9/);
assert.match(source, /分析データの土台/);
assert.match(source, /確定記録/);
assert.match(source, /記録日数/);
assert.match(source, /BET額データ/);
assert.match(source, /日付データ/);
assert.match(source, /1記録の母数比/);
assert.match(source, /良し悪しを判定するものではありません/);
assert.doesNotMatch(source, /危険|安全判定|推奨BET|勝敗予測|到達時期/);
assert.doesNotMatch(source, /setItem\s*\(|removeItem\s*\(|clear\s*\(|fetch\s*\(|setTimeout|setInterval|requestAnimationFrame|MutationObserver|visualViewport|scrollTo|scrollBy/);
assert.doesNotMatch(source, /MAMO_AIR_BET_DRAFT|updateReviewLineStake|placeBet|removeReviewLine/);

console.log("quant analysis STEP 9 data foundation checks passed");
