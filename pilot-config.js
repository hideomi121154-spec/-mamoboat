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

/* 起動速度優先: 本体描画後に拡張を順番に読み込む。 */
const MAMO_SCRIPTS = [
  ["device-sync.js?v=20260817-3","device-sync"],
  ["ai-safe.js?v=20260816-1","ai-safe"],
  ["official-link.js?v=20260816-1","official-link"],
  ["decision-intelligence.js?v=20260816-1","decision-intel"],
  ["baseline-intelligence.js?v=20260816-1","baseline-intel"],
  ["trigger-intelligence.js?v=20260816-1","trigger-intel"],
  ["press-intelligence.js?v=20260816-1","press-intel"],
  ["visual-refresh.js?v=20260816-2","visual-refresh"],
  ["race-layout-refresh.js?v=20260816-2","race-layout-refresh"],
  ["air-outcome-experience.js?v=20260816-1","air-outcome"],
  ["morning-delivery.js?v=20260817-2","morning-delivery"],
  ["push-notifications.js?v=20260816-3","push-notifications"],
  ["nav-stability.js?v=20260816-1","nav-stability"],
  ["sw-refresh.js?v=20260817-2","sw-refresh"],
];

function loadMamoModule([src,key]) {
  if (document.querySelector(`script[data-mamo-module="${key}"]`)) return Promise.resolve();
  return new Promise((resolve) => {
    const s=document.createElement("script");
    s.src=src;
    s.async=true;
    s.dataset.mamoModule=key;
    s.onload=resolve;
    s.onerror=resolve;
    document.head.appendChild(s);
  });
}

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
