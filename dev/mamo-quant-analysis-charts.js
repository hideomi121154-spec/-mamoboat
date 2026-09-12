/* MAMO BOAT — STEP 10 visual analysis charts.
 * Read-only SVG visualisation of settled AIR BET history.
 * Isolated to #mamoQuantAnalysisCharts: no navigation, scrolling, timers,
 * viewport hooks, persistence, network access, or shared UI mutation.
 */
(function initMamoQuantAnalysisCharts(root) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const SETTLED = new Set(["hit", "miss", "refunded"]);

  const safeNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  function buildChartData(snapshot, riskApi, oddsApi, baseApi) {
    const records = Array.isArray(snapshot?.records) ? snapshot.records : [];
    const settled = records.filter((record) => SETTLED.has(record?.status));
    const ordered = typeof riskApi?.orderedRecords === "function" ? riskApi.orderedRecords(settled) : settled.slice();
    const netOf = typeof riskApi?.recordNet === "function" ? riskApi.recordNet : () => 0;
    const stakeOf = typeof riskApi?.recordStake === "function" ? riskApi.recordStake : () => 0;
    const currentBalance = Math.max(0, safeNumber(snapshot?.coins));
    const totalNet = ordered.reduce((sum, record) => sum + safeNumber(netOf(record)), 0);
    let balance = currentBalance - totalNet;
    const balanceSeries = [{ index: 0, balance }];
    ordered.forEach((record, index) => {
      balance += safeNumber(netOf(record));
      balanceSeries.push({ index: index + 1, balance });
    });

    const bands = (oddsApi?.PERFORMANCE_BANDS || []).map((band) => ({
      key: band.key,
      label: band.label,
      stake: 0,
      net: 0,
      count: 0,
    }));
    const byKey = new Map(bands.map((band) => [band.key, band]));
    settled.forEach((record) => {
      const odds = typeof oddsApi?.recordExposureOdds === "function"
        ? oddsApi.recordExposureOdds(record, baseApi)
        : null;
      const band = typeof oddsApi?.bandForOdds === "function" ? oddsApi.bandForOdds(odds) : null;
      const bucket = band ? byKey.get(band.key) : null;
      if (!bucket) return;
      const stake = Math.max(0, safeNumber(stakeOf(record)));
      if (stake <= 0) return;
      bucket.stake += stake;
      bucket.net += safeNumber(netOf(record));
      bucket.count += 1;
    });

    const eligibleStake = bands.reduce((sum, band) => sum + band.stake, 0);
    return Object.freeze({
      settledCount: settled.length,
      currentBalance,
      balanceSeries: Object.freeze(balanceSeries.map(Object.freeze)),
      bands: Object.freeze(bands.map((band) => Object.freeze({
        ...band,
        stakeShare: eligibleStake > 0 ? (band.stake / eligibleStake) * 100 : 0,
      }))),
      eligibleStake,
    });
  }

  function svgElement(name, attrs = {}) {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  }

  function makeChartCard(titleText, descriptionText) {
    const card = document.createElement("section");
    card.className = "panel";
    card.style.marginTop = "12px";
    card.dataset.mamoAnalysisChart = "1";
    const title = document.createElement("h3");
    title.textContent = titleText;
    title.style.margin = "0 0 4px";
    title.style.color = "#0b3554";
    const description = document.createElement("p");
    description.textContent = descriptionText;
    description.style.margin = "0 0 10px";
    description.style.color = "#64798b";
    description.style.fontWeight = "700";
    description.style.fontSize = "12px";
    const body = document.createElement("div");
    body.dataset.chartBody = "1";
    card.append(title, description, body);
    return { card, body };
  }

  function makeEmpty(copy) {
    const empty = document.createElement("div");
    empty.className = "analysis-note";
    empty.textContent = copy;
    return empty;
  }

  function makeLineChart(series) {
    if (!Array.isArray(series) || series.length < 2) return makeEmpty("残高推移を描くための確定記録がまだありません。");
    const width = 320;
    const height = 170;
    const pad = 24;
    const values = series.map((item) => safeNumber(item.balance));
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) { min -= 1; max += 1; }
    const x = (index) => pad + (index / Math.max(1, series.length - 1)) * (width - pad * 2);
    const y = (value) => height - pad - ((value - min) / (max - min)) * (height - pad * 2);
    const svg = svgElement("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": "確定AIR BETから復元したB残高推移" });
    svg.style.width = "100%";
    svg.style.height = "auto";
    [0, 0.5, 1].forEach((ratio) => {
      const yy = pad + ratio * (height - pad * 2);
      svg.appendChild(svgElement("line", { x1: pad, y1: yy, x2: width - pad, y2: yy, stroke: "#dce5ec", "stroke-width": 1 }));
    });
    const points = series.map((item, index) => `${x(index)},${y(item.balance)}`).join(" ");
    svg.appendChild(svgElement("polyline", { points, fill: "none", stroke: "#0b3554", "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    const first = series[0];
    const last = series[series.length - 1];
    [[0, first], [series.length - 1, last]].forEach(([index, item]) => {
      svg.appendChild(svgElement("circle", { cx: x(index), cy: y(item.balance), r: 4, fill: "#e5232d" }));
    });
    const caption = document.createElement("div");
    caption.style.display = "flex";
    caption.style.justifyContent = "space-between";
    caption.style.gap = "8px";
    caption.style.fontSize = "12px";
    caption.style.fontWeight = "800";
    caption.style.color = "#64798b";
    const start = document.createElement("span");
    start.textContent = `開始 ${Math.round(first.balance).toLocaleString("ja-JP")} B`;
    const end = document.createElement("span");
    end.textContent = `現在 ${Math.round(last.balance).toLocaleString("ja-JP")} B`;
    caption.append(start, end);
    const wrap = document.createElement("div");
    wrap.append(svg, caption);
    return wrap;
  }

  function makeBarChart(bands) {
    const rows = (Array.isArray(bands) ? bands : []).filter((band) => band.count > 0);
    if (!rows.length) return makeEmpty("オッズ帯別損益を描ける記録がまだありません。");
    const maxAbs = Math.max(1, ...rows.map((band) => Math.abs(safeNumber(band.net))));
    const wrap = document.createElement("div");
    wrap.style.display = "grid";
    wrap.style.gap = "10px";
    rows.forEach((band) => {
      const row = document.createElement("div");
      const top = document.createElement("div");
      top.style.display = "flex";
      top.style.justifyContent = "space-between";
      top.style.gap = "8px";
      top.style.fontSize = "12px";
      top.style.fontWeight = "800";
      const label = document.createElement("span");
      label.textContent = `${band.label} (${band.count}件)`;
      const value = document.createElement("span");
      value.textContent = `${band.net >= 0 ? "+" : ""}${Math.round(band.net).toLocaleString("ja-JP")} B`;
      top.append(label, value);
      const track = document.createElement("div");
      track.style.height = "12px";
      track.style.borderRadius = "999px";
      track.style.background = "#e8eef3";
      track.style.overflow = "hidden";
      const bar = document.createElement("div");
      bar.style.width = `${Math.max(2, Math.abs(band.net) / maxAbs * 100)}%`;
      bar.style.height = "100%";
      bar.style.borderRadius = "inherit";
      bar.style.background = band.net >= 0 ? "#0b6b53" : "#c9222b";
      track.appendChild(bar);
      row.append(top, track);
      wrap.appendChild(row);
    });
    return wrap;
  }

  function polar(cx, cy, radius, angle) {
    const radians = (angle - 90) * Math.PI / 180;
    return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
  }

  function arcPath(cx, cy, radius, startAngle, endAngle) {
    const start = polar(cx, cy, radius, endAngle);
    const end = polar(cx, cy, radius, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
  }

  function makePieChart(bands, eligibleStake) {
    const rows = (Array.isArray(bands) ? bands : []).filter((band) => band.stake > 0);
    if (!rows.length || eligibleStake <= 0) return makeEmpty("BET構成を描ける参考オッズ付き記録がまだありません。");
    const palette = ["#0b3554", "#2f6f91", "#e5232d", "#d29b2c"];
    const svg = svgElement("svg", { viewBox: "0 0 220 170", role: "img", "aria-label": "オッズ帯別BET額構成" });
    svg.style.width = "100%";
    svg.style.maxWidth = "280px";
    svg.style.display = "block";
    svg.style.margin = "0 auto";
    let angle = 0;
    rows.forEach((band, index) => {
      const sweep = (band.stake / eligibleStake) * 360;
      svg.appendChild(svgElement("path", { d: arcPath(85, 85, 68, angle, angle + sweep), fill: palette[index % palette.length], stroke: "#ffffff", "stroke-width": 2 }));
      angle += sweep;
    });
    const legend = document.createElement("div");
    legend.style.display = "grid";
    legend.style.gap = "6px";
    rows.forEach((band, index) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.gap = "8px";
      row.style.fontSize = "12px";
      row.style.fontWeight = "800";
      const left = document.createElement("span");
      const dot = document.createElement("span");
      dot.textContent = "● ";
      dot.style.color = palette[index % palette.length];
      left.append(dot, document.createTextNode(band.label));
      const value = document.createElement("span");
      value.textContent = `${band.stakeShare.toFixed(1)}%`;
      row.append(left, value);
      legend.appendChild(row);
    });
    const wrap = document.createElement("div");
    wrap.append(svg, legend);
    return wrap;
  }

  function render() {
    if (typeof document === "undefined") return false;
    const mount = document.getElementById("mamoQuantAnalysisCharts");
    const riskApi = root?.MAMO_QUANT_RISK_PROFILE;
    const oddsApi = root?.MAMO_QUANT_ODDS_PERFORMANCE;
    const baseApi = root?.MAMO_QUANT_ANALYSIS_BASIC;
    if (!mount || !riskApi?.readSnapshot || !riskApi?.recordNet || !riskApi?.recordStake || !oddsApi || !baseApi) return false;

    try {
      const snapshot = riskApi.readSnapshot(root?.localStorage);
      const data = buildChartData(snapshot, riskApi, oddsApi, baseApi);
      const fragment = document.createDocumentFragment();

      const heading = document.createElement("div");
      heading.className = "section-head small";
      heading.style.marginTop = "18px";
      const copy = document.createElement("div");
      const title = document.createElement("h2");
      title.textContent = "グラフで見る";
      copy.appendChild(title);
      const meta = document.createElement("span");
      meta.className = "section-meta";
      meta.textContent = `確定 ${data.settledCount}件`;
      heading.append(copy, meta);
      fragment.appendChild(heading);

      const line = makeChartCard("B残高の推移", "確定AIR BETの損益から現在残高を基準に過去残高を復元しています。");
      line.body.appendChild(makeLineChart(data.balanceSeries));
      fragment.appendChild(line.card);

      const bar = makeChartCard("オッズ帯別の損益", "参考オッズが揃った確定記録を、オッズ帯ごとの純損益で比較します。");
      bar.body.appendChild(makeBarChart(data.bands));
      fragment.appendChild(bar.card);

      const pie = makeChartCard("BET額の構成", "参考オッズが揃った確定記録のBET額が、どのオッズ帯に使われたかを表示します。");
      pie.body.appendChild(makePieChart(data.bands, data.eligibleStake));
      fragment.appendChild(pie.card);

      mount.replaceChildren(fragment);
      return true;
    } catch (_) {
      const failure = makeEmpty("グラフを表示できませんでした。数値分析はそのまま利用できます。");
      mount.replaceChildren(failure);
      return false;
    }
  }

  const api = Object.freeze({ buildChartData, render });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.MAMO_QUANT_ANALYSIS_CHARTS = api;
})(typeof window !== "undefined" ? window : globalThis);
