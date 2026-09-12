const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const modulePath = path.join(root, "dev/mamo-quant-analysis-charts.js");
const source = fs.readFileSync(modulePath, "utf8");
const api = require(modulePath);

const records = [
  { status: "miss", stake: 100, odds: 5, net: -100 },
  { status: "hit", stake: 200, odds: 15, net: 600 },
  { status: "miss", stake: 300, odds: 40, net: -300 },
  { status: "refunded", stake: 100, odds: 120, net: 0 },
  { status: "pending", stake: 999, odds: 5, net: -999 },
];

const riskApi = {
  orderedRecords: (items) => items.slice(),
  recordStake: (record) => record.stake,
  recordNet: (record) => record.net,
};
const oddsApi = {
  PERFORMANCE_BANDS: [
    { key: "under10", label: "10倍未満", min: 0, max: 10 },
    { key: "10to30", label: "10〜30倍", min: 10, max: 30 },
    { key: "30to100", label: "30〜100倍", min: 30, max: 100 },
    { key: "100plus", label: "100倍以上", min: 100, max: Infinity },
  ],
  recordExposureOdds: (record) => record.odds,
  bandForOdds(value) {
    return this.PERFORMANCE_BANDS.find((band) => value >= band.min && value < band.max) || null;
  },
};

const data = api.buildChartData({ coins: 50100, records }, riskApi, oddsApi, {});
assert.equal(data.settledCount, 4);
assert.equal(data.balanceSeries.length, 5);
assert.equal(data.balanceSeries.at(-1).balance, 50100);
assert.equal(data.balanceSeries[0].balance, 49900);
assert.equal(data.eligibleStake, 700);
assert.equal(data.bands[0].net, -100);
assert.equal(data.bands[1].net, 600);
assert.equal(data.bands[2].net, -300);
assert.equal(data.bands[3].net, 0);
assert.equal(Math.round(data.bands.reduce((sum, band) => sum + band.stakeShare, 0)), 100);

const empty = api.buildChartData({ coins: 100000, records: [] }, riskApi, oddsApi, {});
assert.equal(empty.settledCount, 0);
assert.deepEqual(empty.balanceSeries, [{ index: 0, balance: 100000 }]);
assert.equal(empty.eligibleStake, 0);

assert.match(source, /mamoQuantAnalysisCharts/);
assert.match(source, /B残高の推移/);
assert.match(source, /オッズ帯別の損益/);
assert.match(source, /BET額の構成/);
assert.match(source, /createElementNS/);
assert.doesNotMatch(source, /\.innerHTML\s*=|insertAdjacentHTML|document\.write/);
assert.doesNotMatch(source, /localStorage\.setItem|sessionStorage\.setItem|fetch\s*\(|XMLHttpRequest/);
assert.doesNotMatch(source, /setTimeout\s*\(|setInterval\s*\(|requestAnimationFrame\s*\(|MutationObserver|visualViewport|scrollTo\s*\(|scrollBy\s*\(/);
assert.doesNotMatch(source, /querySelector\([^)]*(nav|pressroom|membership|pilot)/i);

console.log("quant analysis STEP 10 chart safety checks passed");
