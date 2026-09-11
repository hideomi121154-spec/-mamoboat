const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "..", "air-bet-review-delete-controls.js"), "utf8");
const compat = fs.readFileSync(path.join(__dirname, "..", "decision-event-api-compat.js"), "utf8");
const sw = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");

assert.match(source, /data-mamo-budget-clear-shortcut/);
assert.match(source, /data-mamo-remove-line-shortcut/);
assert.match(source, /data-mamo-clear-all-lines/);
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

assert.match(compat, /air-bet-review-delete-controls\.js\?v=20260911-1/);
assert.match(compat, /data-mamo-review-delete-controls/);
assert.match(sw, /air-bet-review-delete-controls\.js\?v=20260911-1/);

console.log("AIR BET safe delete controls regression checks passed.");
