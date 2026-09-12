const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const helper = fs.readFileSync(path.join(root, "dev/allocation-keypad-stability.js"), "utf8");
const review = fs.readFileSync(path.join(root, "dev/bet-review-flow.js"), "utf8");
const css = fs.readFileSync(path.join(root, "dev/air-bet-review-compact.css"), "utf8");
const sw = fs.readFileSync(path.join(root, "dev/sw.js"), "utf8");

// Existing iPhone keypad ownership remains unchanged.
assert.match(helper, /results\.hidden\s*=\s*!keypad\.hidden/);
assert.match(helper, /data-mamo-budget-toggle/);
assert.match(helper, /data-mamo-budget-close/);
assert.match(helper, /data-mamo-auto-allocate/);
assert.doesNotMatch(helper, /innerHTML|setTimeout|setInterval|requestAnimationFrame|scrollTo|scrollBy|visualViewport|MutationObserver/);

// Missing reference odds are recovered only for the current race context.
assert.match(helper, /boatrace-odds/);
assert.match(helper, /date:\s*ctx\.raceDate/);
assert.match(helper, /venueCode:\s*ctx\.venueCode/);
assert.match(helper, /raceNo:\s*ctx\.raceNo/);
assert.match(helper, /referenceOdds:\s*recovered\.value/);
assert.match(helper, /oddsSource:\s*"review-live-recovery"/);
assert.match(helper, /recoveredOdds\.clear\(\)/);
assert.match(helper, /snapshot:\s*\(\)\s*=>\s*enrichLines\(api\.snapshot\(\),\s*context\(\)\)/);
assert.match(helper, /MAMO_BET_REVIEW_ALLOCATION\?\.refresh\?\.\(\)/);
assert.match(helper, /参考オッズを取得中/);
assert.match(helper, /もう一度入力欄を開くと再取得します/);

// Canonical allocation math and keypad behavior still belong to bet-review-flow.
assert.match(review, /function toggleBudgetKeypad\(/);
assert.match(review, /keypad\.hidden\s*=\s*!open/);
assert.match(review, /window\.MAMO_BET_REVIEW_ALLOCATION\s*=\s*Object\.freeze/);
assert.match(css, /\.mamo-allocation-table-wrap[\s\S]*?overflow-y:\s*auto/);
assert.match(css, /\.mamo-allocation-keypad\[hidden\][\s\S]*?display:\s*none/);

// Keep the previous cache marker while forcing delivery of the recovery build.
assert.match(sw, /mamoboat-v512-allocation-keypad-height-dev/);
assert.match(sw, /mamoboat-v513-allocation-odds-recovery-dev/);
assert.match(sw, /allocation-keypad-stability\.js\?v=20260912-2/);
console.log("allocation keypad and odds recovery stability checks passed");
