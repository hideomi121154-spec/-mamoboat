/* MAMO BOAT — STEP 9 analysis data foundation.
 * Read-only factual coverage metrics for settled AIR BET history.
 * No confidence grade, recommendation, prediction, persistence, or betting-state mutation.
 */
(function initMamoQuantDataFoundation(root) {
  "use strict";

  const STORAGE_KEY = "mamoboat_v40_personal";
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

  function dateKey(record) {
    const candidates = [record?.raceDate, record?.date, record?.time, record?.createdAt, record?.placedAt];
    for (const value of candidates) {
      if (value == null || value === "") continue;
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      const time = new Date(value).getTime();
      if (!Number.isFinite(time)) continue;
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date(time));
      const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return `${map.year}-${map.month}-${map.day}`;
    }
    return null;
  }

  function spanDays(firstKey, lastKey) {
    if (!firstKey || !lastKey) return 0;
    const first = Date.parse(`${firstKey}T00:00:00Z`);
    const last = Date.parse(`${lastKey}T00:00:00Z`);
    if (!Number.isFinite(first) || !Number.isFinite(last) || last < first) return 0;
    return Math.floor((last - first) / 86400000) + 1;
  }

  function calculate(state) {
    const records = Array.isArray(state?.records) ? state.records : [];
    const settled = records.filter((record) => SETTLED.has(record?.status));
    const decided = settled.filter((record) => record?.status === "hit" || record?.status === "miss");
    const stakeDataCount = settled.filter((record) => recordStake(record) > 0).length;
    const dated = settled.map(dateKey).filter(Boolean).sort();
    const uniqueDays = [...new Set(dated)];
    const firstDate = uniqueDays[0] || null;
    const lastDate = uniqueDays[uniqueDays.length - 1] || null;

    return Object.freeze({
      settledCount: settled.length,
      decidedCount: decided.length,
      stakeDataCount,
      stakeCoverageRate: settled.length ? (stakeDataCount / settled.length) * 100 : null,
      datedCount: dated.length,
      dateCoverageRate: settled.length ? (dated.length / settled.length) * 100 : null,
      observedDays: uniqueDays.length,
      firstDate,
      lastDate,
      calendarSpanDays: spanDays(firstDate, lastDate),
      recordsPerObservedDay: uniqueDays.length ? settled.length / uniqueDays.length : null,
      singleRecordShare: settled.length ? 100 / settled.length : null,
    });
  }

  function readSnapshot(storage) {
    try {
      const source = storage || root?.localStorage;
      const raw = source?.getItem?.(STORAGE_KEY);
      if (!raw) return Object.freeze({ records: [] });
      const parsed = JSON.parse(raw);
      return Object.freeze({ records: Array.isArray(parsed?.records) ? parsed.records.slice() : [] });
    } catch (_) {
      return Object.freeze({ records: [] });
    }
  }

  const formatPercent = (value) => value == null ? "—" : `${value.toFixed(1)}%`;
  const formatDate = (value) => value || "—";

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

  function render() {
    if (typeof document === "undefined") return false;
    const mount = document.getElementById("mamoQuantAnalysisDataFoundation");
    if (!mount) return false;

    const metrics = calculate(readSnapshot(root?.localStorage));
    const fragment = document.createDocumentFragment();

    const heading = document.createElement("div");
    heading.className = "section-head small";
    const headingCopy = document.createElement("div");
    const number = document.createElement("span");
    number.className = "section-number";
    number.textContent = "STEP 9";
    const title = document.createElement("h2");
    title.textContent = "分析データの土台";
    headingCopy.append(number, title);
    const meta = document.createElement("span");
    meta.className = "section-meta";
    meta.textContent = "累計 / 読み取り専用";
    heading.append(headingCopy, meta);
    fragment.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "stats-grid";
    grid.append(
      makeCard("確定記録", `${metrics.settledCount}件`, `的中・不的中 ${metrics.decidedCount}件`),
      makeCard("記録日数", `${metrics.observedDays}日`, metrics.recordsPerObservedDay == null ? "1日平均 —" : `1日平均 ${metrics.recordsPerObservedDay.toFixed(1)}件`),
      makeCard("記録期間", metrics.calendarSpanDays ? `${metrics.calendarSpanDays}日間` : "—", `${formatDate(metrics.firstDate)} 〜 ${formatDate(metrics.lastDate)}`),
      makeCard("BET額データ", `${metrics.stakeDataCount}/${metrics.settledCount}件`, `取得率 ${formatPercent(metrics.stakeCoverageRate)}`),
      makeCard("日付データ", `${metrics.datedCount}/${metrics.settledCount}件`, `取得率 ${formatPercent(metrics.dateCoverageRate)}`),
      makeCard("1記録の母数比", formatPercent(metrics.singleRecordShare), "確定記録を同じ1件として見た単純比率")
    );
    fragment.appendChild(grid);

    const observation = document.createElement("div");
    observation.className = "analysis-note";
    observation.style.marginTop = "12px";
    const observationTitle = document.createElement("strong");
    observationTitle.textContent = "数字を読む前の確認";
    observationTitle.style.display = "block";
    observationTitle.style.marginBottom = "6px";
    const copy = document.createElement("div");
    copy.textContent = metrics.settledCount
      ? `現在は確定記録${metrics.settledCount}件が分析の母数です。1件は母数の約${formatPercent(metrics.singleRecordShare)}に相当するため、件数が増えるまでは1件の結果で指標が大きく動くことがあります。`
      : "確定記録がまだないため、分析の母数は0件です。";
    observation.append(observationTitle, copy);
    fragment.appendChild(observation);

    const note = document.createElement("div");
    note.className = "analysis-note";
    note.style.marginTop = "12px";
    note.textContent = "このSTEPは分析結果の良し悪しを判定するものではありません。確定記録数・記録日数・日付/BET額データの取得状況を事実として表示し、他のSTEPを読むときの前提を確認します。";
    fragment.appendChild(note);

    mount.replaceChildren(fragment);
    return true;
  }

  const api = Object.freeze({ recordStake, dateKey, spanDays, calculate, readSnapshot, render });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.MAMO_QUANT_DATA_FOUNDATION = api;
})(typeof window !== "undefined" ? window : globalThis);
