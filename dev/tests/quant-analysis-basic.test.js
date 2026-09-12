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

assert.doesNotMatch(source, /\.setItem\s*\(|\.removeItem\s*\(|\.clear\s*\(/);
assert.doesNotMatch(source, /setTimeout|setInterval|requestAnimationFrame|MutationObserver|visualViewport|scrollTo|scrollBy/);
assert.doesNotMatch(source, /window\.(?:placeBet|updateReviewLineStake|removeReviewLine)\s*=|MAMO_AIR_BET_DRAFT|\.coins\s*=|\.records\s*=|\.pressroom\s*=/);
assert.match(shell, /mamoQuantAnalysisBasic/);
assert.match(shell, /MAMO_QUANT_ANALYSIS_BASIC\?\.render/);
assert.match(sw, /mamoboat-v515-quant-analysis-basic-step2-dev/);
assert.match(sw, /mamo-quant-analysis-basic\.js\?v=20260912-1/);

console.log("quant analysis basic read-only checks passed");
