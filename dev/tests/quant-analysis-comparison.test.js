const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const modulePath = path.join(root, "dev/mamo-quant-analysis-comparison.js");
const source = fs.readFileSync(modulePath, "utf8");
const api = require(modulePath);

assert.equal(api.MIN_BET, 100);
assert.equal(api.STEP, 100);
assert.deepEqual(api.STRESS_COUNTS, [5, 10, 15, 20]);
assert.equal(api.clampHypotheticalBet(4468, 35030), 4500);
assert.equal(api.clampHypotheticalBet(999999, 35030), 35000);
assert.equal(api.clampHypotheticalBet(10, 35030), 100);
assert.equal(api.clampHypotheticalBet(1000, 90), 0);
assert.equal(api.remainingAfterLosses(35030, 2000, 10), 15030);
assert.equal(api.remainingAfterLosses(35030, 5000, 10), 0);

const compared = api.compare(35030, 1000000, 4468, 2000);
assert.equal(compared.actualStake, 4468);
assert.equal(compared.hypotheticalStake, 2000);
assert.equal(compared.stakeDelta, -2468);
assert.equal(compared.actualBalanceRate, (4468 / 35030) * 100);
assert.equal(compared.hypotheticalBalanceRate, (2000 / 35030) * 100);
assert.equal(compared.actualGoalRate, 0.4468);
assert.equal(compared.hypotheticalGoalRate, 0.2);
assert.deepEqual(compared.stress, [
  { losses: 5, actualRemaining: 12690, hypotheticalRemaining: 25030, difference: 12340 },
  { losses: 10, actualRemaining: 0, hypotheticalRemaining: 15030, difference: 15030 },
  { losses: 15, actualRemaining: 0, hypotheticalRemaining: 5030, difference: 5030 },
  { losses: 20, actualRemaining: 0, hypotheticalRemaining: 0, difference: 0 },
]);

const zero = api.compare(0, 1000000, 0, 1000);
assert.equal(zero.hypotheticalStake, 0);
assert.equal(zero.actualBalanceRate, null);
assert.equal(zero.hypotheticalBalanceRate, null);

assert.match(source, /STEP 7/);
assert.match(source, /実績と仮定の比較分析/);
assert.match(source, /今の平均BETと仮BETを比べる/);
assert.match(source, /現在の平均BET/);
assert.match(source, /仮BET/);
assert.match(source, /残高比/);
assert.match(source, /目標B比/);
assert.match(source, /5, 10, 15, 20/);
assert.match(source, /値は保存せず、推奨BET額・勝敗予測・到達時期は表示しません/);
assert.doesNotMatch(source, /\.setItem\s*\(|\.removeItem\s*\(|\.clear\s*\(/);
assert.doesNotMatch(source, /MAMO_AIR_BET_DRAFT|window\.(?:placeBet|updateReviewLineStake|removeReviewLine)\s*=/);
assert.doesNotMatch(source, /setTimeout|setInterval|requestAnimationFrame|MutationObserver|visualViewport|scrollTo|scrollBy|fetch\s*\(/);

console.log("quant analysis STEP 7 comparison checks passed");
