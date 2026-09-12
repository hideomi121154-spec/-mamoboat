/* MAMO BOAT — STEP 6.1 capital resilience / 1,000,000B project foundation.
 * Read-only. Uses the current B balance and settled AIR BET records only.
 * No prediction, recommendation, wallet mutation, or record mutation is performed.
 */
(function initMamoQuantCapital(root) {
  "use strict";

  const STORAGE_KEY = "mamoboat_v40_personal";
  const GOAL_B = 1000000;
  const SETTLED = new Set(["hit", "miss", "refunded"]);

  const safeNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  function recordStake(record) {
    const direct = safeNumber(record?.stake ?? record?.total);
    if (direct > 0) return direct;
    const lines = Array.isArray(record?.lines) ? record.lines : [];
    return lines.reduce((sum, line) => sum + Math.max(0, safeNumber(line?.stake)), 0);
  }

  function calculate(state) {
    const balance = Math.max(0, safeNumber(state?.coins));
    const records = Array.isArray(state?.records) ? state.records : [];
    const settled = records.filter((record) => SETTLED.has(record?.status));
    const stakes = settled.map(recordStake).filter((stake) => stake > 0);
    const averageSettledStake = stakes.length
      ? stakes.reduce((sum, stake) => sum + stake, 0) / stakes.length
      : 0;
    const progress = GOAL_B > 0 ? (balance / GOAL_B) * 100 : 0;
    const remaining = Math.max(0, GOAL_B - balance);
    const averageStakeBalanceRate = balance > 0 && averageSettledStake > 0
      ? (averageSettledStake / balance) * 100
      : null;
    const tenLossAmount = averageSettledStake * 10;
    const tenLossRemaining = Math.max(0, balance - tenLossAmount);

    return Object.freeze({
      goal: GOAL_B,
      balance,
      progress,
      remaining,
      settledCount: settled.length,
      averageSettledStake,
      averageStakeBalanceRate,
      tenLossAmount,
      tenLossRemaining,
    });
  }

  function readSnapshot(storage) {
    try {
      const source = storage || root?.localStorage;
      const raw = source?.getItem?.(STORAGE_KEY);
      if (!raw) return Object.freeze({ coins: 0, records: [] });
      const parsed = JSON.parse(raw);
      return Object.freeze({
        coins: Math.max(0, safeNumber(parsed?.coins)),
        records: Array.isArray(parsed?.records) ? parsed.records.slice() : [],
      });
    } catch (_) {
      return Object.freeze({ coins: 0, records: [] });
    }
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

  function buildStress(metrics) {
    const details = document.createElement("details");
    details.dataset.analysisCapitalStress = "1";
    details.style.marginTop = "12px";
    details.style.border = "1px solid #cbd6df";
    details.style.borderRadius = "10px";
    details.style.background = "#ffffff";

    const summary = document.createElement("summary");
    summary.style.cursor = "pointer";
    summary.style.padding = "12px 14px";
    summary.style.fontWeight = "800";
    summary.style.color = "#0b3554";
    summary.textContent = "10連敗ストレスを見る";

    const body = document.createElement("div");
    body.style.padding = "0 14px 14px";
    body.style.display = "grid";
    body.style.gap = "6px";

    const line1 = document.createElement("strong");
    line1.textContent = `平均確定BET × 10 = ${formatB(metrics.tenLossAmount)}`;
    const line2 = document.createElement("span");
    line2.textContent = `その金額を全て失った場合の単純残高：${formatB(metrics.tenLossRemaining)}`;
    const note = document.createElement("small");
    note.textContent = "これは将来の連敗数や損失を予測するものではなく、現在の残高に対する単純ストレス計算です。";
    note.style.color = "#64798b";
    note.style.fontWeight = "700";

    body.append(line1, line2, note);
    details.append(summary, body);
    return details;
  }

  function render() {
    if (typeof document === "undefined") return false;
    const mount = document.getElementById("mamoQuantAnalysisCapital");
    if (!mount) return false;

    const metrics = calculate(readSnapshot(root?.localStorage));
    const fragment = document.createDocumentFragment();

    const heading = document.createElement("div");
    heading.className = "section-head small";
    const headingCopy = document.createElement("div");
    const number = document.createElement("span");
    number.className = "section-number";
    number.textContent = "STEP 6.1";
    const title = document.createElement("h2");
    title.textContent = "資金耐久・100万B PROJECT";
    headingCopy.append(number, title);
    heading.appendChild(headingCopy);

    const grid = document.createElement("div");
    grid.className = "stats-grid";
    grid.append(
      makeCard("現在のB残高", formatB(metrics.balance)),
      makeCard("100万B進捗", formatPercent(metrics.progress), "未来予測ではなく現在地点"),
      makeCard("100万Bまで残り", formatB(metrics.remaining)),
      makeCard("平均確定BET", formatB(metrics.averageSettledStake), metrics.averageStakeBalanceRate == null ? "残高比 —" : `現在残高比 ${formatPercent(metrics.averageStakeBalanceRate)}`)
    );

    const progress = document.createElement("div");
    progress.style.marginTop = "12px";
    progress.style.height = "12px";
    progress.style.borderRadius = "999px";
    progress.style.background = "#e5ebf0";
    progress.style.overflow = "hidden";
    const fill = document.createElement("div");
    fill.style.height = "100%";
    fill.style.width = `${Math.max(0, Math.min(100, metrics.progress))}%`;
    fill.style.background = "#0b3554";
    progress.appendChild(fill);

    const note = document.createElement("div");
    note.className = "analysis-note";
    note.style.marginTop = "12px";
    note.textContent = `確定済みAIR BET ${metrics.settledCount}件を使って平均BETを算出しています。100万B進捗は現在残高÷1,000,000Bの単純比率です。推奨BET額や到達時期は表示しません。`;

    fragment.append(heading, grid, progress, buildStress(metrics), note);
    mount.replaceChildren(fragment);
    return true;
  }

  const api = Object.freeze({ GOAL_B, recordStake, calculate, readSnapshot, render });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.MAMO_QUANT_CAPITAL = api;
})(typeof window !== "undefined" ? window : globalThis);
