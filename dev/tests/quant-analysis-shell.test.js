const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const helper = fs.readFileSync(path.join(root, "dev/mamo-quant-analysis-shell.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "dev/sw.js"), "utf8");

assert.match(helper, /__MAMO_QUANT_ANALYSIS_SHELL_V2__/);
assert.match(helper, /SCREEN_ID\s*=\s*"quantAnalysis"/);
assert.match(helper, /NAV_ID\s*=\s*"nav-quantAnalysis"/);
assert.match(helper, /main\.insertBefore\(section, settings\)/);
assert.match(helper, /nav\.insertBefore\(button, shopNav \|\| settingsNav\)/);
assert.match(helper, /window\.go\?\.\(SCREEN_ID\)/);
assert.match(helper, /mamoQuantAnalysisBasic/);
assert.match(helper, /読み取り専用/);
assert.match(helper, /MAMO_QUANT_ANALYSIS_BASIC\?\.render/);

// The shell remains presentation/navigation only. Data reading and calculation
// live in the separate basic-analysis module.
assert.doesNotMatch(helper, /localStorage\.|sessionStorage\.|fetch\s*\(|XMLHttpRequest|\.innerHTML\s*=|setTimeout\s*\(|setInterval\s*\(|requestAnimationFrame\s*\(|MutationObserver|visualViewport|scrollTo\s*\(|scrollBy\s*\(/);
assert.doesNotMatch(helper, /window\.MAMO_AIR_BET_DRAFT|MAMO_AIR_BET_DRAFT\s*[.=]|window\.(?:updateReviewLineStake|placeBet|removeReviewLine)\s*=|\.records\s*=|\.coins\s*=|\.pressroom\s*=/);

assert.match(sw, /mamoboat-v515-quant-analysis-basic-step2-dev/);
assert.match(sw, /mamo-quant-analysis-shell\.js\?v=20260912-2/);
assert.match(sw, /mamo-quant-analysis-basic\.js\?v=20260912-1/);
assert.match(sw, /url\.pathname\.endsWith\("\/mamo-quant-analysis-shell\.js"\)/);
assert.match(sw, /url\.pathname\.endsWith\("\/mamo-quant-analysis-basic\.js"\)/);

console.log("quant analysis shell step 2 checks passed");
