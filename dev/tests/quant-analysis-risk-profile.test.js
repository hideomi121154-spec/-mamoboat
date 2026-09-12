const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const modulePath = path.join(root, "dev/mamo-quant-analysis-risk-profile.js");
const source = fs.readFileSync(modulePath, "utf8");
const api = require(modulePath);

const state = {
  coins: 20000,
  records: [
    { status: "miss", stake: 1000, payout: 0, time: "2026-09-10T10:00:00+09:00" },
    { status: "miss", stake: 1000, payout: 0, time: "2026-09-10T11:00:00+09:00" },
    { status: "hit", stake: 1000, payout: 4000, time: "2026-09-10T12:00:00+09:00" },
    { status: "miss", stake: 2000, payout: 0, time: "2026-09-10T13:00:00+09:00" },
    { status: "refunded", stake: 500, refundC: 500, time: "2026-09-10T14:00:00+09:00" },
    { status: "pending", stake: 9000, payout: 0, time: "2026-09-10T15:00:00+09:00" },
  ],
};

assert.equal(api.recordStake({ lines: [{ stake: 300 }, { stake: 700 }] }), 1000);
assert.equal(api.recordReturn({ status: "refunded", stake: 500, refundC: 500 }), 500);
assert.equal(api.recordNet({ status: "hit", stake: 1000, payout: 4000 }), 3000);
assert.equal(api.maxLosingStreak(state.records), 2);

const metrics = api.calculate(state);
assert.equal(metrics.balance, 20000);
assert.equal(metrics.settledCount, 5);
assert.equal(metrics.settledStake, 5500);
assert.equal(metrics.totalReturn, 4500);
assert.equal(metrics.returnRate, (4500 / 5500) * 100);
assert.equal(metrics.averageStake, 1100);
assert.equal(metrics.averageStakeBalanceRate, 5.5);
assert.equal(metrics.maxLosingStreak, 2);
assert.equal(metrics.maxDrawdown, 2000);
assert.equal(metrics.maxDrawdownBetRate, (2000 / 5500) * 100);
assert.equal(metrics.positiveProfitTotal, 3000);
assert.equal(metrics.lossTotal, 4000);
assert.equal(metrics.largestWinProfit, 3000);
assert.equal(metrics.largestSingleLoss, 2000);
assert.equal(metrics.largestWinShare, 100);
assert.equal(metrics.largestLossShare, 50);

const concentration = api.concentration([
  { status: "hit", stake: 1000, payout: 3000 },
  { status: "hit", stake: 1000, payout: 2000 },
  { status: "miss", stake: 1000, payout: 0 },
  { status: "miss", stake: 3000, payout: 0 },
]);
assert.equal(concentration.positiveTotal, 3000);
assert.equal(concentration.largestGain, 2000);
assert.equal(concentration.largestGainShare, (2000 / 3000) * 100);
assert.equal(concentration.negativeTotal, 4000);
assert.equal(concentration.largestLoss, 3000);
assert.equal(concentration.largestLossShare, 75);

let writes = 0;
const storage = {
  getItem(key) {
    assert.equal(key, "mamoboat_v40_personal");
    return JSON.stringify(state);
  },
  setItem() { writes += 1; },
  removeItem() { writes += 1; },
  clear() { writes += 1; },
};
const snapshot = api.readSnapshot(storage);
assert.equal(snapshot.coins, 20000);
assert.equal(snapshot.records.length, 6);
assert.equal(writes, 0);

assert.match(source, /STEP 8/);
assert.match(source, /実績ベースの資金リスク分析/);
assert.match(source, /最大1勝集中度/);
assert.match(source, /最大1損失集中度/);
assert.match(source, /危険.*安全|安全.*危険/);
assert.match(source, /推奨BET額/);
assert.match(source, /次レースの勝敗予測/);
assert.doesNotMatch(source, /setItem\s*\(|removeItem\s*\(|\.clear\s*\(/);
assert.doesNotMatch(source, /MAMO_AIR_BET_DRAFT|window\.(?:placeBet|updateReviewLineStake|removeReviewLine)\s*=/);
assert.doesNotMatch(source, /setTimeout|setInterval|requestAnimationFrame|MutationObserver|visualViewport|scrollTo|scrollBy|fetch\s*\(/);

console.log("quant analysis STEP 8 realized risk profile checks passed");
