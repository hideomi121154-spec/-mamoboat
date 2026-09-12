const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const helper = fs.readFileSync(path.join(root, "dev/allocation-keypad-stability.js"), "utf8");
const review = fs.readFileSync(path.join(root, "dev/bet-review-flow.js"), "utf8");
const css = fs.readFileSync(path.join(root, "dev/air-bet-review-compact.css"), "utf8");
const sw = fs.readFileSync(path.join(root, "dev/sw.js"), "utf8");

assert.match(helper, /results\.hidden\s*=\s*!keypad\.hidden/);
assert.match(helper, /data-mamo-budget-toggle/);
assert.match(helper, /data-mamo-budget-close/);
assert.match(helper, /data-mamo-auto-allocate/);
assert.doesNotMatch(helper, /innerHTML|setTimeout|setInterval|requestAnimationFrame|scrollTo|scrollBy|visualViewport|MutationObserver/);

assert.match(review, /function toggleBudgetKeypad\(/);
assert.match(review, /keypad\.hidden\s*=\s*!open/);
assert.match(css, /\.mamo-allocation-table-wrap[\s\S]*?overflow-y:\s*auto/);
assert.match(css, /\.mamo-allocation-keypad\[hidden\][\s\S]*?display:\s*none/);

assert.match(sw, /mamoboat-v512-allocation-keypad-height-dev/);
assert.match(sw, /allocation-keypad-stability\.js\?v=20260912-1/);
console.log("allocation keypad stability checks passed");
