/* MAMO BOAT — MAMO RECORD passive result anchor */
(()=>{
  "use strict";
  if(window.__MAMO_RECORD_V5__)return;
  window.__MAMO_RECORD_V5__=true;

  const AK="mamoboat_v40_personal",RK="mamoboat_record_v1",CAP=50,R=10;
  let ready=false,active=null;
  const seen=new Set();
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||"null")||f}catch(_){return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const fmt=v=>Math.round(Number(v)||0).toLocaleString("ja-JP");
  const bfmt=v=>`${fmt(v)}B`;
  const day=()=>{try{return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}catch(_){return new Date().toISOString().slice(0,10)}};
  const id=r=>String(r?.id||[r?.time,r?.raceDate,r?.venueCode||r?.venue,r?.raceNo,r?.stake].filter(v=>v!=null&&v!=="").join(":"));
  const settled=r=>r?.settled===true||!!r?.resultEventAt||["hit","miss","refunded","won","lost"].includes(String(r?.status||"").toLowerCase());

  function state(){
    const s=read(RK,{balance:0,ledger:[],reflections:{},postReflections:{},skipReflections:{},seenRecordIds:[]});
    s.version=5;
    s.balance=Math.max(0,+s.balance||0);
    s.ledger=Array.isArray(s.ledger)?s.ledger:[];
    s.reflections=s.reflections||{};
    s.postReflections=s.postReflections||{};
    s.skipReflections=s.skipReflections||{};
    s.seenRecordIds=Array.isArray(s.seenRecordIds)?s.seenRecordIds:[];
    return s;
  }
  const earned=s=>s.ledger.filter(x=>x.day===day()&&+x.amount>0).reduce((a,x)=>a+(+x.amount||0),0);
  function award(s,key,type){
    if(s.ledger.some(x=>x.recordId===key&&x.type===type))return{amount:0,reason:"already"};
    const a=Math.max(0,Math.min(R,CAP-earned(s)));
    if(a){
      s.balance+=a;
      s.ledger.push({id:`mr-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,recordId:key,type,amount:a,day:day(),at:new Date().toISOString(),balanceAfter:s.balance});
    }
    return{amount:a,reason:a?"awarded":"daily_cap"};
  }
  function css(){
    if(document.getElementById("mr3css"))return;
    const s=document.createElement("style");
    s.id="mr3css";
    s.textContent=`#mamoRecordSummary{margin:10px 0 4px;padding:13px 14px;border:1px solid #dce4e5;border-left:5px solid #d2a23b;border-radius:13px;background:#fffdf8;display:flex;align-items:center;justify-content:space-between;gap:12px}#mamoRecordSummary small{display:block;color:#8b6a1d;font-size:8px;font-weight:1000;letter-spacing:.12em}#mamoRecordSummary b{display:block;color:#08233d;font-size:15px}#mamoRecordSummary strong{color:#a77709;font-size:25px}.mr-bg{position:fixed;inset:0;z-index:9999;background:#04141f6b;display:none;align-items:flex-end;justify-content:center}.mr-bg.show{display:flex}.mr-sheet{width:min(100%,560px);max-height:92dvh;overflow-y:auto;overscroll-behavior:contain;background:#fff;border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom))}.mr-top{display:flex;justify-content:space-between;gap:10px}.mr-top h2{margin:3px 0;color:#08233d}.mr-close{width:34px;height:34px;border:0;border-radius:50%}.mr-result{margin:14px 0 0;padding:13px;border:1px solid #dbe3e5;border-radius:14px;background:#f5f9fa}.mr-result-kicker{display:block;color:#a91e2b;font-size:8px;font-weight:1000;letter-spacing:.12em}.mr-result-head{display:flex;align-items:center;justify-content:space-between;margin:7px 0}.mr-result-head b{color:#08233d;font-size:12px}.mr-result-head small{color:#718188;font-size:8px;font-weight:900}.mr-finish{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.mr-place{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:2px 7px;min-width:0;padding:9px;background:#fff;border:1px solid #dce5e7;border-radius:11px}.mr-place>span{color:#72838a;font-size:8px;font-weight:1000}.mr-place>strong{grid-row:1/3;width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:#082f50;color:#fff;font-size:18px}.mr-place>small{overflow:hidden;color:#18394a;font-size:8px;font-weight:900;text-overflow:ellipsis;white-space:nowrap}.mr-result-none{grid-column:1/-1;padding:13px;text-align:center;background:#fff;border-radius:11px;color:#18394a;font-weight:1000}.mr-air-outcome{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:9px;padding:11px 12px;border-radius:11px;background:#eaf1f4}.mr-air-outcome small{display:block;color:#62767e;font-size:8px;font-weight:1000;letter-spacing:.1em}.mr-air-outcome strong{display:block;color:#08233d;font-size:19px}.mr-air-outcome>b{color:#08233d;font-size:14px}.mr-air-outcome.hit{background:#fff4d8;border:1px solid #d9ad41}.mr-air-outcome.hit strong,.mr-air-outcome.hit>b{color:#9d6b00}.mr-air-outcome.refund{background:#f4effb;border:1px solid #b9a1d7}.mr-bet-receipt{margin-top:9px;padding:10px 11px;background:#fff;border:1px solid #dfe6e7;border-radius:11px}.mr-bet-receipt>span{display:block;color:#72838a;font-size:8px;font-weight:1000}.mr-bet-line{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:5px;color:#18394a;font-size:9px;font-weight:900}.mr-bet-line b{color:#08233d}.mr-bet-more{display:block;margin-top:5px;color:#72838a;font-size:8px;font-weight:900}.mr-money{display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:7px;margin-top:9px;padding-top:8px;border-top:1px solid #e2e8e9}.mr-money div{min-width:0}.mr-money span{display:block;color:#72838a;font-size:8px;font-weight:900}.mr-money strong{display:block;color:#08233d;font-size:15px}.mr-money>i{align-self:center;color:#87969b;font-style:normal;font-weight:1000}.mr-observe{margin-top:12px;padding:13px;border:1px solid #d7e3e8;border-radius:13px;background:#f7fafc}.mr-observe>b{display:block;color:#08233d;font-size:14px}.mr-observe>p{margin:5px 0 10px;color:#5d707a;font-size:10px;line-height:1.6}.mr-observe-flow{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:5px;align-items:center;margin:8px 0 12px}.mr-observe-flow span{padding:8px 5px;border-radius:9px;background:#e9f1f5;color:#153a53;font-size:8px;font-weight:1000;text-align:center}.mr-observe-flow i{color:#cf1d2b;font-style:normal;font-weight:1000}.mr-observe button{width:100%;min-height:48px;border:0;border-radius:11px;background:#082f50;color:#fff;font-weight:1000}.mr-foot{text-align:center;font-size:9px;color:#718188;margin-top:10px}.mr-done{text-align:center;padding:22px}.mr-done strong{display:block;font-size:42px;color:#a77709}.mr-toast{position:fixed;left:50%;bottom:calc(88px + env(safe-area-inset-bottom));z-index:10020;transform:translate(-50%,14px);opacity:0;pointer-events:none;background:#08233d;color:#fff;border:2px solid #d2a23b;border-radius:999px;padding:9px 14px;font-size:12px;font-weight:1000;transition:.2s}.mr-toast.show{opacity:1;transform:translate(-50%,0)}`;
    document.head.appendChild(s);
  }
  function sheet(){
    let b=document.getElementById("mamoRecordSheetBg");
    if(b)return b;
    b=document.createElement("div");
    b.id="mamoRecordSheetBg";
    b.className="mr-bg";
    b.innerHTML='<div class="mr-sheet"><div id="mamoRecordSheetBody"></div></div>';
    document.body.appendChild(b);
    return b;
  }
  function close(){sheet().classList.remove("show");active=null}
  function head(r,t){return `<div class="mr-top"><div><small>MAMO RECORD</small><h2>${t}</h2><p>${esc(r?.venue||"")} ${esc(r?.raceNo||"")}R</p></div><button class="mr-close" data-close aria-label="閉じる">×</button></div>`}
  const betTypeLabel=type=>({trifecta:"3連単",trio:"3連複",exacta:"2連単",quinella:"2連複",wide:"拡連複",win:"単勝",place:"複勝"})[String(type||"")]||"AIR BET";
  function finishBoats(r){
    const direct=String(r?.resultCombo||"").match(/\d+/g)?.map(Number).filter(n=>n>=1&&n<=6)||[];
    if(direct.length)return direct.slice(0,3);
    const order=Array.isArray(r?.resultOrder)?r.resultOrder:Array.isArray(r?.finishOrder)?r.finishOrder:[];
    return order.map(item=>Number(item?.boatNumber??item)).filter(n=>n>=1&&n<=6).slice(0,3);
  }
  function racerName(r,boat){
    const entry=(Array.isArray(r?.entrySnapshot)?r.entrySnapshot:[]).find(item=>Number(item?.boatNumber)===Number(boat));
    return String(entry?.name||`${boat}号艇`);
  }
  function outcome(r){
    const status=String(r?.status||"").toLowerCase(),payout=Number(r?.payoutC)||0;
    if(["hit","won"].includes(status))return{label:"的中",tone:"hit",amount:`+${bfmt(payout)}`};
    if(status==="refunded")return{label:"返還",tone:"refund",amount:`+${bfmt(payout)}`};
    return{label:"不的中",tone:"miss",amount:"払戻 0B"};
  }
  function resultHtml(r){
    const boats=finishBoats(r),status=outcome(r),lines=Array.isArray(r?.lines)?r.lines:[];
    const finish=boats.length
      ?boats.map((boat,index)=>`<div class="mr-place"><strong>${boat}</strong><span>${index+1}着</span><small>${esc(racerName(r,boat))}</small></div>`).join("")
      :`<div class="mr-result-none">${String(r?.resultCombo||"").includes("不成立")?"レース不成立":"公式結果 確定"}</div>`;
    const betLines=lines.length
      ?lines.slice(0,3).map(line=>{const combo=(Array.isArray(line?.combo)?line.combo:[]).join("-")||"—";return `<div class="mr-bet-line"><span>${esc(betTypeLabel(line?.betType))} ${esc(combo)}</span><b>${bfmt(line?.stake||0)}</b></div>`}).join("")
      :'<div class="mr-bet-line"><span>買い目記録なし</span><b>—</b></div>';
    const stake=Number(r?.stake)||lines.reduce((sum,line)=>sum+(Number(line?.stake)||0),0),payout=Number(r?.payoutC)||0;
    return `<section class="mr-result" aria-label="実レース結果とAIR BET結果">
      <span class="mr-result-kicker">OFFICIAL RACE RESULT</span>
      <div class="mr-result-head"><b>確定着順</b><small>公式結果</small></div>
      <div class="mr-finish">${finish}</div>
      <div class="mr-air-outcome ${esc(status.tone)}"><div><small>AIR BET RESULT</small><strong>${esc(status.label)}</strong></div><b>${esc(status.amount)}</b></div>
      <div class="mr-bet-receipt"><span>あなたの買い目</span>${betLines}${lines.length>3?`<small class="mr-bet-more">ほか${lines.length-3}点</small>`:""}
        <div class="mr-money"><div><span>参加</span><strong>${bfmt(stake)}</strong></div><i>→</i><div><span>${status.tone==="refund"?"返還":"払戻"}</span><strong>${bfmt(payout)}</strong></div></div>
      </div>
    </section>`;
  }
  function showPost(r){
    active=r;
    document.getElementById("mamoRecordSheetBody").innerHTML=head(r,"結果と、その次の行動")+resultHtml(r)+'<div class="mr-observe"><b>ここからは、質問せずに行動を見ます。</b><p>次のレースを開くまで、次のAIR BETまで、公式サイトへ移動して戻るまでを同じ流れとして記録します。</p><div class="mr-observe-flow" aria-label="自動記録する流れ"><span>結果確認</span><i>→</i><span>次の閲覧</span><i>→</i><span>AIR / 公式</span></div><button type="button" data-result-observed>結果を確認した</button></div><div class="mr-foot">気持ちや依存度は直接質問しません</div>';
    sheet().classList.add("show");
    try{window.dispatchEvent(new CustomEvent("mamo:result-observed",{detail:{record:r,source:"result_sheet_shown",at:new Date().toISOString()}}))}catch(_){}
  }
  function track(n,p,r){
    const a=window.MAMO_DECISION_EVENTS;
    try{(a?.track||a?.send)?.(n,p,{screen:"race",raceDate:r?.raceDate||day(),venueCode:r?.venueCode||null,raceNo:r?.raceNo||null})}catch(_){}
  }
  function captureAirBet(r,reward=true){
    const rid=id(r);
    if(!rid)return;
    const s=state();
    if(s.reflections[rid])return;
    s.reflections[rid]={
      recordId:rid,
      source:"passive_behavior_observation",
      recordedAt:r?.time||new Date().toISOString()
    };
    const a=reward?award(s,rid,"air_bet_recorded"):{amount:0,reason:"backfill"};
    write(RK,s);
    if(reward)track("mamo_record_air_bet_observed",{record_id:rid,observation_version:Number(r?.observationVersion)||1,record_awarded:a.amount},r);
    summary();
  }
  function done(a){
    document.getElementById("mamoRecordSheetBody").innerHTML=`<div class="mr-done"><small>RECORD COMPLETE</small><strong>${a.amount?`+${a.amount}R`:"記録済み"}</strong><h3>${a.reason==="daily_cap"?"今日の上限に到達":"あとはMAMOがまとめます。"}</h3></div>`;
    summary();
    setTimeout(close,1100);
  }
  function toast(text){
    let t=document.getElementById("mamoRecordToast");
    if(!t){t=document.createElement("div");t.id="mamoRecordToast";t.className="mr-toast";document.body.appendChild(t)}
    t.textContent=text;t.classList.add("show");clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove("show"),1500);
  }
  function confirmResult(){
    if(!active)return;
    const rid=id(active),s=state();
    if(s.postReflections[rid])return done({amount:0,reason:"already"});
    s.postReflections[rid]={recordId:rid,observed:true,recordedAt:new Date().toISOString(),status:active.status,source:"result_check"};
    const a=award(s,rid,"result_observation_complete");
    write(RK,s);
    track("mamo_record_result_observation_completed",{record_id:rid,status:active.status,record_awarded:a.amount},active);
    done(a);
  }
  function rewardSkip(button){
    const app=read(AK,{}),reason=String(button?.dataset?.decisionSkipReason||"other"),raceDate=window.MamoCore?.jstDate?.()||day(),venueCode=String(app.venue||""),raceNo=Number(app.raceNo)||0;
    if(!venueCode||!raceNo)return;
    const key=`skip:${raceDate}:${venueCode}:${raceNo}`,s=state();
    if(s.skipReflections[key]){toast("この見送りは記録済み");return}
    s.skipReflections[key]={key,reason,raceDate,venueCode,raceNo,recordedAt:new Date().toISOString()};
    const a=award(s,key,"skip_reflection_complete");
    write(RK,s);
    track("mamo_record_skip_reflection_completed",{skip_key:key,reason,record_awarded:a.amount,reward_basis:"skip_reason_recording_only"},{raceDate,venueCode,raceNo});
    summary();
    toast(a.amount?`見送りを記録 +${a.amount}R`:a.reason==="daily_cap"?"見送りを記録・今日の上限到達":"見送りを記録済み");
  }
  function click(e){
    const skip=e.target.closest?.("[data-decision-skip-reason]");
    if(skip){setTimeout(()=>rewardSkip(skip),0);return}
    if(e.target.closest?.("[data-close]"))return close();
    if(e.target.closest?.("[data-result-observed]")&&active)return confirmResult();
  }
  function summary(){
    const stats=document.getElementById("home")?.querySelector(".three-stats");
    if(!stats)return;
    let p=document.getElementById("mamoRecordSummary");
    if(!p){p=document.createElement("div");p.id="mamoRecordSummary";stats.insertAdjacentElement("afterend",p)}
    const s=state();
    p.innerHTML=`<div><small>MAMO RECORD</small><b>結果確認・見送り・行動の流れを記録。</b><span style="display:block;font-size:8px;color:#7c8a90">今日 ${earned(s)}/${CAP}R</span></div><strong>${s.balance.toLocaleString("ja-JP")}R</strong>`;
  }
  function scan(){
    const records=read(AK,{}).records||[],s=state(),persist=new Set(s.seenRecordIds);
    if(!ready){
      records.forEach(r=>{const x=id(r);if(!x)return;seen.add(x);persist.add(x);captureAirBet(r,false)});
      ready=true;
    }else{
      for(const r of records){
        const x=id(r);
        if(!x||seen.has(x)||persist.has(x))continue;
        seen.add(x);persist.add(x);captureAirBet(r,true);
      }
    }
    const latest=state();
    latest.seenRecordIds=[...persist].slice(-3000);
    write(RK,latest);
    if(active||document.hidden)return;
    const c=[...records].reverse().find(r=>{const x=id(r);return x&&!latest.postReflections[x]&&settled(r)});
    if(c)setTimeout(()=>{if(!active)showPost(c)},300);
  }
  function boot(){
    css();sheet();document.addEventListener("click",click,false);summary();scan();setInterval(scan,1000);
    window.addEventListener("pageshow",()=>{summary();scan()});
    window.MAMO_RECORD=Object.freeze({version:5,balance:()=>state().balance,state,dailyCap:CAP,activeRecord:()=>active});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
