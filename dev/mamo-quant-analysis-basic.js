/* MAMO BOAT — independent quantitative analysis, step 2.5.
 * Read-only basic metrics + period filtering only. This module never writes
 * localStorage and never mutates AIR BET, wallet, records, pressroom, SHOP,
 * Supabase, or navigation state.
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

  function jstDateKey(value) {
    if (value == null || value === "") return null;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
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
    const date = new Date(Date.UTC(year, month - 1, day + days));
    return date.toISOString().slice(0, 10);
  }

  function mondayKey(key) {
    const [year, month, day] = String(key).split("-").map(Number);
    if (![year, month, day].every(Number.isFinite)) return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    const weekday = date.getUTCDay();
    return shiftDateKey(key, -((weekday + 6) % 7));
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
    if (periodKey === "last7") {
      return Object.freeze({ from: shiftDateKey(today, -6), to: today });
    }
    if (periodKey === "thisWeek") {
      return Object.freeze({ from: mondayKey(today), to: today });
    }
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

  function makePeriodButton(period) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = period.label;
    button.dataset.analysisPeriod = period.key;
    button.setAttribute("aria-pressed", period.key === activePeriod ? "true" : "false");
    button.style.minHeight = "38px";
    button.style.borderRadius = "10px";
    button.style.border = period.key === activePeriod ? "2px solid #e41f2b" : "1px solid #cbd6df";
    button.style.background = period.key === activePeriod ? "#e41f2b" : "#ffffff";
    button.style.color = period.key === activePeriod ? "#ffffff" : "#0b3554";
    button.style.fontWeight = "800";
    button.style.fontSize = "13px";
    button.addEventListener("click", () => {
      activePeriod = period.key;
      render();
    });
    return button;
  }

  function render() {
    if (typeof document === "undefined") return false;
    const mount = document.getElementById("mamoQuantAnalysisBasic");
    if (!mount) return false;

    const snapshot = readSnapshot();
    const filteredRecords = filterRecords(snapshot.records, activePeriod);
    const metrics = calculate({ coins: snapshot.coins, records: filteredRecords });
    const period = PERIODS.find((item) => item.key === activePeriod) || PERIODS[0];

    const controls = document.createElement("div");
    controls.setAttribute("aria-label", "分析期間");
    controls.style.display = "grid";
    controls.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
    controls.style.gap = "6px";
    controls.style.marginBottom = "14px";
    PERIODS.forEach((item) => controls.appendChild(makePeriodButton(item)));

    const grid = document.createElement("div");
    grid.className = "stat-grid";
    grid.setAttribute("aria-label", `${period.label}の基本分析`);
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
    label.textContent = `STEP 2.5 / ${period.label}`;
    const copy = document.createElement("p");
    copy.textContent = metrics.recordCount
      ? `${period.label}の記録${metrics.recordCount}件を表示中です。的中率は的中・不的中が確定した${metrics.decidedCount}件だけで計算し、返還は母数に含めません。B残高だけは期間に関係なく現在値です。`
      : `${period.label}に該当する記録はありません。B残高だけは期間に関係なく現在値です。`;
    note.append(label, copy);

    mount.replaceChildren(controls, grid, note);
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
  if (root.__MAMO_QUANT_ANALYSIS_BASIC_V2__) return;
  root.__MAMO_QUANT_ANALYSIS_BASIC_V2__ = true;
  root.MAMO_QUANT_ANALYSIS_BASIC = API;

  const boot = () => render();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})(typeof window !== "undefined" ? window : null);
