/* MAMO BOAT — independent quantitative analysis shell, step 1.
 * Navigation + an empty analysis surface only.
 * No AIR BET, wallet, records, pressroom, SHOP, or calculation state is mutated here.
 */
(() => {
  "use strict";
  if (window.__MAMO_QUANT_ANALYSIS_SHELL_V1__) return;
  window.__MAMO_QUANT_ANALYSIS_SHELL_V1__ = true;

  const SCREEN_ID = "quantAnalysis";
  const NAV_ID = "nav-quantAnalysis";

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

  function buildPlaceholder(section) {
    const heading = document.createElement("div");
    heading.className = "section-head small";

    const headingCopy = document.createElement("div");
    const number = document.createElement("span");
    number.className = "section-number";
    number.textContent = "STEP 1";
    const title = document.createElement("h2");
    title.textContent = "分析画面の動作確認";
    headingCopy.append(number, title);

    const meta = document.createElement("span");
    meta.className = "section-meta";
    meta.textContent = "計算機能はまだ未接続";
    heading.append(headingCopy, meta);

    const panel = document.createElement("div");
    panel.className = "panel";
    const panelTitle = document.createElement("h2");
    panelTitle.textContent = "分析機能を準備中です";
    const copy = document.createElement("p");
    copy.textContent = "まずは画面遷移と下部ナビだけを確認します。既存の記録・編集部・SHOPには変更を加えていません。";
    panel.append(panelTitle, copy);

    section.append(heading, panel);
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
    buildPlaceholder(section);
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
    button.addEventListener("click", () => window.go?.(SCREEN_ID));

    const shopNav = document.getElementById("nav-shop");
    nav.insertBefore(button, shopNav || settingsNav);
    return true;
  }

  function boot() {
    if (!ensureScreen()) return;
    ensureNavigation();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
