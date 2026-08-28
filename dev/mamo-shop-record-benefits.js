/* MAMO BOAT SHOP x MAMO RECORD — actionable benefits pilot */
(() => {
  "use strict";
  if (window.__MAMO_SHOP_RECORD_BENEFITS_V3__) return;
  window.__MAMO_SHOP_RECORD_BENEFITS_V3__ = true;

  const RECORD_KEY = "mamoboat_record_v1";
  const APP_KEY = "mamoboat_v40_personal";
  const BENEFIT_KEY = "mamoboat_record_benefits_v2";
  const TRIAL_DAYS = 7;
  const BENEFITS = [
    { id: "special-analysis", need: 100, title: "特別分析 1回", desc: "あなたの直近記録を、MAMO編集部が1枚に整理。", icon: "分析" },
    { id: "gold-trial", need: 300, title: "GOLD分析 7日体験", desc: "朝刊・週間・月刊などGOLD体験を7日間解放。", icon: "7D" },
    { id: "shop-guide", need: 500, title: "SHOP選び方ガイド", desc: "クーポン確認から商品条件の確認まで、順番に案内。", icon: "選" },
  ];

  const readJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch (_) { return fallback; }
  };
  const writeJson = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  };
  const record = () => readJson(RECORD_KEY, {}) || {};
  const balance = () => Math.max(0, Number(record().balance) || 0);
  const appState = () => readJson(APP_KEY, {}) || {};
  const remain = (end) => Math.max(0, Math.ceil((new Date(end) - Date.now()) / 86400000));

  function benefitState() {
    const state = readJson(BENEFIT_KEY, { claims: {}, trial: null, guide: null }) || {};
    state.claims = state.claims || {};
    if (!state.claims["shop-guide"] && state.claims["shop-coupon"]) {
      state.claims["shop-guide"] = state.claims["shop-coupon"];
      state.guide = state.guide || { label: "楽天公式クーポンから確認" };
      delete state.coupon;
      writeJson(BENEFIT_KEY, state);
    }
    return state;
  }

  function syncTrial() {
    const state = benefitState();
    const trial = state.trial;
    if (!trial?.active || new Date(trial.endsAt) > Date.now()) return;
    const app = appState();
    app.pressroom = app.pressroom || {};
    if (app.pressroom.plan === "gold" && trial.previousPlan) app.pressroom.plan = trial.previousPlan;
    trial.active = false;
    writeJson(APP_KEY, app);
    writeJson(BENEFIT_KEY, state);
  }

  function installStyle() {
    if (document.getElementById("mamoShopRecordBenefitStyleV3")) return;
    const style = document.createElement("style");
    style.id = "mamoShopRecordBenefitStyleV3";
    style.textContent = `
      #mamoShopRecordBenefits{margin:12px 10px 18px;border:1px solid #d3dee7;border-top:5px solid #082b4a;border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 7px 18px rgba(8,43,74,.07)}
      .msrb-head{display:flex;justify-content:space-between;gap:10px;padding:14px}
      .msrb-head small{color:#b11922;font-size:8px;font-weight:1000;letter-spacing:.14em}
      .msrb-head h3{margin:3px 0;color:#082b4a;font-size:18px}
      .msrb-balance{font-size:25px;color:#b11922}
      .msrb-progress{padding:0 14px 12px;color:#63798a;font-size:9px}
      .msrb-bar{height:8px;background:#e3eaf0;border-radius:9px;overflow:hidden}
      .msrb-bar i{display:block;height:100%;background:#dc2029}
      .msrb-list{display:grid;gap:8px;padding:0 12px 13px}
      .msrb-item{display:grid;grid-template-columns:40px 1fr auto;gap:9px;align-items:center;padding:11px;border:1px solid #e2e7e9;border-radius:12px;background:#fff}
      .msrb-item.locked{opacity:.55}
      .msrb-item.unlocked{border-color:#e7a7ac;background:#fff7f8}
      .msrb-item .ico{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:#082b4a;color:#fff;font-size:10px;font-weight:1000}
      .msrb-copy b{display:block;color:#082b4a;font-size:12px}
      .msrb-copy span{display:block;margin-top:3px;color:#73828a;font-size:9px}
      .msrb-copy em{display:block;margin-top:4px;color:#b11922;font-size:8px;font-style:normal}
      .msrb-action{border:0;border-radius:9px;background:#082b4a;color:#fff;padding:9px 10px;font-size:9px;font-weight:1000}
      .msrb-action[disabled]{background:#d8dddf;color:#7a878d}
      .msrb-guide{margin-top:5px;padding:7px 9px;border:1px dashed #dc2029;border-radius:8px;background:#fff1f2;color:#941821;font-size:9px;font-weight:1000}
      .msrb-note{padding:9px 13px;background:#082b4a;color:#dbe7eb;font-size:8px;line-height:1.6}
      #mamoSpecialAnalysis{margin:12px 0;padding:14px;border:1px solid #e7a7ac;border-left:5px solid #dc2029;border-radius:13px;background:#fff7f8}
      .msa-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
      .msa-grid div{padding:9px;border:1px solid #e6e8e8;border-radius:9px;background:#fff}
      .msa-grid span{font-size:8px;color:#7b898f}
      .msa-grid b{display:block;font-size:15px}
      .msa-note{font-size:10px;line-height:1.65}
    `;
    document.head.appendChild(style);
  }

  function analysisData() {
    const current = record();
    const pre = Object.values(current.reflections || {});
    const post = Object.values(current.postReflections || {});
    const skipped = Object.values(current.skipReflections || {});
    const average = (list, key) => list.length ? list.reduce((sum, item) => sum + (+item?.[key] || 0), 0) / list.length : 0;
    const emotions = {};
    post.forEach((item) => { emotions[item?.emotion || "unknown"] = (emotions[item?.emotion || "unknown"] || 0) + 1; });
    const top = Object.entries(emotions).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    const labels = { satisfied: "納得した", frustrated: "悔しい", chase: "取り返したい", neutral: "特になし", "—": "—" };
    return { count: pre.length, urge: average(pre, "cashUrge"), conviction: average(pre, "conviction"), skip: skipped.length, top: labels[top] || top };
  }

  function renderSpecial() {
    const state = benefitState();
    let box = document.getElementById("mamoSpecialAnalysis");
    if (!state.claims["special-analysis"]) { box?.remove(); return; }
    const host = document.getElementById("mamoAiSafeReport") || document.getElementById("analysisCards") || document.getElementById("analysis");
    if (!host) return;
    if (!box) {
      box = document.createElement("section");
      box.id = "mamoSpecialAnalysis";
      host.insertAdjacentElement("afterend", box);
    }
    const data = analysisData();
    box.innerHTML = `<small>100R BENEFIT / SPECIAL REPORT</small><h3>あなたのRECORD特別分析</h3><div class="msa-grid"><div><span>心理記録</span><b>${data.count}件</b></div><div><span>現金衝動 平均</span><b>${data.urge ? data.urge.toFixed(1) : "—"}/5</b></div><div><span>納得度 平均</span><b>${data.conviction ? data.conviction.toFixed(1) : "—"}/5</b></div></div><p class="msa-note">結果後の最多感情：<b>${data.top}</b> / 見送り記録：<b>${data.skip}件</b></p>`;
  }

  function unlockSpecial() {
    if (balance() < 100) return;
    const state = benefitState();
    state.claims["special-analysis"] = { claimedAt: new Date().toISOString() };
    writeJson(BENEFIT_KEY, state);
    render();
    renderSpecial();
    window.go?.("analysis");
    setTimeout(() => document.getElementById("mamoSpecialAnalysis")?.scrollIntoView({ block: "center" }), 180);
  }

  function startTrial() {
    if (balance() < 300) return;
    const state = benefitState();
    if (state.trial?.active && new Date(state.trial.endsAt) > Date.now()) return;
    const app = appState();
    app.pressroom = app.pressroom || {};
    const previousPlan = app.pressroom.plan || "free";
    const now = Date.now();
    const endsAt = new Date(now + TRIAL_DAYS * 86400000).toISOString();
    state.claims["gold-trial"] = { claimedAt: new Date(now).toISOString() };
    state.trial = { active: true, startedAt: new Date(now).toISOString(), endsAt, previousPlan };
    app.pressroom.plan = "gold";
    app.pressroom.mamoRecordTrialEndsAt = endsAt;
    writeJson(BENEFIT_KEY, state);
    writeJson(APP_KEY, app);
    location.reload();
  }

  function openShopGuide() {
    if (balance() < 500) return;
    const state = benefitState();
    state.claims["shop-guide"] = state.claims["shop-guide"] || { claimedAt: new Date().toISOString() };
    state.guide = { label: "楽天公式クーポンから確認" };
    delete state.coupon;
    writeJson(BENEFIT_KEY, state);
    render();
    document.getElementById("mamoRakutenCoupons")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function actionMarkup(item, currentBalance, state) {
    if (currentBalance < item.need) return `<button class="msrb-action" disabled>${item.need}R</button>`;
    if (item.id === "special-analysis") return `<button class="msrb-action" data-benefit-action="special">${state.claims[item.id] ? "分析を見る" : "分析を解放"}</button>`;
    if (item.id === "gold-trial") {
      const active = state.trial?.active && new Date(state.trial.endsAt) > Date.now();
      return `<button class="msrb-action" data-benefit-action="trial">${active ? `あと${remain(state.trial.endsAt)}日` : state.claims[item.id] ? "体験済み" : "7日体験開始"}</button>`;
    }
    return `<button class="msrb-action" data-benefit-action="guide">${state.claims[item.id] ? "ガイドを見る" : "ガイド解放"}</button>`;
  }

  function render() {
    syncTrial();
    const shop = document.getElementById("shop");
    if (!shop) return;
    const grid = document.getElementById("shopGrid");
    let box = document.getElementById("mamoShopRecordBenefits");
    if (!box) {
      box = document.createElement("section");
      box.id = "mamoShopRecordBenefits";
    }
    if (grid && box.previousElementSibling !== grid) grid.insertAdjacentElement("afterend", box);
    else if (!grid && !box.isConnected) shop.appendChild(box);

    const currentBalance = balance();
    const state = benefitState();
    const next = BENEFITS.find((item) => currentBalance < item.need);
    const previous = [0, 100, 300, 500].filter((amount) => amount <= currentBalance).pop() || 0;
    const target = next?.need || 500;
    const progress = next ? Math.max(0, Math.min(100, ((currentBalance - previous) / (target - previous)) * 100)) : 100;
    const renderKey = JSON.stringify({ currentBalance, claims: Object.keys(state.claims).sort(), trial: state.trial?.endsAt || "", guide: Boolean(state.guide) });
    if (box.dataset.renderKey === renderKey) { renderSpecial(); return; }
    box.dataset.renderKey = renderKey;
    box.innerHTML = `<div class="msrb-head"><div><small>MAMO RECORD BENEFIT</small><h3>商品案内の最後に、会員特典。</h3></div><strong class="msrb-balance">${currentBalance.toLocaleString()}R</strong></div><div class="msrb-progress"><p>${next ? `あと ${next.need - currentBalance}R で「${next.title}」解放` : "3つのPILOT特典を解放できます"}</p><div class="msrb-bar"><i style="width:${progress}%"></i></div></div><div class="msrb-list">${BENEFITS.map((item) => { const unlocked = currentBalance >= item.need; return `<article class="msrb-item ${unlocked ? "unlocked" : "locked"}"><i class="ico">${unlocked ? "✓" : item.icon}</i><div class="msrb-copy"><b>${item.title}</b><span>${item.desc}</span><em>${unlocked ? "UNLOCKED" : `${item.need}Rで解放`}</em>${item.id === "shop-guide" && state.guide ? `<div class="msrb-guide">${state.guide.label}</div>` : ""}</div>${actionMarkup(item, currentBalance, state)}</article>`; }).join("")}</div><div class="msrb-note">RECORDは消費しません。楽天の割引額・対象条件は、上の公式クーポン案内から確認してください。</div>`;
    renderSpecial();
  }

  function handleClick(event) {
    const action = event.target.closest?.("[data-benefit-action]");
    if (!action) return;
    if (action.dataset.benefitAction === "special") unlockSpecial();
    else if (action.dataset.benefitAction === "trial") startTrial();
    else openShopGuide();
  }

  function boot() {
    installStyle();
    syncTrial();
    render();
    renderSpecial();
    document.addEventListener("click", handleClick);
    setInterval(() => { if (document.getElementById("shop")) render(); }, 2500);
    window.addEventListener("pageshow", () => { render(); renderSpecial(); });
    window.addEventListener("mamo:analysis-rendered", renderSpecial);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
