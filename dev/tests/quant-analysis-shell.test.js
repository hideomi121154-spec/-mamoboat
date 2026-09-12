const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const helper = fs.readFileSync(path.join(root, "dev/mamo-quant-analysis-shell.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "dev/sw.js"), "utf8");

assert.match(helper, /__MAMO_QUANT_ANALYSIS_SHELL_V10__/);
assert.match(helper, /SCREEN_ID\s*=\s*"quantAnalysis"/);
assert.match(helper, /NAV_ID\s*=\s*"nav-quantAnalysis"/);
assert.match(helper, /BASIC_SCRIPT_SRC\s*=\s*"mamo-quant-analysis-basic\.js\?v=20260912-7"/);
assert.match(helper, /PERFORMANCE_SCRIPT_SRC\s*=\s*"mamo-quant-analysis-odds-performance\.js\?v=20260912-1"/);
assert.match(helper, /CAPITAL_SCRIPT_SRC\s*=\s*"mamo-quant-analysis-capital\.js\?v=20260913-3"/);
assert.match(helper, /COMPARISON_SCRIPT_SRC\s*=\s*"mamo-quant-analysis-comparison\.js\?v=20260913-1"/);
assert.match(helper, /RISK_SCRIPT_SRC\s*=\s*"mamo-quant-analysis-risk-profile\.js\?v=20260913-1"/);
assert.match(helper, /DATA_SCRIPT_SRC\s*=\s*"mamo-quant-analysis-data-foundation\.js\?v=20260913-1"/);
assert.match(helper, /data-mamo-quant-analysis-basic/);
assert.match(helper, /data-mamo-quant-analysis-odds-performance/);
assert.match(helper, /data-mamo-quant-analysis-capital/);
assert.match(helper, /data-mamo-quant-analysis-comparison/);
assert.match(helper, /data-mamo-quant-analysis-risk-profile/);
assert.match(helper, /data-mamo-quant-analysis-data-foundation/);
assert.match(helper, /mamoQuantAnalysisBasic/);
assert.match(helper, /mamoQuantAnalysisOddsPerformance/);
assert.match(helper, /mamoQuantAnalysisCapital/);
assert.match(helper, /mamoQuantAnalysisComparison/);
assert.match(helper, /mamoQuantAnalysisRiskProfile/);
assert.match(helper, /mamoQuantAnalysisDataFoundation/);
assert.match(helper, /MAMO_QUANT_ANALYSIS_BASIC\?\.render/);
assert.match(helper, /MAMO_QUANT_ODDS_PERFORMANCE\?\.render/);
assert.match(helper, /MAMO_QUANT_CAPITAL\?\.render/);
assert.match(helper, /MAMO_QUANT_COMPARISON\?\.render/);
assert.match(helper, /MAMO_QUANT_RISK_PROFILE\?\.render/);
assert.match(helper, /MAMO_QUANT_DATA_FOUNDATION\?\.render/);
assert.match(helper, /ensurePerformanceModule/);
assert.match(helper, /ensureCapitalModule/);
assert.match(helper, /ensureComparisonModule/);
assert.match(helper, /ensureRiskProfileModule/);
assert.match(helper, /ensureDataFoundationModule/);
assert.match(helper, /分析データの土台を読み込めませんでした/);
assert.match(helper, /main\.insertBefore\(section, settings\)/);
assert.match(helper, /nav\.insertBefore\(button, shopNav \|\| settingsNav\)/);
assert.match(helper, /window\.go\?\.\(SCREEN_ID\)/);
assert.match(helper, /読み取り専用/);

assert.doesNotMatch(helper, /localStorage\.|sessionStorage\.|fetch\s*\(|XMLHttpRequest|\.innerHTML\s*=|setTimeout\s*\(|setInterval\s*\(|requestAnimationFrame\s*\(|MutationObserver|visualViewport|scrollTo\s*\(|scrollBy\s*\(/);
assert.doesNotMatch(helper, /window\.MAMO_AIR_BET_DRAFT|MAMO_AIR_BET_DRAFT\s*[.=]|window\.(?:updateReviewLineStake|placeBet|removeReviewLine)\s*=|\.records\s*=|\.coins\s*=|\.pressroom\s*=/);

assert.match(sw, /mamoboat-v515-quant-analysis-basic-step2-dev/);
assert.match(sw, /url\.pathname\.endsWith\("\/mamo-quant-analysis-shell\.js"\)/);
assert.match(sw, /url\.pathname\.endsWith\("\/mamo-quant-analysis-basic\.js"\)/);

console.log("quant analysis shell STEP 9 delivery checks passed");
