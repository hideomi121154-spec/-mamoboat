"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "..");
const C = require(path.join(root, "core.js"));

function entry(boatNumber, motor2Rate, exhibitionTime, averageStart, nationalWinRate) {
  return {
    boatNumber,
    racerNumber: String(4000 + boatNumber),
    name: `選手${boatNumber}`,
    motor2Rate,
    exhibitionTime,
    averageStart,
    nationalWinRate,
  };
}

const entries = [
  entry(1, 58.2, 6.73, 0.13, 7.12),
  entry(2, 46.1, 6.82, 0.15, 6.38),
  entry(3, 52.4, 6.70, 0.16, 6.02),
  entry(4, 38.6, 6.88, 0.17, 5.91),
  entry(5, 49.3, 6.74, 0.12, 6.45),
  entry(6, 41.0, 6.90, 0.18, 5.72),
];

function record() {
  return {
    id: "review-1",
    raceDate: "2026-09-28",
    venueCode: "12",
    raceNo: 12,
    selfConfidence: 4,
    selfBasis: "motor",
    selfFocusBoat: 1,
    entrySnapshot: structuredClone(entries),
    lines: [
      { betType: "trifecta", combo: [1, 3, 5], stake: 100 },
      { betType: "trifecta", combo: [1, 5, 3], stake: 100 },
      { betType: "trifecta", combo: [1, 3, 2], stake: 100 },
      { betType: "trifecta", combo: [1, 5, 2], stake: 100 },
    ],
    stake: 400,
    status: "pending",
    settled: false,
    payoutC: 0,
    refundC: 0,
  };
}

function dataset() {
  return {
    date: "2026-09-28",
    venues: [{
      code: "12",
      races: [{
        number: 12,
        entries: structuredClone(entries),
        result: {
          settleable: true,
          finish: [
            { position: 1, boatNumber: 1, name: "選手1" },
            { position: 2, boatNumber: 5, name: "選手5" },
            { position: 3, boatNumber: 3, name: "選手3" },
          ],
          payouts: {
            trifecta: [{ combination: "1-5-3", payout: 5620, popularity: 10 }],
          },
        },
      }],
    }],
  };
}

test("multiple trifecta tickets are decomposed into 1st/2nd/3rd candidates", () => {
  const review = C.buildTrifectaResultAnalysis(record(), dataset().venues[0].races[0]);
  assert.equal(review.version, 1);
  assert.equal(review.lineCount, 4);
  assert.deepEqual(review.result, [1, 5, 3]);
  assert.deepEqual(review.firstCandidates, [1]);
  assert.deepEqual(review.secondCandidates, [3, 5]);
  assert.deepEqual(review.thirdCandidates, [2, 3, 5]);
  assert.deepEqual(review.positionMatches, [true, true, true]);
  assert.equal(review.matchedPositionCount, 3);
  assert.equal(review.top3Coverage, 3);
  assert.equal(review.exactHitCount, 1);
  assert.equal(review.exactOrderHit, true);
  assert.equal(review.lineResults.find((line) => line.combo === "1-5-3").exact, true);
  assert.deepEqual(
    review.lineResults.find((line) => line.combo === "1-5-2").positionMatches,
    [true, true, false]
  );
});

test("SELF CHECK basis is compared with pre-race official fact ranks", () => {
  const review = C.buildTrifectaResultAnalysis(record(), dataset().venues[0].races[0]);
  assert.equal(review.selfCheck.basis, "motor");
  assert.equal(review.selfCheck.focusBoat, 1);
  assert.equal(review.basisComparison.metricLabel, "モーター2連率");
  assert.equal(review.basisComparison.winnerRank, 1);
  assert.equal(review.basisComparison.focusRank, 1);
  assert.equal(review.basisComparison.focusResultPosition, 1);

  const first = review.finishFacts.find((item) => item.position === 1);
  const second = review.finishFacts.find((item) => item.position === 2);
  const third = review.finishFacts.find((item) => item.position === 3);
  assert.equal(first.facts.motor.rank, 1);
  assert.equal(second.facts.start.rank, 1);
  assert.equal(third.facts.exhibition.rank, 1);
});

test("settlement stores the result review on the AIR BET record", () => {
  const r = record();
  const result = C.settleRecord(r, dataset(), "2026-09-28T15:00:00+09:00");
  assert.equal(result.changed, true);
  assert.equal(r.status, "hit");
  assert.equal(r.resultCombo, "1-5-3");
  assert.equal(r.payoutC, 5620);
  assert.equal(r.resultAnalysis.exactHitCount, 1);
  assert.equal(r.resultAnalysis.top3Coverage, 3);
});

test("app captures full pre-race facts and sends a bounded result-review event", () => {
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const reviewFlow = fs.readFileSync(path.join(root, "bet-review-flow.js"), "utf8");
  const masterHtml = fs.readFileSync(path.join(repoRoot, "master-room.html"), "utf8");
  const masterJs = fs.readFileSync(path.join(repoRoot, "master-room.js"), "utf8");
  const userHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");

  for (const key of [
    "motor2Rate",
    "motor3Rate",
    "exhibitionTime",
    "averageStart",
    "nationalWinRate",
    "localWinRate",
    "boat2Rate",
  ]) {
    assert.match(app, new RegExp(`\\b${key}\\b`));
  }
  assert.match(app, /entrySnapshotVersion:\s*2/);
  assert.match(app, /entrySnapshotCapturedAt/);
  assert.match(app, /selfFocusBoat/);
  assert.match(app, /result_review:\s*resultReviewEventPayload\(record\.resultAnalysis\)/);
  assert.match(app, /lines:\s*\(analysis\.lineResults \|\| \[\]\)\.slice\(0, 30\)/);

  assert.match(reviewFlow, /特に評価した艇は？（任意）/);
  assert.match(reviewFlow, /data-mamo-self-focus-boat/);
  assert.match(reviewFlow, /panel\.dataset\.focusBoat/);

  assert.match(masterHtml, /3連単 レース答え合わせ/);
  assert.match(masterHtml, /id="editorialResultReviews"/);
  assert.match(masterHtml, /ユーザー画面にはまだ表示しません/);
  assert.match(masterJs, /function renderEditorialResultReviews\(data\)/);
  assert.match(masterJs, /判断と事実の比較/);
  assert.match(masterJs, /result_review/);

  assert.doesNotMatch(userHtml, /3連単 レース答え合わせ|editorialResultReviews/);
});
