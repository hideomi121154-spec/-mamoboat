const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "air-bet-review-compact.css"), "utf8");
const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

// FINAL CHECK must have exactly one internal vertical scroll owner so long
// SELF CHECK content remains reachable on iPhone without moving the page behind it.
assert.match(css, /data-mamo-review-step="final"[\s\S]{0,220}\.mamo-review-final[\s\S]{0,260}flex:\s*1 1 0/);
assert.match(css, /data-mamo-review-step="final"[\s\S]{0,300}\.mamo-review-final[\s\S]{0,340}min-height:\s*0/);
assert.match(css, /data-mamo-review-step="final"[\s\S]{0,360}\.mamo-review-final[\s\S]{0,420}overflow-y:\s*auto/);
assert.match(css, /data-mamo-review-step="final"[\s\S]{0,420}\.mamo-review-final[\s\S]{0,480}overscroll-behavior:\s*contain/);
assert.match(css, /data-mamo-review-step="final"[\s\S]{0,480}\.mamo-review-final[\s\S]{0,540}-webkit-overflow-scrolling:\s*touch/);
assert.match(css, /data-mamo-review-step="final"[\s\S]{0,540}\.mamo-review-final[\s\S]{0,600}touch-action:\s*pan-y/);

// The outer AIR BET modal remains fixed; do not reintroduce page-level/nested scrolling.
assert.match(styles, /\.modal\.air-bet-review-modal\s*\{[\s\S]{0,420}overflow:\s*hidden/);
assert.match(styles, /\.air-bet-review-shell\s*\{[\s\S]{0,360}overflow:\s*hidden/);
assert.doesNotMatch(css, /position:\s*fixed/);

console.log("AIR BET final-check scroll ownership regression checks passed.");
