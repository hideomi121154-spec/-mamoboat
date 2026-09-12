const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "air-bet-review-compact.css"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

// Allocation mode has exactly one internal vertical scroll owner: the table wrap.
assert.match(css, /data-mamo-review-step="allocation"[\s\S]{0,220}\.mamo-allocation-results[\s\S]{0,260}flex:\s*1 1 0/);
assert.match(css, /data-mamo-review-step="allocation"[\s\S]{0,260}\.mamo-allocation-results[\s\S]{0,320}grid-template-rows:\s*auto minmax\(0, 1fr\) auto/);
assert.match(css, /\.mamo-allocation-table-wrap[\s\S]{0,260}overflow-y:\s*auto/);
assert.match(css, /\.mamo-allocation-table-wrap[\s\S]{0,320}-webkit-overflow-scrolling:\s*touch/);
assert.match(css, /\.mamo-allocation-table-wrap[\s\S]{0,360}touch-action:\s*pan-y/);
assert.match(css, /\.mamo-allocation-table th[\s\S]{0,180}position:\s*sticky/);

// Delivery must force installed iPhone PWAs onto this CSS revision.
assert.match(sw, /mamoboat-v509-allocation-results-scroll-dev/);
assert.match(sw, /air-bet-review-compact\.css\?v=20260912-2/);

// Keep risky JS scrolling/timing mechanisms out of this CSS-only fix.
assert.doesNotMatch(css, /position:\s*fixed/);

console.log("AIR BET allocation results scroll regression checks passed.");
