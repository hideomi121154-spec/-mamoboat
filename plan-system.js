/* MAMO BOAT Plan System v1 — 4-tier product architecture. PILOT keeps every feature open. */
(() => {
  "use strict";
  if (window.__MAMO_PLAN_SYSTEM_V1__) return;
  window.__MAMO_PLAN_SYSTEM_V1__ = true;

  const PLAN_KEY = "mamoboat_plan_preview_v1";
  const PILOT_ALL_OPEN = true;

  const PLANS = Object.freeze({
    free: Object.freeze({
      id: "free", order: 0, name: "FREE", price: 0,
      tagline: "まず、自分の勝負を見えるように。",
      features: ["score", "air_total", "air_count", "air_average", "short_note"],
      bullets: ["MAMO SCORE", "AIR BET総額・回数・平均", "今日の短い振り返り"],
    }),
    light: Object.freeze({
      id: "light", order: 1, name: "LIGHT", price: 300,
      tagline: "いつ、どれくらい勝負しているか。",
      features: ["score", "air_total", "air_count", "air_average", "short_note", "period_compare", "time_pattern", "hundred_rate", "basic_chart"],
      bullets: ["FREEの全機能", "前期間との比較", "時間帯・100B率", "ベーシックグラフ"],
    }),
    standard: Object.freeze({
      id: "standard", order: 2, name: "STANDARD", price: 500,
      tagline: "勝負が動く条件まで読む。",
      features: ["score", "air_total", "air_count", "air_average", "short_note", "period_compare", "time_pattern", "hundred_rate", "basic_chart", "behavior_indices", "trigger_analysis", "weekly_report", "personal_baseline"],
      bullets: ["LIGHTの全機能", "行動指数", "勝負トリガー分析", "個人ベースライン", "週間レポート"],
      recommended: true,
    }),
    premium: Object.freeze({
      id: "premium", order: 3, name: "PREMIUM", price: 1000,
      tagline: "あなた専属の編集部を持つ。",
      features: ["score", "air_total", "air_count", "air_average", "short_note", "period_compare", "time_pattern", "hundred_rate", "basic_chart", "behavior_indices", "trigger_analysis", "weekly_report", "personal_baseline", "morning_paper", "monthly_report", "deep_reason", "long_term_trend", "editorial_insight"],
      bullets: ["STANDARDの全機能", "MAMO朝刊", "週間・月刊の深掘り", "理由・長期トレンド分析", "加音 守の個人記事"],
    }),
  });

  const FEATURE_MIN = Object.freeze({
    score: "free", air_total: "free", air_count: "free", air_average: "free", short_note: "free",
    period_compare: "light", time_pattern: "light", hundred_rate: "light", basic_chart: "light",
    behavior_indices: "standard", trigger_analysis: "standard", weekly_report: "standard", personal_baseline: "standard",
    morning_paper: "premium", monthly_report: "premium", deep_reason: "premium", long_term_trend: "premium", editorial_insight: "premium",
  });

  const esc = (v) => String(v ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

  function selectedPlan() {
    try {
      const id = localStorage.getItem(PLAN_KEY) || "premium";
      return PLANS[id] || PLANS.premium;
    } catch (_) { return PLANS.premium; }
  }

  function can(feature, planId = selectedPlan().id) {
    if (PILOT_ALL_OPEN) return true;
    const needed = PLANS[FEATURE_MIN[feature] || "premium"];
    const current = PLANS[planId] || PLANS.free;
    return current.order >= needed.order;
  }

  function setPreview(id) {
    if (!PLANS[id]) return;
    try { localStorage.setItem(PLAN_KEY, id); } catch (_) {}
    document.documentElement.dataset.mamoPlan = id;
    render();
  }

  window.MAMO_PLAN = Object.freeze({
    plans: PLANS,
    featureMinimum: FEATURE_MIN,
    pilotAllOpen: PILOT_ALL_OPEN,
    current: () => selectedPlan(),
    can,
    setPreview,
  });

  function planCard(plan) {
    const active = selectedPlan().id === plan.id;
    return `<article class="mamo-plan-card ${plan.recommended ? "recommended" : ""} ${active ? "active" : ""}">
      ${plan.recommended ? '<span class="mamo-plan-ribbon">おすすめ</span>' : ""}
      <div class="mamo-plan-head"><div><small>${esc(plan.name)}</small><h3>${plan.price ? `${plan.price.toLocaleString("ja-JP")}円` : "無料"}<em>${plan.price ? "/月" : ""}</em></h3></div>${active ? '<b>PREVIEW</b>' : ""}</div>
      <p>${esc(plan.tagline)}</p>
      <ul>${plan.bullets.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <button type="button" data-plan-preview="${plan.id}">${active ? "この表示を確認中" : "このプランをプレビュー"}</button>
    </article>`;
  }

  function tagPanel(id, label, tier) {
    const el = document.getElementById(id);
    if (!el) return;
    el.dataset.planTier = tier;
    if (el.querySelector(":scope > .mamo-tier-tag")) return;
    const tag = document.createElement("span");
    tag.className = "mamo-tier-tag";
    tag.textContent = `${label} / ${PLANS[tier].name}+`;
    el.prepend(tag);
  }

  function applyTierTags() {
    tagPanel("mamoAiSafeReport", "PERIOD", "light");
    tagPanel("mamoBaselinePanel", "BASELINE", "standard");
    tagPanel("mamoTriggerPanel", "TRIGGER", "standard");
    tagPanel("mamoPeriodTriggerSummary", "TRIGGER", "standard");
    tagPanel("mamoPressIntel", "PRESS", "premium");
    tagPanel("mamoMorningInsightBridge", "MORNING", "premium");
  }

  function render() {
    document.documentElement.dataset.mamoPlan = selectedPlan().id;
    const panel = document.getElementById("membershipPanel");
    if (panel) {
      panel.innerHTML = `
        <div class="mamo-plan-intro">
          <div><span>MEMBERSHIP / PRODUCT PREVIEW</span><h3>自分を知る深さで選ぶ。</h3></div>
          <b>PILOT<br>ALL OPEN</b>
        </div>
        <p class="mamo-plan-copy">現在は検証版のため、選択プランに関係なく全分析を表示します。本番では同じデータを裏で記録し、見える分析の深さだけを4段階に分けます。</p>
        <div class="mamo-plan-grid">${Object.values(PLANS).map(planCard).join("")}</div>
        <div class="mamo-plan-policy"><strong>設計原則</strong><span>無料でも役に立つ。有料になるほど「機能数」ではなく「自分を理解する解像度」が上がる。</span></div>`;
      panel.querySelectorAll("[data-plan-preview]").forEach((btn) => {
        btn.addEventListener("click", () => setPreview(btn.dataset.planPreview));
      });
    }
    const badge = document.getElementById("pressPlanBadge");
    if (badge) badge.textContent = "PILOT / ALL OPEN";
    applyTierTags();
  }

  function styles() {
    if (document.getElementById("mamoPlanSystemStyle")) return;
    const s = document.createElement("style");
    s.id = "mamoPlanSystemStyle";
    s.textContent = `
      .membership-panel{background:#071b2b!important;color:#f8f4e8!important;border:1px solid rgba(204,174,102,.45)!important;padding:14px!important;box-shadow:0 10px 28px rgba(7,27,43,.18)!important}
      .mamo-plan-intro{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid rgba(204,174,102,.38);padding-bottom:11px}.mamo-plan-intro span{font-size:8px;letter-spacing:.15em;font-weight:1000;color:#cdb275}.mamo-plan-intro h3{margin:4px 0 0;font-size:21px;color:#fff}.mamo-plan-intro>b{text-align:right;font-size:9px;line-height:1.35;color:#071b2b;background:#d8bd78;padding:6px 8px;letter-spacing:.08em}
      .mamo-plan-copy{font-size:10px;line-height:1.7;color:#bdc8cc;margin:11px 0 13px}.mamo-plan-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.mamo-plan-card{position:relative;background:#0d293e;border:1px solid rgba(255,255,255,.12);padding:11px;min-width:0}.mamo-plan-card.active{border-color:#d8bd78;box-shadow:inset 0 0 0 1px #d8bd78}.mamo-plan-card.recommended{background:#102f43}.mamo-plan-ribbon{position:absolute;right:7px;top:7px;background:#d8bd78;color:#071b2b;font-size:7px;font-weight:1000;padding:3px 5px}.mamo-plan-head{display:flex;justify-content:space-between;gap:6px}.mamo-plan-head small{font-size:8px;letter-spacing:.12em;color:#cdb275;font-weight:1000}.mamo-plan-head h3{margin:3px 0;font-size:20px;color:#fff}.mamo-plan-head h3 em{font-size:8px;font-style:normal;color:#8fa2aa}.mamo-plan-head>b{font-size:7px;color:#d8bd78}.mamo-plan-card>p{min-height:30px;font-size:9px;line-height:1.5;color:#b9c5ca}.mamo-plan-card ul{margin:9px 0;padding:0;list-style:none}.mamo-plan-card li{font-size:8px;line-height:1.55;padding:2px 0;color:#edf0ef}.mamo-plan-card li:before{content:'◆';font-size:5px;color:#d8bd78;margin-right:5px}.mamo-plan-card button{width:100%;border:1px solid #d8bd78;background:transparent;color:#f4e7bd;padding:7px 5px;font-size:8px;font-weight:1000}.mamo-plan-card.active button{background:#d8bd78;color:#071b2b}.mamo-plan-policy{margin-top:10px;padding:9px;border-top:1px solid rgba(255,255,255,.1);display:grid;gap:3px}.mamo-plan-policy strong{font-size:8px;color:#d8bd78;letter-spacing:.1em}.mamo-plan-policy span{font-size:9px;line-height:1.55;color:#bdc8cc}
      .mamo-tier-tag{display:inline-block!important;margin:0 0 7px!important;padding:3px 6px!important;background:#071b2b!important;color:#d8bd78!important;font-size:7px!important;font-weight:1000!important;letter-spacing:.1em!important;width:auto!important}
      @media(max-width:380px){.mamo-plan-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function boot() {
    styles();
    render();
    const observer = new MutationObserver(() => applyTierTags());
    observer.observe(document.body, { childList:true, subtree:true });
    window.setInterval(() => {
      if (document.getElementById("analysis")?.classList.contains("active")) render();
    }, 5000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();