/* MAMO BOAT — STEP 8 realized risk profile.
 * Read-only retrospective analysis of settled AIR BET records.
 * No recommendation, prediction, persistence, or betting-state mutation.
 */
(function initMamoQuantRiskProfile(root) {
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

  function maxDrawdown(records) {
    let equity = 0;
    let peak = 0;
    let maximum = 0;
    orderedRecords(records).forEach((record) => {
      equity += recordNet(record);
      peak = Math.max(peak, equity);
      maximum = Math.max(maximum, peak - equity);
    });
    return maximum;
  }

  function concentration(records) {
    const nets = (Array.isArray(records) ? records : []).map(recordNet);
    const gains = nets.filter((value) => value > 0);
    const losses = nets.filter((value) => value < 0).map((value) => Math.abs(value));
    const positiveTotal = gains.reduce((sum, value) => sum + value, 0);
    const negativeTotal = losses.reduce((sum, value) => sum + value, 0);
    const largestGain = gains.length ? Math.max(...gains) : 0;
    const largestLoss = losses.length ? Math.max(...losses) : 0;
    return Object.freeze({
      positiveTotal,
      negativeTotal,
      largestGain,
      largestLoss,
      largestGainShare: positiveTotal > 0 ? (largestGain / positiveTotal) * 100 : null,
      largestLossShare: negativeTotal > 0 ? (largestLoss / negativeTotal) * 100 : null,
    });
  }

  function calculate(state) {
    const balance = Math.max(0, safeNumber(state?.coins));
    const records = Array.isArray(state?.records) ? state.records : [];
    const settled = records.filter((record) => SETTLED.has(record?.status));
    const stakes = settled.map(recordStake).filter((stake) => stake > 0);
    const averageStake = stakes.length ? stakes.reduce((sum, stake) => sum + stake, 0) / stakes.length : 0;
    const settledStake = settled.reduce((sum, record) => sum + recordStake(record), 0);
    const totalReturn = settled.reduce((sum, record) => sum + recordReturn(record), 0);
    const returnRate = settledStake > 0 ? (totalReturn / settledStake) * 100 : null;
    const drawdown = maxDrawdown(settled);
    const drawdownBetRate = settledStake > 0 ? (drawdown / settledStake) * 100 : null;
    const averageStakeBalanceRate = balance > 0 && averageStake > 0 ? (averageStake / balance) * 100 : null;
    const c = concentration(settled);

    return Object.freeze({
      balance,
      settledCount: settled.length,
      settledStake,
      totalReturn,
      returnRate,
      averageStake,
      averageStakeBalanceRate,
      maxLosingStreak: maxLosingStreak(settled),
      maxDrawdown: drawdown,
      maxDrawdownBetRate: drawdownBetRate,
      positiveProfitTotal: c.positiveTotal,
      lossTotal: c.negativeTotal,
      largestWinProfit: c.largestGain,
      largestSingleLoss: c.largestLoss,
      largestWinShare: c.largestGainShare,
      largestLossShare: c.largestLossShare,
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

  function makeObservation(metrics) {
    const box = document.createElement("div");
    box.className = "analysis-note";
    box.style.marginTop = "12px";
    const title = document.createElement("strong");
    title.textContent = "記録から見えること";
    title.style.display = "block";
    title.style.marginBottom = "6px";
    const lines = document.createElement("div");
    lines.style.display = "grid";
    lines.style.gap = "5px";

    const texts = [];
    if (metrics.averageStakeBalanceRate != null) {
      texts.push(`平均確定BETは現在残高の ${formatPercent(metrics.averageStakeBalanceRate)} に相当します。`);
    }
    texts.push(`最大連敗は ${metrics.maxLosingStreak}回、最大DDは ${formatB(metrics.maxDrawdown)} でした。`);
    if (metrics.largestWinShare != null) {
      texts.push(`最大1勝の利益は、勝ち利益合計の ${formatPercent(metrics.largestWinShare)} を占めています。`);
    }
    if (metrics.largestLossShare != null) {
      texts.push(`最大1回損失は、損失合計の ${formatPercent(metrics.largestLossShare)} を占めています。`);
    }
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
    const mount = document.getElementById("mamoQuantAnalysisRiskProfile");
    if (!mount) return false;

    const metrics = calculate(readSnapshot(root?.localStorage));
    const fragment = document.createDocumentFragment();

    const heading = document.createElement("div");
    heading.className = "section-head small";
    const headingCopy = document.createElement("div");
    const number = document.createElement("span");
    number.className = "section-number";
    number.textContent = "STEP 8";
    const title = document.createElement("h2");
    title.textContent = "実績ベースの資金リスク分析";
    headingCopy.append(number, title);
    const meta = document.createElement("span");
    meta.className = "section-meta";
    meta.textContent = "累計 / 読み取り専用";
    heading.append(headingCopy, meta);
    fragment.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "stats-grid";
    grid.append(
      makeCard("回収率", formatPercent(metrics.returnRate), `確定 ${metrics.settledCount}件`),
      makeCard("平均BET残高比", formatPercent(metrics.averageStakeBalanceRate), `平均 ${formatB(metrics.averageStake)}`),
      makeCard("最大連敗", `${metrics.maxLosingStreak}回`),
      makeCard("最大DD", formatB(metrics.maxDrawdown), metrics.maxDrawdownBetRate == null ? "BET総額比 —" : `BET総額比 ${formatPercent(metrics.maxDrawdownBetRate)}`),
      makeCard("最大1勝集中度", formatPercent(metrics.largestWinShare), metrics.largestWinShare == null ? "勝ち利益なし" : `最大1勝利益 ${formatB(metrics.largestWinProfit)}`),
      makeCard("最大1損失集中度", formatPercent(metrics.largestLossShare), metrics.largestLossShare == null ? "損失なし" : `最大1回損失 ${formatB(metrics.largestSingleLoss)}`)
    );
    fragment.appendChild(grid);
    fragment.appendChild(makeObservation(metrics));

    const note = document.createElement("div");
    note.className = "analysis-note";
    note.style.marginTop = "12px";
    note.textContent = "このSTEPは過去の確定AIR BETを集計した観察結果です。『危険』『安全』の判定や推奨BET額、次レースの勝敗予測は行いません。集中度は、最大1件が同種の利益・損失合計に占める割合です。";
    fragment.appendChild(note);

    mount.replaceChildren(fragment);
    return true;
  }

  const api = Object.freeze({
    recordStake,
    recordReturn,
    recordNet,
    orderedRecords,
    maxLosingStreak,
    maxDrawdown,
    concentration,
    calculate,
    readSnapshot,
    render,
  });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.MAMO_QUANT_RISK_PROFILE = api;
})(typeof window !== "undefined" ? window : globalThis);
