const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const modulePath = path.join(root, "dev/mamo-quant-analysis-integrated.js");
const source = fs.readFileSync(modulePath, "utf8");
const api = require(modulePath);

const metrics = api.buildIntegratedMetrics(
  {
    settledCount: 20,
    returnRate: 84.2,
    averageStakeBalanceRate: 12.5,
    maxLosingStreak: 7,
    maxDrawdown: 18000,
    maxDrawdownBetRate: 31.4,
    largestWinShare: 62.5,
    largestLossShare: 28.0,
  },
  {
    settledCount: 20,
    observedDays: 4,
    singleRecordShare: 5,
    stakeCoverageRate: 100,
    dateCoverageRate: 95,
  }
);

assert.equal(metrics.settledCount, 20);
assert.equal(metrics.observedDays, 4);
assert.equal(metrics.minimumCoverageRate, 95);
assert.equal(metrics.returnRate, 84.2);
assert.equal(metrics.averageStakeBalanceRate, 12.5);
assert.equal(metrics.maxLosingStreak, 7);
assert.equal(metrics.maxDrawdown, 18000);
assert.equal(metrics.maxDrawdownBetRate, 31.4);
assert.equal(metrics.largestWinShare, 62.5);
assert.equal(metrics.largestLossShare, 28);
assert.equal(metrics.singleRecordShare, 5);

const sparse = api.buildIntegratedMetrics({}, {});
assert.equal(sparse.settledCount, 0);
assert.equal(sparse.observedDays, 0);
assert.equal(sparse.minimumCoverageRate, null);
assert.equal(sparse.returnRate, null);
assert.equal(sparse.averageStakeBalanceRate, null);
assert.equal(sparse.maxDrawdown, 0);

assert.match(source, /STEP 10/);
assert.match(source, /統合分析/);
assert.match(source, /指標同士を無理に1つの点数へ合成せず/);
assert.match(source, /『安全・危険』の判定、原因の断定、推奨BET額、次レース予測は行いません/);
assert.match(source, /MAMO_QUANT_RISK_PROFILE/);
assert.match(source, /MAMO_QUANT_DATA_FOUNDATION/);
assert.doesNotMatch(source, /localStorage\.setItem|sessionStorage\.setItem|fetch\s*\(|XMLHttpRequest|setTimeout\s*\(|setInterval\s*\(|requestAnimationFrame\s*\(|MutationObserver|visualViewport|scrollTo\s*\(|scrollBy\s*\(/);
assert.doesNotMatch(source, /リスクスコア|総合点|ランク[A-E]|次レースは|到達予定日/);

console.log("quant analysis STEP 10 integrated checks passed");
