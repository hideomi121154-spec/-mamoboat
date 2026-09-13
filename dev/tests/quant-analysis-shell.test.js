const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const helper = fs.readFileSync(path.join(root, "dev/mamo-quant-analysis-shell.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "dev/sw.js"), "utf8");

assert.match(helper, /__MAMO_QUANT_ANALYSIS_SHELL_V11__/);
assert.match(helper, /SCREEN_ID\s*=\s*"quantAnalysis"/);
assert.match(helper, /NAV_ID\s*=\s*"nav-quantAnalysis"/);
assert.match(helper, /BASIC_SCRIPT_SRC\s*=\s*"mamo-quant-analysis-basic\.js\?v=20260912-7"/);
assert.match(helper, /PERFORMANCE_SCRIPT_SRC\s*=\s*"mamo-quant-analysis-odds-performance\.js\?v=20260912-1"/);
assert.match(helper, /CAPITAL_SCRIPT_SRC\s*=\s*"mamo-quant-analysis-capital\.js\?v=20260913-3"/);
assert.match(helper, /COMPARISON_SCRIPT_SRC\s*=\s*"mamo-quant-analysis-comparison\.js\?v=20260913-1"/);
assert.match(helper, /RISK_SCRIPT_SRC\s*=\s*"mamo-quant-analysis-risk-profile\.js\?v=20260913-1"/);
assert.match(helper, /DATA_SCRIPT_SRC\s*=\s*"mamo-quant-analysis-data-foundation\.js\?v=20260913-1"/);
assert.match(helper, /INTEGRATED_SCRIPT_SRC\s*=\s*"mamo-quant-analysis-integrated\.js\?v=20260913-2"/);
assert.match(helper, /data-mamo-quant-analysis-basic/);
assert.match(helper, /data-mamo-quant-analysis-odds-performance/);
assert.match(helper, /data-mamo-quant-analysis-capital/);
assert.match(helper, /data-mamo-quant-analysis-comparison/);
assert.match(helper, /data-mamo-quant-analysis-risk-profile/);
assert.match(helper, /data-mamo-quant-analysis-data-foundation/);
assert.match(helper, /data-mamo-quant-analysis-integrated/);
assert.match(helper, /mamoQuantAnalysisBasic/);
assert.match(helper, /mamoQuantAnalysisOddsPerformance/);
assert.match(helper, /mamoQuantAnalysisCapital/);
assert.match(helper, /mamoQuantAnalysisComparison/);
assert.match(helper, /mamoQuantAnalysisRiskProfile/);
assert.match(helper, /mamoQuantAnalysisDataFoundation/);
assert.match(helper, /mamoQuantAnalysisIntegrated/);
assert.match(helper, /MAMO_QUANT_ANALYSIS_BASIC\?\.render/);
assert.match(helper, /MAMO_QUANT_ODDS_PERFORMANCE\?\.render/);
assert.match(helper, /MAMO_QUANT_CAPITAL\?\.render/);
assert.match(helper, /MAMO_QUANT_COMPARISON\?\.render/);
assert.match(helper, /MAMO_QUANT_RISK_PROFILE\?\.render/);
assert.match(helper, /MAMO_QUANT_DATA_FOUNDATION\?\.render/);
assert.match(helper, /MAMO_QUANT_INTEGRATED\?\.render/);
assert.match(helper, /ensurePerformanceModule/);
assert.match(helper, /ensureCapitalModule/);
assert.match(helper, /ensureComparisonModule/);
assert.match(helper, /ensureRiskProfileModule/);
assert.match(helper, /ensureDataFoundationModule/);
assert.match(helper, /ensureIntegratedModule/);
assert.match(helper, /統合分析を読み込めませんでした/);
assert.match(helper, /anchor\.appendChild\(section\)/);
assert.match(helper, /button\.id = NAV_ID/);
assert.match(helper, /nav\.appendChild\(button\)/);
assert.match(helper, /読み取り専用/);

// Analysis remains read-only. Opening the independent screen may reset the page
// scroll position, but it must not own timers, viewport listeners, network calls,
// persistence, or AIR BET mutations.
assert.doesNotMatch(helper, /localStorage\.|sessionStorage\.|fetch\s*\(|XMLHttpRequest|\.innerHTML\s*=|setTimeout\s*\(|setInterval\s*\(|requestAnimationFrame\s*\(|MutationObserver|visualViewport|scrollBy\s*\(/);
assert.doesNotMatch(helper, /window\.MAMO_AIR_BET_DRAFT|MAMO_AIR_BET_DRAFT\s*[.=]|window\.(?:updateReviewLineStake|placeBet|removeReviewLine)\s*=|\.records\s*=|\.coins\s*=|\.pressroom\s*=/);

assert.match(sw, /mamoboat-v517-primary-nav-safe-dev/);
assert.match(sw, /\/mamo-quant-analysis-\[\^\/\]\+\\\.js\$\/\.test\(url\.pathname\)/);
assert.match(sw, /fetch\(event\.request,\{cache:"no-store"\}\)/);

console.log("quant analysis shell STEP 10 delivery checks passed");
