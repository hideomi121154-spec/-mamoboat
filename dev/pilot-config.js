/*
 * MAMO BOAT パイロット設定
 * GitHub Pagesでは受信サーバーを持てないため、中央集計はSupabaseへ送信します。
 */
window.MAMOBOAT_PILOT = Object.freeze({
  studyId: "mamoboat-pilot-v1",
  collector: Object.freeze({
    enabled: true,
    transport: "rpc",
    endpoint: "https://mihicuoijitluvrufsoj.supabase.co/rest/v1/rpc/ingest_pilot_events",
    publishableKey: "sb_publishable_cexgWfIKzthZ1d6tLOH3_g_sWgcunHB",
  }),
  rewards: Object.freeze([]),
});

const MAMO_PLAN_STATE_KEY = "mamoboat_v40_personal";
const MAMO_PLAN_ALIASES = Object.freeze({ ume: "bronze", take: "silver", matsu: "gold" });
const MAMO_PLAN_KEYS = Object.freeze(["free", "bronze", "silver", "gold"]);

function readMamoPlan() {
  try {
    const stored = JSON.parse(localStorage.getItem(MAMO_PLAN_STATE_KEY) || "{}");
    const raw = stored?.pressroom?.plan;
    if (MAMO_PLAN_KEYS.includes(raw)) return raw;
    return MAMO_PLAN_ALIASES[raw] || "free";
  } catch (_) {
    return "free";
  }
}

function syncMamoPlanMarker() {
  if (!document.body) return;
  document.body.dataset.mamoPlan = readMamoPlan();
}

function installMamoPlanTierStyles() {
  if (document.getElementById("mamoPlanTierStyles")) return;
  const style = document.createElement("style");
  style.id = "mamoPlanTierStyles";
  style.textContent = `
    /* Keep the pressroom visually ordered by value: FREE → BRONZE → SILVER → GOLD. */
    #analysis.active {
      display: flex;
      flex-direction: column;
    }
    #analysis.active > * {
      order: 45;
      min-width: 0;
    }
    #analysis.active > .analysis-intro { order: 0; }
    #analysis.active > .section-head:has(+ .newsroom-cast) { order: 10; }
    #analysis.active > .newsroom-cast { order: 11; }

    /* FREE */
    #analysis.active > .section-head:has(+ #analysisCards) { order: 20; }
    #analysis.active > #analysisCards { order: 21; }
    #analysis.active > .section-head:has(+ #analysisList) { order: 22; }
    #analysis.active > #analysisList { order: 23; }

    /* BRONZE */
    #analysis.active > #mamoAiSafeReport { order: 30; }

    /* SILVER */
    #analysis.active > #mamoDecisionPanel { order: 40; }
    #analysis.active > #mamoBaselinePanel { order: 41; }
    #analysis.active > #mamoTriggerPanel { order: 42; }
    #analysis.active > #mamoPeriodTriggerSummary { order: 43; }

    /* GOLD */
    #analysis.active > .section-head:has(+ .paper-tabs) { order: 50; }
    #analysis.active > .paper-tabs { order: 51; }
    #analysis.active > #pressPaper { order: 52; }
    #analysis.active > #mamoPressIntel { order: 53; }

    /* Subscription choice always comes last. */
    #analysis.active > .section-head:has(+ #membershipPanel) { order: 60; }
    #analysis.active > #membershipPanel { order: 61; }
    #analysis.active > .analysis-tools { order: 62; }

    #mamoAiSafeReport { --mamo-plan-title: "前の自分との比較"; --mamo-tier-frame-height: 176px; }
    #mamoDecisionPanel { --mamo-plan-title: "勝負の選び方"; --mamo-tier-frame-height: 176px; }
    #mamoBaselinePanel { --mamo-plan-title: "個人ベースライン"; --mamo-tier-frame-height: 176px; }
    #mamoTriggerPanel { --mamo-plan-title: "あなたの勝負トリガー"; --mamo-tier-frame-height: 176px; }
    #mamoPeriodTriggerSummary { --mamo-plan-title: "週間分析"; --mamo-tier-frame-height: 176px; }
    #pressPaper { --mamo-plan-title: "あなた専用の新聞"; --mamo-tier-frame-height: 220px; }
    #mamoPressIntel { --mamo-plan-title: "編集部の深掘り分析"; --mamo-tier-frame-height: 200px; }
    #homePressTeaser { --mamo-plan-title: "MAMO BOAT PRESS"; --mamo-tier-frame-height: 112px; }

    #mamoAiSafeReport,
    #mamoDecisionPanel,
    #mamoBaselinePanel,
    #mamoTriggerPanel,
    #mamoPeriodTriggerSummary,
    #pressPaper,
    #mamoPressIntel,
    #homePressTeaser {
      height: var(--mamo-tier-frame-height) !important;
      max-height: var(--mamo-tier-frame-height) !important;
      box-sizing: border-box;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }

    body[data-mamo-plan="free"] #mamoAiSafeReport {
      --mamo-plan-lock: "BRONZEで開放";
    }

    body[data-mamo-plan="free"] #mamoDecisionPanel,
    body[data-mamo-plan="free"] #mamoBaselinePanel,
    body[data-mamo-plan="free"] #mamoTriggerPanel,
    body[data-mamo-plan="free"] #mamoPeriodTriggerSummary,
    body[data-mamo-plan="bronze"] #mamoDecisionPanel,
    body[data-mamo-plan="bronze"] #mamoBaselinePanel,
    body[data-mamo-plan="bronze"] #mamoTriggerPanel,
    body[data-mamo-plan="bronze"] #mamoPeriodTriggerSummary {
      --mamo-plan-lock: "SILVERで開放";
    }

    body:not([data-mamo-plan="gold"]) #pressPaper,
    body:not([data-mamo-plan="gold"]) #mamoPressIntel,
    body:not([data-mamo-plan="gold"]) #homePressTeaser {
      --mamo-plan-lock: "GOLDで開放";
    }

    body[data-mamo-plan="free"] #mamoAiSafeReport,
    body[data-mamo-plan="free"] #mamoDecisionPanel,
    body[data-mamo-plan="free"] #mamoBaselinePanel,
    body[data-mamo-plan="free"] #mamoTriggerPanel,
    body[data-mamo-plan="free"] #mamoPeriodTriggerSummary,
    body[data-mamo-plan="bronze"] #mamoDecisionPanel,
    body[data-mamo-plan="bronze"] #mamoBaselinePanel,
    body[data-mamo-plan="bronze"] #mamoTriggerPanel,
    body[data-mamo-plan="bronze"] #mamoPeriodTriggerSummary,
    body:not([data-mamo-plan="gold"]) #pressPaper,
    body:not([data-mamo-plan="gold"]) #mamoPressIntel,
    body:not([data-mamo-plan="gold"]) #homePressTeaser {
      position: relative !important;
      isolation: isolate;
      overflow: hidden !important;
      pointer-events: none;
      color: transparent !important;
      text-shadow: none !important;
    }

    body[data-mamo-plan="free"] #mamoAiSafeReport > *,
    body[data-mamo-plan="free"] #mamoDecisionPanel > *,
    body[data-mamo-plan="free"] #mamoBaselinePanel > *,
    body[data-mamo-plan="free"] #mamoTriggerPanel > *,
    body[data-mamo-plan="free"] #mamoPeriodTriggerSummary > *,
    body[data-mamo-plan="bronze"] #mamoDecisionPanel > *,
    body[data-mamo-plan="bronze"] #mamoBaselinePanel > *,
    body[data-mamo-plan="bronze"] #mamoTriggerPanel > *,
    body[data-mamo-plan="bronze"] #mamoPeriodTriggerSummary > *,
    body:not([data-mamo-plan="gold"]) #pressPaper > *,
    body:not([data-mamo-plan="gold"]) #mamoPressIntel > *,
    body:not([data-mamo-plan="gold"]) #homePressTeaser > * {
      visibility: hidden !important;
    }

    body[data-mamo-plan="free"] #mamoAiSafeReport::before,
    body[data-mamo-plan="free"] #mamoDecisionPanel::before,
    body[data-mamo-plan="free"] #mamoBaselinePanel::before,
    body[data-mamo-plan="free"] #mamoTriggerPanel::before,
    body[data-mamo-plan="free"] #mamoPeriodTriggerSummary::before,
    body[data-mamo-plan="bronze"] #mamoDecisionPanel::before,
    body[data-mamo-plan="bronze"] #mamoBaselinePanel::before,
    body[data-mamo-plan="bronze"] #mamoTriggerPanel::before,
    body[data-mamo-plan="bronze"] #mamoPeriodTriggerSummary::before,
    body:not([data-mamo-plan="gold"]) #pressPaper::before,
    body:not([data-mamo-plan="gold"]) #mamoPressIntel::before,
    body:not([data-mamo-plan="gold"]) #homePressTeaser::before {
      content: "🔒  " var(--mamo-plan-title);
      position: absolute;
      z-index: 21;
      left: 18px;
      right: 18px;
      top: 24px;
      color: var(--navy, #071b2b);
      font-size: clamp(18px, 4.8vw, 25px);
      line-height: 1.35;
      font-weight: 1000;
      letter-spacing: -0.02em;
      text-align: left;
      white-space: normal;
    }

    body[data-mamo-plan="free"] #mamoAiSafeReport::after,
    body[data-mamo-plan="free"] #mamoDecisionPanel::after,
    body[data-mamo-plan="free"] #mamoBaselinePanel::after,
    body[data-mamo-plan="free"] #mamoTriggerPanel::after,
    body[data-mamo-plan="free"] #mamoPeriodTriggerSummary::after,
    body[data-mamo-plan="bronze"] #mamoDecisionPanel::after,
    body[data-mamo-plan="bronze"] #mamoBaselinePanel::after,
    body[data-mamo-plan="bronze"] #mamoTriggerPanel::after,
    body[data-mamo-plan="bronze"] #mamoPeriodTriggerSummary::after,
    body:not([data-mamo-plan="gold"]) #pressPaper::after,
    body:not([data-mamo-plan="gold"]) #mamoPressIntel::after,
    body:not([data-mamo-plan="gold"]) #homePressTeaser::after {
      content: var(--mamo-plan-lock);
      position: absolute;
      z-index: 21;
      left: 18px;
      top: 76px;
      padding: 5px 10px;
      border: 1px solid rgba(7, 27, 43, 0.16);
      border-radius: 999px;
      background: #fffdf7;
      color: #765615;
      box-shadow: 0 4px 12px rgba(7, 27, 43, 0.06);
      font-size: 10px;
      line-height: 1.4;
      font-weight: 900;
      letter-spacing: 0.04em;
      text-align: left;
      white-space: nowrap;
    }

    body:not([data-mamo-plan="gold"]) .paper-tabs button {
      pointer-events: none;
      opacity: 0.62;
    }
  `;
  document.head.appendChild(style);
}

function bootMamoPlanTierUI() {
  installMamoPlanTierStyles();
  syncMamoPlanMarker();

  document.addEventListener("click", (event) => {
    const target = event.target?.closest?.("[data-pilot-plan], .plan-option");
    if (!target) return;
    Promise.resolve().then(syncMamoPlanMarker);
  }, false);

  window.addEventListener("mamo:analysis-rendered", syncMamoPlanMarker);
  window.addEventListener("pageshow", syncMamoPlanMarker);
  window.addEventListener("storage", (event) => {
    if (event.key === MAMO_PLAN_STATE_KEY) syncMamoPlanMarker();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootMamoPlanTierUI, { once: true });
} else {
  bootMamoPlanTierUI();
}

function loadMamoModule([src,key]) {
  if (document.querySelector(`script[data-mamo-module="${key}"]`)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s=document.createElement("script");
    s.src=src;
    s.async=true;
    s.dataset.mamoModule=key;
    s.onload=()=>resolve(true);
    s.onerror=()=>resolve(false);
    document.head.appendChild(s);
  });
}

window.MAMO_RELEASE_SYNC_GATE = () => {
  document.documentElement.classList.remove("mamo-sync-booting");
  document.getElementById("mamoSyncBootGate")?.remove();
};
window.MAMO_RELEASE_SYNC_GATE();

window.MAMO_SYNC_READY = loadMamoModule(["device-sync.js?v=20260817-9","device-sync"])
  .then(()=>window.MAMO_DEVICE_SYNC_READY || true)
  .catch(()=>false);

const MAMO_SCRIPTS = [
  ["decision-event-schema.js?v=20260819-1","decision-event-schema"],
  ["decision-event-collector.js?v=20260819-1","decision-event-collector"],
  ["decision-event-api-compat.js?v=20260822-1","decision-event-api-compat"],
  ["decision-transition-model.js?v=20260819-2","decision-transition-model"],
  ["intervention-history.js?v=20260819-1","intervention-history"],
  ["baseline-intervention.js?v=20260819-1","baseline-intervention"],
  ["ai-safe.js?v=20260818-3","ai-safe"],
  ["period-trigger-summary.js?v=20260818-3","period-trigger-summary"],
  ["official-link.js?v=20260816-1","official-link"],
  ["decision-intelligence.js?v=20260818-3","decision-intel"],
  ["baseline-intelligence.js?v=20260818-3","baseline-intel"],
  ["decision-state-score.js?v=20260819-1","decision-state-score"],
  ["trigger-intelligence.js?v=20260818-3","trigger-intel"],
  ["behavior-pattern-profile.js?v=20260819-1","behavior-pattern-profile"],
  ["compound-pattern-intelligence.js?v=20260819-1","compound-pattern-intel"],
  ["compound-pattern-realtime.js?v=20260819-1","compound-pattern-realtime"],
  ["press-intelligence.js?v=20260818-3","press-intel"],
  ["morning-insight-bridge.js?v=20260818-3","morning-insight-bridge"],
  ["morning-intervention-insight.js?v=20260819-1","morning-intervention-insight"],
  ["period-intervention-insight.js?v=20260819-1","period-intervention-insight"],
  // Plan selection is owned by app.js. Do not load plan wrappers or scroll fixes.
  ["visual-refresh.js?v=20260816-2","visual-refresh"],
  ["race-layout-refresh.js?v=20260816-2","race-layout-refresh"],
  ["air-outcome-experience.js?v=20260817-2","air-outcome"],
  ["morning-delivery.js?v=20260818-1","morning-delivery"],
  ["push-notifications.js?v=20260818-1","push-notifications"],
  ["sw-refresh.js?v=20260822-25","sw-refresh"],
];

async function loadMamoEnhancements() {
  for (const item of MAMO_SCRIPTS) {
    await loadMamoModule(item);
    await new Promise((resolve)=>setTimeout(resolve,0));
  }
}

function scheduleMamoEnhancements() {
  const start=()=>{
    if ("requestIdleCallback" in window) requestIdleCallback(()=>loadMamoEnhancements(),{timeout:1800});
    else setTimeout(()=>loadMamoEnhancements(),700);
  };
  if (document.readyState==="complete") start();
  else window.addEventListener("load",start,{once:true});
}

scheduleMamoEnhancements();
