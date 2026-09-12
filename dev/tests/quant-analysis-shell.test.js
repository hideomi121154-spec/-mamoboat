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
assert.doesNotMatch(helper, /localStorage|sessionStorage|fetch\(|XMLHttpRequest|innerHTML|setTimeout|setInterval|requestAnimationFrame|MutationObserver|visualViewport|scrollTo|scrollBy/);
assert.doesNotMatch(helper, /MAMO_AIR_BET_DRAFT|coins|wallet|records\s*=|pressroom|mamo-shop/i);

assert.match(sw, /mamoboat-v514-quant-analysis-shell-step1-dev/);
assert.match(sw, /mamo-quant-analysis-shell\.js\?v=20260912-1/);
assert.match(sw, /url\.pathname\.endsWith\("\/mamo-quant-analysis-shell\.js"\)/);

console.log("quant analysis shell step 1 checks passed");
