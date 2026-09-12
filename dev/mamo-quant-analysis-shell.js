/* MAMO BOAT — independent quantitative analysis shell, step 2 delivery fix.
 * Navigation + a read-only basic analysis surface.
 * The shell owns loading the basic analysis module so an older controlling
 * Service Worker cannot deliver the new shell without its matching dependency.
 * No AIR BET, wallet, records, pressroom, SHOP, or calculation state is mutated here.
 */
(() => {
  "use strict";
  if (window.__MAMO_QUANT_ANALYSIS_SHELL_V3__) return;
  window.__MAMO_QUANT_ANALYSIS_SHELL_V3__ = true;

  const SCREEN_ID = "quantAnalysis";
  const NAV_ID = "nav-quantAnalysis";
  const BASIC_SCRIPT_SRC = "mamo-quant-analysis-basic.js?v=20260912-2";
  const BASIC_SCRIPT_SELECTOR = 'script[data-mamo-quant-analysis-basic="1"]';

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

    section.append(heading, mount);
  }

  function showBasicLoadFailure() {
    const mount = document.getElementById("mamoQuantAnalysisBasic");
    if (!mount) return;
    const panel = document.createElement("div");
    panel.className = "panel";
    const title = document.createElement("h2");
    title.textContent = "基本分析を読み込めませんでした";
    const copy = document.createElement("p");
    copy.textContent = "画面を開き直しても同じ場合は、分析モジュールの配信状態を確認してください。記録データは変更されていません。";
    panel.append(title, copy);
    mount.replaceChildren(panel);
  }

  function renderBasic() {
    const render = window.MAMO_QUANT_ANALYSIS_BASIC?.render;
    if (typeof render !== "function") return false;
    return render() === true;
  }

  function ensureBasicModule() {
    if (renderBasic()) return;

    const existing = document.querySelector(BASIC_SCRIPT_SELECTOR);
    if (existing) {
      existing.addEventListener("load", () => {
        if (!renderBasic()) showBasicLoadFailure();
      }, { once: true });
      existing.addEventListener("error", showBasicLoadFailure, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = BASIC_SCRIPT_SRC;
    script.async = true;
    script.dataset.mamoQuantAnalysisBasic = "1";
    script.addEventListener("load", () => {
      if (!renderBasic()) showBasicLoadFailure();
    }, { once: true });
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
