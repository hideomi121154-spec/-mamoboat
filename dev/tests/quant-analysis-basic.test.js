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
    { status: "hit", stake: 100, payoutC: 250 },
    { status: "miss", stake: 300, payoutC: 0 },
    { status: "refunded", stake: 500, payoutC: 500, refundC: 500 },
    { status: "pending", stake: 1000, payoutC: 0 },
  ],
});
assert.equal(metrics.balance, 98700);
assert.equal(metrics.recordCount, 4);
assert.equal(metrics.decidedCount, 2);
assert.equal(metrics.hitCount, 1);
assert.equal(metrics.missCount, 1);
assert.equal(metrics.hitRate, 50);
assert.equal(metrics.averageStake, 475);
assert.equal(metrics.settledCount, 3);
assert.equal(metrics.settledStake, 900);
assert.equal(metrics.totalReturn, 750);
assert.equal(metrics.netProfit, -150);
assert.equal(metrics.returnRate, (750 / 900) * 100);
assert.equal(metrics.maxLosingStreak, 1);
assert.equal(metrics.maxDrawdown, 300);
assert.equal(metrics.maxDrawdownBetRate, (300 / 900) * 100);
assert.equal(metrics.maxSingleLoss, 300);
assert.equal(metrics.oddsLineCount, 0);
assert.equal(metrics.oddsCapturedCount, 0);
assert.equal(metrics.oddsCaptureRate, null);
assert.equal(metrics.averageOdds, null);
assert.equal(metrics.medianOdds, null);
assert.equal(metrics.minOdds, null);
assert.equal(metrics.maxOdds, null);
assert.deepEqual(metrics.oddsBands.map((band) => band.count), [0, 0, 0, 0]);

assert.equal(api.recordStake({ lines: [{ stake: 100 }, { stake: 200 }] }), 300);
assert.equal(api.recordReturn({ status: "hit", payoutC: 250, refundC: 50 }), 300);
assert.equal(api.recordReturn({ status: "refunded", payoutC: 500, refundC: 500 }), 500);
assert.equal(api.recordReturn({ status: "refunded", payoutC: 0, refundC: 400 }), 400);
assert.equal(api.recordNet({ status: "miss", stake: 500, payoutC: 0, refundC: 100 }), -400);
assert.equal(api.calculate({ coins: 100000, records: [] }).hitRate, null);
assert.equal(api.calculate({ coins: 100000, records: [] }).returnRate, null);
assert.equal(api.calculate({ coins: 100000, records: [] }).maxDrawdownBetRate, null);

assert.equal(api.normalizeOddsValue("2.35倍"), 2.35);
assert.equal(api.normalizeOddsValue(8.4), 8.4);
assert.equal(api.normalizeOddsValue("未取得"), null);
assert.equal(api.normalizeOddsValue(0), null);
assert.deepEqual(api.recordOddsEntries({
  lines: [
    { odds: "2.4" },
    { referenceOdds: "5.6倍" },
    { odds: "" },
  ],
}), [2.4, 5.6, null]);
assert.deepEqual(api.recordOddsEntries({ odds: "9.1" }), [9.1]);

assert.equal(api.median([]), null);
assert.equal(api.median([9]), 9);
assert.equal(api.median([100, 5, 20]), 20);
assert.equal(api.median([5, 10, 20, 100]), 15);
const boundaryBands = api.oddsBandDistribution([7.1, 10, 29.9, 30, 99.9, 100, 1666]);
assert.deepEqual(boundaryBands.map((band) => [band.key, band.count]), [
  ["under10", 1],
  ["10to30", 2],
  ["30to100", 2],
  ["100plus", 2],
]);
assert.equal(boundaryBands[0].rate, (1 / 7) * 100);
assert.equal(boundaryBands[1].rate, (2 / 7) * 100);
assert.equal(boundaryBands[2].rate, (2 / 7) * 100);
assert.equal(boundaryBands[3].rate, (2 / 7) * 100);

const oddsSummary = api.summarizeOdds([
  { lines: [{ odds: "2.0" }, { odds: "4.0" }, { odds: "" }] },
  { lines: [{ referenceOdds: "10.0倍" }] },
]);
assert.equal(oddsSummary.lineCount, 4);
assert.equal(oddsSummary.capturedCount, 3);
assert.equal(oddsSummary.captureRate, 75);
assert.equal(oddsSummary.averageOdds, 16 / 3);
assert.equal(oddsSummary.medianOdds, 4);
assert.equal(oddsSummary.minOdds, 2);
assert.equal(oddsSummary.maxOdds, 10);
assert.deepEqual(oddsSummary.bands.map((band) => band.count), [2, 1, 0, 0]);

const oddsMetrics = api.calculate({
  coins: 100000,
  records: [
    { status: "miss", stake: 200, lines: [{ stake: 100, odds: "3.2" }, { stake: 100, odds: "" }] },
    { status: "hit", stake: 100, payoutC: 500, lines: [{ stake: 100, odds: "8.8" }] },
  ],
});
assert.equal(oddsMetrics.oddsLineCount, 3);
assert.equal(oddsMetrics.oddsCapturedCount, 2);
assert.equal(oddsMetrics.oddsCaptureRate, (2 / 3) * 100);
assert.equal(oddsMetrics.averageOdds, 6);
assert.equal(oddsMetrics.medianOdds, 6);
assert.equal(oddsMetrics.minOdds, 3.2);
assert.equal(oddsMetrics.maxOdds, 8.8);
assert.deepEqual(oddsMetrics.oddsBands.map((band) => band.count), [2, 0, 0, 0]);

const outlierOdds = api.summarizeOdds([
  { lines: [
    { odds: "7.1" },
    { odds: "12" },
    { odds: "18" },
    { odds: "24" },
    { odds: "1666" },
  ] },
]);
assert.equal(outlierOdds.medianOdds, 18);
assert.equal(outlierOdds.averageOdds, (7.1 + 12 + 18 + 24 + 1666) / 5);
assert.deepEqual(outlierOdds.bands.map((band) => band.count), [1, 3, 0, 1]);

const riskRecords = [
  { time: "2026-09-12T03:00:00+09:00", status: "miss", stake: 300, payoutC: 0 },
  { time: "2026-09-12T01:00:00+09:00", status: "hit", stake: 100, payoutC: 300 },
  { time: "2026-09-12T02:00:00+09:00", status: "miss", stake: 100, payoutC: 0 },
  { time: "2026-09-12T04:00:00+09:00", status: "refunded", stake: 500, payoutC: 500 },
  { time: "2026-09-12T05:00:00+09:00", status: "pending", stake: 900, payoutC: 0 },
  { time: "2026-09-12T06:00:00+09:00", status: "miss", stake: 200, payoutC: 0 },
];
assert.deepEqual(api.orderedRecords(riskRecords).map((record) => record.time), [
  "2026-09-12T01:00:00+09:00",
  "2026-09-12T02:00:00+09:00",
  "2026-09-12T03:00:00+09:00",
  "2026-09-12T04:00:00+09:00",
  "2026-09-12T05:00:00+09:00",
  "2026-09-12T06:00:00+09:00",
]);
assert.equal(api.maxLosingStreak(riskRecords), 3);
assert.equal(api.currentLosingStreak(riskRecords), 3);
assert.equal(api.maxDrawdown(riskRecords), 600);
assert.equal(api.maxSingleLoss(riskRecords), 300);
assert.equal(api.currentLosingStreak([{ status: "pending" }, { status: "refunded" }]), null);
assert.equal(api.currentLosingStreak([{ status: "miss" }, { status: "hit" }]), 0);

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
assert.deepEqual(api.ODDS_BANDS.map((item) => item.key), ["under10", "10to30", "30to100", "100plus"]);
assert.match(source, /STEP 2\.6/);
assert.match(source, /STEP 3/);
assert.match(source, /STEP 4\.1/);
assert.match(source, /STEP 5\.1/);
assert.match(source, /収支分析/);
assert.match(source, /リスク分析/);
assert.match(source, /オッズ分析/);
assert.match(source, /オッズ取得率/);
assert.match(source, /中央値参考オッズ/);
assert.match(source, /平均参考オッズ/);
assert.match(source, /高オッズの影響を受けます/);
assert.match(source, /参考オッズ範囲/);
assert.match(source, /オッズ帯分布を見る/);
assert.match(source, /10倍未満/);
assert.match(source, /10〜30倍/);
assert.match(source, /30〜100倍/);
assert.match(source, /100倍以上/);
assert.match(source, /極端な高オッズの影響を受けにくい指標/);
assert.match(source, /買い目単位で集計/);
assert.match(source, /次のレースの的中確率を予測するものではありません/);
assert.match(source, /最大連敗/);
assert.match(source, /現在連敗/);
assert.match(source, /最大DD/);
assert.match(source, /最大1回損失/);
assert.match(source, /maxDrawdownBetRate/);
assert.match(source, /makeCardWithSubline/);
assert.match(source, /BET総額比/);
assert.match(source, /確定BET額に対する最大DDの比率/);
assert.match(source, /残高ベースのDD率ではありません/);
assert.match(source, /全履歴の最新の的中・不的中結果から算出/);
assert.match(source, /収支曲線の山から谷までの最大落ち込み/);
assert.match(source, /結果待ちのAIR BETはBET額・損益・回収率にまだ含めません/);
assert.match(source, /期間：\$\{period\.label\}/);
assert.match(source, /dataset\.analysisPeriodControl/);
assert.match(source, /dataset\.analysisOddsBands/);
assert.match(source, /document\.createElement\("details"\)/);
assert.match(source, /document\.createElement\("summary"\)/);
assert.match(source, /details\.open\s*=\s*false/);
assert.doesNotMatch(source, /gridTemplateColumns\s*=\s*"repeat\(3/);
assert.match(source, /B残高だけは期間に関係なく現在値/);
assert.doesNotMatch(source, /\.setItem\s*\(|\.removeItem\s*\(|\.clear\s*\(/);
assert.doesNotMatch(source, /setTimeout|setInterval|requestAnimationFrame|MutationObserver|visualViewport|scrollTo|scrollBy/);
assert.doesNotMatch(source, /window\.(?:placeBet|updateReviewLineStake|removeReviewLine)\s*=|MAMO_AIR_BET_DRAFT|\.coins\s*=|\.records\s*=|\.pressroom\s*=/);
assert.match(shell, /mamoQuantAnalysisBasic/);
assert.match(shell, /MAMO_QUANT_ANALYSIS_BASIC\?\.render/);
assert.match(shell, /mamo-quant-analysis-basic\.js\?v=20260912-7/);
assert.match(sw, /mamoboat-v515-quant-analysis-basic-step2-dev/);

console.log("quant analysis step 5.1 median and odds-band checks passed");