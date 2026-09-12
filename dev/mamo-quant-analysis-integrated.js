/* MAMO BOAT — STEP 10 integrated analysis.
 * Read-only integration of existing STEP 8 risk metrics and STEP 9 data-foundation metrics.
 * This module does not grade safety, make recommendations, predict outcomes, or persist values.
 */
(function initMamoQuantIntegrated(root) {
  "use strict";

  const safeNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  function buildIntegratedMetrics(riskMetrics, dataMetrics) {
    const risk = riskMetrics || {};
    const data = dataMetrics || {};
    const coverageValues = [data.stakeCoverageRate, data.dateCoverageRate]
      .filter((value) => Number.isFinite(value));
    const minimumCoverageRate = coverageValues.length ? Math.min(...coverageValues) : null;

    return Object.freeze({
      settledCount: Math.max(0, safeNumber(data.settledCount ?? risk.settledCount)),
      observedDays: Math.max(0, safeNumber(data.observedDays)),
      singleRecordShare: Number.isFinite(data.singleRecordShare) ? data.singleRecordShare : null,
      minimumCoverageRate,
      returnRate: Number.isFinite(risk.returnRate) ? risk.returnRate : null,
      averageStakeBalanceRate: Number.isFinite(risk.averageStakeBalanceRate) ? risk.averageStakeBalanceRate : null,
      maxLosingStreak: Math.max(0, safeNumber(risk.maxLosingStreak)),
      maxDrawdown: Math.max(0, safeNumber(risk.maxDrawdown)),
      maxDrawdownBetRate: Number.isFinite(risk.maxDrawdownBetRate) ? risk.maxDrawdownBetRate : null,
      largestWinShare: Number.isFinite(risk.largestWinShare) ? risk.largestWinShare : null,
      largestLossShare: Number.isFinite(risk.largestLossShare) ? risk.largestLossShare : null,
    });
  }

  const formatB = (value) => `${Math.round(safeNumber(value)).toLocaleString("ja-JP")} B`;
  const formatPercent = (value) => value == null ? "—" : `${value.toFixed(1)}%`;

  function makeCard(label, value, subline = "") {
    const card = document.createElement("div");
    card.className = "stat-card";
    const title = document.createElement("span");
    title.textContent = label;
    const metric = document.createElement("strong");
    metric.textContent = value;
    card.append(title, metric);
    if (subline) {
      const detail = document.createElement("small");
      detail.textContent = subline;
      detail.style.display = "block";
      detail.style.marginTop = "4px";
      detail.style.fontSize = "12px";
      detail.style.fontWeight = "800";
      detail.style.color = "#64798b";
      card.appendChild(detail);
    }
    return card;
  }

  function makeIntegratedObservation(metrics) {
    const box = document.createElement("div");
    box.className = "analysis-note";
    box.style.marginTop = "12px";

    const title = document.createElement("strong");
    title.textContent = "統合して読む";
    title.style.display = "block";
    title.style.marginBottom = "6px";

    const lines = document.createElement("div");
    lines.style.display = "grid";
    lines.style.gap = "6px";

    const texts = [];
    if (metrics.returnRate != null) texts.push(`確定記録の回収率は ${formatPercent(metrics.returnRate)} です。`);
    if (metrics.averageStakeBalanceRate != null) texts.push(`平均確定BETは現在残高の ${formatPercent(metrics.averageStakeBalanceRate)} に相当します。`);
    texts.push(`実績上の最大連敗は ${metrics.maxLosingStreak}回、最大DDは ${formatB(metrics.maxDrawdown)} です。`);
    if (metrics.largestWinShare != null) texts.push(`最大1勝の利益が勝ち利益合計に占める割合は ${formatPercent(metrics.largestWinShare)} です。`);
    if (metrics.largestLossShare != null) texts.push(`最大1回損失が損失合計に占める割合は ${formatPercent(metrics.largestLossShare)} です。`);
    if (metrics.settledCount > 0) texts.push(`この統合表示の母数は確定${metrics.settledCount}件・記録${metrics.observedDays}日です。`);

    texts.forEach((text) => {
      const row = document.createElement("div");
      row.textContent = text;
      lines.appendChild(row);
    });
    box.append(title, lines);
    return box;
  }

  function render() {
    if (typeof document === "undefined") return false;
    const mount = document.getElementById("mamoQuantAnalysisIntegrated");
    const riskApi = root?.MAMO_QUANT_RISK_PROFILE;
    const dataApi = root?.MAMO_QUANT_DATA_FOUNDATION;
    if (!mount || !riskApi || !dataApi) return false;
    if (typeof riskApi.calculate !== "function" || typeof riskApi.readSnapshot !== "function") return false;
    if (typeof dataApi.calculate !== "function" || typeof dataApi.readSnapshot !== "function") return false;

    const storage = root?.localStorage;
    const riskMetrics = riskApi.calculate(riskApi.readSnapshot(storage));
    const dataMetrics = dataApi.calculate(dataApi.readSnapshot(storage));
    const metrics = buildIntegratedMetrics(riskMetrics, dataMetrics);

    const fragment = document.createDocumentFragment();
    const heading = document.createElement("div");
    heading.className = "section-head small";
    const headingCopy = document.createElement("div");
    const number = document.createElement("span");
    number.className = "section-number";
    number.textContent = "STEP 10";
    const title = document.createElement("h2");
    title.textContent = "統合分析";
    headingCopy.append(number, title);
    const meta = document.createElement("span");
    meta.className = "section-meta";
    meta.textContent = "累計 / 読み取り専用";
    heading.append(headingCopy, meta);
    fragment.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "stats-grid";
    grid.append(
      makeCard("回収率", formatPercent(metrics.returnRate), `母数 ${metrics.settledCount}件`),
      makeCard("平均BET残高比", formatPercent(metrics.averageStakeBalanceRate), "現在残高に対する平均確定BET"),
      makeCard("最大連敗", `${metrics.maxLosingStreak}回`, "過去の確定記録"),
      makeCard("最大DD", formatB(metrics.maxDrawdown), metrics.maxDrawdownBetRate == null ? "BET総額比 —" : `BET総額比 ${formatPercent(metrics.maxDrawdownBetRate)}`),
      makeCard("最大1勝集中度", formatPercent(metrics.largestWinShare), "勝ち利益合計に占める割合"),
      makeCard("最大1損失集中度", formatPercent(metrics.largestLossShare), "損失合計に占める割合"),
      makeCard("データ取得率", formatPercent(metrics.minimumCoverageRate), "BET額・日付のうち低い方"),
      makeCard("1記録の母数比", formatPercent(metrics.singleRecordShare), `${metrics.observedDays}日 / ${metrics.settledCount}件`)
    );
    fragment.appendChild(grid);
    fragment.appendChild(makeIntegratedObservation(metrics));

    const note = document.createElement("div");
    note.className = "analysis-note";
    note.style.marginTop = "12px";
    note.textContent = "このSTEPはSTEP 8とSTEP 9の事実を1か所にまとめる統合ビューです。指標同士を無理に1つの点数へ合成せず、『安全・危険』の判定、原因の断定、推奨BET額、次レース予測は行いません。";
    fragment.appendChild(note);

    mount.replaceChildren(fragment);
    return true;
  }

  const api = Object.freeze({ buildIntegratedMetrics, render });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.MAMO_QUANT_INTEGRATED = api;
})(typeof window !== "undefined" ? window : globalThis);
