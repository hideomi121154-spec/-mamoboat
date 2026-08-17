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

/*
 * PILOT購読プランは静的表示のみ。
 * iOSのタップ操作を守るため、DOM監視・クリックイベント・追加ボタンは一切使わない。
 */
(function installStaticMembershipTiers(){
  const mount=()=>{
    const legacy=document.getElementById("membershipPanel");
    if(!legacy || document.getElementById("mamoStaticMembership")) return;
    legacy.style.display="none";

    const panel=document.createElement("div");
    panel.id="mamoStaticMembership";
    panel.className="mamo-static-membership";
    panel.innerHTML=`
      <div class="msm-head">
        <div><small>MAMO MEMBERSHIP / PILOT</small><h3>ひと目でわかる、4つのランク。</h3></div>
        <b>ALL<br>OPEN</b>
      </div>
      <p class="msm-copy">現在は検証版のため、すべての分析を開放しています。本番ではAIR BET・実結果・B精算は無料のまま、分析の深さだけを4段階に分けます。</p>
      <div class="msm-grid">
        <article class="msm-card free"><small>FREE</small><strong>無料</strong><p>まず、自分の勝負を見る。</p><span>基本記録<br>AIR BET総額・回数・平均<br>短い振り返り</span></article>
        <article class="msm-card bronze"><small>BRONZE</small><strong>390円<em>/月</em></strong><p>勝負の変化が見えてくる。</p><span>前期間比較<br>時間帯・100B率<br>ベーシックグラフ</span></article>
        <article class="msm-card silver"><i>おすすめ</i><small>SILVER</small><strong>690円<em>/月</em></strong><p>自分でも気づかないクセまで。</p><span>行動指数<br>勝負トリガー分析<br>個人ベースライン・週間分析</span></article>
        <article class="msm-card gold"><small>GOLD</small><strong>1,190円<em>/月</em></strong><p>あなた専属のMAMO BOATへ。</p><span>MAMO朝刊・週間・月刊<br>理由・長期トレンド分析<br>加音 守の個人記事</span></article>
      </div>
      <div class="msm-policy"><b>全プラン共通</b><span>AIR BET・実レース結果・B精算・安全機能は無料。課金対象は「自分を理解する解像度」です。</span></div>`;
    legacy.insertAdjacentElement("afterend",panel);

    const style=document.createElement("style");
    style.id="mamoStaticMembershipStyle";
    style.textContent=`
      #mamoStaticMembership{background:#071b2b;color:#f7f4ea;border:1px solid rgba(216,189,120,.45);border-radius:14px;padding:14px;box-shadow:0 8px 22px rgba(7,27,43,.13);pointer-events:none}
      #mamoStaticMembership *{pointer-events:none}
      .msm-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid rgba(216,189,120,.3);padding-bottom:10px}.msm-head small{font-size:8px;letter-spacing:.15em;font-weight:900;color:#d8bd78}.msm-head h3{margin:4px 0 0;font-size:20px;color:#fff;letter-spacing:-.04em}.msm-head>b{background:#d8bd78;color:#071b2b;font-size:8px;line-height:1.25;padding:6px 8px;text-align:center;letter-spacing:.08em}.msm-copy{margin:11px 0 13px;color:#bfc9cd;font-size:10px;line-height:1.7}
      .msm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.msm-card{position:relative;min-width:0;background:#0d293e;border:1px solid rgba(255,255,255,.12);padding:11px}.msm-card small{display:block;font-size:9px;font-weight:1000;letter-spacing:.13em}.msm-card strong{display:block;margin:4px 0;color:#fff;font-size:20px}.msm-card strong em{font-size:8px;font-style:normal;color:#91a1aa}.msm-card p{min-height:30px;margin:5px 0 8px;color:#b9c5ca;font-size:9px;line-height:1.5}.msm-card span{display:block;color:#edf0ef;font-size:8px;line-height:1.65}.msm-card.free{color:#d7dde0}.msm-card.bronze{color:#c88752;border-color:rgba(200,135,82,.55)}.msm-card.silver{color:#d8dde2;border-color:rgba(216,221,226,.58)}.msm-card.gold{color:#d8bd78;border-color:rgba(216,189,120,.72);background:linear-gradient(145deg,#102f43,#0a2234)}.msm-card i{position:absolute;right:7px;top:7px;background:#d8dde2;color:#071b2b;font-size:7px;font-style:normal;font-weight:1000;padding:3px 5px}.msm-policy{margin-top:10px;padding-top:9px;border-top:1px solid rgba(255,255,255,.1);display:grid;gap:3px}.msm-policy b{font-size:8px;color:#d8bd78;letter-spacing:.1em}.msm-policy span{font-size:9px;line-height:1.55;color:#bdc8cc}@media(max-width:380px){.msm-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",mount,{once:true}); else mount();
})();

const MAMO_SCRIPTS = [
  ["ai-safe.js?v=20260817-3","ai-safe"],
  ["period-trigger-summary.js?v=20260817-1","period-trigger-summary"],
  ["official-link.js?v=20260816-1","official-link"],
  ["decision-intelligence.js?v=20260816-1","decision-intel"],
  ["baseline-intelligence.js?v=20260816-1","baseline-intel"],
  ["trigger-intelligence.js?v=20260816-1","trigger-intel"],
  ["press-intelligence.js?v=20260817-3","press-intel"],
  ["morning-insight-bridge.js?v=20260817-1","morning-insight-bridge"],
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