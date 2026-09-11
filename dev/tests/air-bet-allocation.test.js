const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "bet-review-flow.js"), "utf8");
const styles = fs.readFileSync(path.join(__dirname, "..", "air-bet-review-compact.css"), "utf8");

function loadEngine() {
  const document = {
    readyState: "loading",
    addEventListener() {},
    querySelectorAll() { return []; },
  };
  const window = { addEventListener() {} };
  const context = vm.createContext({ window, document, console, CustomEvent: class CustomEvent {} });
  vm.runInContext(source, context, { filename: "bet-review-flow.js" });
  return context.window.MAMO_BET_REVIEW_ALLOCATION;
}

const engine = loadEngine();
assert.ok(engine, "allocation engine is exported");
assert.equal(engine.unit, 100);

{
  const lines = [
    { referenceOdds: "5.0" },
    { referenceOdds: "10.0" },
    { referenceOdds: "20.0" },
  ];
  const combined = engine.combinedOdds(lines);
  assert.ok(Math.abs(combined - (1 / 0.35)) < 1e-9, "combined odds use reciprocal sum");

  const result = engine.allocate(lines, 10000);
  assert.equal(result.ok, true);
  assert.equal(result.amounts.reduce((sum, value) => sum + value, 0), 10000, "allocation preserves budget exactly");
  assert.ok(result.amounts.every((value) => value >= 100 && value % 100 === 0), "every line remains a valid 100B stake");
  assert.ok(result.payoutMax - result.payoutMin <= 1000, "discrete allocation keeps payouts close");
}

{
  const missing = engine.allocate([
    { referenceOdds: "5.0" },
    { referenceOdds: null },
  ], 1000);
  assert.equal(missing.ok, false);
  assert.equal(missing.code, "missing_odds");
}

{
  const tooSmall = engine.allocate([
    { referenceOdds: "5.0" },
    { referenceOdds: "10.0" },
    { referenceOdds: "20.0" },
  ], 200);
  assert.equal(tooSmall.ok, false);
  assert.equal(tooSmall.code, "budget_too_small");
  assert.equal(tooSmall.minimumBudget, 300);
}

{
  const invalidUnit = engine.allocate([{ referenceOdds: "5.0" }], 1050);
  assert.equal(invalidUnit.ok, false);
  assert.equal(invalidUnit.code, "invalid_unit");
}

// Native budget input and runtime CSS injection stay retired.
assert.equal(source.includes('input.type = "number"'), false, "allocation budget must not use a native number input");
assert.equal(source.includes('input.inputMode = "numeric"'), false, "allocation budget must not open the iOS numeric keyboard");
assert.equal(source.includes("injectAllocationStyles"), false, "allocation styles must live in the canonical review stylesheet");
assert.match(source, /dataset\.mamoBudgetKey/);
assert.match(source, /dataset\.mamoBudgetAdd/);
assert.match(source, /mamo-allocation-keypad/);

// Two-step review is presentation-only: existing cart and placeBet remain canonical.
assert.match(source, /reviewStep = "allocation"/);
assert.match(source, /dataset\.mamoReviewStep/);
assert.match(source, /dataset\.mamoReviewContinue/);
assert.match(source, /dataset\.mamoReviewBack/);
assert.match(source, /mamo-allocation-table/);
assert.match(source, /replaceChildren\(\.\.\.rows\)/, "compact list is diff-updated, not rebuilt through innerHTML");
assert.match(source, /window\.updateReviewLineStake/);
assert.doesNotMatch(source, /window\.placeBet\s*=/, "step controller must never wrap or replace placeBet");
assert.doesNotMatch(source, /window\.reviewBet\s*=/, "step controller must never wrap or replace reviewBet");

// Final state hides allocation/list and reveals the existing canonical confirmation button.
assert.match(styles, /data-mamo-review-step="allocation"/);
assert.match(styles, /data-mamo-review-step="final"/);
assert.match(styles, /\.air-bet-confirm-button/);
assert.match(styles, /\.mamo-review-final/);
assert.match(styles, /\.mamo-allocation-table\s*\{[\s\S]*?table-layout:\s*fixed/);
assert.doesNotMatch(styles, /position:\s*fixed/, "review-specific CSS must not create another fixed layer");

for (const unsafe of ["setInterval(", "setTimeout(", "requestAnimationFrame(", "visualViewport", "MutationObserver", "scrollIntoView", "scrollTo(", "scrollBy(", "position:fixed", "position: fixed"]) {
  assert.equal(source.includes(unsafe), false, `review allocation must not introduce ${unsafe}`);
}

console.log("AIR BET allocation, two-step review, and custom keypad tests passed");