/* MAMO BOAT SHOP x MAMO RECORD — Phase 5 pilot */
(()=>{
  "use strict";
  if(window.__MAMO_SHOP_RECORD_BENEFITS__) return;
  window.__MAMO_SHOP_RECORD_BENEFITS__=true;
  const RECORD_KEY="mamoboat_record_v1";
  const BENEFITS=[
    {need:100,title:"MAMO SELECT",desc:"編集部セレクトの限定棚を解放",icon:"★"},
    {need:300,title:"EARLY ACCESS",desc:"新しい特典・企画を先に確認",icon:"◷"},
    {need:500,title:"MEMBER PICK",desc:"RECORD利用者向け限定セレクトを解放",icon:"◆"},
  ];
  const read=()=>{try{return JSON.parse(localStorage.getItem(RECORD_KEY)||"{}")||{}}catch(_){return{}}};
  const balance=()=>Math.max(0,Number(read().balance)||0);
  function styles(){
    if(document.getElementById("mamoShopRecordBenefitStyle")) return;
    const s=document.createElement("style");s.id="mamoShopRecordBenefitStyle";s.textContent=`
      #mamoShopRecordBenefits{margin:12px 18px 4px;border:1px solid #e4d39e;border-radius:16px;background:linear-gradient(145deg,#fffdf7,#fff8e8);overflow:hidden;box-shadow:0 6px 18px rgba(8,35,61,.06)}
      .msrb-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 15px;border-bottom:1px solid #eee2bd}.msrb-head small{display:block;color:#8b6a1d;font-size:8px;font-weight:1000;letter-spacing:.12em}.msrb-head h3{margin:2px 0 0;color:#08233d;font-size:16px}.msrb-balance{white-space:nowrap;color:#a77709;font-size:25px;font-weight:1000}.msrb-progress{padding:11px 15px}.msrb-progress p{margin:0 0 7px;color:#64747d;font-size:9px;font-weight:800}.msrb-bar{height:8px;border-radius:999px;background:#ece7d7;overflow:hidden}.msrb-bar i{display:block;height:100%;border-radius:inherit;background:#d2a23b}.msrb-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;padding:0 12px 13px}.msrb-item{position:relative;min-width:0;padding:10px 8px;border:1px solid #e2e7e9;border-radius:11px;background:#fff}.msrb-item.locked{opacity:.55;filter:saturate(.45)}.msrb-item .ico{display:grid;place-items:center;width:26px;height:26px;margin-bottom:6px;border-radius:50%;background:#08233d;color:#fff;font-size:12px}.msrb-item.unlocked{border-color:#d9ba65;background:#fffdf7}.msrb-item.unlocked .ico{background:#d2a23b}.msrb-item b{display:block;color:#08233d;font-size:9px;line-height:1.25}.msrb-item span{display:block;margin-top:4px;color:#73828a;font-size:7px;line-height:1.45}.msrb-item em{display:block;margin-top:6px;color:#98721c;font-size:7px;font-style:normal;font-weight:1000}.msrb-note{padding:9px 13px;background:#08233d;color:#dbe7eb;font-size:8px;line-height:1.55}.msrb-note b{color:#f1c85c}
      @media(max-width:390px){.msrb-list{grid-template-columns:1fr}.msrb-item{display:grid;grid-template-columns:30px 1fr;column-gap:8px}.msrb-item .ico{grid-row:1/4}.msrb-item em{margin-top:3px}}
    `;document.head.appendChild(s);
  }
  function render(){
    const shop=document.getElementById("shop"); if(!shop) return;
    let box=document.getElementById("mamoShopRecordBenefits");
    if(!box){box=document.createElement("section");box.id="mamoShopRecordBenefits";const hero=shop.querySelector(".shop-hero"); if(hero) hero.insertAdjacentElement("afterend",box); else shop.prepend(box);}
    const b=balance();
    const next=BENEFITS.find(x=>b<x.need)||null;
    const prevNeed=[0,...BENEFITS.map(x=>x.need)].filter(x=>x<=b).pop()||0;
    const target=next?.need||BENEFITS.at(-1).need;
    const pct=next?Math.max(0,Math.min(100,((b-prevNeed)/(target-prevNeed))*100)):100;
    box.innerHTML=`<div class="msrb-head"><div><small>MAMO RECORD BENEFIT</small><h3>使うほど、特典が開く。</h3></div><strong class="msrb-balance">${b.toLocaleString("ja-JP")}R</strong></div>
      <div class="msrb-progress"><p>${next?`あと ${Math.max(0,next.need-b)}R で「${next.title}」解放`:`PILOT特典をすべて解放しました`}</p><div class="msrb-bar"><i style="width:${pct}%"></i></div></div>
      <div class="msrb-list">${BENEFITS.map(x=>{const ok=b>=x.need;return `<article class="msrb-item ${ok?"unlocked":"locked"}"><i class="ico">${ok?"✓":x.icon}</i><b>${x.title}</b><span>${x.desc}</span><em>${ok?"UNLOCKED":`${x.need}Rで解放`}</em></article>`}).join("")}</div>
      <div class="msrb-note"><b>RECORDは使っても減りません。</b> AIR BET額や勝敗ではなく、気持ち・結果後・見送りの記録で貯まります。現在はPILOT特典で、金銭価値はありません。</div>`;
  }
  function boot(){styles();render();setInterval(()=>{if(document.getElementById("shop"))render()},1500);window.addEventListener("pageshow",render);window.addEventListener("storage",e=>{if(e.key===RECORD_KEY)render()});document.addEventListener("click",e=>{if(e.target?.closest?.("#nav-shop"))setTimeout(render,80)},false)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
