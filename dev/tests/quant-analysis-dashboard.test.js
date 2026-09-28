const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const dashboard = fs.readFileSync(path.join(root, "dev/mamo-quant-analysis-dashboard.js"), "utf8");
const css = fs.readFileSync(path.join(root, "dev/mamo-quant-analysis-dashboard.css"), "utf8");
const shell = fs.readFileSync(path.join(root, "dev/mamo-quant-analysis-shell.js"), "utf8");
const charts = fs.readFileSync(path.join(root, "dev/mamo-quant-analysis-charts.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "dev/sw.js"), "utf8");

assert.match(shell, /DASHBOARD_SCRIPT_SRC\s*=\s*"mamo-quant-analysis-dashboard\.js\?v=20260928-1"/);
assert.match(shell, /DASHBOARD_STYLE_HREF\s*=\s*"mamo-quant-analysis-dashboard\.css\?v=20260928-1"/);
assert.match(shell, /mamoQuantAnalysisDashboard/);
assert.match(shell, /mamoQuantAnalysisLegacy/);
assert.match(shell, /legacy\.append\(heading, mount, performanceMount, capitalMount, comparisonMount, riskMount, dataMount, integratedMount\)/);
assert.match(shell, /ensureDashboardModule/);
assert.match(shell, /if \(renderIntegrated\(\)\) \{[\s\S]*?ensureDashboardModule\(\)/);

assert.match(dashboard, /MAMO CHECK（要約）/);
assert.match(dashboard, /今の成績（累計）/);
assert.match(dashboard, /① 成績/);
assert.match(dashboard, /② BETの特徴/);
assert.match(dashboard, /③ 資金の耐久力/);
assert.match(dashboard, /④ 詳細データ/);
assert.match(dashboard, /分析トップに戻る/);
assert.match(dashboard, /ヘルプ \/ 見方ガイド/);
assert.match(dashboard, /function setPresentationMode\(/);
assert.match(dashboard, /shellIntro\.hidden = dashboardVisible/);
assert.match(dashboard, /data-analysis-dashboard-slider/);
assert.match(dashboard, /MAMO_QUANT_ANALYSIS_BASIC/);
assert.match(dashboard, /MAMO_QUANT_ODDS_PERFORMANCE/);
assert.match(dashboard, /MAMO_QUANT_CAPITAL/);
assert.match(dashboard, /MAMO_QUANT_RISK_PROFILE/);
assert.match(dashboard, /MAMO_QUANT_DATA_FOUNDATION/);
assert.match(dashboard, /MAMO_QUANT_INTEGRATED/);
assert.match(dashboard, /未来予測ではなく/);
assert.match(dashboard, /BET額を推奨しません/);
assert.doesNotMatch(dashboard, /window\.placeBet\s*=|MAMO_AIR_BET_DRAFT\s*[.=]|\.coins\s*=|\.records\s*=|\.pressroom\s*=/);
assert.doesNotMatch(dashboard, /fetch\s*\(|XMLHttpRequest|setInterval\s*\(|MutationObserver|visualViewport|preventDefault\s*\(/);

assert.match(css, /scroll-snap-type:\s*x mandatory/);
assert.match(css, /grid-auto-columns:\s*100%/);
assert.match(css, /-webkit-overflow-scrolling:\s*touch/);
assert.doesNotMatch(css, /position:\s*fixed[^}]*mamo-analysis-slider/);

assert.match(charts, /function render\(mountId = "mamoQuantAnalysisCharts"\)/);
assert.match(charts, /document\.getElementById\(mountId\)/);

assert.match(sw, /mamo-quant-analysis-dashboard\.js\?v=20260928-1/);
assert.match(sw, /mamo-quant-analysis-dashboard\.css\?v=20260928-1/);
assert.match(sw, /mamo-quant-analysis-charts\.js\?v=20260928-1/);
assert.match(sw, /url\.pathname\.endsWith\("\/mamo-quant-analysis-dashboard\.css"\)/);

console.log("beginner analysis dashboard delivery and ownership checks passed");
