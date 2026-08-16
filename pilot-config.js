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
  const existing=document.querySelector(`script[data-mamo-module="${key}"]`);
  if (existing) return existing.__mamoPromise || Promise.resolve();
  const promise=new Promise((resolve) => {
    const s=document.createElement("script");
    s.src=src;
    s.async=true;
    s.dataset.mamoModule=key;
    s.onload=()=>resolve(true);
    s.onerror=()=>resolve(false);
    s.__mamoPromise=promise;
    document.head.appendChild(s);
  });
  return promise;
}

/*
 * 共有コードがある端末では、同期前の100,000Bや --B を完成画面として見せない。
 * pilot-config.js は app.js より先に読み込まれるため、ここで起動ゲートを掛ける。
 */
(function installSyncBootGate(){
  const TOKEN_KEY="mamoboat_sync_token_v1";
  let hasToken=false;
  try{hasToken=!!localStorage.getItem(TOKEN_KEY);}catch(_){ }
  if(!hasToken) return;
  document.documentElement.classList.add("mamo-sync-booting");
  const style=document.createElement("style");
  style.id="mamoSyncBootStyle";
  style.textContent=`
    html.mamo-sync-booting .app-shell,
    html.mamo-sync-booting .bottom-nav{visibility:hidden!important}
    #mamoSyncBootGate{position:fixed;inset:0;z-index:2147483000;background:#f7f4ec;display:flex;align-items:center;justify-content:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif;color:#05233e}
    #mamoSyncBootGate>div{width:min(360px,90vw);text-align:center}
    #mamoSyncBootGate b{display:block;font-size:18px;margin-bottom:8px}
    #mamoSyncBootGate span{font-size:13px;color:#647786}
  `;
  document.head.appendChild(style);
  const addGate=()=>{
    if(document.getElementById("mamoSyncBootGate")) return;
    const gate=document.createElement("div");
    gate.id="mamoSyncBootGate";
    gate.innerHTML="<div><b>MAMO BOATを同期しています</b><span>記録・B残高を確認中です…</span></div>";
    document.body.appendChild(gate);
  };
  if(document.body) addGate();
  else document.addEventListener("DOMContentLoaded",addGate,{once:true});
  window.MAMO_RELEASE_SYNC_GATE=()=>{
    document.documentElement.classList.remove("mamo-sync-booting");
    document.getElementById("mamoSyncBootGate")?.remove();
  };
  setTimeout(()=>window.MAMO_RELEASE_SYNC_GATE?.(),6000);
})();

/* 同期は最優先。完了Promiseを公開する。 */
window.MAMO_SYNC_READY = loadMamoModule(["device-sync.js?v=20260817-5","device-sync"])
  .then(()=>window.MAMO_DEVICE_SYNC_READY || true)
  .catch(()=>false);

/* 起動速度優先: その他の拡張は本体描画後に順番に読み込む。 */
const MAMO_SCRIPTS = [
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
