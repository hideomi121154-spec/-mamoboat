/* MAMO BOAT — quantitative analysis STEP 5.2.
 * Read-only odds-band performance by AIR BET record.
 * A settled AIR BET is classified by the stake-weighted average of its recorded
 * reference odds. Records with missing line odds or line stakes are excluded so
 * payout is never guessed or split across individual lines.
 */
(function initMamoQuantOddsPerformance(root) {
  "use strict";

  if (typeof module === "undefined" && root?.__MAMO_QUANT_ODDS_PERFORMANCE_V1__) return;

  const PERFORMANCE_BANDS = Object.freeze([
    { key: "under10", label: "10倍未満", min: 0, max: 10 },
    { key: "10to30", label: "10〜30倍", min: 10, max: 30 },
    { key: "30to100", label: "30〜100倍", min: 30, max: 100 },
    { key: "100plus", label: "100倍以上", min: 100, max: Infinity },
  ]);
  const DECIDED = new Set(["hit", "miss"]);
  let activePeriod = "all";

  function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function recordExposureOdds(record, baseApi) {
    const normalize = baseApi?.normalizeOddsValue;
    if (typeof normalize !== "function") return null;
    const lines = Array.isArray(record?.lines) ? record.lines : [];

    if (lines.length) {
      let weighted = 0;
      let totalStake = 0;
      for (const line of lines) {
        const odds = normalize(line?.odds ?? line?.referenceOdds);
        const stake = Math.max(0, safeNumber(line?.stake));
        if (odds == null || stake <= 0) return null;
        weighted += odds * stake;
        totalStake += stake;
      }
      return totalStake > 0 ? weighted / totalStake : null;
    }

    const odds = normalize(record?.odds ?? record?.referenceOdds);
    const stake = typeof baseApi?.recordStake === "function" ? baseApi.recordStake(record) : 0;
    return odds != null && stake > 0 ? odds : null;
  }

  function bandForOdds(value) {
    if (!Number.isFinite(value) || value <= 0) return null;
    return PERFORMANCE_BANDS.find((band) => value >= band.min && value < band.max) || null;
  }

  function summarizeBandPerformance(records, baseApi) {
    const result = PERFORMANCE_BANDS.map((band) => ({
      key: band.key,
      label: band.label,
      recordCount: 0,
      hitCount: 0,
      stake: 0,
      returned: 0,
    }));
    const byKey = new Map(result.map((item) => [item.key, item]));
    let decidedCount = 0;
    let eligibleCount = 0;
    let excludedMissingOdds = 0;

    for (const record of Array.isArray(records) ? records : []) {
      if (!DECIDED.has(record?.status)) continue;
      decidedCount += 1;
      const exposureOdds = recordExposureOdds(record, baseApi);
      const band = bandForOdds(exposureOdds);
      const stake = typeof baseApi?.recordStake === "function" ? baseApi.recordStake(record) : 0;
      if (!band || stake <= 0) {
        excludedMissingOdds += 1;
        continue;
      }
      eligibleCount += 1;
      const bucket = byKey.get(band.key);
      bucket.recordCount += 1;
      bucket.hitCount += record.status === "hit" ? 1 : 0;
      bucket.stake += stake;
      bucket.returned += typeof baseApi?.recordReturn === "function" ? baseApi.recordReturn(record) : 0;
    }

    return Object.freeze({
      decidedCount,
      eligibleCount,
      excludedMissingOdds,
      bands: Object.freeze(result.map((item) => Object.freeze({
        ...item,
        hitRate: item.recordCount ? (item.hitCount / item.recordCount) * 100 : null,
        returnRate: item.stake > 0 ? (item.returned / item.stake) * 100 : null,
      }))),
    });
  }

  const formatPercent = (value) => value == null ? "—" : `${value.toFixed(1)}%`;

  function render() {
    if (typeof document === "undefined") return false;
    const mount = document.getElementById("mamoQuantAnalysisOddsPerformance");
    const baseApi = root?.MAMO_QUANT_ANALYSIS_BASIC;
    if (!mount || !baseApi?.readSnapshot || !baseApi?.filterRecords) return false;

    const snapshot = baseApi.readSnapshot();
    const filtered = baseApi.filterRecords(snapshot.records, activePeriod);
    const summary = summarizeBandPerformance(filtered, baseApi);
    const period = baseApi.PERIODS?.find((item) => item.key === activePeriod)?.label || "累計";

    const heading = document.createElement("div");
    heading.className = "section-head small";
    heading.style.marginTop = "18px";
    const headingCopy = document.createElement("div");
    const number = document.createElement("span");
    number.className = "section-number";
    number.textContent = "STEP 5.2";
    const title = document.createElement("h2");
    title.textContent = "オッズ帯別成績";
    headingCopy.append(number, title);
    heading.appendChild(headingCopy);

    const details = document.createElement("details");
    details.dataset.analysisOddsPerformance = "1";
    details.style.border = "1px solid #cbd6df";
    details.style.borderRadius = "10px";
    details.style.background = "#ffffff";
    const toggle = document.createElement("summary");
    toggle.style.cursor = "pointer";
    toggle.style.padding = "12px 14px";
    toggle.style.fontWeight = "800";
    toggle.style.color = "#0b3554";
    toggle.textContent = "オッズ帯ごとの成績を見る";
    details.appendChild(toggle);

    const body = document.createElement("div");
    body.style.display = "grid";
    body.style.gap = "1px";
    body.style.background = "#dce5ec";
    summary.bands.forEach((band) => {
      const row = document.createElement("div");
      row.style.background = "#ffffff";
      row.style.padding = "11px 14px";
      const top = document.createElement("div");
      top.style.display = "flex";
      top.style.justifyContent = "space-between";
      top.style.gap = "10px";
      top.style.fontWeight = "800";
      top.style.color = "#0b3554";
      const label = document.createElement("span");
      label.textContent = band.label;
      const count = document.createElement("span");
      count.textContent = `${band.recordCount}件`;
      top.append(label, count);
      const sub = document.createElement("div");
      sub.style.marginTop = "4px";
      sub.style.color = "#64798b";
      sub.style.fontWeight = "700";
      sub.textContent = band.recordCount
        ? `的中率 ${formatPercent(band.hitRate)} / 回収率 ${formatPercent(band.returnRate)}`
        : "対象記録なし";
      row.append(top, sub);
      body.appendChild(row);
    });
    details.appendChild(body);

    const note = document.createElement("div");
    note.className = "tactical-note";
    const noteLabel = document.createElement("span");
    noteLabel.className = "manga-label";
    noteLabel.textContent = `STEP 5.2 / ${period}`;
    const noteCopy = document.createElement("p");
    noteCopy.textContent = summary.decidedCount
      ? `結果が確定した的中・不的中${summary.decidedCount}件のうち、全買い目の参考オッズとBET額が揃った${summary.eligibleCount}件をAIR BET単位で分析しています。複数買い目は参考オッズをBET額で加重平均して1つのオッズ帯に分類し、払戻を個別買い目へ推測配分しません。${summary.excludedMissingOdds}件は必要データ不足のため除外しています。`
      : `${period}にはオッズ帯別成績を計算できる的中・不的中記録がありません。`;
    note.append(noteLabel, noteCopy);

    mount.replaceChildren(heading, details, note);
    return true;
  }

  function setPeriod(periodKey) {
    const keys = new Set((root?.MAMO_QUANT_ANALYSIS_BASIC?.PERIODS || []).map((item) => item.key));
    if (!keys.has(periodKey)) return false;
    activePeriod = periodKey;
    return render();
  }

  const API = Object.freeze({ PERFORMANCE_BANDS, recordExposureOdds, bandForOdds, summarizeBandPerformance, render, setPeriod });
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (!root || typeof document === "undefined") return;
  root.__MAMO_QUANT_ODDS_PERFORMANCE_V1__ = true;
  root.MAMO_QUANT_ODDS_PERFORMANCE = API;

  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-analysis-period]");
    if (!button) return;
    setPeriod(button.dataset.analysisPeriod);
  });
  render();
})(typeof window !== "undefined" ? window : null);
