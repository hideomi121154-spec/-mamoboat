const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const modulePath = path.join(root, "dev/mamo-quant-analysis-capital.js");
const source = fs.readFileSync(modulePath, "utf8");
const api = require(modulePath);

assert.equal(api.DEFAULT_GOAL_B, 1000000);
assert.equal(api.MIN_GOAL_B, 10000);
assert.equal(api.MAX_GOAL_B, 100000000);
assert.deepEqual(api.STRESS_COUNTS, [5, 10, 15, 20]);
assert.equal(api.normalizeGoal(500000), 500000);
assert.equal(api.normalizeGoal(9999), 1000000);
assert.equal(api.normalizeGoal(100000001), 1000000);
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
}, 500000);
assert.equal(metrics.balance, 30030);
assert.equal(metrics.goal, 500000);
assert.equal(metrics.progress, (30030 / 500000) * 100);
assert.equal(metrics.remaining, 469970);
assert.equal(metrics.settledCount, 3);
assert.equal(metrics.averageSettledStake, 1000);
assert.equal(metrics.averageStakeBalanceRate, (1000 / 30030) * 100);
assert.deepEqual(metrics.stress, [
  { losses: 5, lossAmount: 5000, remaining: 25030 },
  { losses: 10, lossAmount: 10000, remaining: 20030 },
  { losses: 15, lossAmount: 15000, remaining: 15030 },
  { losses: 20, lossAmount: 20000, remaining: 10030 },
]);

const zero = api.calculate({ coins: 0, records: [] });
assert.equal(zero.progress, 0);
assert.equal(zero.remaining, 1000000);
assert.equal(zero.averageSettledStake, 0);
assert.equal(zero.averageStakeBalanceRate, null);
assert.deepEqual(zero.stress.map((item) => item.remaining), [0, 0, 0, 0]);

const overGoal = api.calculate({ coins: 1200000, records: [] }, 1000000);
assert.equal(overGoal.progress, 120);
assert.equal(overGoal.remaining, 0);

let appWrites = 0;
const appStorage = {
  getItem(key) {
    assert.equal(key, "mamoboat_v40_personal");
    return JSON.stringify({ coins: 50000, records: [{ status: "miss", stake: 500 }] });
  },
  setItem() { appWrites += 1; },
  removeItem() { appWrites += 1; },
  clear() { appWrites += 1; },
};
const snapshot = api.readSnapshot(appStorage);
assert.equal(snapshot.coins, 50000);
assert.equal(snapshot.records.length, 1);
assert.equal(appWrites, 0);

const goalStore = new Map();
const goalStorage = {
  getItem(key) { return goalStore.has(key) ? goalStore.get(key) : null; },
  setItem(key, value) {
    assert.equal(key, "mamoboat_quant_goal_v1");
    goalStore.set(key, value);
  },
};
assert.equal(api.readGoal(goalStorage), 1000000);
assert.equal(api.writeGoal(goalStorage, 750000), true);
assert.equal(goalStore.get("mamoboat_quant_goal_v1"), "750000");
assert.equal(api.readGoal(goalStorage), 750000);
assert.equal(api.writeGoal(goalStorage, 9999), false);
assert.equal(api.readGoal(goalStorage), 750000);

assert.match(source, /STEP 6\.2/);
assert.match(source, /資金耐久・目標B PROJECT/);
assert.match(source, /目標Bを変更する/);
assert.match(source, /100万Bは初期例です/);
assert.match(source, /連敗ストレスを見る/);
assert.match(source, /5, 10, 15, 20/);
assert.match(source, /将来の連敗数や損失を予測するものではありません/);
assert.match(source, /推奨BET額や到達時期は表示しません/);
assert.match(source, /mamoboat_quant_goal_v1/);
assert.doesNotMatch(source, /MAMO_AIR_BET_DRAFT|window\.(?:placeBet|updateReviewLineStake|removeReviewLine)\s*=/);
assert.doesNotMatch(source, /setTimeout|setInterval|requestAnimationFrame|MutationObserver|visualViewport|scrollTo|scrollBy|fetch\s*\(/);

console.log("quant analysis STEP 6.2 custom-goal capital checks passed");
