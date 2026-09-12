/* MAMO BOAT — independent quantitative analysis, step 5.1.
 * Read-only basic metrics + compact period filtering + settled returns + risk + odds analysis.
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
  const ODDS_BANDS = Object.freeze([
    { key: "under10", label: "10倍未満", min: 0, max: 10 },
    { key: "10to30", label: "10〜30倍", min: 10, max: 30 },
    { key: "30to100", label: "30〜100倍", min: 30, max: 100 },
    { key: "100plus", label: "100倍以上", min: 100, max: Infinity },
  ]);
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

  function recordNet(record) {
    return recordReturn(record) - recordStake(record);
  }

  function recordTimestamp(record) {
    const candidates = [record?.time, record?.createdAt, record?.placedAt, record?.raceDate, record?.date];
    for (const value of candidates) {
      if (value == null || value === "") continue;
      const time = new Date(value).getTime();
      if (Number.isFinite(time)) return time;
    }
    return null;
  }

  function orderedRecords(records) {
    return (Array.isArray(records) ? records : [])
      .map((record, index) => ({ record, index, time: recordTimestamp(record) }))
      .sort((a, b) => {
        if (a.time != null && b.time != null && a.time !== b.time) return a.time - b.time;
        return a.index - b.index;
      })
      .map((item) => item.record);
  }

  function maxLosingStreak(records) {
    let current = 0;
    let maximum = 0;
    orderedRecords(records).forEach((record) => {
      if (record?.status === "miss") {
        current += 1;
        maximum = Math.max(maximum, current);
      } else if (record?.status === "hit") {
        current = 0;
      }
    });
    return maximum;
  }

  function currentLosingStreak(records) {
    const decided = orderedRecords(records).filter((record) => record?.status === "hit" || record?.status === "miss");
    if (!decided.length) return null;
    let streak = 0;
    for (let index = decided.length - 1; index >= 0; index -= 1) {
      if (decided[index].status !== "miss") break;
      streak += 1;
    }
    return streak;
  }

  function maxDrawdown(records) {
    let equity = 0;
    let peak = 0;
    let maximum = 0;
    orderedRecords(records)
      .filter((record) => SETTLED_STATUSES.has(record?.status))
      .forEach((record) => {
        equity += recordNet(record);
        peak = Math.max(peak, equity);
        maximum = Math.max(maximum, peak - equity);
      });
    return maximum;
  }

  function maxSingleLoss(records) {
    return orderedRecords(records)
      .filter((record) => SETTLED_STATUSES.has(record?.status))
      .reduce((maximum, record) => Math.max(maximum, Math.max(0, -recordNet(record))), 0);
  }

  function normalizeOddsValue(value) {
    if (value == null || value === "") return null;
    const match = String(value).trim().match(/^([0-9]+(?:\.[0-9]+)?)/);
    if (!match) return null;
    const number = Number(match[1]);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  function recordOddsEntries(record) {
    const lines = Array.isArray(record?.lines) ? record.lines : [];
    if (lines.length) {
      return lines.map((line) => normalizeOddsValue(line?.odds ?? line?.referenceOdds));
    }
    if (record?.odds != null || record?.referenceOdds != null) {
      return [normalizeOddsValue(record?.odds ?? record?.referenceOdds)];
    }
    return [];
  }

  function median(values) {
    const sorted = (Array.isArray(values) ? values : [])
      .filter((value) => Number.isFinite(value))
      .slice()
      .sort((a, b) => a - b);
    if (!sorted.length) return null;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function oddsBandDistribution(values) {
    const list = (Array.isArray(values) ? values : []).filter((value) => Number.isFinite(value) && value > 0);
    return Object.freeze(ODDS_BANDS.map((band) => {
      const count = list.filter((value) => value >= band.min && value < band.max).length;
      return Object.freeze({
        key: band.key,
        label: band.label,
        count,
        rate: list.length ? (count / list.length) * 100 : null,
      });
    }));
  }

  function summarizeOdds(records) {
    const entries = (Array.isArray(records) ? records : []).flatMap(recordOddsEntries);
    const captured = entries.filter((value) => value != null);
    const lineCount = entries.length;
    const capturedCount = captured.length;
    return Object.freeze({
      lineCount,
      capturedCount,
      captureRate: lineCount ? (capturedCount / lineCount) * 100 : null,
      averageOdds: capturedCount ? captured.reduce((sum, value) => sum + value, 0) / capturedCount : null,
      medianOdds: median(captured),
      minOdds: capturedCount ? Math.min(...captured) : null,
      maxOdds: capturedCount ? Math.max(...captured) : null,
      bands: oddsBandDistribution(captured),
    });
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
    const maximumDrawdown = maxDrawdown(records);
    const maxDrawdownBetRate = settledStake > 0 ? (maximumDrawdown / settledStake) * 100 : null;
    const odds = summarizeOdds(records);

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
      maxLosingStreak: maxLosingStreak(records),
      maxDrawdown: maximumDrawdown,
      maxDrawdownBetRate,
      maxSingleLoss: maxSingleLoss(records),
      oddsLineCount: odds.lineCount,
      oddsCapturedCount: odds.capturedCount,
      oddsCaptureRate: odds.captureRate,
      averageOdds: odds.averageOdds,
      medianOdds: odds.medianOdds,
      minOdds: odds.minOdds,
      maxOdds: odds.maxOdds,
      oddsBands: odds.bands,
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
  const formatOdds = (value) => value == null ? "—" : `${value.toFixed(1)}倍`;
  const formatOddsRange = (min, max) => min == null || max == null ? "—" : `${min.toFixed(1)}〜${max.toFixed(1)}倍`;

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

  function makeCardWithSubline(label, value, subline, extraClass = "") {
    const card = makeCard(label, value, extraClass);
    const detail = document.createElement("small");
    detail.textContent = subline;
    detail.style.display = "block";
    detail.style.marginTop = "4px";
    detail.style.fontSize = "12px";
    detail.style.fontWeight = "800";
    detail.style.color = "#64798b";
    card.appendChild(detail);
    return card;
  }

  function makeOddsBandDetails(bands) {
    const details = document.createElement("details");
    details.dataset.analysisOddsBands = "1";
    details.style.marginTop = "12px";
    details.style.border = "1px solid #cbd6df";
    details.style.borderRadius = "10px";
    details.style.background = "#ffffff";

    const summary = document.createElement("summary");
    summary.style.cursor = "pointer";
    summary.style.padding = "12px 14px";
    summary.style.fontWeight = "800";
    summary.style.color = "#0b3554";
    summary.textContent = "オッズ帯分布を見る";
    details.appendChild(summary);

    const body = document.createElement("div");
    body.style.display = "grid";
    body.style.gap = "1px";
    body.style.background = "#e2e8ed";
    body.style.borderTop = "1px solid #e2e8ed";

    (Array.isArray(bands) ? bands : []).forEach((band) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.gap = "12px";
      row.style.padding = "10px 14px";
      row.style.background = "#ffffff";

      const label = document.createElement("span");
      label.textContent = band.label;
      label.style.fontWeight = "700";
      const value = document.createElement("strong");
      value.textContent = `${band.count}件 / ${formatPercent(band.rate)}`;
      row.append(label, value);
      body.appendChild(row);
    });

    details.appendChild(body);
    return details;
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
    const currentStreak = currentLosingStreak(snapshot.records);
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

    const riskHeading = makeSectionHeading("STEP 4", "リスク分析");
    const riskGrid = document.createElement("div");
    riskGrid.className = "stat-grid";
    riskGrid.setAttribute("aria-label", `${period.label}のリスク分析`);
    riskGrid.append(
      makeCard("最大連敗", metrics.decidedCount ? `${metrics.maxLosingStreak}回` : "—", metrics.maxLosingStreak > 0 ? "coral" : ""),
      makeCard("現在連敗", currentStreak == null ? "—" : `${currentStreak}回`),
      makeCardWithSubline(
        "最大DD",
        metrics.settledCount ? formatB(metrics.maxDrawdown) : "—",
        metrics.settledCount ? `BET総額比 ${formatPercent(metrics.maxDrawdownBetRate)}` : "",
        metrics.maxDrawdown > 0 ? "coral" : ""
      ),
      makeCard("最大1回損失", metrics.settledCount ? formatB(metrics.maxSingleLoss) : "—")
    );

    const riskNote = document.createElement("div");
    riskNote.className = "tactical-note";
    const riskLabel = document.createElement("span");
    riskLabel.className = "manga-label";
    riskLabel.textContent = `STEP 4.1 / ${period.label}`;
    const riskCopy = document.createElement("p");
    riskCopy.textContent = metrics.decidedCount || metrics.settledCount
      ? `最大連敗・最大DD・最大1回損失は${period.label}の記録から計算しています。現在連敗だけは期間に関係なく、全履歴の最新の的中・不的中結果から算出します。返還・結果待ちは連敗判定に含めません。最大DDは確定済みAIR BETの損益を時系列に積み上げた収支曲線の山から谷までの最大落ち込みです。最大DDの％は、選択期間の確定BET額に対する最大DDの比率で、残高ベースのDD率ではありません。`
      : `${period.label}にはリスク分析に使える確定記録がありません。現在連敗は全履歴の最新確定結果から表示します。`;
    riskNote.append(riskLabel, riskCopy);

    const oddsHeading = makeSectionHeading("STEP 5", "オッズ分析");
    const oddsGrid = document.createElement("div");
    oddsGrid.className = "stat-grid";
    oddsGrid.setAttribute("aria-label", `${period.label}のオッズ分析`);
    oddsGrid.append(
      makeCard("オッズ取得率", formatPercent(metrics.oddsCaptureRate)),
      makeCard("中央値参考オッズ", formatOdds(metrics.medianOdds)),
      makeCardWithSubline("平均参考オッズ", formatOdds(metrics.averageOdds), "高オッズの影響を受けます"),
      makeCard("参考オッズ範囲", formatOddsRange(metrics.minOdds, metrics.maxOdds))
    );

    const oddsBands = makeOddsBandDetails(metrics.oddsBands);

    const oddsNote = document.createElement("div");
    oddsNote.className = "tactical-note";
    const oddsLabel = document.createElement("span");
    oddsLabel.className = "manga-label";
    oddsLabel.textContent = `STEP 5.1 / ${period.label}`;
    const oddsCopy = document.createElement("p");
    oddsCopy.textContent = metrics.oddsLineCount
      ? `参考オッズは${period.label}のAIR BET記録を買い目単位で集計しています。${metrics.oddsCapturedCount}/${metrics.oddsLineCount}買い目で参考オッズを取得済みです。中央値は取得済みオッズを小さい順に並べた真ん中の値で、極端な高オッズの影響を受けにくい指標です。平均は高オッズに引っ張られることがあるため、中央値・オッズ帯分布と合わせて確認してください。次のレースの的中確率を予測するものではありません。`
      : `${period.label}には参考オッズを集計できる買い目記録がありません。`;
    oddsNote.append(oddsLabel, oddsCopy);

    mount.replaceChildren(
      controls,
      basicGrid,
      basicNote,
      returnsHeading,
      returnsGrid,
      returnsNote,
      riskHeading,
      riskGrid,
      riskNote,
      oddsHeading,
      oddsGrid,
      oddsBands,
      oddsNote
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
    ODDS_BANDS,
    recordStake,
    recordReturn,
    recordNet,
    recordTimestamp,
    orderedRecords,
    maxLosingStreak,
    currentLosingStreak,
    maxDrawdown,
    maxSingleLoss,
    normalizeOddsValue,
    recordOddsEntries,
    median,
    oddsBandDistribution,
    summarizeOdds,
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
  if (root.__MAMO_QUANT_ANALYSIS_BASIC_V8__) return;
  root.__MAMO_QUANT_ANALYSIS_BASIC_V8__ = true;
  root.MAMO_QUANT_ANALYSIS_BASIC = API;

  const boot = () => render();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})(typeof window !== "undefined" ? window : null);