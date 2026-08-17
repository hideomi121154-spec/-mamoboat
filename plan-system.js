/* MAMO BOAT Plan System v2.5 — display-only, navigation-safe. */
(() => {
  "use strict";
  if (window.__MAMO_PLAN_SYSTEM_V25__) return;
  window.__MAMO_PLAN_SYSTEM_V25__ = true;

  const PLANS = [
    { id:"free", name:"FREE", price:0, tagline:"まず、自分の勝負を見る。", bullets:["AIR BET・実結果・B精算", "AIR BET総額・回数・平均", "基本の振り返り"] },
    { id:"bronze", name:"BRONZE", price:390, tagline:"勝負の変化が見えてくる。", bullets:["FREEの全機能", "前期間との比較", "時間帯・100B率", "ベーシックグラフ"] },
    { id:"silver", name:"SILVER", price:690, tagline:"自分でも気づかないクセまで。", bullets:["BRONZEの全機能", "行動指数", "勝負トリガー分析", "個人ベースライン・週間分析"], recommended:true },
    { id:"gold", name:"GOLD", price:1190, tagline:"あなた専属のMAMO BOATへ。", bullets:["SILVERの全機能", "MAMO朝刊・週間・月刊", "理由・長期トレンド分析", "加音 守の個人記事"] },
  ];

  const esc = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const card = plan => `<article class="mamo-plan-card mamo-${plan.id}">${plan.recommended?'<span class="mamo-plan-ribbon">おすすめ</span>':""}<div class="mamo-plan-head"><small>${plan.name}</small><h3>${plan.price?`${plan.price.toLocaleString("ja-JP")}円`:'無料'}<em>${plan.price?'/月':''}</em></h3></div><p>${esc(plan.tagline)}</p><ul>${plan.bullets.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></article>`;

  function render(){
    const panel=document.getElementById("membershipPanel");
    if(!panel) return;
    panel.innerHTML=`<div class="mamo-plan-intro"><div><span>MAMO MEMBERSHIP</span><h3>ひと目でわかる、4つのランク。</h3></div><b>PILOT<br>ALL OPEN</b></div><p class="mamo-plan-copy">現在は検証版のため全機能を開放しています。本番では、同じデータを裏で記録しながら「見える分析の深さ」だけを4段階に分けます。</p><div class="mamo-plan-grid">${PLANS.map(card).join("")}</div><div class="mamo-plan-policy"><strong>全プラン共通</strong><span>AIR BET・実レース結果・B精算・安全機能は無料。課金対象は分析の深さです。</span></div>`;
    const badge=document.getElementById("pressPlanBadge");
    if(badge) badge.textContent="PILOT / ALL OPEN";
  }

  function installStyles(){
    if(document.getElementById("mamoPlanStaticStyle")) return;
    const s=document.createElement("style"); s.id="mamoPlanStaticStyle";
    s.textContent=`.membership-panel{background:#071b2b!important;color:#f8f4e8!important;border:1px solid rgba(204,174,102,.45)!important;padding:14px!important;box-shadow:0 10px 28px rgba(7,27,43,.16)!important}.mamo-plan-intro{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(204,174,102,.36);padding-bottom:11px}.mamo-plan-intro span{font-size:8px;letter-spacing:.15em;font-weight:1000;color:#cdb275}.mamo-plan-intro h3{margin:4px 0 0;font-size:20px;color:#fff}.mamo-plan-intro>b{text-align:right;font-size:8px;line-height:1.35;color:#071b2b;background:#d8bd78;padding:6px 8px}.mamo-plan-copy{font-size:10px;line-height:1.7;color:#bdc8cc;margin:11px 0 13px}.mamo-plan-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.mamo-plan-card{--tier:#d7dde0;position:relative;background:#0d293e;border:1px solid rgba(255,255,255,.12);padding:11px;min-width:0;color:var(--tier)}.mamo-plan-card.mamo-bronze{--tier:#c88752;border-color:rgba(200,135,82,.55)}.mamo-plan-card.mamo-silver{--tier:#d8dde2;border-color:rgba(216,221,226,.58)}.mamo-plan-card.mamo-gold{--tier:#d8bd78;border-color:rgba(216,189,120,.72);background:linear-gradient(145deg,#102f43,#0a2234)}.mamo-plan-ribbon{position:absolute;right:7px;top:7px;background:var(--tier);color:#071b2b;font-size:7px;font-weight:1000;padding:3px 5px}.mamo-plan-head small{font-size:9px;letter-spacing:.12em;color:var(--tier);font-weight:1000}.mamo-plan-head h3{margin:3px 0;font-size:20px;color:#fff}.mamo-plan-head h3 em{font-size:8px;font-style:normal;color:#91a1aa}.mamo-plan-card>p{min-height:30px;font-size:9px;line-height:1.5;color:#b9c5ca}.mamo-plan-card ul{margin:8px 0;padding:0;list-style:none}.mamo-plan-card li{font-size:8px;line-height:1.55;padding:2px 0;color:#edf0ef}.mamo-plan-card li:before{content:'◆';font-size:5px;color:var(--tier);margin-right:5px}.mamo-plan-policy{margin-top:10px;padding:9px;border-top:1px solid rgba(255,255,255,.1);display:grid;gap:3px}.mamo-plan-policy strong{font-size:8px;color:#d8bd78;letter-spacing:.1em}.mamo-plan-policy span{font-size:9px;line-height:1.55;color:#bdc8cc}@media(max-width:380px){.mamo-plan-grid{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }

  installStyles();

  // Inline onclick="go('analysis')" runs on the target before this bubble handler.
  // Rendering here replaces the legacy panel in the same user-interaction frame,
  // without MutationObserver, timers, overlays or navigation interception.
  document.addEventListener("click", (event) => {
    if(!event.target.closest?.("#nav-analysis")) return;
    render();
  }, {passive:true});
})();