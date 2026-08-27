/* MAMO RECORD: show the settled race result before asking for a post-result feeling, and respect X dismiss. */
(()=>{
  "use strict";
  if(window.__MAMO_RECORD_RESULT_FIRST_V2__)return;
  window.__MAMO_RECORD_RESULT_FIRST_V2__=true;

  const AK="mamoboat_v40_personal",RK="mamoboat_record_v1";
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||"null")||f}catch(_){return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const fmt=v=>Math.round(Number(v)||0).toLocaleString("ja-JP");
  const bfmt=v=>`${fmt(v)}B`;
  const rid=r=>String(r?.id||[r?.time,r?.raceDate,r?.venueCode||r?.venue,r?.raceNo,r?.stake].filter(v=>v!=null&&v!=="").join(":"));
  const settled=r=>r?.settled===true||!!r?.resultEventAt||["hit","miss","refunded","won","lost"].includes(String(r?.status||"").toLowerCase());

  function eligible(){
    const app=read(AK,{}),s=read(RK,{}),records=Array.isArray(app.records)?app.records:[];
    s.reflections=s.reflections||{};
    s.postReflections=s.postReflections||{};
    return [...records].reverse().find(r=>{
      const id=rid(r);
      return id&&s.reflections[id]&&!s.postReflections[id]&&settled(r);
    })||null;
  }

  function resultCombo(r){
    const direct=String(r?.resultCombo||"").trim();
    if(direct)return direct;
    const order=Array.isArray(r?.resultOrder)?r.resultOrder:Array.isArray(r?.finishOrder)?r.finishOrder:null;
    if(order?.length)return order.slice(0,3).join("-");
    return "結果確定";
  }

  function airStatus(r){
    const status=String(r?.status||"").toLowerCase();
    if(["hit","won"].includes(status))return{label:"的中",tone:"hit"};
    if(status==="refunded")return{label:"返還",tone:"refund"};
    if(["miss","lost"].includes(status))return{label:"不的中",tone:"miss"};
    return{label:"結果確定",tone:"done"};
  }

  function betText(r){
    const lines=Array.isArray(r?.lines)?r.lines:[];
    if(!lines.length)return "買い目記録なし";
    const labels=lines.slice(0,3).map(line=>{
      const combo=Array.isArray(line?.combo)?line.combo.join("-"):String(line?.combo||"");
      return `${combo||"—"} / ${bfmt(line?.stake||0)}`;
    });
    return labels.join("　")+(lines.length>3?`　ほか${lines.length-3}点`:"");
  }

  function moneyText(r){
    const stake=Number(r?.stake??r?.intendedYen??0)||0;
    const payout=Number(r?.payoutC??0)||0;
    const refund=Number(r?.refundC??0)||0;
    const bits=[`参加 ${bfmt(stake)}`];
    if(payout>0)bits.push(`AIR払戻 +${bfmt(payout)}`);
    else if(refund>0)bits.push(`返還 +${bfmt(refund)}`);
    else bits.push("AIR払戻 0B");
    return bits.join(" ・ ");
  }

  function installStyle(){
    if(document.getElementById("mamoRecordResultFirstCss"))return;
    const s=document.createElement("style");
    s.id="mamoRecordResultFirstCss";
    s.textContent=`
      #mamoRecordResultFirst{margin:14px 0 4px;padding:13px;border:1px solid #dbe3e5;border-radius:14px;background:#f7faf9}
      #mamoRecordResultFirst .mrrf-kicker{display:block;color:#087d77;font-size:8px;font-weight:1000;letter-spacing:.12em;margin-bottom:7px}
      #mamoRecordResultFirst .mrrf-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      #mamoRecordResultFirst .mrrf-cell{padding:10px 11px;background:#fff;border:1px solid #e1e7e8;border-radius:11px}
      #mamoRecordResultFirst .mrrf-cell span{display:block;color:#75858b;font-size:8px;font-weight:900}
      #mamoRecordResultFirst .mrrf-cell strong{display:block;margin-top:2px;color:#08233d;font-size:22px;line-height:1.2}
      #mamoRecordResultFirst .mrrf-cell.hit strong{color:#a77709}
      #mamoRecordResultFirst .mrrf-cell.refund strong{color:#7453a8}
      #mamoRecordResultFirst .mrrf-bet{margin-top:8px;padding:9px 10px;background:#fff;border:1px solid #e1e7e8;border-radius:11px}
      #mamoRecordResultFirst .mrrf-bet span{display:block;color:#75858b;font-size:8px;font-weight:900}
      #mamoRecordResultFirst .mrrf-bet b{display:block;margin-top:3px;color:#18394a;font-size:10px;line-height:1.5}
      #mamoRecordResultFirst .mrrf-money{margin-top:7px;color:#586b73;font-size:9px;font-weight:800}
      #mamoRecordSheetBody .mr-q[data-mrrf-emotion]{margin-top:12px}
    `;
    document.head.appendChild(s);
  }

  function renderResultFirst(){
    const body=document.getElementById("mamoRecordSheetBody");
    if(!body)return;
    const title=body.querySelector(".mr-top h2");
    if(!title||!title.textContent.includes("結果を見た今"))return;
    if(body.querySelector("#mamoRecordResultFirst"))return;
    const r=eligible();
    if(!r)return;

    const status=airStatus(r);
    const card=document.createElement("section");
    card.id="mamoRecordResultFirst";
    card.setAttribute("aria-label","レース結果");
    card.innerHTML=`
      <span class="mrrf-kicker">RACE RESULT</span>
      <div class="mrrf-grid">
        <div class="mrrf-cell"><span>実着順</span><strong>${esc(resultCombo(r))}</strong></div>
        <div class="mrrf-cell ${esc(status.tone)}"><span>AIR結果</span><strong>${esc(status.label)}</strong></div>
      </div>
      <div class="mrrf-bet"><span>あなたのAIR BET</span><b>${esc(betText(r))}</b></div>
      <div class="mrrf-money">${esc(moneyText(r))}</div>
    `;
    body.querySelector(".mr-top")?.insertAdjacentElement("afterend",card);
    title.textContent="結果を見て、今は？";
    const q=body.querySelector(".mr-q");
    if(q){
      q.dataset.mrrfEmotion="1";
      const label=q.querySelector("b");
      if(label)label.textContent="結果を見て、いちばん近い気持ちを1つだけ";
    }
  }

  installStyle();
  const observe=()=>{
    const body=document.getElementById("mamoRecordSheetBody");
    if(!body)return false;
    new MutationObserver(()=>queueMicrotask(renderResultFirst)).observe(body,{childList:true,subtree:true});
    renderResultFirst();
    return true;
  };
  if(!observe()){
    const timer=setInterval(()=>{if(observe())clearInterval(timer)},250);
    setTimeout(()=>clearInterval(timer),10000);
  }

  document.addEventListener("click",e=>{
    const close=e.target.closest?.("#mamoRecordSheetBg [data-close]");
    if(!close)return;
    const title=document.querySelector("#mamoRecordSheetBody .mr-top h2")?.textContent||"";
    if(!title.includes("結果を見"))return;
    const r=eligible();
    if(!r)return;
    const id=rid(r),s=read(RK,{});
    s.postReflections=s.postReflections||{};
    if(!s.postReflections[id]){
      s.postReflections[id]={recordId:id,dismissed:true,recordedAt:new Date().toISOString(),status:r.status||null};
      write(RK,s);
    }
  },true);
})();
