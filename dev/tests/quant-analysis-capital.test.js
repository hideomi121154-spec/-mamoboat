const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const modulePath = path.join(root, "dev/mamo-quant-analysis-capital.js");
const source = fs.readFileSync(modulePath, "utf8");
const api = require(modulePath);

assert.equal(api.GOAL_B, 1000000);
assert.equal(api.recordStake({ stake: 1200 }), 1200);
assert.equal(api.recordStake({ lines: [{ stake: 300 }, { stake: 700 }] }), 1000);

const metrics = api.calculate({
  coins: 30030,
  records: [
    { status: "hit", stake: 1000 },
    { status: "miss", stake: 1200 },
    { status: "refunded", stake: 800 },
    { status: "pending", stake: 9000 },
  ],
});
assert.equal(metrics.balance, 30030);
assert.equal(metrics.goal, 1000000);
assert.equal(metrics.progress, 3.003);
assert.equal(metrics.remaining, 969970);
assert.equal(metrics.settledCount, 3);
assert.equal(metrics.averageSettledStake, 1000);
assert.equal(metrics.averageStakeBalanceRate, (1000 / 30030) * 100);
assert.equal(metrics.tenLossAmount, 10000);
assert.equal(metrics.tenLossRemaining, 20030);

const zero = api.calculate({ coins: 0, records: [] });
assert.equal(zero.progress, 0);
assert.equal(zero.remaining, 1000000);
assert.equal(zero.averageSettledStake, 0);
assert.equal(zero.averageStakeBalanceRate, null);
assert.equal(zero.tenLossAmount, 0);
assert.equal(zero.tenLossRemaining, 0);

const overGoal = api.calculate({ coins: 1200000, records: [] });
assert.equal(overGoal.progress, 120);
assert.equal(overGoal.remaining, 0);

let writes = 0;
const storage = {
  getItem(key) {
    assert.equal(key, "mamoboat_v40_personal");
    return JSON.stringify({ coins: 50000, records: [{ status: "miss", stake: 500 }] });
  },
  setItem() { writes += 1; },
  removeItem() { writes += 1; },
  clear() { writes += 1; },
};
const snapshot = api.readSnapshot(storage);
assert.equal(snapshot.coins, 50000);
assert.equal(snapshot.records.length, 1);
assert.equal(writes, 0);

assert.match(source, /STEP 6\.1/);
assert.match(source, /100万B PROJECT/);
assert.match(source, /100万B進捗/);
assert.match(source, /100万Bまで残り/);
assert.match(source, /平均確定BET/);
assert.match(source, /10連敗ストレスを見る/);
assert.match(source, /将来の連敗数や損失を予測するものではなく/);
assert.match(source, /推奨BET額や到達時期は表示しません/);
assert.doesNotMatch(source, /\.setItem\s*\(|\.removeItem\s*\(|\.clear\s*\(/);
assert.doesNotMatch(source, /setTimeout|setInterval|requestAnimationFrame|MutationObserver|visualViewport|scrollTo|scrollBy|fetch\s*\(/);
assert.doesNotMatch(source, /MAMO_AIR_BET_DRAFT|window\.(?:placeBet|updateReviewLineStake|removeReviewLine)\s*=/);

console.log("quant analysis STEP 6.1 capital checks passed");
