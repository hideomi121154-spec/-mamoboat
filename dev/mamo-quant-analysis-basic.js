/* MAMO BOAT — independent quantitative analysis, step 3.
 * Read-only basic metrics + compact period filtering + settled returns analysis.
 * This module never writes localStorage and never mutates AIR BET, wallet,
 * records, pressroom, SHOP, Supabase, or navigation state.
 */
(function initMamoQuantAnalysisBasic(root) {
  "use strict";

  const STORAGE_KEY = "mamoboat_v40_personal";
  const PERIODS = Object.freeze([
    { key: "all", label: "累計" },
    { key: "today", label: "今日" },
    { key: "yesterday", label: "昨日" },
    { key: "last7", label: "直近7日" },
    { key: "thisWeek", label: "今週" },
    { key: "thisMonth", label: "今月" },
  ]);
  const PERIOD_KEYS = new Set(PERIODS.map((item) => item.key));
  const SETTLED_STATUSES = new Set(["hit", "miss", "refunded"]);
  let activePeriod = "all";

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

  function recordReturn(record) {
    const payout = Math.max(0, safeNumber(record?.payoutC ?? record?.payout));
    const refund = Math.max(0, safeNumber(record?.refundC));
    if (record?.status === "refunded") return payout > 0 ? payout : refund;
    return payout + refund;
  }

  function calculate(state) {
    const records = Array.isArray(state?.records) ? state.records : [];
    const balance = Math.max(0, safeNumber(state?.coins));
    const hitCount = records.filter((record) => record?.status === "hit").length;
    const missCount = records.filter((record) => record?.status === "miss").length;
    const decidedCount = hitCount + missCount;
    const stakes = records.map(recordStake).filter((value) => value > 0);
    const averageStake = stakes.length
      ? stakes.reduce((sum, value) => sum + value, 0) / stakes.length
      : 0;

    const settledRecords = records.filter((record) => SETTLED_STATUSES.has(record?.status));
    const settledStake = settledRecords.reduce((sum, record) => sum + recordStake(record), 0);
    const totalReturn = settledRecords.reduce((sum, record) => sum + recordReturn(record), 0);
    const netProfit = totalReturn - settledStake;
    const returnRate = settledStake > 0 ? (totalReturn / settledStake) * 100 : null;

    return Object.freeze({
      balance,
      recordCount: records.length,
      decidedCount,
      hitCount,
      missCount,
      hitRate: decidedCount ? (hitCount / decidedCount) * 100 : null,
      averageStake,
      settledCount: settledRecords.length,
      settledStake,
      totalReturn,
      netProfit,
      returnRate,
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

  function jstDateKey(value) {
    if (value == null || value === "") return null;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function shiftDateKey(key, days) {
    const [year, month, day] = String(key).split("-").map(Number);
    if (![year, month, day].every(Number.isFinite)) return null;
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
  }

  function mondayKey(key) {
    const [year, month, day] = String(key).split("-").map(Number);
    if (![year, month, day].every(Number.isFinite)) return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    return shiftDateKey(key, -((date.getUTCDay() + 6) % 7));
  }

  function recordDateKey(record) {
    return jstDateKey(
      record?.raceDate
      || record?.date
      || record?.time
      || record?.createdAt
      || record?.placedAt
    );
  }

  function periodBounds(periodKey, now = new Date()) {
    const today = jstDateKey(now);
    if (!today || !PERIOD_KEYS.has(periodKey)) return null;
    if (periodKey === "all") return Object.freeze({ from: null, to: null });
    if (periodKey === "today") return Object.freeze({ from: today, to: today });
    if (periodKey === "yesterday") {
      const yesterday = shiftDateKey(today, -1);
      return Object.freeze({ from: yesterday, to: yesterday });
    }
    if (periodKey === "last7") return Object.freeze({ from: shiftDateKey(today, -6), to: today });
    if (periodKey === "thisWeek") return Object.freeze({ from: mondayKey(today), to: today });
    return Object.freeze({ from: `${today.slice(0, 7)}-01`, to: today });
  }

  function filterRecords(records, periodKey = "all", now = new Date()) {
    const list = Array.isArray(records) ? records : [];
    if (periodKey === "all") return list.slice();
    const bounds = periodBounds(periodKey, now);
    if (!bounds?.from || !bounds?.to) return [];
    return list.filter((record) => {
      const key = recordDateKey(record);
      return !!key && key >= bounds.from && key <= bounds.to;
    });
  }

  const formatB = (value) => `${Math.round(safeNumber(value)).toLocaleString("ja-JP")} B`;
  const formatSignedB = (value) => {
    const number = Math.round(safeNumber(value));
    const sign = number > 0 ? "+" : "";
    return `${sign}${number.toLocaleString("ja-JP")} B`;
  };
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

  function makePeriodControl(period) {
    const details = document.createElement("details");
    details.dataset.analysisPeriodControl = "1";
    details.style.marginBottom = "14px";

    const summary = document.createElement("summary");
    summary.dataset.analysisPeriodSummary = "1";
    summary.style.listStyle = "none";
    summary.style.cursor = "pointer";
    summary.style.minHeight = "44px";
    summary.style.display = "flex";
    summary.style.alignItems = "center";
    summary.style.justifyContent = "space-between";
    summary.style.padding = "0 14px";
    summary.style.border = "1px solid #cbd6df";
    summary.style.borderRadius = "10px";
    summary.style.background = "#ffffff";
    summary.style.color = "#0b3554";
    summary.style.fontWeight = "800";

    const label = document.createElement("span");
    label.textContent = `期間：${period.label}`;
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "▼";
    summary.append(label, arrow);

    const list = document.createElement("div");
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", "分析期間");
    list.style.display = "grid";
    list.style.gap = "1px";
    list.style.marginTop = "6px";
    list.style.border = "1px solid #cbd6df";
    list.style.borderRadius = "10px";
    list.style.overflow = "hidden";
    list.style.background = "#cbd6df";

    PERIODS.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.analysisPeriod = item.key;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", item.key === activePeriod ? "true" : "false");
      button.textContent = item.label;
      button.style.minHeight = "44px";
      button.style.border = "0";
      button.style.background = item.key === activePeriod ? "#f7e8ea" : "#ffffff";
      button.style.color = "#0b3554";
      button.style.fontWeight = item.key === activePeriod ? "900" : "700";
      button.style.textAlign = "left";
      button.style.padding = "0 14px";
      button.addEventListener("click", () => {
        activePeriod = item.key;
        details.open = false;
        render();
      });
      list.appendChild(button);
    });

    details.append(summary, list);
    return details;
  }

  function makeSectionHeading(step, title) {
    const heading = document.createElement("div");
    heading.className = "section-head small";
    heading.style.marginTop = "18px";
    const copy = document.createElement("div");
    const number = document.createElement("span");
    number.className = "section-number";
    number.textContent = step;
    const headingTitle = document.createElement("h2");
    headingTitle.textContent = title;
    copy.append(number, headingTitle);
    heading.appendChild(copy);
    return heading;
  }

  function render() {
    if (typeof document === "undefined") return false;
    const mount = document.getElementById("mamoQuantAnalysisBasic");
    if (!mount) return false;

    const snapshot = readSnapshot();
    const filteredRecords = filterRecords(snapshot.records, activePeriod);
    const metrics = calculate({ coins: snapshot.coins, records: filteredRecords });
    const period = PERIODS.find((item) => item.key === activePeriod) || PERIODS[0];

    const controls = makePeriodControl(period);

    const basicGrid = document.createElement("div");
    basicGrid.className = "stat-grid";
    basicGrid.setAttribute("aria-label", `${period.label}の基本分析`);
    basicGrid.append(
      makeCard("現在のB残高", formatB(metrics.balance)),
      makeCard("AIR BET回数", `${metrics.recordCount.toLocaleString("ja-JP")}回`),
      makeCard("的中率", formatPercent(metrics.hitRate), "coral"),
      makeCard("平均BET", metrics.averageStake > 0 ? formatB(metrics.averageStake) : "—")
    );

    const basicNote = document.createElement("div");
    basicNote.className = "tactical-note";
    const basicLabel = document.createElement("span");
    basicLabel.className = "manga-label";
    basicLabel.textContent = `STEP 2.6 / ${period.label}`;
    const basicCopy = document.createElement("p");
    basicCopy.textContent = metrics.recordCount
      ? `${period.label}の記録${metrics.recordCount}件を表示中です。的中率は的中・不的中が確定した${metrics.decidedCount}件だけで計算し、返還は母数に含めません。B残高だけは期間に関係なく現在値です。`
      : `${period.label}に該当する記録はありません。B残高だけは期間に関係なく現在値です。`;
    basicNote.append(basicLabel, basicCopy);

    const returnsHeading = makeSectionHeading("STEP 3", "収支分析");
    const returnsGrid = document.createElement("div");
    returnsGrid.className = "stat-grid";
    returnsGrid.setAttribute("aria-label", `${period.label}の収支分析`);
    returnsGrid.append(
      makeCard("BET額", metrics.settledStake > 0 ? formatB(metrics.settledStake) : "—"),
      makeCard("払戻・返還", metrics.settledStake > 0 ? formatB(metrics.totalReturn) : "—"),
      makeCard("損益", metrics.settledStake > 0 ? formatSignedB(metrics.netProfit) : "—", metrics.netProfit < 0 ? "coral" : ""),
      makeCard("回収率", formatPercent(metrics.returnRate))
    );

    const returnsNote = document.createElement("div");
    returnsNote.className = "tactical-note";
    const returnsLabel = document.createElement("span");
    returnsLabel.className = "manga-label";
    returnsLabel.textContent = `STEP 3 / ${period.label}`;
    const returnsCopy = document.createElement("p");
    returnsCopy.textContent = metrics.settledCount
      ? `収支は結果が確定した${metrics.settledCount}件だけで計算しています。結果待ちのAIR BETはBET額・損益・回収率にまだ含めません。返還は払戻・返還額に含めます。`
      : `${period.label}には結果確定済みのAIR BETがありません。結果待ちは収支計算に含めません。`;
    returnsNote.append(returnsLabel, returnsCopy);

    mount.replaceChildren(
      controls,
      basicGrid,
      basicNote,
      returnsHeading,
      returnsGrid,
      returnsNote
    );
    return true;
  }

  function setPeriod(periodKey) {
    if (!PERIOD_KEYS.has(periodKey)) return false;
    activePeriod = periodKey;
    return render();
  }

  const API = Object.freeze({
    STORAGE_KEY,
    PERIODS,
    recordStake,
    recordReturn,
    calculate,
    readSnapshot,
    jstDateKey,
    recordDateKey,
    periodBounds,
    filterRecords,
    render,
    setPeriod,
  });

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (!root || typeof document === "undefined") return;
  if (root.__MAMO_QUANT_ANALYSIS_BASIC_V4__) return;
  root.__MAMO_QUANT_ANALYSIS_BASIC_V4__ = true;
  root.MAMO_QUANT_ANALYSIS_BASIC = API;

  const boot = () => render();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})(typeof window !== "undefined" ? window : null);
