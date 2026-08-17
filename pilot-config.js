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
  ["ai-safe.js?v=20260817-3","ai-safe"],
  ["period-trigger-summary.js?v=20260817-1","period-trigger-summary"],
  ["official-link.js?v=20260816-1","official-link"],
  ["decision-intelligence.js?v=20260816-1","decision-intel"],
  ["baseline-intelligence.js?v=20260816-1","baseline-intel"],
  ["trigger-intelligence.js?v=20260816-1","trigger-intel"],
  ["press-intelligence.js?v=20260817-3","press-intel"],
  ["morning-insight-bridge.js?v=20260817-1","morning-insight-bridge"],
  ["plan-system.js?v=20260817-4","plan-system"],
  ["visual-refresh.js?v=20260816-2","visual-refresh"],
  ["race-layout-refresh.js?v=20260816-2","race-layout-refresh"],
  ["air-outcome-experience.js?v=20260817-2","air-outcome"],
  ["morning-delivery.js?v=20260817-2","morning-delivery"],
  ["push-notifications.js?v=20260816-3","push-notifications"],
  ["nav-stability.js?v=20260816-1","nav-stability"],
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