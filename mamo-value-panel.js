/* MAMO BOAT Phase 6 — subscription value panel.
 * Shows factual AIR BET replacement amount against the selected pilot plan fee.
 * Never labels avoided spending as profit or winnings.
 */
(()=>{
  "use strict";
  if(window.__MAMO_VALUE_PANEL__) return;
  window.__MAMO_VALUE_PANEL__=true;

  const KEY="mamoboat_v40_personal";
  const FEES={free:0,bronze:390,silver:690,gold:1190};
  const LABELS={free:"FREE",bronze:"BRONZE",silver:"SILVER",gold:"GOLD"};
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")||{}}catch(_){return {}}};
  const fmt=n=>Math.max(0,Math.round(Number(n)||0)).toLocaleString("ja-JP");
  const jstParts=()=>{
    const p=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit"}).format(new Date());
    return p.slice(0,7);
  };
  const recordMonth=r=>{
    const raw=r?.raceDate||r?.time||"";
    if(/^\d{4}-\d{2}/.test(String(raw))) return String(raw).slice(0,7);
    const ms=new Date(raw||0).getTime();
    if(!Number.isFinite(ms)||ms<=0)return "";
    return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit"}).format(new Date(ms)).slice(0,7);
  };
  function metrics(){
    const s=read();
    const records=Array.isArray(s.records)?s.records:[];
    const month=jstParts();
    const replacement=records.filter(r=>recordMonth(r)===month).reduce((sum,r)=>sum+Math.max(0,Number(r.saved)||Number(r.intendedYen)||0),0);
    const plan=["free","bronze","silver","gold"].includes(s?.pressroom?.plan)?s.pressroom.plan:"free";
    const fee=FEES[plan]||0;
    return {replacement,plan,fee,afterFee:Math.max(0,replacement-fee)};
  }
  function styles(){
    if(document.getElementById("mamoValuePanelStyle"))return;
    const st=document.createElement("style");st.id="mamoValuePanelStyle";st.textContent=`
      #mamoValuePanel{margin:14px 0 18px;border:1px solid #dbe3e6;border-top:5px solid #d7a62b;border-radius:16px;background:#fff;box-shadow:0 7px 18px rgba(8,35,61,.07);overflow:hidden}
      .mvp-head{padding:14px 15px 10px;background:linear-gradient(135deg,#fffdf7,#f7fbfb)}
      .mvp-head small{display:block;color:#9b7318;font-size:9px;font-weight:1000;letter-spacing:.12em}.mvp-head h3{margin:4px 0 3px;color:#08233d;font-size:21px}.mvp-head p{margin:0;color:#71828c;font-size:10px;line-height:1.6}
      .mvp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid #edf1f2}.mvp-grid div{padding:13px 10px;text-align:center;border-right:1px solid #edf1f2}.mvp-grid div:last-child{border-right:0}.mvp-grid span{display:block;color:#71828c;font-size:8px;font-weight:900;line-height:1.35}.mvp-grid strong{display:block;margin-top:5px;color:#08233d;font-size:19px;line-height:1.1}.mvp-grid .mvp-main strong{color:#0b9ea3}.mvp-grid .mvp-net strong{color:#b27d06}
      .mvp-note{padding:11px 14px;background:#f5f9f9;color:#536b76;font-size:10px;line-height:1.65;border-top:1px solid #e6eded}.mvp-note b{color:#08233d}.mvp-free{padding:11px 14px;background:#fff9e8;border-top:1px solid #f2e4b7;color:#76591b;font-size:10px;line-height:1.6}
      @media(max-width:390px){.mvp-grid strong{font-size:17px}.mvp-grid div{padding-left:6px;padding-right:6px}}
    `;document.head.appendChild(st);
  }
  function render(){
    const host=document.getElementById("membershipPanel");
    if(!host)return;
    let panel=document.getElementById("mamoValuePanel");
    if(!panel){panel=document.createElement("section");panel.id="mamoValuePanel";host.insertAdjacentElement("beforebegin",panel)}
    const m=metrics();
    const paid=m.fee>0;
    panel.innerHTML=`<div class="mvp-head"><small>MAMO VALUE / THIS MONTH</small><h3>今月、MAMOを通した金額。</h3><p>AIR BETへ置き換えた現金予定額と、現在のPILOTプランを並べています。</p></div>
      <div class="mvp-grid"><div class="mvp-main"><span>今月の現金置換額</span><strong>${fmt(m.replacement)}円</strong></div><div><span>${LABELS[m.plan]} 月額</span><strong>${fmt(m.fee)}円</strong></div><div class="mvp-net"><span>利用料を除いた置換額</span><strong>${paid?fmt(m.afterFee)+"円":"—"}</strong></div></div>
      ${paid?`<div class="mvp-note"><b>数字は事実だけ。</b> 「利益」や「儲け」ではなく、現金投票に使う予定だった金額をAIR BETへ置き換えた記録です。</div>`:`<div class="mvp-free">FREEでは利用料0円。まず記録を蓄積し、有料プランではMAMOが朝刊・週間・長期分析まで自動で整理する設計です。</div>`}`;
  }
  function boot(){styles();render();window.addEventListener("pageshow",render);window.addEventListener("mamo:analysis-rendered",render);document.addEventListener("click",e=>{if(e.target.closest?.("[data-pilot-plan],.plan-option,#nav-analysis"))setTimeout(render,80)},false);window.addEventListener("storage",e=>{if(e.key===KEY)render()});setInterval(()=>{if(document.getElementById("analysis")?.classList.contains("active"))render()},3000)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
