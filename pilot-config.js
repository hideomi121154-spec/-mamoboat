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
    body[data-mamo-plan="free"] #mamoAiSafeReport {
      --mamo-plan-lock: "BRONZEで開放 / 前の自分との比較・時間帯・基本グラフ";
    }

    body[data-mamo-plan="free"] #mamoDecisionPanel,
    body[data-mamo-plan="free"] #mamoBaselinePanel,
    body[data-mamo-plan="free"] #mamoTriggerPanel,
    body[data-mamo-plan="free"] #mamoPeriodTriggerSummary,
    body[data-mamo-plan="bronze"] #mamoDecisionPanel,
    body[data-mamo-plan="bronze"] #mamoBaselinePanel,
    body[data-mamo-plan="bronze"] #mamoTriggerPanel,
    body[data-mamo-plan="bronze"] #mamoPeriodTriggerSummary {
      --mamo-plan-lock: "SILVERで開放 / 勝負トリガー・個人ベースライン・週間分析";
    }

    body:not([data-mamo-plan="gold"]) #pressPaper,
    body:not([data-mamo-plan="gold"]) #mamoPressIntel,
    body:not([data-mamo-plan="gold"]) #homePressTeaser {
      --mamo-plan-lock: "GOLDで開放 / MAMO朝刊・週間・月刊・深掘り・長期分析";
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
      overflow: hidden;
      pointer-events: none;
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
      content: "";
      position: absolute;
      inset: 0;
      z-index: 20;
      background: rgba(255, 255, 255, 0.965);
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
      left: 14px;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      padding: 14px 12px;
      border: 1px solid rgba(7, 27, 43, 0.14);
      border-left: 5px solid var(--gold, #ffc83d);
      border-radius: 8px;
      background: #fffdf7;
      color: var(--navy, #071b2b);
      box-shadow: 0 8px 24px rgba(7, 27, 43, 0.08);
      font-size: 12px;
      line-height: 1.7;
      font-weight: 900;
      text-align: left;
      white-space: normal;
    }

    body:not([data-mamo-plan="gold"]) .paper-tabs button {
      pointer-events: none;
      opacity: 0.48;
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
  ["ai-safe.js?v=20260818-3","ai-safe"],
  ["period-trigger-summary.js?v=20260818-3","period-trigger-summary"],
  ["official-link.js?v=20260816-1","official-link"],
  ["decision-intelligence.js?v=20260818-3","decision-intel"],
  ["baseline-intelligence.js?v=20260818-3","baseline-intel"],
  ["trigger-intelligence.js?v=20260818-3","trigger-intel"],
  ["press-intelligence.js?v=20260818-3","press-intel"],
  ["morning-insight-bridge.js?v=20260818-3","morning-insight-bridge"],
  // Plan selection is owned by app.js. Do not load plan wrappers or scroll fixes.
  ["visual-refresh.js?v=20260816-2","visual-refresh"],
  ["race-layout-refresh.js?v=20260816-2","race-layout-refresh"],
  ["air-outcome-experience.js?v=20260817-2","air-outcome"],
  ["morning-delivery.js?v=20260817-2","morning-delivery"],
  ["push-notifications.js?v=20260816-3","push-notifications"],
  ["sw-refresh.js?v=20260817-2","sw-refresh"],
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
