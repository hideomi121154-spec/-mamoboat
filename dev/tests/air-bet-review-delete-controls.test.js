const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "air-bet-review-delete-controls.js"), "utf8");
const compat = fs.readFileSync(path.join(__dirname, "..", "decision-event-api-compat.js"), "utf8");
const sw = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");

assert.match(source, /data-mamo-budget-clear-shortcut/);
assert.match(source, /data-mamo-remove-line-shortcut/);
assert.match(source, /data-mamo-clear-all-lines/);
assert.match(source, /data-mamo-review-mode-chooser/);
assert.match(source, /data-mamo-review-mode-choice/);
assert.match(source, /通常BET/);
assert.match(source, /自動資金配分/);
assert.match(source, /dataset\.mamoReviewMode = MODE_NORMAL/);
assert.match(source, /setImportantDisplay\(nodes\.stakeTools, "grid"\)/);
assert.match(source, /setProperty\("flex", "0 0 auto", "important"\)/);
assert.match(source, /setProperty\("min-height", "0", "important"\)/);
assert.match(source, /window\.removeReviewLine\(index\)/);
assert.match(source, /window\.deleteAllReviewLines\(\)/);
assert.match(source, /MAMO_BET_REVIEW_ALLOCATION\?\.refresh/);

assert.doesNotMatch(source, /window\.removeReviewLine\s*=/);
assert.doesNotMatch(source, /window\.deleteAllReviewLines\s*=/);
assert.doesNotMatch(source, /window\.placeBet\s*=/);
assert.doesNotMatch(source, /window\.reviewBet\s*=/);
assert.doesNotMatch(source, /innerHTML\s*=/);
assert.doesNotMatch(source, /MutationObserver/);
assert.doesNotMatch(source, /requestAnimationFrame/);
assert.doesNotMatch(source, /visualViewport/);
assert.doesNotMatch(source, /scrollTo|scrollBy/);
assert.doesNotMatch(source, /setInterval|setTimeout/);

assert.match(compat, /air-bet-review-delete-controls\.js\?v=20260911-2/);
assert.match(compat, /data-mamo-review-delete-controls/);
assert.match(sw, /air-bet-review-delete-controls\.js\?v=20260911-2/);
assert.match(sw, /mamoboat-v496-airbet-normal-layout-dev/);

console.log("AIR BET safe review controls regression checks passed.");
