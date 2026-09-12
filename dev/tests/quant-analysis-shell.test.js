const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const helper = fs.readFileSync(path.join(root, "dev/mamo-quant-analysis-shell.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "dev/sw.js"), "utf8");

assert.match(helper, /__MAMO_QUANT_ANALYSIS_SHELL_V1__/);
assert.match(helper, /SCREEN_ID\s*=\s*"quantAnalysis"/);
assert.match(helper, /NAV_ID\s*=\s*"nav-quantAnalysis"/);
assert.match(helper, /main\.insertBefore\(section, settings\)/);
assert.match(helper, /nav\.insertBefore\(button, shopNav \|\| settingsNav\)/);
assert.match(helper, /window\.go\?\.\(SCREEN_ID\)/);
assert.match(helper, /計算機能はまだ未接続/);

// Step 1 must remain presentation/navigation only. Match actual executable
// integration points rather than harmless words that may appear in comments/copy.
assert.doesNotMatch(helper, /localStorage\.|sessionStorage\.|fetch\s*\(|XMLHttpRequest|\.innerHTML\s*=|setTimeout\s*\(|setInterval\s*\(|requestAnimationFrame\s*\(|MutationObserver|visualViewport|scrollTo\s*\(|scrollBy\s*\(/);
assert.doesNotMatch(helper, /window\.MAMO_AIR_BET_DRAFT|MAMO_AIR_BET_DRAFT\s*[.=]|window\.(?:updateReviewLineStake|placeBet|removeReviewLine)\s*=|\.records\s*=|\.coins\s*=|\.pressroom\s*=/);

assert.match(sw, /mamoboat-v514-quant-analysis-shell-step1-dev/);
assert.match(sw, /mamo-quant-analysis-shell\.js\?v=20260912-1/);
assert.match(sw, /url\.pathname\.endsWith\("\/mamo-quant-analysis-shell\.js"\)/);

console.log("quant analysis shell step 1 checks passed");
