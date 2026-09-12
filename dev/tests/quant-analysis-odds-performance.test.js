const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const modulePath = path.join(root, "dev/mamo-quant-analysis-odds-performance.js");
const source = fs.readFileSync(modulePath, "utf8");
const api = require(modulePath);

const baseApi = {
  normalizeOddsValue(value) {
    if (value == null || value === "") return null;
    const match = String(value).match(/^([0-9]+(?:\.[0-9]+)?)/);
    return match ? Number(match[1]) : null;
  },
  recordStake(record) {
    if (Number(record?.stake) > 0) return Number(record.stake);
    return (record?.lines || []).reduce((sum, line) => sum + Number(line.stake || 0), 0);
  },
  recordReturn(record) {
    return Number(record?.payoutC || 0) + Number(record?.refundC || 0);
  },
};

assert.equal(api.recordExposureOdds({
  lines: [
    { stake: 100, odds: 10 },
    { stake: 300, odds: 30 },
  ],
}, baseApi), 25);
assert.equal(api.recordExposureOdds({
  lines: [
    { stake: 100, odds: 10 },
    { stake: 300, odds: "" },
  ],
}, baseApi), null);
assert.equal(api.recordExposureOdds({ stake: 500, odds: 18 }, baseApi), 18);
assert.equal(api.recordExposureOdds({ stake: 500 }, baseApi), null);

assert.equal(api.bandForOdds(9.9).key, "under10");
assert.equal(api.bandForOdds(10).key, "10to30");
assert.equal(api.bandForOdds(30).key, "30to100");
assert.equal(api.bandForOdds(100).key, "100plus");
assert.equal(api.bandForOdds(null), null);

const summary = api.summarizeBandPerformance([
  { status: "hit", stake: 100, payoutC: 150, lines: [{ stake: 100, odds: 8 }] },
  { status: "miss", stake: 200, payoutC: 0, lines: [{ stake: 200, odds: 20 }] },
  { status: "hit", stake: 300, payoutC: 900, lines: [{ stake: 100, odds: 20 }, { stake: 200, odds: 50 }] },
  { status: "miss", stake: 400, payoutC: 0, lines: [{ stake: 400, odds: 120 }] },
  { status: "miss", stake: 500, payoutC: 0, lines: [{ stake: 250, odds: 15 }, { stake: 250, odds: "" }] },
  { status: "refunded", stake: 600, payoutC: 600, lines: [{ stake: 600, odds: 12 }] },
  { status: "pending", stake: 700, payoutC: 0, lines: [{ stake: 700, odds: 25 }] },
], baseApi);

assert.equal(summary.decidedCount, 5);
assert.equal(summary.eligibleCount, 4);
assert.equal(summary.excludedMissingOdds, 1);
assert.deepEqual(summary.bands.map((band) => band.recordCount), [1, 1, 1, 1]);
assert.deepEqual(summary.bands.map((band) => band.hitCount), [1, 0, 1, 0]);
assert.equal(summary.bands[0].returnRate, 150);
assert.equal(summary.bands[1].returnRate, 0);
assert.equal(summary.bands[2].returnRate, 300);
assert.equal(summary.bands[3].returnRate, 0);
assert.equal(summary.bands[0].hitRate, 100);
assert.equal(summary.bands[1].hitRate, 0);

assert.match(source, /STEP 5\.2/);
assert.match(source, /オッズ帯別成績/);
assert.match(source, /オッズ帯ごとの成績を見る/);
assert.match(source, /BET額で加重平均/);
assert.match(source, /払戻を個別買い目へ推測配分しません/);
assert.match(source, /data-analysis-period/);
assert.doesNotMatch(source, /setTimeout|setInterval|requestAnimationFrame|MutationObserver|visualViewport|scrollTo|scrollBy/);
assert.doesNotMatch(source, /\.setItem\s*\(|\.removeItem\s*\(|\.clear\s*\(/);
assert.doesNotMatch(source, /fetch\s*\(|XMLHttpRequest|MAMO_AIR_BET_DRAFT|\.coins\s*=|\.records\s*=/);

console.log("quant analysis step 5.2 odds-band performance checks passed");
