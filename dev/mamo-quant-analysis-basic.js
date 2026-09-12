/* MAMO BOAT — independent quantitative analysis, step 2.
 * Read-only basic metrics only. This module never writes localStorage and never
 * mutates AIR BET, wallet, records, pressroom, SHOP, or navigation state.
 */
(function initMamoQuantAnalysisBasic(root) {
  "use strict";

  const STORAGE_KEY = "mamoboat_v40_personal";

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
    const records = Array.isArray(state?.records) ? state.records : [];
    const balance = Math.max(0, safeNumber(state?.coins));
    const hitCount = records.filter((record) => record?.status === "hit").length;
    const missCount = records.filter((record) => record?.status === "miss").length;
    const decidedCount = hitCount + missCount;
    const stakes = records
      .map(recordStake)
      .filter((value) => value > 0);
    const averageStake = stakes.length
      ? stakes.reduce((sum, value) => sum + value, 0) / stakes.length
      : 0;

    return Object.freeze({
      balance,
      recordCount: records.length,
      decidedCount,
      hitCount,
      missCount,
      hitRate: decidedCount ? (hitCount / decidedCount) * 100 : null,
      averageStake,
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

  function makeCard(label, value, extraClass = "") {
    const card = document.createElement("div");
    card.className = `stat-card${extraClass ? ` ${extraClass}` : ""}`;
    const title = document.createElement("span");
    title.textContent = label;
    const metric = document.createElement("strong");
    metric.textContent = value;
    card.append(title, metric);
    return card;
  }

  function render() {
    if (typeof document === "undefined") return false;
    const mount = document.getElementById("mamoQuantAnalysisBasic");
    if (!mount) return false;

    const metrics = calculate(readSnapshot());
    const grid = document.createElement("div");
    grid.className = "stat-grid";
    grid.setAttribute("aria-label", "基本分析");
    grid.append(
      makeCard("現在のB残高", formatB(metrics.balance)),
      makeCard("AIR BET回数", `${metrics.recordCount.toLocaleString("ja-JP")}回`),
      makeCard("的中率", formatPercent(metrics.hitRate), "coral"),
      makeCard("平均BET", metrics.averageStake > 0 ? formatB(metrics.averageStake) : "—")
    );

    const note = document.createElement("div");
    note.className = "tactical-note";
    const label = document.createElement("span");
    label.className = "manga-label";
    label.textContent = "STEP 2 / READ ONLY";
    const copy = document.createElement("p");
    copy.textContent = metrics.recordCount
      ? `的中率は的中・不的中が確定した${metrics.decidedCount}件だけで計算しています。返還は母数に含めません。`
      : "記録が増えると、ここに基本集計が表示されます。分析側から記録を書き換えることはありません。";
    note.append(label, copy);

    mount.replaceChildren(grid, note);
    return true;
  }

  const API = Object.freeze({ STORAGE_KEY, recordStake, calculate, readSnapshot, render });

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (!root || typeof document === "undefined") return;
  if (root.__MAMO_QUANT_ANALYSIS_BASIC_V1__) return;
  root.__MAMO_QUANT_ANALYSIS_BASIC_V1__ = true;
  root.MAMO_QUANT_ANALYSIS_BASIC = API;

  const boot = () => render();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})(typeof window !== "undefined" ? window : null);
