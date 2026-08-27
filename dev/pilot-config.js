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
    /* One analysis owner: base facts → small insights → free safety → GOLD press. */
    #analysis.active {
      display: flex;
      flex-direction: column;
    }
    #analysis.active > * {
      order: 45;
      min-width: 0;
    }
    #analysis.active > .analysis-intro { order: 0; }
    #analysis.active > #mamoValueSectionHead { order: 10; }
    #analysis.active > #mamoValueEditorialSlot { order: 11; }
    #analysis.active > .section-head:has(+ #analysisCards) { order: 20; }
    #analysis.active > #analysisCards { order: 21; }
    #analysis.active > .section-head:has(+ #analysisList) { order: 22; }
    #analysis.active > #analysisList { order: 23; }
    #analysis.active > #mamoAiSafeReport { order: 30; }
    #analysis.active > .section-head:has(+ .paper-tabs) { order: 40; }
    #analysis.active > .paper-tabs { order: 41; }
    #analysis.active > #pressPaper { order: 42; }
    #analysis.active > #mamoPressIntel { order: 43; }
    #analysis.active > .section-head:has(+ #membershipPanel) { order: 60; }
    #analysis.active > #membershipPanel { order: 61; }
    #analysis.active > .analysis-tools { order: 62; }
    #analysis.active > .section-head:has(+ .newsroom-cast) { order: 90; }
    #analysis.active > .newsroom-cast { order: 91; }

    /* Safety never becomes paid or blurred. The app itself renders GOLD paper locks. */
    #mamoAiSafeReport,
    #pressPaper,
    #mamoPressIntel,
    #homePressTeaser {
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
      pointer-events: auto !important;
      color: inherit !important;
    }
    #mamoAiSafeReport > *,
    #pressPaper > *,
    #mamoPressIntel > *,
    #homePressTeaser > * {
      visibility: visible !important;
    }
    #mamoAiSafeReport::before,
    #mamoAiSafeReport::after,
    #pressPaper::before,
    #pressPaper::after,
    #mamoPressIntel::before,
    #mamoPressIntel::after,
    #homePressTeaser::before,
    #homePressTeaser::after {
      content: none !important;
    }

    /* Older parallel analysis panels still collect data but no longer duplicate the UI. */
    html.mamo-insights-v2 #mamoDecisionPanel,
    html.mamo-insights-v2 #mamoBaselinePanel,
    html.mamo-insights-v2 #mamoTriggerPanel,
    html.mamo-insights-v2 #mamoPeriodTriggerSummary,
    html.mamo-insights-v2 #mamoBehaviorPatternProfile,
    html.mamo-insights-v2 #mamoCompoundPatternPanel,
    html.mamo-insights-v2 #mamoDecisionStateScore,
    html.mamo-insights-v2 #mamoRecordEditorial,
    html.mamo-insights-v2 #goldEditorialDesk {
      display: none !important;
    }

    /* Detailed editorial articles belong to GOLD; lower tiers see the app's teaser. */
    body:not([data-mamo-plan="gold"]) #mamoPressIntel {
      display: none !important;
    }

    body:not([data-mamo-plan="gold"]) .paper-tabs button {
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

window.MAMO_SYNC_READY = loadMamoModule(["device-sync.js?v=20260827-2","device-sync"])
  .then(()=>window.MAMO_DEVICE_SYNC_READY || true)
  .catch(()=>false);

const MAMO_SCRIPTS = [
  ["decision-event-schema.js?v=20260819-1","decision-event-schema"],
  ["decision-event-collector.js?v=20260819-1","decision-event-collector"],
  ["decision-event-api-compat.js?v=20260827-1","decision-event-api-compat"],
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
  ["behavior-pattern-profile.js?v=20260823-2","behavior-pattern-profile"],
  ["compound-pattern-intelligence.js?v=20260819-1","compound-pattern-intel"],
  ["compound-pattern-realtime.js?v=20260819-1","compound-pattern-realtime"],
  ["press-intelligence.js?v=20260818-3","press-intel"],
  ["morning-insight-bridge.js?v=20260818-3","morning-insight-bridge"],
  ["morning-intervention-insight.js?v=20260819-1","morning-intervention-insight"],
  ["period-intervention-insight.js?v=20260819-1","period-intervention-insight"],
  // Plan selection is owned by app.js. Do not load plan wrappers or scroll fixes.
  ["visual-refresh.js?v=20260827-1","visual-refresh"],
  ["race-layout-refresh.js?v=20260816-2","race-layout-refresh"],
  ["air-outcome-experience.js?v=20260817-2","air-outcome"],
  ["morning-delivery.js?v=20260818-1","morning-delivery"],
  ["push-notifications.js?v=20260818-1","push-notifications"],
  ["sw-refresh.js?v=20260823-27","sw-refresh"],
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
