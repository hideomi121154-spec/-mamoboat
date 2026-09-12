/* MAMO BOAT — independent quantitative analysis shell.
 * Navigation + read-only analysis surfaces.
 * The shell owns loading analysis modules so an older controlling Service Worker
 * cannot deliver a new shell without its matching dependencies.
 * No AIR BET, wallet, records, pressroom, SHOP, or calculation state is mutated here.
 */
(() => {
  "use strict";
  if (window.__MAMO_QUANT_ANALYSIS_SHELL_V10__) return;
  window.__MAMO_QUANT_ANALYSIS_SHELL_V10__ = true;

  const SCREEN_ID = "quantAnalysis";
  const NAV_ID = "nav-quantAnalysis";
  const BASIC_SCRIPT_SRC = "mamo-quant-analysis-basic.js?v=20260912-7";
  const BASIC_SCRIPT_SELECTOR = 'script[data-mamo-quant-analysis-basic="1"]';
  const PERFORMANCE_SCRIPT_SRC = "mamo-quant-analysis-odds-performance.js?v=20260912-1";
  const PERFORMANCE_SCRIPT_SELECTOR = 'script[data-mamo-quant-analysis-odds-performance="1"]';
  const CAPITAL_SCRIPT_SRC = "mamo-quant-analysis-capital.js?v=20260913-3";
  const CAPITAL_SCRIPT_SELECTOR = 'script[data-mamo-quant-analysis-capital="1"]';
  const COMPARISON_SCRIPT_SRC = "mamo-quant-analysis-comparison.js?v=20260913-1";
  const COMPARISON_SCRIPT_SELECTOR = 'script[data-mamo-quant-analysis-comparison="1"]';
  const RISK_SCRIPT_SRC = "mamo-quant-analysis-risk-profile.js?v=20260913-1";
  const RISK_SCRIPT_SELECTOR = 'script[data-mamo-quant-analysis-risk-profile="1"]';
  const DATA_SCRIPT_SRC = "mamo-quant-analysis-data-foundation.js?v=20260913-1";
  const DATA_SCRIPT_SELECTOR = 'script[data-mamo-quant-analysis-data-foundation="1"]';

  function buildIntro(section) {
    const intro = document.createElement("div");
    intro.className = "page-intro";
    const copy = document.createElement("div");
    const kicker = document.createElement("span");
    kicker.className = "kicker";
    kicker.textContent = "MAMO ANALYSIS";
    const title = document.createElement("h1");
    title.textContent = "分析";
    const lead = document.createElement("p");
    lead.textContent = "資金・成績・リスクを、記録から振り返る独立分析エリアです。";
    copy.append(kicker, title, lead);
    intro.appendChild(copy);
    section.appendChild(intro);
  }

  function buildBasicSection(section) {
    const heading = document.createElement("div");
    heading.className = "section-head small";
    const headingCopy = document.createElement("div");
    const number = document.createElement("span");
    number.className = "section-number";
    number.textContent = "STEP 2";
    const title = document.createElement("h2");
    title.textContent = "基本分析";
    headingCopy.append(number, title);
    const meta = document.createElement("span");
    meta.className = "section-meta";
    meta.textContent = "読み取り専用";
    heading.append(headingCopy, meta);

    const mount = document.createElement("div");
    mount.id = "mamoQuantAnalysisBasic";
    const panel = document.createElement("div");
    panel.className = "panel";
    const panelTitle = document.createElement("h2");
    panelTitle.textContent = "基本データを読み込み中です";
    const copy = document.createElement("p");
    copy.textContent = "記録データを変更せず、現在残高・AIR BET回数・的中率・平均BETを集計します。";
    panel.append(panelTitle, copy);
    mount.appendChild(panel);

    const performanceMount = document.createElement("div");
    performanceMount.id = "mamoQuantAnalysisOddsPerformance";
    const capitalMount = document.createElement("div");
    capitalMount.id = "mamoQuantAnalysisCapital";
    const comparisonMount = document.createElement("div");
    comparisonMount.id = "mamoQuantAnalysisComparison";
    const riskMount = document.createElement("div");
    riskMount.id = "mamoQuantAnalysisRiskProfile";
    const dataMount = document.createElement("div");
    dataMount.id = "mamoQuantAnalysisDataFoundation";
    section.append(heading, mount, performanceMount, capitalMount, comparisonMount, riskMount, dataMount);
  }

  function showFailure(mountId, titleText, copyText) {
    const mount = document.getElementById(mountId);
    if (!mount) return;
    const panel = document.createElement("div");
    panel.className = "panel";
    const title = document.createElement("h2");
    title.textContent = titleText;
    const copy = document.createElement("p");
    copy.textContent = copyText;
    panel.append(title, copy);
    mount.replaceChildren(panel);
  }

  const showBasicLoadFailure = () => showFailure(
    "mamoQuantAnalysisBasic",
    "基本分析を読み込めませんでした",
    "画面を開き直しても同じ場合は、分析モジュールの配信状態を確認してください。記録データは変更されていません。"
  );
  const showPerformanceLoadFailure = () => showFailure(
    "mamoQuantAnalysisOddsPerformance",
    "オッズ帯別成績を読み込めませんでした",
    "既存の分析結果には影響ありません。画面を開き直しても同じ場合は配信状態を確認してください。"
  );
  const showCapitalLoadFailure = () => showFailure(
    "mamoQuantAnalysisCapital",
    "資金耐久分析を読み込めませんでした",
    "既存の分析結果には影響ありません。画面を開き直しても同じ場合は配信状態を確認してください。"
  );
  const showComparisonLoadFailure = () => showFailure(
    "mamoQuantAnalysisComparison",
    "比較分析を読み込めませんでした",
    "既存の分析結果には影響ありません。画面を開き直しても同じ場合は配信状態を確認してください。"
  );
  const showRiskLoadFailure = () => showFailure(
    "mamoQuantAnalysisRiskProfile",
    "実績リスク分析を読み込めませんでした",
    "既存の分析結果には影響ありません。画面を開き直しても同じ場合は配信状態を確認してください。"
  );
  const showDataLoadFailure = () => showFailure(
    "mamoQuantAnalysisDataFoundation",
    "分析データの土台を読み込めませんでした",
    "既存の分析結果には影響ありません。画面を開き直しても同じ場合は配信状態を確認してください。"
  );

  function renderDataFoundation() {
    const render = window.MAMO_QUANT_DATA_FOUNDATION?.render;
    return typeof render === "function" && render() === true;
  }

  function ensureDataFoundationModule() {
    if (renderDataFoundation()) return;
    const existing = document.querySelector(DATA_SCRIPT_SELECTOR);
    if (existing) {
      existing.addEventListener("load", () => {
        if (!renderDataFoundation()) showDataLoadFailure();
      }, { once: true });
      existing.addEventListener("error", showDataLoadFailure, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = DATA_SCRIPT_SRC;
    script.async = true;
    script.dataset.mamoQuantAnalysisDataFoundation = "1";
    script.addEventListener("load", () => {
      if (!renderDataFoundation()) showDataLoadFailure();
    }, { once: true });
    script.addEventListener("error", showDataLoadFailure, { once: true });
    document.head.appendChild(script);
  }

  function renderRiskProfile() {
    const render = window.MAMO_QUANT_RISK_PROFILE?.render;
    return typeof render === "function" && render() === true;
  }

  function ensureRiskProfileModule() {
    if (renderRiskProfile()) {
      ensureDataFoundationModule();
      return;
    }
    const existing = document.querySelector(RISK_SCRIPT_SELECTOR);
    if (existing) {
      existing.addEventListener("load", () => {
        if (!renderRiskProfile()) {
          showRiskLoadFailure();
          return;
        }
        ensureDataFoundationModule();
      }, { once: true });
      existing.addEventListener("error", showRiskLoadFailure, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = RISK_SCRIPT_SRC;
    script.async = true;
    script.dataset.mamoQuantAnalysisRiskProfile = "1";
    script.addEventListener("load", () => {
      if (!renderRiskProfile()) {
        showRiskLoadFailure();
        return;
      }
      ensureDataFoundationModule();
    }, { once: true });
    script.addEventListener("error", showRiskLoadFailure, { once: true });
    document.head.appendChild(script);
  }

  function renderComparison() {
    const render = window.MAMO_QUANT_COMPARISON?.render;
    return typeof render === "function" && render() === true;
  }

  function ensureComparisonModule() {
    if (renderComparison()) {
      ensureRiskProfileModule();
      return;
    }
    const existing = document.querySelector(COMPARISON_SCRIPT_SELECTOR);
    if (existing) {
      existing.addEventListener("load", () => {
        if (!renderComparison()) {
          showComparisonLoadFailure();
          return;
        }
        ensureRiskProfileModule();
      }, { once: true });
      existing.addEventListener("error", showComparisonLoadFailure, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = COMPARISON_SCRIPT_SRC;
    script.async = true;
    script.dataset.mamoQuantAnalysisComparison = "1";
    script.addEventListener("load", () => {
      if (!renderComparison()) {
        showComparisonLoadFailure();
        return;
      }
      ensureRiskProfileModule();
    }, { once: true });
    script.addEventListener("error", showComparisonLoadFailure, { once: true });
    document.head.appendChild(script);
  }

  function renderCapital() {
    const render = window.MAMO_QUANT_CAPITAL?.render;
    return typeof render === "function" && render() === true;
  }

  function ensureCapitalModule() {
    if (renderCapital()) {
      ensureComparisonModule();
      return;
    }
    const existing = document.querySelector(CAPITAL_SCRIPT_SELECTOR);
    if (existing) {
      existing.addEventListener("load", () => {
        if (!renderCapital()) {
          showCapitalLoadFailure();
          return;
        }
        ensureComparisonModule();
      }, { once: true });
      existing.addEventListener("error", showCapitalLoadFailure, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = CAPITAL_SCRIPT_SRC;
    script.async = true;
    script.dataset.mamoQuantAnalysisCapital = "1";
    script.addEventListener("load", () => {
      if (!renderCapital()) {
        showCapitalLoadFailure();
        return;
      }
      ensureComparisonModule();
    }, { once: true });
    script.addEventListener("error", showCapitalLoadFailure, { once: true });
    document.head.appendChild(script);
  }

  function renderPerformance() {
    const render = window.MAMO_QUANT_ODDS_PERFORMANCE?.render;
    return typeof render === "function" && render() === true;
  }

  function ensurePerformanceModule() {
    if (renderPerformance()) {
      ensureCapitalModule();
      return;
    }
    const existing = document.querySelector(PERFORMANCE_SCRIPT_SELECTOR);
    if (existing) {
      existing.addEventListener("load", () => {
        if (!renderPerformance()) {
          showPerformanceLoadFailure();
          return;
        }
        ensureCapitalModule();
      }, { once: true });
      existing.addEventListener("error", showPerformanceLoadFailure, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = PERFORMANCE_SCRIPT_SRC;
    script.async = true;
    script.dataset.mamoQuantAnalysisOddsPerformance = "1";
    script.addEventListener("load", () => {
      if (!renderPerformance()) {
        showPerformanceLoadFailure();
        return;
      }
      ensureCapitalModule();
    }, { once: true });
    script.addEventListener("error", showPerformanceLoadFailure, { once: true });
    document.head.appendChild(script);
  }

  function renderBasic() {
    const render = window.MAMO_QUANT_ANALYSIS_BASIC?.render;
    return typeof render === "function" && render() === true;
  }

  function onBasicReady() {
    if (!renderBasic()) {
      showBasicLoadFailure();
      return;
    }
    ensurePerformanceModule();
  }

  function ensureBasicModule() {
    if (renderBasic()) {
      ensurePerformanceModule();
      return;
    }
    const existing = document.querySelector(BASIC_SCRIPT_SELECTOR);
    if (existing) {
      existing.addEventListener("load", onBasicReady, { once: true });
      existing.addEventListener("error", showBasicLoadFailure, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = BASIC_SCRIPT_SRC;
    script.async = true;
    script.dataset.mamoQuantAnalysisBasic = "1";
    script.addEventListener("load", onBasicReady, { once: true });
    script.addEventListener("error", showBasicLoadFailure, { once: true });
    document.head.appendChild(script);
  }

  function ensureScreen() {
    if (document.getElementById(SCREEN_ID)) return true;
    const main = document.querySelector(".app-shell main");
    const settings = document.getElementById("settings");
    if (!main || !settings) return false;
    const section = document.createElement("section");
    section.id = SCREEN_ID;
    section.className = "screen";
    section.setAttribute("aria-label", "分析");
    buildIntro(section);
    buildBasicSection(section);
    main.insertBefore(section, settings);
    return true;
  }

  function ensureNavigation() {
    if (document.getElementById(NAV_ID)) return true;
    const nav = document.querySelector(".bottom-nav");
    const settingsNav = document.getElementById("nav-settings");
    if (!nav || !settingsNav) return false;
    const button = document.createElement("button");
    button.id = NAV_ID;
    button.className = "nav";
    button.type = "button";
    button.setAttribute("aria-label", "分析を開く");
    const icon = document.createElement("b");
    icon.textContent = "▥";
    const label = document.createElement("span");
    label.textContent = "分析";
    button.append(icon, label);
    button.addEventListener("click", () => {
      window.go?.(SCREEN_ID);
      ensureBasicModule();
    });
    const shopNav = document.getElementById("nav-shop");
    nav.insertBefore(button, shopNav || settingsNav);
    return true;
  }

  function boot() {
    if (!ensureScreen()) return;
    ensureNavigation();
    ensureBasicModule();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();