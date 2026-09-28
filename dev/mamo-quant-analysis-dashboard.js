/* MAMO BOAT — beginner-friendly analysis dashboard.
 * Presentation-only layer over the existing read-only analysis APIs.
 * It never mutates AIR BET records, wallet state, navigation state, Supabase,
 * or betting execution. If required analysis APIs are unavailable, legacy
 * analysis remains visible as the safe fallback.
 */
(function initMamoQuantAnalysisDashboard(root) {
  "use strict";

  if (!root || typeof document === "undefined") return;
  if (root.__MAMO_QUANT_ANALYSIS_DASHBOARD_V1__) return;
  root.__MAMO_QUANT_ANALYSIS_DASHBOARD_V1__ = true;

  const MOUNT_ID = "mamoQuantAnalysisDashboard";
  const LEGACY_ID = "mamoQuantAnalysisLegacy";
  const CHARTS_SCRIPT_SRC = "mamo-quant-analysis-charts.js?v=20260928-1";
  const CHARTS_SCRIPT_SELECTOR = 'script[data-mamo-quant-analysis-charts="1"]';
  const DETAIL_TITLES = ["成績", "BETの特徴", "資金の耐久力", "詳細データ"];
  const DETAIL_COPY = [
    "今の成績を詳しく見る",
    "自分の買い方のクセを見る",
    "連敗した場合の資金を確認",
    "グラフ・オッズ別・データ件数を見る",
  ];
  const DETAIL_ICONS = ["▥", "◎", "●", "▤"];

  let activePeriod = "all";
  let activeSlide = 0;
  let detailOpen = false;

  const safeNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };
  const formatB = (value) => `${Math.round(safeNumber(value)).toLocaleString("ja-JP")}B`;
  const formatSignedB = (value) => {
    const number = Math.round(safeNumber(value));
    return `${number > 0 ? "+" : ""}${number.toLocaleString("ja-JP")}B`;
  };
  const formatPercent = (value) => value == null || !Number.isFinite(Number(value))
    ? "—"
    : `${Number(value).toFixed(1)}%`;

  function el(name, className = "", text = "") {
    const node = document.createElement(name);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function button(className, text, action, value = "") {
    const node = document.createElement("button");
    node.type = "button";
    node.className = className;
    node.textContent = text;
    node.dataset.analysisDashboardAction = action;
    if (value !== "") node.dataset.analysisDashboardValue = String(value);
    return node;
  }

  function getApis() {
    const basic = root.MAMO_QUANT_ANALYSIS_BASIC;
    const odds = root.MAMO_QUANT_ODDS_PERFORMANCE;
    const capital = root.MAMO_QUANT_CAPITAL;
    const risk = root.MAMO_QUANT_RISK_PROFILE;
    const data = root.MAMO_QUANT_DATA_FOUNDATION;
    const integrated = root.MAMO_QUANT_INTEGRATED;
    if (!basic?.readSnapshot || !basic?.calculate || !basic?.filterRecords) return null;
    if (!odds?.summarizeBandPerformance) return null;
    if (!capital?.calculate || !capital?.simulateBet) return null;
    if (!risk?.calculate) return null;
    if (!data?.calculate) return null;
    if (!integrated?.buildIntegratedMetrics || !integrated?.splitIntegratedObservationLines) return null;
    return { basic, odds, capital, risk, data, integrated };
  }

  function metricCard(label, value, className = "", subline = "") {
    const card = el("div", `mamo-analysis-metric ${className}`.trim());
    const labelNode = el("span", "mamo-analysis-metric-label", label);
    const valueNode = el("strong", "mamo-analysis-metric-value", value);
    card.append(labelNode, valueNode);
    if (subline) card.appendChild(el("small", "mamo-analysis-metric-sub", subline));
    return card;
  }

  function sectionTitle(title, copy = "") {
    const wrap = el("div", "mamo-analysis-section-title");
    wrap.appendChild(el("h3", "", title));
    if (copy) wrap.appendChild(el("p", "", copy));
    return wrap;
  }

  function currentSnapshot(apis) {
    return apis.basic.readSnapshot(root.localStorage);
  }

  function filteredMetrics(apis, snapshot) {
    const records = apis.basic.filterRecords(snapshot.records, activePeriod);
    const metrics = apis.basic.calculate({ coins: snapshot.coins, records });
    return { records, metrics };
  }

  function cumulativeMetrics(apis, snapshot) {
    const risk = apis.risk.calculate(snapshot);
    const data = apis.data.calculate(snapshot);
    const integrated = apis.integrated.buildIntegratedMetrics(risk, data);
    return { risk, data, integrated };
  }

  function makeHelpButton() {
    const help = button("mamo-analysis-help-button", "?", "help-open");
    help.setAttribute("aria-label", "分析の見方ガイドを開く");
    return help;
  }

  function buildCheck(apis, cumulative) {
    const box = el("section", "mamo-analysis-check");
    const head = el("div", "mamo-analysis-check-head");
    const icon = el("span", "mamo-analysis-check-icon", "💡");
    const title = el("strong", "", "MAMO CHECK（要約）");
    head.append(icon, title);
    box.appendChild(head);

    const split = apis.integrated.splitIntegratedObservationLines(cumulative.integrated);
    const lines = [...split.preview, ...split.details].slice(0, 4);
    const list = el("ul", "mamo-analysis-check-list");
    if (!lines.length) {
      const item = el("li", "", "確定記録が増えると、ここに要点が表示されます。");
      list.appendChild(item);
    } else {
      lines.forEach((line) => list.appendChild(el("li", "", line)));
    }
    box.appendChild(list);
    return box;
  }

  function buildHome(apis, snapshot, cumulative) {
    const home = el("div", "mamo-analysis-home");
    home.dataset.analysisDashboardHome = "1";

    const hero = el("div", "mamo-analysis-dashboard-hero");
    const heroCopy = el("div", "");
    heroCopy.append(
      el("span", "mamo-analysis-kicker", "MAMO ANALYSIS"),
      el("h2", "", "分析"),
      el("p", "", "まず要点だけ。気になるところだけ詳しく見られます。")
    );
    hero.append(heroCopy, makeHelpButton());
    home.appendChild(hero);

    home.appendChild(buildCheck(apis, cumulative));

    home.appendChild(sectionTitle("今の成績（累計）", "最初はこの4つだけ見れば全体をつかめます。"));
    const allMetrics = apis.basic.calculate(snapshot);
    const metrics = el("div", "mamo-analysis-metric-grid");
    metrics.append(
      metricCard("B残高", formatB(allMetrics.balance), "is-blue"),
      metricCard("損益", allMetrics.settledStake > 0 ? formatSignedB(allMetrics.netProfit) : "—", allMetrics.netProfit < 0 ? "is-red" : "is-green"),
      metricCard("回収率", formatPercent(allMetrics.returnRate), "is-green"),
      metricCard("的中率", formatPercent(allMetrics.hitRate), "is-orange")
    );
    home.appendChild(metrics);

    const nav = el("div", "mamo-analysis-card-list");
    DETAIL_TITLES.forEach((title, index) => {
      const card = button(`mamo-analysis-nav-card nav-${index + 1}`, "", "open-detail", index);
      const icon = el("span", "mamo-analysis-nav-icon", DETAIL_ICONS[index]);
      const copy = el("span", "mamo-analysis-nav-copy");
      copy.append(el("strong", "", `${index + 1}　${title}`), el("small", "", DETAIL_COPY[index]));
      const arrow = el("span", "mamo-analysis-nav-arrow", "›");
      card.append(icon, copy, arrow);
      nav.appendChild(card);
    });
    home.appendChild(nav);

    return home;
  }

  function buildPeriodTabs(apis) {
    const wrap = el("div", "mamo-analysis-periods");
    (apis.basic.PERIODS || []).forEach((period) => {
      const item = button("mamo-analysis-period", period.label, "period", period.key);
      item.classList.toggle("active", period.key === activePeriod);
      if (period.key === activePeriod) item.setAttribute("aria-current", "true");
      wrap.appendChild(item);
    });
    return wrap;
  }

  function buildBalanceChart(apis, snapshot, records) {
    const settled = records.filter((record) => ["hit", "miss", "refunded"].includes(record?.status));
    const ordered = typeof apis.basic.orderedRecords === "function"
      ? apis.basic.orderedRecords(settled)
      : settled.slice();
    if (!ordered.length) {
      return el("div", "mamo-analysis-empty", "残高推移を描ける確定記録がまだありません。");
    }
    const totalNet = ordered.reduce((sum, record) => sum + apis.basic.recordNet(record), 0);
    let balance = Math.max(0, safeNumber(snapshot.coins)) - totalNet;
    const series = [balance];
    ordered.forEach((record) => {
      balance += apis.basic.recordNet(record);
      series.push(balance);
    });

    const width = 320;
    const height = 150;
    const pad = 22;
    let min = Math.min(...series);
    let max = Math.max(...series);
    if (min === max) { min -= 1; max += 1; }
    const x = (index) => pad + (index / Math.max(1, series.length - 1)) * (width - pad * 2);
    const y = (value) => height - pad - ((value - min) / (max - min)) * (height - pad * 2);

    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "選択期間のB残高推移");
    svg.classList.add("mamo-analysis-mini-chart");

    [0, 0.5, 1].forEach((ratio) => {
      const line = document.createElementNS(SVG_NS, "line");
      const yy = pad + ratio * (height - pad * 2);
      line.setAttribute("x1", String(pad));
      line.setAttribute("x2", String(width - pad));
      line.setAttribute("y1", String(yy));
      line.setAttribute("y2", String(yy));
      line.setAttribute("class", "mamo-analysis-grid-line");
      svg.appendChild(line);
    });

    const polyline = document.createElementNS(SVG_NS, "polyline");
    polyline.setAttribute("points", series.map((value, index) => `${x(index)},${y(value)}`).join(" "));
    polyline.setAttribute("class", "mamo-analysis-line");
    svg.appendChild(polyline);

    const wrap = el("section", "mamo-analysis-chart-card");
    wrap.append(sectionTitle("B残高の推移", "選択期間の確定AIR BET損益から復元しています。"), svg);
    return wrap;
  }

  function buildPerformanceSlide(apis, snapshot) {
    const slide = el("article", "mamo-analysis-slide");
    slide.dataset.analysisDashboardSlide = "0";
    slide.appendChild(sectionTitle("① 成績", "今の成績を数字と推移で確認します。"));
    slide.appendChild(buildPeriodTabs(apis));

    const { records, metrics } = filteredMetrics(apis, snapshot);
    const grid = el("div", "mamo-analysis-metric-grid");
    grid.append(
      metricCard("B残高", formatB(metrics.balance), "is-blue"),
      metricCard("損益", metrics.settledStake > 0 ? formatSignedB(metrics.netProfit) : "—", metrics.netProfit < 0 ? "is-red" : "is-green"),
      metricCard("回収率", formatPercent(metrics.returnRate), "is-green"),
      metricCard("的中率", formatPercent(metrics.hitRate), "is-orange"),
      metricCard("AIR BET回数", `${metrics.recordCount.toLocaleString("ja-JP")}回`),
      metricCard("平均BET", metrics.averageStake > 0 ? formatB(metrics.averageStake) : "—")
    );
    slide.append(grid, buildBalanceChart(apis, snapshot, records));

    const note = el("p", "mamo-analysis-footnote");
    note.textContent = "的中率は的中・不的中が確定した記録だけ、収支は結果確定済みのAIR BETだけで計算します。";
    slide.appendChild(note);
    return slide;
  }

  function oddsBandRow(band) {
    const row = el("div", "mamo-analysis-odds-row");
    row.append(
      el("strong", "", band.label),
      el("span", "", `${band.recordCount}回`),
      el("span", "", formatPercent(band.hitRate)),
      el("span", band.returnRate != null && band.returnRate >= 100 ? "is-positive" : "", formatPercent(band.returnRate))
    );
    return row;
  }

  function buildBetStyleSlide(apis, snapshot) {
    const slide = el("article", "mamo-analysis-slide");
    slide.dataset.analysisDashboardSlide = "1";
    slide.appendChild(sectionTitle("② BETの特徴", "どんな買い方をしているかを見ます。"));

    const { records, metrics } = filteredMetrics(apis, snapshot);
    const performance = apis.odds.summarizeBandPerformance(records, apis.basic);
    const risk = apis.risk.calculate({ coins: snapshot.coins, records });
    const mainBand = performance.bands
      .slice()
      .sort((a, b) => b.recordCount - a.recordCount)[0];
    const mainBandLabel = mainBand?.recordCount ? mainBand.label : "—";

    const summary = el("div", "mamo-analysis-metric-grid two");
    summary.append(
      metricCard("平均BET", metrics.averageStake > 0 ? formatB(metrics.averageStake) : "—", "is-blue"),
      metricCard("よく選ぶオッズ帯", mainBandLabel, "is-green")
    );
    slide.appendChild(summary);

    slide.appendChild(sectionTitle("オッズ帯別 成績", "購入回数・的中率・回収率を同じ場所で比較します。"));
    const table = el("div", "mamo-analysis-odds-table");
    const header = el("div", "mamo-analysis-odds-row header");
    header.append(el("span", "", "オッズ帯"), el("span", "", "回数"), el("span", "", "的中率"), el("span", "", "回収率"));
    table.appendChild(header);
    performance.bands.forEach((band) => table.appendChild(oddsBandRow(band)));
    slide.appendChild(table);

    slide.appendChild(sectionTitle("勝ち方・負け方の偏り", "専門用語ではなく、1回の結果への偏りとして表示します。"));
    const concentration = el("div", "mamo-analysis-explain-grid");
    concentration.append(
      metricCard("利益は1回の大勝にどれくらい偏っている？", formatPercent(risk.largestWinShare), "is-orange", risk.largestWinShare == null ? "勝ち利益の確定記録なし" : `最大1勝利益 ${formatB(risk.largestWinProfit)}`),
      metricCard("損失は1回の大負けにどれくらい偏っている？", formatPercent(risk.largestLossShare), "is-red", risk.largestLossShare == null ? "損失の確定記録なし" : `最大1回損失 ${formatB(risk.largestSingleLoss)}`)
    );
    slide.appendChild(concentration);

    const note = el("p", "mamo-analysis-footnote");
    note.textContent = "オッズ帯別成績は、参考オッズとBET額が揃っている的中・不的中記録だけを使います。";
    slide.appendChild(note);
    return slide;
  }

  function updateSimulatorResult(container, apis, snapshot, goal, stake) {
    const result = container.querySelector("[data-analysis-sim-result]");
    if (!result) return;
    const sim = apis.capital.simulateBet(snapshot.coins, goal, stake);
    result.replaceChildren(
      metricCard("仮の1回BET", formatB(sim.stake), "is-blue"),
      metricCard("現在残高比", formatPercent(sim.balanceRate)),
      metricCard("設定目標B比", formatPercent(sim.goalRate))
    );

    const list = el("div", "mamo-analysis-stress-list");
    sim.stress.forEach((scenario) => {
      const row = el("div", "mamo-analysis-stress-row");
      row.append(
        el("strong", "", `${scenario.losses}連敗`),
        el("span", "", `${formatB(snapshot.coins)} → ${formatB(scenario.remaining)}`),
        el("b", "is-loss", `−${formatB(scenario.lossAmount)}`)
      );
      list.appendChild(row);
    });
    result.appendChild(list);
  }

  function buildCapitalSlide(apis, snapshot) {
    const slide = el("article", "mamo-analysis-slide");
    slide.dataset.analysisDashboardSlide = "2";
    slide.appendChild(sectionTitle("③ 資金の耐久力", "今のBET額で連敗した場合の影響を確認します。"));

    const risk = apis.risk.calculate(snapshot);
    const goal = apis.capital.readGoal(root.localStorage);
    const capital = apis.capital.calculate(snapshot, goal);
    const grid = el("div", "mamo-analysis-metric-grid");
    grid.append(
      metricCard("平均BETの残高比", formatPercent(risk.averageStakeBalanceRate), "is-blue", risk.averageStake > 0 ? `平均 ${formatB(risk.averageStake)}` : ""),
      metricCard("最大連敗", `${risk.maxLosingStreak}回`, "is-orange"),
      metricCard("これまで一番大きく資金が減った幅", formatB(risk.maxDrawdown), "is-red", "最大DDを初心者向けに言い換え"),
      metricCard("最大1回損失", formatB(risk.largestSingleLoss), "is-red")
    );
    slide.appendChild(grid);

    slide.appendChild(sectionTitle("連敗シミュレーション", "未来予測ではなく、同じBET額で負け続けた場合の単純計算です。"));
    const currentStress = el("div", "mamo-analysis-stress-list");
    capital.stress.forEach((scenario) => {
      const row = el("div", "mamo-analysis-stress-row");
      row.append(
        el("strong", "", `${scenario.losses}連敗した場合`),
        el("span", "", `${formatB(snapshot.coins)} → ${formatB(scenario.remaining)}`),
        el("b", "is-loss", `−${formatB(scenario.lossAmount)}`)
      );
      currentStress.appendChild(row);
    });
    slide.appendChild(currentStress);

    const simulator = el("section", "mamo-analysis-simulator");
    simulator.appendChild(sectionTitle("仮BETでシミュレーション", "スライダーを動かして資金への影響だけ比較できます。"));
    const max = Math.max(100, Math.floor(Math.max(0, snapshot.coins) / 100) * 100);
    const initial = apis.capital.normalizeSimBet(capital.averageSettledStake || 100, snapshot.coins) || Math.min(100, max);
    const control = el("div", "mamo-analysis-range-row");
    const range = document.createElement("input");
    range.type = "range";
    range.min = "100";
    range.max = String(max);
    range.step = "100";
    range.value = String(initial);
    range.dataset.analysisSimRange = "1";
    range.setAttribute("aria-label", "仮の1回BET");
    const value = el("output", "mamo-analysis-range-value", formatB(initial));
    value.dataset.analysisSimValue = "1";
    control.append(range, value);
    simulator.appendChild(control);
    const result = el("div", "mamo-analysis-sim-result");
    result.dataset.analysisSimResult = "1";
    simulator.appendChild(result);
    slide.appendChild(simulator);
    updateSimulatorResult(simulator, apis, snapshot, goal, initial);

    const note = el("p", "mamo-analysis-footnote");
    note.textContent = "この画面はBET額を推奨しません。仮BET値も保存されません。";
    slide.appendChild(note);
    return slide;
  }

  function ensureChartsFor(mountId) {
    const render = root.MAMO_QUANT_ANALYSIS_CHARTS?.render;
    if (typeof render === "function") {
      render(mountId);
      return;
    }
    const existing = document.querySelector(CHARTS_SCRIPT_SELECTOR);
    if (existing) {
      existing.addEventListener("load", () => root.MAMO_QUANT_ANALYSIS_CHARTS?.render?.(mountId), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = CHARTS_SCRIPT_SRC;
    script.async = true;
    script.dataset.mamoQuantAnalysisCharts = "1";
    script.addEventListener("load", () => root.MAMO_QUANT_ANALYSIS_CHARTS?.render?.(mountId), { once: true });
    document.head.appendChild(script);
  }

  function buildDataSlide(apis, snapshot, cumulative) {
    const slide = el("article", "mamo-analysis-slide");
    slide.dataset.analysisDashboardSlide = "3";
    slide.appendChild(sectionTitle("④ 詳細データ", "グラフや母数を確認したい人向けの深掘り画面です。"));

    const data = cumulative.data;
    const grid = el("div", "mamo-analysis-metric-grid");
    grid.append(
      metricCard("確定記録", `${data.settledCount}件`, "is-blue"),
      metricCard("記録日数", `${data.observedDays}日`),
      metricCard("BET額データ取得率", formatPercent(data.stakeCoverageRate), "is-green"),
      metricCard("日付データ取得率", formatPercent(data.dateCoverageRate), "is-green"),
      metricCard("1記録の母数比", formatPercent(data.singleRecordShare), "is-orange"),
      metricCard("記録期間", data.calendarSpanDays ? `${data.calendarSpanDays}日間` : "—")
    );
    slide.appendChild(grid);

    const charts = el("div", "mamo-analysis-dashboard-charts");
    charts.id = "mamoAnalysisDashboardCharts";
    charts.appendChild(el("div", "mamo-analysis-empty", "グラフを読み込み中です。"));
    slide.appendChild(charts);

    const note = el("p", "mamo-analysis-footnote");
    note.textContent = "記録数が少ないうちは、1回の結果で回収率などの数字が大きく動くことがあります。";
    slide.appendChild(note);
    return slide;
  }

  function buildDetail(apis, snapshot, cumulative) {
    const detail = el("div", "mamo-analysis-detail");
    detail.dataset.analysisDashboardDetail = "1";
    detail.hidden = !detailOpen;

    const toolbar = el("div", "mamo-analysis-detail-toolbar");
    const back = button("mamo-analysis-back", "← 分析トップに戻る", "back-home");
    const counter = el("span", "mamo-analysis-page-counter", `${activeSlide + 1} / 4`);
    counter.dataset.analysisDashboardCounter = "1";
    toolbar.append(back, counter);
    detail.appendChild(toolbar);

    const track = el("div", "mamo-analysis-slider");
    track.dataset.analysisDashboardSlider = "1";
    track.setAttribute("aria-label", "分析詳細。左右にスワイプできます。");
    track.append(
      buildPerformanceSlide(apis, snapshot),
      buildBetStyleSlide(apis, snapshot),
      buildCapitalSlide(apis, snapshot),
      buildDataSlide(apis, snapshot, cumulative)
    );
    detail.appendChild(track);

    const dots = el("div", "mamo-analysis-dots");
    DETAIL_TITLES.forEach((title, index) => {
      const dot = button("mamo-analysis-dot", String(index + 1), "go-slide", index);
      dot.setAttribute("aria-label", `${index + 1} ${title}`);
      dot.classList.toggle("active", index === activeSlide);
      dots.appendChild(dot);
    });
    detail.appendChild(dots);

    return detail;
  }

  function buildHelp() {
    const overlay = el("div", "mamo-analysis-help-overlay");
    overlay.dataset.analysisDashboardHelp = "1";
    overlay.hidden = true;
    const panel = el("section", "mamo-analysis-help-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "分析の見方ガイド");

    const head = el("div", "mamo-analysis-help-head");
    head.append(el("h3", "", "ヘルプ / 見方ガイド"), button("mamo-analysis-help-close", "×", "help-close"));
    panel.appendChild(head);

    const items = [
      ["MAMO CHECKとは？", "今ある記録から見える事実を短くまとめたものです。勝敗予測ではありません。"],
      ["回収率とは？", "BETした金額に対して、払戻・返還がどれだけ戻ったかを示します。"],
      ["資金が減った幅とは？", "過去の収支曲線で、山から谷まで最も大きく下がった幅です。"],
      ["偏りとは？", "利益や損失が、1回の大きな結果にどれくらい集中しているかを示します。"],
      ["データの母数とは？", "分析に使った確定記録の数です。少ないほど1回の結果の影響が大きくなります。"],
    ];
    items.forEach(([title, copy]) => {
      const details = document.createElement("details");
      details.className = "mamo-analysis-help-item";
      const summary = document.createElement("summary");
      summary.textContent = title;
      details.append(summary, el("p", "", copy));
      panel.appendChild(details);
    });
    overlay.appendChild(panel);
    return overlay;
  }

  function syncSlideUi(rootNode, index) {
    activeSlide = Math.max(0, Math.min(3, index));
    const counter = rootNode.querySelector("[data-analysis-dashboard-counter]");
    if (counter) counter.textContent = `${activeSlide + 1} / 4`;
    rootNode.querySelectorAll(".mamo-analysis-dot").forEach((dot, dotIndex) => {
      dot.classList.toggle("active", dotIndex === activeSlide);
    });
  }

  function moveToSlide(rootNode, index) {
    const track = rootNode.querySelector("[data-analysis-dashboard-slider]");
    if (!track) return;
    syncSlideUi(rootNode, index);
    track.scrollLeft = activeSlide * track.clientWidth;
    const slide = track.children[activeSlide];
    slide?.querySelector("h3")?.focus?.({ preventScroll: true });
    if (activeSlide === 3) ensureChartsFor("mamoAnalysisDashboardCharts");
  }

  function showDetail(rootNode, index) {
    detailOpen = true;
    const home = rootNode.querySelector("[data-analysis-dashboard-home]");
    const detail = rootNode.querySelector("[data-analysis-dashboard-detail]");
    if (home) home.hidden = true;
    if (detail) detail.hidden = false;
    moveToSlide(rootNode, index);
    root.scrollTo({ top: 0, behavior: "auto" });
  }

  function showHome(rootNode) {
    detailOpen = false;
    const home = rootNode.querySelector("[data-analysis-dashboard-home]");
    const detail = rootNode.querySelector("[data-analysis-dashboard-detail]");
    if (home) home.hidden = false;
    if (detail) detail.hidden = true;
    root.scrollTo({ top: 0, behavior: "auto" });
  }

  function attachEvents(rootNode, apis) {
    rootNode.addEventListener("click", (event) => {
      const target = event.target?.closest?.("[data-analysis-dashboard-action]");
      if (!target || !rootNode.contains(target)) return;
      const action = target.dataset.analysisDashboardAction;
      const value = target.dataset.analysisDashboardValue;

      if (action === "open-detail" || action === "go-slide") {
        showDetail(rootNode, Number(value) || 0);
        return;
      }
      if (action === "back-home") {
        showHome(rootNode);
        return;
      }
      if (action === "period") {
        if (!(apis.basic.PERIODS || []).some((period) => period.key === value)) return;
        activePeriod = value;
        detailOpen = true;
        activeSlide = 0;
        render();
        return;
      }
      if (action === "help-open") {
        const help = rootNode.querySelector("[data-analysis-dashboard-help]");
        if (help) help.hidden = false;
        return;
      }
      if (action === "help-close") {
        const help = rootNode.querySelector("[data-analysis-dashboard-help]");
        if (help) help.hidden = true;
      }
    });

    const track = rootNode.querySelector("[data-analysis-dashboard-slider]");
    if (track) {
      track.addEventListener("scroll", () => {
        if (!track.clientWidth) return;
        const index = Math.round(track.scrollLeft / track.clientWidth);
        if (index !== activeSlide) {
          syncSlideUi(rootNode, index);
          if (index === 3) ensureChartsFor("mamoAnalysisDashboardCharts");
        }
      }, { passive: true });
    }

    const range = rootNode.querySelector("[data-analysis-sim-range]");
    if (range) {
      range.addEventListener("input", () => {
        const snapshot = currentSnapshot(apis);
        const goal = apis.capital.readGoal(root.localStorage);
        const value = apis.capital.normalizeSimBet(range.value, snapshot.coins);
        const output = rootNode.querySelector("[data-analysis-sim-value]");
        if (output) output.textContent = formatB(value);
        const simulator = range.closest(".mamo-analysis-simulator");
        if (simulator) updateSimulatorResult(simulator, apis, snapshot, goal, value);
      });
    }

    const help = rootNode.querySelector("[data-analysis-dashboard-help]");
    if (help) {
      help.addEventListener("click", (event) => {
        if (event.target === help) help.hidden = true;
      });
    }
  }

  function render() {
    const mount = document.getElementById(MOUNT_ID);
    const legacy = document.getElementById(LEGACY_ID);
    if (!mount) return false;

    const apis = getApis();
    if (!apis) {
      mount.hidden = true;
      if (legacy) legacy.hidden = false;
      return false;
    }

    try {
      const snapshot = currentSnapshot(apis);
      const cumulative = cumulativeMetrics(apis, snapshot);

      const fragment = document.createDocumentFragment();
      fragment.append(
        buildHome(apis, snapshot, cumulative),
        buildDetail(apis, snapshot, cumulative),
        buildHelp()
      );
      mount.replaceChildren(fragment);
      mount.hidden = false;
      if (legacy) legacy.hidden = true;
      attachEvents(mount, apis);

      if (detailOpen) {
        const home = mount.querySelector("[data-analysis-dashboard-home]");
        const detail = mount.querySelector("[data-analysis-dashboard-detail]");
        if (home) home.hidden = true;
        if (detail) detail.hidden = false;
        moveToSlide(mount, activeSlide);
      }
      return true;
    } catch (_) {
      mount.hidden = true;
      if (legacy) legacy.hidden = false;
      return false;
    }
  }

  root.MAMO_QUANT_ANALYSIS_DASHBOARD = Object.freeze({ render });
})(typeof window !== "undefined" ? window : null);
