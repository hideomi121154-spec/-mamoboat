/* MAMO BOAT SHOP x MAMO RECORD — actionable benefits pilot */
(()=>{
  "use strict";
  if(window.__MAMO_SHOP_RECORD_BENEFITS_V2__) return;
  window.__MAMO_SHOP_RECORD_BENEFITS_V2__=true;

  const RECORD_KEY="mamoboat_record_v1";
  const APP_KEY="mamoboat_v40_personal";
  const BENEFIT_KEY="mamoboat_record_benefits_v2";
  const TRIAL_DAYS=7;
  const BENEFITS=[
    {id:"special-analysis",need:100,title:"特別分析 1回",desc:"あなたの直近記録を、MAMO編集部が1枚に整理。",icon:"分析"},
    {id:"gold-trial",need:300,title:"GOLD分析 7日体験",desc:"朝刊・週間・月刊などGOLD体験を7日間解放。",icon:"7D"},
    {id:"shop-coupon",need:500,title:"SHOP限定クーポン",desc:"PILOT SHOPで使う特典クーポン枠を解放。",icon:"%"},
  ];

  const readJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||"null")??fallback}catch(_){return fallback}};
  const writeJson=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_){return false}};
  const record=()=>readJson(RECORD_KEY,{})||{};
  const balance=()=>Math.max(0,Number(record().balance)||0);
  function benefitState(){const s=readJson(BENEFIT_KEY,{claims:{},trial:null,coupon:null})||{};s.claims=s.claims&&typeof s.claims==="object"?s.claims:{};return s;}
  function appState(){return readJson(APP_KEY,{})||{};}
  const fmtDate=(value)=>new Date(value).toLocaleDateString("ja-JP",{timeZone:"Asia/Tokyo",month:"numeric",day:"numeric"});
  const remainingDays=(end)=>Math.max(0,Math.ceil((new Date(end).getTime()-Date.now())/86400000));

  function syncTrial(){
    const bs=benefitState(),trial=bs.trial;
    if(!trial?.active) return;
    if(new Date(trial.endsAt).getTime()>Date.now()) return;
    const app=appState();
    app.pressroom=app.pressroom||{};
    if(app.pressroom.plan==="gold"&&trial.previousPlan) app.pressroom.plan=trial.previousPlan;
    trial.active=false;trial.expiredAt=new Date().toISOString();
    writeJson(APP_KEY,app);writeJson(BENEFIT_KEY,bs);
  }

  function styles(){
    if(document.getElementById("mamoShopRecordBenefitStyleV2")) return;
    const s=document.createElement("style");s.id="mamoShopRecordBenefitStyleV2";s.textContent=`
      #mamoShopRecordBenefits{margin:12px 18px 4px;border:1px solid #e4d39e;border-radius:16px;background:linear-gradient(145deg,#fffdf7,#fff8e8);overflow:hidden;box-shadow:0 6px 18px rgba(8,35,61,.06)}
      .msrb-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 15px;border-bottom:1px solid #eee2bd}.msrb-head small{display:block;color:#8b6a1d;font-size:8px;font-weight:1000;letter-spacing:.12em}.msrb-head h3{margin:2px 0 0;color:#08233d;font-size:16px}.msrb-balance{white-space:nowrap;color:#a77709;font-size:25px;font-weight:1000}
      .msrb-progress{padding:11px 15px}.msrb-progress p{margin:0 0 7px;color:#64747d;font-size:9px;font-weight:800}.msrb-bar{height:8px;border-radius:999px;background:#ece7d7;overflow:hidden}.msrb-bar i{display:block;height:100%;border-radius:inherit;background:#d2a23b}
      .msrb-list{display:grid;gap:8px;padding:0 12px 13px}.msrb-item{display:grid;grid-template-columns:40px 1fr auto;gap:9px;align-items:center;padding:11px;border:1px solid #e2e7e9;border-radius:12px;background:#fff}.msrb-item.locked{opacity:.55}.msrb-item.unlocked{border-color:#d9ba65;background:#fffdf7}.msrb-item .ico{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:#08233d;color:#fff;font-size:10px;font-weight:1000}.msrb-item.unlocked .ico{background:#d2a23b}.msrb-copy b{display:block;color:#08233d;font-size:12px}.msrb-copy span{display:block;margin-top:3px;color:#73828a;font-size:9px;line-height:1.45}.msrb-copy em{display:block;margin-top:4px;color:#98721c;font-size:8px;font-style:normal;font-weight:1000}.msrb-action{border:0;border-radius:9px;background:#08233d;color:#fff;padding:9px 10px;font-size:9px;font-weight:1000;white-space:nowrap}.msrb-action[disabled]{background:#d8dddf;color:#7a878d}.msrb-note{padding:9px 13px;background:#08233d;color:#dbe7eb;font-size:8px;line-height:1.55}.msrb-note b{color:#f1c85c}
      #mamoSpecialAnalysis{margin:12px 0;padding:14px;border:1px solid #d9ba65;border-left:5px solid #d2a23b;border-radius:13px;background:#fffdf7}.msa-head{display:flex;justify-content:space-between;gap:10px}.msa-head small{color:#8b6a1d;font-size:8px;font-weight:1000}.msa-head h3{margin:3px 0 9px;color:#08233d}.msa-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.msa-grid div{padding:9px;border-radius:9px;background:#fff;border:1px solid #e6e8e8}.msa-grid span{display:block;color:#7b898f;font-size:8px}.msa-grid b{display:block;margin-top:3px;color:#08233d;font-size:15px}.msa-note{margin:10px 0 0;color:#53656d;font-size:10px;line-height:1.65}.msrb-coupon{margin-top:5px;padding:7px 9px;border:1px dashed #c89b2d;border-radius:8px;background:#fff8df;color:#7a5813;font-size:9px;font-weight:1000}
    `;document.head.appendChild(s);
  }

  function specialAnalysisData(){
    const r=record(),pre=Object.values(r.reflections||{}),post=Object.values(r.postReflections||{}),skip=Object.values(r.skipReflections||{});
    const avg=(arr,key)=>arr.length?arr.reduce((a,x)=>a+(Number(x?.[key])||0),0)/arr.length:0;
    const emotions={};post.forEach(x=>{const k=x?.emotion||"unknown";emotions[k]=(emotions[k]||0)+1});
    const topEmotion=Object.entries(emotions).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";
    const labels={satisfied:"納得した",frustrated:"悔しい",chase:"取り返したい",neutral:"特になし","—":"—"};
    return {count:pre.length,urge:avg(pre,"cashUrge"),conviction:avg(pre,"conviction"),post:post.length,skip:skip.length,topEmotion:labels[topEmotion]||topEmotion};
  }

  function renderSpecialAnalysis(){
    const bs=benefitState();
    let box=document.getElementById("mamoSpecialAnalysis");
    if(!bs.claims["special-analysis"]){box?.remove();return}
    const host=document.getElementById("mamoAiSafeReport")||document.getElementById("analysisCards")||document.getElementById("analysis");if(!host)return;
    if(!box){box=document.createElement("section");box.id="mamoSpecialAnalysis";host.insertAdjacentElement("afterend",box)}
    const d=specialAnalysisData();
    box.innerHTML=`<div class="msa-head"><div><small>100R BENEFIT / SPECIAL REPORT</small><h3>あなたのRECORD特別分析</h3></div><b>1 REPORT</b></div><div class="msa-grid"><div><span>心理記録</span><b>${d.count}件</b></div><div><span>現金衝動 平均</span><b>${d.urge?d.urge.toFixed(1):"—"}/5</b></div><div><span>納得度 平均</span><b>${d.conviction?d.conviction.toFixed(1):"—"}/5</b></div></div><p class="msa-note">結果後の最多感情：<b>${d.topEmotion}</b> / 見送り記録：<b>${d.skip}件</b>。これは勝敗予測ではなく、あなた自身の記録をまとめたPILOT分析です。</p>`;
  }

  function claimSpecial(){const bs=benefitState();if(balance()<100)return;bs.claims["special-analysis"]={claimedAt:new Date().toISOString()};writeJson(BENEFIT_KEY,bs);render();renderSpecialAnalysis();window.go?.("analysis");setTimeout(()=>document.getElementById("mamoSpecialAnalysis")?.scrollIntoView({block:"center"}),180)}
  function startGoldTrial(){
    if(balance()<300)return;
    const bs=benefitState();
    if(bs.trial?.active&&new Date(bs.trial.endsAt).getTime()>Date.now()) return;
    const app=appState();app.pressroom=app.pressroom||{};
    const previousPlan=app.pressroom.plan||"free",now=Date.now(),ends=new Date(now+TRIAL_DAYS*86400000).toISOString();
    bs.claims["gold-trial"]={claimedAt:new Date(now).toISOString()};bs.trial={active:true,startedAt:new Date(now).toISOString(),endsAt:ends,previousPlan};
    app.pressroom.plan="gold";app.pressroom.mamoRecordTrialEndsAt=ends;
    writeJson(BENEFIT_KEY,bs);writeJson(APP_KEY,app);
    location.reload();
  }
  function unlockCoupon(){if(balance()<500)return;const bs=benefitState();bs.claims["shop-coupon"]={claimedAt:new Date().toISOString()};bs.coupon={code:"MAMO500-PILOT",label:"PILOT SHOP 10% OFF",unlockedAt:new Date().toISOString(),pilot:true};writeJson(BENEFIT_KEY,bs);render()}

  function actionFor(x,b,bs){
    if(b<x.need)return `<button class="msrb-action" disabled>${x.need}R</button>`;
    if(x.id==="special-analysis")return `<button class="msrb-action" data-benefit-action="special">${bs.claims[x.id]?"分析を見る":"分析を解放"}</button>`;
    if(x.id==="gold-trial"){
      const active=bs.trial?.active&&new Date(bs.trial.endsAt).getTime()>Date.now();
      return `<button class="msrb-action" data-benefit-action="trial">${active?`あと${remainingDays(bs.trial.endsAt)}日`:bs.claims[x.id]?"体験済み":"7日体験開始"}</button>`;
    }
    return `<button class="msrb-action" data-benefit-action="coupon">${bs.claims[x.id]?"表示中":"クーポン解放"}</button>`;
  }

  function render(){
    syncTrial();
    const shop=document.getElementById("shop");if(!shop)return;
    let box=document.getElementById("mamoShopRecordBenefits");if(!box){box=document.createElement("section");box.id="mamoShopRecordBenefits";const hero=shop.querySelector(".shop-hero");hero?hero.insertAdjacentElement("afterend",box):shop.prepend(box)}
    const b=balance(),bs=benefitState(),next=BENEFITS.find(x=>b<x.need)||null,prev=[0,...BENEFITS.map(x=>x.need)].filter(x=>x<=b).pop()||0,target=next?.need||500,pct=next?Math.max(0,Math.min(100,((b-prev)/(target-prev))*100)):100;
    const trialActive=bs.trial?.active&&new Date(bs.trial.endsAt).getTime()>Date.now();
    box.innerHTML=`<div class="msrb-head"><div><small>MAMO RECORD BENEFIT</small><h3>使うほど、特典が開く。</h3></div><strong class="msrb-balance">${b.toLocaleString("ja-JP")}R</strong></div><div class="msrb-progress"><p>${next?`あと ${next.need-b}R で「${next.title}」解放`:`3つのPILOT特典を解放できます`}${trialActive?` / GOLD体験 ${fmtDate(bs.trial.endsAt)}まで`:""}</p><div class="msrb-bar"><i style="width:${pct}%"></i></div></div><div class="msrb-list">${BENEFITS.map(x=>{const ok=b>=x.need;return `<article class="msrb-item ${ok?"unlocked":"locked"}"><i class="ico">${ok?"✓":x.icon}</i><div class="msrb-copy"><b>${x.title}</b><span>${x.desc}</span><em>${ok?"UNLOCKED":`${x.need}Rで解放`}</em>${x.id==="shop-coupon"&&bs.coupon?`<div class="msrb-coupon">${bs.coupon.label}｜${bs.coupon.code}</div>`:""}</div>${actionFor(x,b,bs)}</article>`}).join("")}</div><div class="msrb-note"><b>RECORDは消費しません。</b> 現在はPILOT検証用です。500Rクーポンも実決済には使用されません。</div>`;
    renderSpecialAnalysis();
  }

  function click(e){const a=e.target.closest?.("[data-benefit-action]");if(!a)return;const kind=a.dataset.benefitAction;if(kind==="special")claimSpecial();else if(kind==="trial")startGoldTrial();else if(kind==="coupon")unlockCoupon()}
  function boot(){styles();syncTrial();render();renderSpecialAnalysis();document.addEventListener("click",click,false);setInterval(()=>{if(document.getElementById("shop"))render()},2500);window.addEventListener("pageshow",()=>{render();renderSpecialAnalysis()});window.addEventListener("mamo:analysis-rendered",renderSpecialAnalysis);window.addEventListener("storage",e=>{if([RECORD_KEY,BENEFIT_KEY].includes(e.key))render()})}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
