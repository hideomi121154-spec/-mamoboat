const assert = require("assert");
const fs = require("fs");
const path = require("path");
const C = require("../core.js");
const ShopValue = require("../mamo-shop-value-core.js");

function resultDataset(payouts, payoutStatus = "paid") {
  return {
    date: "2026-08-09",
    venues: [{
      code: "12",
      races: [{
        number: 1,
        result: {
          finish: [
            { position: 1, boatNumber: 1 },
            { position: 2, boatNumber: 3 },
            { position: 3, boatNumber: 5 },
          ],
          sanrensho: payouts,
          payoutStatus,
        },
      }],
    }],
  };
}

let record = {
  raceDate: "2026-08-09",
  venueCode: "12",
  raceNo: 1,
  settled: false,
  stake: 1000,
  lines: [{ combo: [1, 3, 5], stake: 1000 }],
};
let settlement = C.settleRecord(
  record,
  resultDataset([{ combination: "1-3-5", payout: 4820, popularity: 4 }])
);
assert(settlement.changed);
assert.equal(record.status, "hit");
assert.equal(record.payoutC, 48200);

const deadHeat = {
  raceDate: "2026-08-09",
  venueCode: "12",
  raceNo: 1,
  settled: false,
  lines: [
    { combo: [1, 3, 5], stake: 100 },
    { combo: [1, 5, 3], stake: 200 },
  ],
};
C.settleRecord(deadHeat, resultDataset([
  { combination: "1-3-5", payout: 1000 },
  { combination: "1-5-3", payout: 800 },
]));
assert.equal(deadHeat.status, "hit");
assert.equal(deadHeat.payoutC, 2600);
assert.equal(deadHeat.resultPayouts.length, 2);

const allTypesDataset = resultDataset([]);
allTypesDataset.venues[0].races[0].result.payouts = {
  win: [{ combination: "1", payout: 170 }],
  place: [
    { combination: "1", payout: 200 },
    { combination: "3", payout: 180 },
  ],
  exacta: [{ combination: "1-3", payout: 540 }],
  quinella: [{ combination: "1-3", payout: 270 }],
  wide: [
    { combination: "1-3", payout: 100 },
    { combination: "1-2", payout: 160 },
    { combination: "2-3", payout: 110 },
  ],
  trifecta: [{ combination: "1-3-2", payout: 660 }],
  trio: [{ combination: "1-2-3", payout: 300 }],
};
allTypesDataset.venues[0].races[0].result.payoutStatus = "paid";
const allTypesRecord = {
  raceDate: "2026-08-09",
  venueCode: "12",
  raceNo: 1,
  settled: false,
  lines: [
    { betType: "win", combo: [1], stake: 100 },
    { betType: "place", combo: [3], stake: 200 },
    { betType: "exacta", combo: [1, 3], stake: 100 },
    { betType: "quinella", combo: [3, 1], stake: 100 },
    { betType: "wide", combo: [2, 1], stake: 100 },
    { betType: "trifecta", combo: [1, 3, 2], stake: 100 },
    { betType: "trio", combo: [3, 1, 2], stake: 100 },
  ],
};
const allTypesSettlement = C.settleRecord(allTypesRecord, allTypesDataset);
assert(allTypesSettlement.changed);
assert.equal(allTypesRecord.status, "hit");
assert.equal(allTypesRecord.payoutC, 2460);
assert.equal(allTypesRecord.resultPayouts.length, 10);

const partialDataset = resultDataset([]);
partialDataset.venues[0].races[0].result.payoutStatus = "partial";
partialDataset.venues[0].races[0].result.notEstablishedTypes = [
  "place", "quinella", "wide", "trifecta", "trio",
];
partialDataset.venues[0].races[0].result.payouts = {
  win: [{ combination: "1", payout: 170 }],
  exacta: [{ combination: "1-3", payout: 540 }],
};
const partialRecord = {
  raceDate: "2026-08-09",
  venueCode: "12",
  raceNo: 1,
  settled: false,
  stake: 600,
  lines: [
    { betType: "exacta", combo: [1, 3], stake: 100 },
    { betType: "trifecta", combo: [1, 3, 2], stake: 200 },
    { betType: "place", combo: [1], stake: 300 },
  ],
};
C.settleRecord(partialRecord, partialDataset);
assert.equal(partialRecord.status, "hit");
assert.equal(partialRecord.payoutC, 1040);
assert.equal(partialRecord.refundC, 500);

const wrongDate = {
  raceDate: "2026-08-08",
  venueCode: "12",
  raceNo: 1,
  settled: false,
  lines: [{ combo: [1, 3, 5], stake: 100 }],
};
assert.equal(C.settleRecord(
  wrongDate,
  resultDataset([{ combination: "1-3-5", payout: 1000 }])
).changed, false);

const refund = {
  raceDate: "2026-08-09",
  venueCode: "12",
  raceNo: 1,
  settled: false,
  stake: 700,
  lines: [{ combo: [1, 3, 5], stake: 700 }],
};
const refundResult = C.settleRecord(refund, resultDataset([], "notEstablished"));
assert(refundResult.changed);
assert(refundResult.refunded);
assert.equal(refund.status, "refunded");
assert.equal(refund.payoutC, 700);
assert.equal(refundResult.payoutAdded, 700);

function completeDataset() {
  const venues = Array.from({ length: 24 }, (_, venueIndex) => ({
    code: String(venueIndex + 1).padStart(2, "0"),
    name: `場${venueIndex + 1}`,
    active: venueIndex === 6,
    races: [],
  }));
  venues[6].races = Array.from({ length: 12 }, (_, raceIndex) => ({
    number: raceIndex + 1,
    closeTime: `2026-08-09T${String(9 + raceIndex).padStart(2, "0")}:00:00+09:00`,
    entries: Array.from({ length: 6 }, (_, boatIndex) => ({
      boatNumber: boatIndex + 1,
      racerNumber: 4000 + raceIndex * 6 + boatIndex,
      name: `選手${boatIndex + 1}`,
    })),
    result: null,
  }));
  return { schemaVersion: 7, date: "2026-08-09", venues };
}

const complete = completeDataset();
assert(C.validateDataset(complete));
complete.venues[6].races[3].entries.pop();
assert.equal(C.validateDataset(complete), false);

const totals = C.savedTotals([
  { time: "2026-08-09T01:00:00+09:00", saved: 1000 },
  { time: "2026-08-03T23:00:00+09:00", saved: 2000 },
  { time: "2026-08-02T23:00:00+09:00", saved: 4000 },
], new Date("2026-08-09T12:00:00+09:00"));
assert.deepEqual(totals, { today: 1000, week: 3000, month: 7000, all: 7000 });

const behavior = C.behaviorStats([
  {
    time: "2026-08-09T10:00:00+09:00",
    status: "miss",
    intendedYen: 1000,
    reason: "なんとなく",
    urge: 8,
    afterUrge: 3,
  },
  {
    time: "2026-08-09T10:10:00+09:00",
    status: "pending",
    intendedYen: 2000,
    reason: "取り返したい",
    urge: 9,
    afterUrge: 4,
  },
  {
    time: "2026-08-09T10:20:00+09:00",
    status: "pending",
    intendedYen: 500,
    reason: "レースがあるから",
    urge: 6,
    afterUrge: 2,
  },
]);
assert.equal(behavior.chase, 1);
assert.equal(behavior.declaredChase, 1);
assert.equal(behavior.postLossChase, 1);
assert.equal(behavior.escalation, 1);
assert.equal(behavior.rapid, 1);
assert.equal(behavior.urgeDrop, 14 / 3);

const morningReport = C.editorialReport([
  {
    time: "2026-08-13T10:00:00+09:00",
    intendedYen: 100,
    saved: 100,
    conf: 5,
    urge: 7,
    reason: "まあ100円だけ",
    status: "miss",
  },
  {
    time: "2026-08-13T10:12:00+09:00",
    intendedYen: 500,
    saved: 500,
    conf: 4,
    urge: 8,
    reason: "なんとなく",
    status: "pending",
  },
  {
    time: "2026-08-12T11:00:00+09:00",
    intendedYen: 100,
    saved: 100,
    conf: 6,
    urge: 4,
    reason: "推し選手",
    status: "miss",
  },
], "morning", new Date("2026-08-14T08:00:00+09:00"));
assert.equal(morningReport.available, true);
assert.equal(morningReport.recordCount, 2);
assert.equal(morningReport.issueKey, "morning:2026-08-13");
assert.match(morningReport.headline, /予定額が動いた場面/);
assert.equal(morningReport.facts[1].value, "600円");
assert.match(morningReport.trend, /前の同期間/);
assert(!/勝率|買い目|賭け金を推奨/.test(morningReport.headline));

const emptyMonthlyReport = C.editorialReport(
  [],
  "monthly",
  new Date("2026-08-14T08:00:00+09:00")
);
assert.equal(emptyMonthlyReport.available, false);
assert.equal(emptyMonthlyReport.recordCount, 0);
assert.match(emptyMonthlyReport.trend, /賭けなかった日とは推測しません/);

assert.equal(C.normalizeCombo("1 - 3 − 5"), "1-3-5");
assert.equal(C.canonicalCombo([3, 1, 2], "trio"), "1-2-3");
assert.equal(C.canonicalCombo([3, 1], "quinella"), "1-3");
assert.equal(C.canonicalCombo([3, 1], "exacta"), "3-1");

const latencyDataset = resultDataset([
  { combination: "1-3-5", payout: 1200 },
]);
latencyDataset.venues[0].races[0].closeTime = "2026-08-09T10:00:00+09:00";
latencyDataset.venues[0].races[0].result.fetchedAt = "2026-08-09T10:12:00+09:00";
const latencyRecord = {
  raceDate: "2026-08-09",
  venueCode: "12",
  raceNo: 1,
  closeTime: "2026-08-09T10:00:00+09:00",
  settled: false,
  lines: [{ combo: [1, 3, 5], stake: 100 }],
};
C.settleRecord(latencyRecord, latencyDataset, "2026-08-09T10:13:30+09:00");
assert.equal(latencyRecord.resultFetchLatencyMinutes, 12);
assert.equal(latencyRecord.resultLatencyMinutes, 13.5);
assert.equal(latencyRecord.resultDeliverySeconds, 90);
assert.equal(latencyRecord.resultReflectedAt, "2026-08-09T01:13:30.000Z");
const latencyStats = C.resultLatencyStats([
  latencyRecord,
  { resultLatencyMinutes: 15.2, resultFetchLatencyMinutes: 14 },
  { resultLatencyMinutes: 20, resultFetchLatencyMinutes: 18 },
  { resultLatencyMinutes: null, resultFetchLatencyMinutes: null },
]);
assert.equal(latencyStats.samples, 3);
assert.equal(latencyStats.medianMinutes, 15.2);
assert.equal(latencyStats.fetchedMedianMinutes, 14);

const official = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "data", "today.json"),
  "utf8"
));
assert.equal(official.source.type, "official-lzh");
assert(C.validateDataset(official));
const officialRaces = official.venues.reduce((sum, venue) => sum + venue.races.length, 0);
const officialEntries = official.venues.reduce(
  (sum, venue) => sum + venue.races.reduce(
    (raceSum, race) => raceSum + race.entries.length,
    0
  ),
  0
);
assert.equal(officialRaces, official.quality.stats.scheduleRaces);
assert.equal(officialEntries, official.quality.stats.scheduleEntries);

// 手動の「最新結果を確認」はキャッシュ読込だけで終わらず、Edge Functionへ
// forceRefreshを明示する契約を維持する（通信自体は通常テストでは行わない）。
const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
assert.match(appSource, /window\.refreshResultNow\s*=\s*async/);
assert.match(appSource, /forceRefresh:\s*true/);
assert.match(appSource, /result_latency_minutes/);
assert.match(appSource, /締切→MAMO BOAT反映/);
assert.doesNotMatch(appSource, /Air Boat/);

const selectPlanMatch = appSource.match(
  /window\.selectPilotPlan\s*=\s*\(key\)\s*=>\s*\{([\s\S]*?)\n  \};/
);
assert(selectPlanMatch, "selectPilotPlan implementation must exist in app.js");
assert.match(selectPlanMatch[1], /updatePlanUI\(\)/);
assert.doesNotMatch(
  selectPlanMatch[1],
  /renderPressroom|renderMembershipPanel|scrollTo|scrollBy|scrollY|requestAnimationFrame|visualViewport/
);
assert.match(appSource, /function updatePlanUI\(\)/);
assert.match(appSource, /data-pilot-plan="gold"/);
assert.doesNotMatch(appSource, /serviceWorker\.register/);
assert.match(appSource, /function renderAfterBackgroundUpdate\(\)/);
assert.match(appSource, /if \(id === "analysis"\) return;/);

const indexSource = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const manifestSource = fs.readFileSync(
  path.join(__dirname, "..", "manifest.webmanifest"),
  "utf8"
);
const serviceWorkerSource = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
const stylesSource = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
assert.match(indexSource, /<title>MAMO BOAT v4\.0\.1<\/title>/);
assert.match(indexSource, /styles\.css\?v=20260906-1/);
assert.match(indexSource, /brand-theme\.css\?v=20260827-2/);
assert.match(indexSource, /cast-ui\.js\?v=20260827-3/);
assert.match(indexSource, /assets\/EFE288D7-4C85-4906-A6E9-1590E55E7070\.png\?v=20260815-10/);
assert.match(indexSource, /onboard-cover-art/);
assert.doesNotMatch(indexSource, /onboard-(?:racer|cover)-tag/);
assert.match(indexSource, /core\.js\?v=401/);
assert.match(indexSource, /pilot-config\.js\?v=20260906-2/);
assert.match(indexSource, /app\.js\?v=20260906-2/);
assert.doesNotMatch(indexSource, /まもボート|Air Boat|v3\.9\.2|v=392/);
assert.match(indexSource, /MAMO編集部/);
assert.match(indexSource, /加音 守/);
assert.doesNotMatch(indexSource, /id="realBetFloat"/);
assert.doesNotMatch(indexSource, /ダブルWIN・防衛スタンプ/);
assert.match(indexSource, /<\/main>\s*<nav class="bottom-nav"/);
assert.match(stylesSource, /@media \(max-width: 743px\)[\s\S]*?\.bottom-nav[\s\S]*?bottom: 0 !important/);
assert.match(stylesSource, /\.bottom-nav[\s\S]*?transform: none !important/);
assert.match(stylesSource, /FIRST VOYAGE magazine cover/);
assert.equal(JSON.parse(manifestSource).name, "MAMO BOAT");
assert.equal(JSON.parse(manifestSource).short_name, "MAMO BOAT");
assert.match(serviceWorkerSource, /mamoboat-v415-compact-race-roster-53-dev/);

const pilotConfigSource = fs.readFileSync(path.join(__dirname, "..", "pilot-config.js"), "utf8");
assert.match(pilotConfigSource, /enabled:\s*true/);
assert.match(pilotConfigSource, /transport:\s*"rpc"/);
assert.match(pilotConfigSource, /\/rest\/v1\/rpc\/ingest_pilot_events/);
assert.match(pilotConfigSource, /publishableKey:\s*"sb_publishable_/);
assert.doesNotMatch(pilotConfigSource, /sb_secret_|service_role/);
assert.doesNotMatch(
  pilotConfigSource,
  /plan-(?:stable-controller|partial-update|selection-stable|click-stability|anchor-fix|system)|nav-stability|analysis-zoom-stability/
);
assert.match(appSource, /collectorClientKey/);
assert.match(appSource, /if \(\/\^eyJ\/\.test\(clientKey\)\)/);

const pressIntelligenceSource = fs.readFileSync(
  path.join(__dirname, "..", "press-intelligence.js"),
  "utf8"
);
const morningInsightSource = fs.readFileSync(
  path.join(__dirname, "..", "morning-insight-bridge.js"),
  "utf8"
);
const aiSafeSource = fs.readFileSync(path.join(__dirname, "..", "ai-safe.js"), "utf8");
const swRefreshSource = fs.readFileSync(path.join(__dirname, "..", "sw-refresh.js"), "utf8");
assert.doesNotMatch(pressIntelligenceSource, /setInterval\s*\(/);
assert.doesNotMatch(pressIntelligenceSource, /document\.addEventListener\("click"/);
assert.match(pressIntelligenceSource, /mamo:analysis-rendered/);
assert.doesNotMatch(morningInsightSource, /setInterval\s*\(/);
assert.doesNotMatch(morningInsightSource, /document\.addEventListener\("click"/);
assert.match(morningInsightSource, /mamo:press-intelligence-rendered/);
const aiSafeClickHandler = aiSafeSource.match(
  /document\.addEventListener\("click"[\s\S]*?\n  \}, false\);/
);
assert(aiSafeClickHandler, "AI safe click collector must exist");
assert.doesNotMatch(aiSafeClickHandler[0], /renderReport\(\)/);
assert.match(aiSafeSource, /mamo:analysis-rendered/);
assert.match(swRefreshSource, /serviceWorker\.register/);

for (const retiredPath of [
  "plan-anchor-fix.js",
  "plan-click-stability.js",
  "plan-partial-update.js",
  "plan-selection-stable.js",
  "plan-stable-controller.js",
  "plan-system.js",
  "analysis-zoom-stability.js",
  "nav-stability.js",
  ".github/workflows/patch-select-plan-only.yml",
]) {
  assert.equal(fs.existsSync(path.join(__dirname, "..", retiredPath)), false);
}
// 実レースで確認した中止・返還・欠場を精算回帰テストとして固定する。
function liveExceptionDataset(date, venueCode, raceNo, result) {
  return { date, venues: [{ code: venueCode, races: [{ number: raceNo, result }] }] };
}

// 2026-08-11 江戸川1R: レース中止は全買い目を返還する。
const cancelledLiveResult = {
  finish: [],
  payouts: {},
  refundBoats: [],
  payoutStatus: "notEstablished",
  notEstablishedTypes: ["win", "place", "exacta", "quinella", "wide", "trifecta", "trio"],
  settleable: true,
};
const cancelledLiveRecord = {
  raceDate: "2026-08-11",
  venueCode: "03",
  raceNo: 1,
  settled: false,
  stake: 700,
  lines: [{ betType: "trifecta", combo: [1, 2, 3], stake: 700 }],
};
C.settleRecord(
  cancelledLiveRecord,
  liveExceptionDataset("2026-08-11", "03", 1, cancelledLiveResult)
);
assert.equal(cancelledLiveRecord.status, "refunded");
assert.equal(cancelledLiveRecord.payoutC, 700);

// 2026-08-12 江戸川5R: 3・4・5号艇返還、拡連複・3連複不成立。
const partialLiveResult = {
  finish: [
    { position: 1, boatNumber: 1 },
    { position: 2, boatNumber: 6 },
    { position: 3, boatNumber: 2 },
  ],
  payouts: {
    win: [{ combination: "1", payout: 100 }],
    wide: [],
    trifecta: [{ combination: "1-6-2", payout: 440 }],
  },
  refundBoats: [3, 4, 5],
  payoutStatus: "partial",
  notEstablishedTypes: ["wide", "trio"],
  settleable: true,
};
const partialLiveRecord = {
  raceDate: "2026-08-12",
  venueCode: "03",
  raceNo: 5,
  settled: false,
  stake: 400,
  lines: [
    { betType: "trifecta", combo: [1, 6, 2], stake: 100 },
    { betType: "trifecta", combo: [3, 1, 6], stake: 100 },
    { betType: "wide", combo: [1, 6], stake: 100 },
    { betType: "win", combo: [2], stake: 100 },
  ],
};
C.settleRecord(
  partialLiveRecord,
  liveExceptionDataset("2026-08-12", "03", 5, partialLiveResult)
);
assert.equal(partialLiveRecord.status, "hit");
assert.equal(partialLiveRecord.refundC, 200);
assert.equal(partialLiveRecord.payoutC, 640);

// 2026-01-05 大村10R: 3号艇欠場は3号艇を含む買い目だけ返還する。
const scratchedLiveResult = {
  finish: [
    { position: 1, boatNumber: 6 },
    { position: 2, boatNumber: 2 },
    { position: 3, boatNumber: 1 },
  ],
  payouts: {
    win: [{ combination: "6", payout: 480 }],
    trifecta: [{ combination: "6-2-1", payout: 5230 }],
  },
  statuses: [
    { boatNumber: 1, status: "03" },
    { boatNumber: 2, status: "02" },
    { boatNumber: 3, status: "欠" },
    { boatNumber: 4, status: "04" },
    { boatNumber: 5, status: "05" },
    { boatNumber: 6, status: "01" },
  ],
  refundBoats: [3],
  payoutStatus: "paid",
  notEstablishedTypes: [],
  settleable: true,
};
const scratchedLiveRecord = {
  raceDate: "2026-01-05",
  venueCode: "24",
  raceNo: 10,
  settled: false,
  stake: 400,
  lines: [
    { betType: "trifecta", combo: [6, 2, 1], stake: 100 },
    { betType: "trifecta", combo: [3, 6, 2], stake: 100 },
    { betType: "win", combo: [3], stake: 100 },
    { betType: "win", combo: [6], stake: 100 },
  ],
};
const scratchedLiveSettlement = C.settleRecord(
  scratchedLiveRecord,
  liveExceptionDataset("2026-01-05", "24", 10, scratchedLiveResult)
);
assert(scratchedLiveSettlement.changed);
assert.equal(scratchedLiveRecord.status, "hit");
assert.equal(scratchedLiveRecord.refundC, 200);
assert.equal(scratchedLiveRecord.payoutC, 5910);
assert.equal(
  C.settleRecord(
    scratchedLiveRecord,
    liveExceptionDataset("2026-01-05", "24", 10, scratchedLiveResult)
  ).changed,
  false
);

// MAMO VALUE compares factual AIR BET replacement records with product prices.
const valueNow = new Date("2026-08-22T12:00:00+09:00");
const valueTotals = ShopValue.periodTotals([
  { raceDate: "2026-08-22", saved: 2000 },
  { raceDate: "2026-08-20", intendedYen: 500 },
  { raceDate: "2026-07-31", saved: 900 },
], valueNow);
assert.deepEqual(valueTotals, { today: 2000, week: 2500, month: 2500, all: 3400 });
assert.deepEqual(ShopValue.comparePrice(1800, valueTotals.month), {
  state: "within", remaining: 0, ratio: 100,
});
assert.deepEqual(ShopValue.comparePrice(3000, valueTotals.month), {
  state: "remaining", remaining: 500, ratio: 83,
});

const shopMarketplaceSource = fs.readFileSync(
  path.join(__dirname, "..", "mamo-shop-marketplace.js"),
  "utf8"
);
assert.match(shopMarketplaceSource, /これは値引き額ではありません/);
assert.match(shopMarketplaceSource, /実際の損失・貯金を補填するものではなく/);
assert.doesNotMatch(shopMarketplaceSource, /損失を取り返|実質無料|MAMO BOATのおかげ/);
assert.equal(fs.existsSync(path.join(__dirname, "..", "mamo-shop-real-products.js")), false);
assert.match(pilotConfigSource, /decision-event-api-compat\.js\?v=20260906-2/);
assert.match(pilotConfigSource, /behavior-science\.js\?v=20260829-2/);
assert.match(swRefreshSource, /Service Worker refresh v36/);

console.log("logic tests OK");
