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
    /* HOME = 今日の自分 / 24場 = レース探索。開催カードの二重表示をやめる。 */
    #home .home-command,
    #home .home-filters,
    #home .home-route,
    #home #homeVenues { display:none !important; }
    #home .home-titlebar { margin-bottom:14px; }
    #home .mamo-home-role-card {
      margin: 0 24px 18px;
      padding: 18px 18px 16px;
      border: 1px solid #c9d9e5;
      border-left: 7px solid #e51d2a;
      border-radius: 18px;
      background: #fff;
      box-shadow: 0 8px 22px rgba(8,43,74,.06);
    }
    #home .mamo-home-role-card small { display:block; color:#e51d2a; font-weight:900; letter-spacing:.12em; margin-bottom:5px; }
    #home .mamo-home-role-card strong { display:block; color:#082b4a; font-size:1.25rem; line-height:1.35; }
    #home .mamo-home-role-card p { margin:7px 0 14px; color:#647b8e; line-height:1.55; }
    #home .mamo-home-role-card button {
      width:100%; border:0; border-radius:13px; padding:13px 16px; background:#082b4a; color:#fff;
      font:inherit; font-weight:900;
    }

    /* One analysis owner: base facts → small insights → free safety → GOLD press. */
    /* Safety never becomes paid or blurred. */
    #analysis.active { display:flex; flex-direction:column; }
    #analysis.active > * { order:45; min-width:0; }
    #analysis.active > .analysis-intro { order:0; }
    #analysis.active > #mamoValueSectionHead { order: 10; }
    #analysis.active > #mamoValueEditorialSlot { order: 11; }
    #analysis.active > .section-head:has(+ #analysisCards) { order:20; }
    #analysis.active > #analysisCards { order:21; }
    #analysis.active > .section-head:has(+ #analysisList) { order:22; }
    #analysis.active > #analysisList { order:23; }
    #analysis.active > #mamoAiSafeReport { order:30; }
    #analysis.active > .section-head:has(+ .paper-tabs) { order:40; }
    #analysis.active > .paper-tabs { order:41; }
    #analysis.active > #pressPaper { order:42; }
    #analysis.active > #mamoPressIntel { order:43; }
    #analysis.active > .section-head:has(+ #membershipPanel) { order:60; }
    #analysis.active > #membershipPanel { order:61; }
    #analysis.active > .analysis-tools { order:62; }
    #analysis.active > .section-head:has(+ .newsroom-cast) { order:90; }
    #analysis.active > .newsroom-cast { order: 91; }
    #mamoAiSafeReport,#pressPaper,#mamoPressIntel,#homePressTeaser { height: auto !important;max-height:none!important;overflow:visible!important;pointer-events:auto!important;color:inherit!important; }
    #mamoAiSafeReport > *,#pressPaper > *,#mamoPressIntel > *,#homePressTeaser > * { visibility: visible !important; }
    #mamoAiSafeReport::before,#mamoAiSafeReport::after,#pressPaper::before,#pressPaper::after,#mamoPressIntel::before,#mamoPressIntel::after,#homePressTeaser::before,#homePressTeaser::after { content:none!important; }
    /* Older parallel analysis panels stay hidden so one renderer owns the screen. */
    html.mamo-insights-v2 #mamoDecisionPanel,html.mamo-insights-v2 #mamoBaselinePanel,html.mamo-insights-v2 #mamoTriggerPanel,html.mamo-insights-v2 #mamoPeriodTriggerSummary,html.mamo-insights-v2 #mamoBehaviorPatternProfile,html.mamo-insights-v2 #mamoCompoundPatternPanel,html.mamo-insights-v2 #mamoDecisionStateScore,html.mamo-insights-v2 #mamoRecordEditorial,html.mamo-insights-v2 #goldEditorialDesk { display:none!important; }
    body:not([data-mamo-plan="gold"]) #mamoPressIntel { display:none!important; }
    body:not([data-mamo-plan="gold"]) .paper-tabs button { opacity:.62; }
  `;
  document.head.appendChild(style);
}

function installMamoHomeRole() {
  const home=document.getElementById("home");
  if (!home || document.getElementById("mamoHomeRoleCard")) return;
  const title=home.querySelector(".home-titlebar h1");
  if (title) title.innerHTML="今日の<span>自分</span>";
  const callout=home.querySelector(".masthead-callout");
  if (callout) callout.innerHTML="<span>今日の</span><strong>勝負を<em>知る。</em></strong>";
  const card=document.createElement("div");
  card.id="mamoHomeRoleCard";
  card.className="mamo-home-role-card";
  card.innerHTML=`<small>TODAY / PERSONAL DASHBOARD</small><strong>ホームは「今日の自分」を見る場所。</strong><p>開催場探しは24場へ。ここでは次の締切、今日の行動記録、編集部からの気づきを確認します。</p><button type="button">24場からレースを探す →</button>`;
  card.querySelector("button").addEventListener("click",()=>window.go?.("venues"));
  const sync=home.querySelector(".home-sync-details");
  (sync || home.firstElementChild)?.insertAdjacentElement(sync?"beforebegin":"afterend",card);
}

function bootMamoPlanTierUI() {
  installMamoPlanTierStyles(); syncMamoPlanMarker(); installMamoHomeRole();
  document.addEventListener("click",(event)=>{const target=event.target?.closest?.("[data-pilot-plan], .plan-option");if(!target)return;Promise.resolve().then(syncMamoPlanMarker);},false);
  window.addEventListener("mamo:analysis-rendered",syncMamoPlanMarker);
  window.addEventListener("pageshow",()=>{syncMamoPlanMarker();installMamoHomeRole();});
  window.addEventListener("storage",(event)=>{if(event.key===MAMO_PLAN_STATE_KEY)syncMamoPlanMarker();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootMamoPlanTierUI,{once:true});else bootMamoPlanTierUI();

function loadMamoModule([src,key]) { if(document.querySelector(`script[data-mamo-module="${key}"]`))return Promise.resolve(true);return new Promise((resolve)=>{const s=document.createElement("script");s.src=src;s.async=true;s.dataset.mamoModule=key;s.onload=()=>resolve(true);s.onerror=()=>resolve(false);document.head.appendChild(s);}); }
window.MAMO_RELEASE_SYNC_GATE=()=>{document.documentElement.classList.remove("mamo-sync-booting");document.getElementById("mamoSyncBootGate")?.remove();};
window.MAMO_RELEASE_SYNC_GATE();
window.MAMO_SYNC_READY=loadMamoModule(["device-sync.js?v=20260827-2","device-sync"]).then(()=>window.MAMO_DEVICE_SYNC_READY||true).catch(()=>false);
const MAMO_SCRIPTS=[
["decision-event-schema.js?v=20260831-2","decision-event-schema"],["decision-conflict-core.js?v=20260831-1","decision-conflict-core"],["decision-conflict-guard.js?v=20260831-1","decision-conflict-guard"],["decision-event-collector.js?v=20260831-2","decision-event-collector"],["decision-event-api-compat.js?v=20260906-2","decision-event-api-compat"],["decision-transition-model.js?v=20260819-2","decision-transition-model"],["intervention-history.js?v=20260819-1","intervention-history"],["baseline-intervention.js?v=20260819-1","baseline-intervention"],["ai-safe.js?v=20260818-3","ai-safe"],["period-trigger-summary.js?v=20260818-3","period-trigger-summary"],["official-link.js?v=20260816-1","official-link"],["decision-intelligence.js?v=20260818-3","decision-intel"],["baseline-intelligence.js?v=20260818-3","baseline-intel"],["decision-state-score.js?v=20260819-1","decision-state-score"],["trigger-intelligence.js?v=20260818-3","trigger-intel"],["behavior-pattern-profile.js?v=20260828-3","behavior-pattern-profile"],["behavior-science.js?v=20260829-2","behavior-science"],["compound-pattern-intelligence.js?v=20260819-1","compound-pattern-intel"],["compound-pattern-realtime.js?v=20260819-1","compound-pattern-realtime"],["press-intelligence.js?v=20260818-3","press-intel"],["morning-insight-bridge.js?v=20260818-3","morning-insight-bridge"],["morning-intervention-insight.js?v=20260819-1","morning-intervention-insight"],["period-intervention-insight.js?v=20260819-1","period-intervention-insight"],["visual-refresh.js?v=20260829-2","visual-refresh"],["race-layout-refresh.js?v=20260816-2","race-layout-refresh"],["air-outcome-experience.js?v=20260817-2","air-outcome"],["motion-experience.js?v=20260827-1","motion-experience"],["morning-delivery.js?v=20260818-1","morning-delivery"],["push-notifications.js?v=20260818-1","push-notifications"],["sw-refresh.js?v=20260831-36","sw-refresh"]];
async function loadMamoEnhancements(){for(const item of MAMO_SCRIPTS){await loadMamoModule(item);await new Promise((resolve)=>setTimeout(resolve,0));}}
function scheduleMamoEnhancements(){const start=()=>{"requestIdleCallback" in window?requestIdleCallback(()=>loadMamoEnhancements(),{timeout:1800}):setTimeout(()=>loadMamoEnhancements(),700);};document.readyState==="complete"?start():window.addEventListener("load",start,{once:true});}
scheduleMamoEnhancements();
