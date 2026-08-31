const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const devRoot = path.resolve(__dirname, "..");
const core = require(path.join(devRoot, "decision-conflict-core.js"));
const guard = fs.readFileSync(path.join(devRoot, "decision-conflict-guard.js"), "utf8");
const pilot = fs.readFileSync(path.join(devRoot, "pilot-config.js"), "utf8");
const serviceWorker = fs.readFileSync(path.join(devRoot, "sw.js"), "utf8");

test("information-led reconsideration is not treated as conflict", () => {
  const tracker = core.createTracker();
  tracker.recordSelection("A");
  tracker.recordInformation("odds");
  tracker.recordSelection("B");
  tracker.recordInformation("entries");
  tracker.recordSelection("A");
  tracker.recordReviewOpen();
  tracker.recordReviewReturn();
  tracker.recordInformation("live");
  tracker.recordReviewOpen();
  tracker.recordReviewReturn();

  const result = core.evaluate(tracker.summary());
  assert.equal(result.classification, "deliberation");
  assert.equal(result.informationDominant, true);
  assert.equal(result.shouldPause, false);
});

test("repeated review returns plus an uninformed selection return pause REAL", () => {
  const tracker = core.createTracker();
  tracker.recordSelection("A");
  tracker.recordSelection("B");
  tracker.recordSelection("A");
  tracker.recordReviewOpen();
  tracker.recordReviewReturn();
  tracker.recordReviewOpen();
  tracker.recordReviewReturn();

  const result = core.evaluate(tracker.summary());
  assert.equal(result.reviewStrong, true);
  assert.equal(result.uninformedSelectionReversals, 1);
  assert.equal(result.classification, "conflict_high");
  assert.equal(result.shouldPause, true);
  assert.ok(result.score >= 60);
});

test("one signal on its own never pauses REAL", () => {
  const amountOnly = core.createTracker();
  amountOnly.recordAmount(100);
  amountOnly.recordAmount(500);
  amountOnly.recordAmount(100);
  assert.equal(core.evaluate(amountOnly.summary()).shouldPause, false);

  const reviewOnly = core.createTracker();
  reviewOnly.recordReviewOpen();
  reviewOnly.recordReviewReturn();
  reviewOnly.recordReviewOpen();
  reviewOnly.recordReviewReturn();
  assert.equal(core.evaluate(reviewOnly.summary()).shouldPause, false);
});

test("review returns plus an uninformed amount reversal can pause REAL", () => {
  const tracker = core.createTracker();
  tracker.recordAmount(100);
  tracker.recordAmount(500);
  tracker.recordAmount(100);
  tracker.recordReviewOpen();
  tracker.recordReviewReturn();
  tracker.recordReviewOpen();
  tracker.recordReviewReturn();

  const result = core.evaluate(tracker.summary());
  assert.equal(result.uninformedAmountDirectionChanges, 1);
  assert.equal(result.shouldPause, true);
});

test("summaries contain counts but not the selected boats", () => {
  const tracker = core.createTracker();
  tracker.recordSelection("trifecta|normal|1;2;3");
  tracker.recordSelection("trifecta|normal|1;3;2");
  const serialized = JSON.stringify(tracker.summary());
  assert.doesNotMatch(serialized, /trifecta|normal|1;2;3/);
  assert.equal(tracker.summary().selectionChanges, 1);
});

test("the guard owns REAL capture before existing transition collectors", () => {
  const coreIndex = pilot.indexOf('"decision-conflict-core"');
  const guardIndex = pilot.indexOf('"decision-conflict-guard"');
  const collectorIndex = pilot.indexOf('"decision-event-collector"');
  assert.ok(coreIndex >= 0 && guardIndex > coreIndex && collectorIndex > guardIndex);
  assert.match(guard, /addEventListener\("click", handleRealCapture, true\)/);
  assert.match(guard, /event\.preventDefault\(\)/);
  assert.match(guard, /event\.stopImmediatePropagation\(\)/);
  assert.match(guard, /const bypassOnce = new WeakSet\(\)/);
});

test("the intervention is transparent, optional, and does not ask for a rating", () => {
  assert.match(guard, /情報確認を挟まない戻し直しが複数重なりました/);
  assert.match(guard, /今回は見送る/);
  assert.match(guard, /AIR BETに戻る/);
  assert.match(guard, /このまま公式サイトへ進む/);
  assert.match(guard, /迷いの強さは質問していません/);
  assert.match(guard, /艇番・買い目そのものは判定後に保存・送信しません/);
  assert.doesNotMatch(guard, /どれくらい迷いましたか|prompt\s*\(/);
  assert.doesNotMatch(guard, /setInterval\s*\(/);
});

test("the decision-conflict modules are available offline", () => {
  assert.match(serviceWorker, /decision-conflict-core\.js/);
  assert.match(serviceWorker, /decision-conflict-guard\.js/);
  assert.match(serviceWorker, /mamoboat-v412-decision-conflict-50-dev/);
});
