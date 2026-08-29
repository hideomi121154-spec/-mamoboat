/* MAMO BOAT — MAMO RECORD Phase 1 + 2 + 3 */
(()=>{
  "use strict";
  if(window.__MAMO_RECORD_V4__)return;
  window.__MAMO_RECORD_V4__=true;

  const AK="mamoboat_v40_personal",RK="mamoboat_record_v1",CAP=50,R=10;
  let ready=false,active=null;
  const seen=new Set();
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||"null")||f}catch(_){return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
  const day=()=>{try{return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}catch(_){return new Date().toISOString().slice(0,10)}};
  const id=r=>String(r?.id||[r?.time,r?.raceDate,r?.venueCode||r?.venue,r?.raceNo,r?.stake].filter(v=>v!=null&&v!=="").join(":"));
  const settled=r=>r?.settled===true||!!r?.resultEventAt||["hit","miss","refunded","won","lost"].includes(String(r?.status||"").toLowerCase());

  function state(){
    const s=read(RK,{balance:0,ledger:[],reflections:{},postReflections:{},skipReflections:{},seenRecordIds:[]});
    s.version=4;
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
    s.textContent=`#mamoRecordSummary{margin:10px 0 4px;padding:13px 14px;border:1px solid #dce4e5;border-left:5px solid #d2a23b;border-radius:13px;background:#fffdf8;display:flex;align-items:center;justify-content:space-between;gap:12px}#mamoRecordSummary small{display:block;color:#8b6a1d;font-size:8px;font-weight:1000;letter-spacing:.12em}#mamoRecordSummary b{display:block;color:#08233d;font-size:15px}#mamoRecordSummary strong{color:#a77709;font-size:25px}.mr-bg{position:fixed;inset:0;z-index:9999;background:#04141f6b;display:none;align-items:flex-end;justify-content:center}.mr-bg.show{display:flex}.mr-sheet{width:min(100%,560px);background:#fff;border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom))}.mr-top{display:flex;justify-content:space-between;gap:10px}.mr-top h2{margin:3px 0;color:#08233d}.mr-close{width:34px;height:34px;border:0;border-radius:50%}.mr-q{margin-top:16px;padding:13px;border:1px solid #e1e7e8;border-radius:13px}.mr-emotions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mr-emotions button{min-height:44px;border:1px solid #d7e0e1;border-radius:10px;background:#fff;font-weight:900}.mr-foot{text-align:center;font-size:9px;color:#718188;margin-top:10px}.mr-done{text-align:center;padding:22px}.mr-done strong{display:block;font-size:42px;color:#a77709}.mr-toast{position:fixed;left:50%;bottom:calc(88px + env(safe-area-inset-bottom));z-index:10020;transform:translate(-50%,14px);opacity:0;pointer-events:none;background:#08233d;color:#fff;border:2px solid #d2a23b;border-radius:999px;padding:9px 14px;font-size:12px;font-weight:1000;transition:.2s}.mr-toast.show{opacity:1;transform:translate(-50%,0)}`;
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
  function head(r,t){return `<div class="mr-top"><div><small>MAMO RECORD</small><h2>${t}</h2><p>${r?.venue||""} ${r?.raceNo||""}R</p></div><button class="mr-close" data-close>×</button></div>`}
  function showPost(r){
    active=r;
    document.getElementById("mamoRecordSheetBody").innerHTML=head(r,"結果を見て、今は？")+'<div class="mr-q"><b>いちばん近い気持ちを1つだけ</b><div class="mr-emotions"><button data-emotion="satisfied">納得した</button><button data-emotion="frustrated">悔しい</button><button data-emotion="chase">取り返したい</button><button data-emotion="neutral">特になし</button></div></div><div class="mr-foot">1タップで完了</div>';
    sheet().classList.add("show");
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
    const confidence=Number(r?.conf),cashUrge=Number(r?.urge);
    s.reflections[rid]={
      recordId:rid,
      conviction:Number.isFinite(confidence)?confidence/2:null,
      confidence:Number.isFinite(confidence)?confidence:null,
      cashUrge:Number.isFinite(cashUrge)?cashUrge/2:null,
      cashUrgeRaw:Number.isFinite(cashUrge)?cashUrge:null,
      sourceScale:10,
      source:"air_bet_confirmation",
      recordedAt:r?.time||new Date().toISOString()
    };
    const a=reward?award(s,rid,"air_bet_recorded"):{amount:0,reason:"backfill"};
    write(RK,s);
    if(reward)track("mamo_record_air_bet_captured",{record_id:rid,confidence:Number.isFinite(confidence)?confidence:null,cash_urge:Number.isFinite(cashUrge)?cashUrge:null,record_awarded:a.amount},r);
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
  function post(emotion){
    if(!active)return;
    const rid=id(active),s=state();
    if(s.postReflections[rid])return done({amount:0,reason:"already"});
    s.postReflections[rid]={recordId:rid,emotion,recordedAt:new Date().toISOString(),status:active.status};
    const a=award(s,rid,"result_reflection_complete");
    write(RK,s);
    track("mamo_record_result_reflection_completed",{record_id:rid,emotion,status:active.status,record_awarded:a.amount},active);
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
    const em=e.target.closest?.("[data-emotion]");
    if(em&&active)return post(em.dataset.emotion);
  }
  function summary(){
    const stats=document.getElementById("home")?.querySelector(".three-stats");
    if(!stats)return;
    let p=document.getElementById("mamoRecordSummary");
    if(!p){p=document.createElement("div");p.id="mamoRecordSummary";stats.insertAdjacentElement("afterend",p)}
    const s=state();
    p.innerHTML=`<div><small>MAMO RECORD</small><b>気持ち・振り返り・見送りを記録。</b><span style="display:block;font-size:8px;color:#7c8a90">今日 ${earned(s)}/${CAP}R</span></div><strong>${s.balance.toLocaleString("ja-JP")}R</strong>`;
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
    if(active)return;
    const c=[...records].reverse().find(r=>{const x=id(r);return x&&!latest.postReflections[x]&&settled(r)});
    if(c)setTimeout(()=>{if(!active)showPost(c)},300);
  }
  function boot(){
    css();sheet();document.addEventListener("click",click,false);summary();scan();setInterval(scan,1000);
    window.addEventListener("pageshow",()=>{summary();scan()});
    window.MAMO_RECORD=Object.freeze({version:4,balance:()=>state().balance,state,dailyCap:CAP});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
