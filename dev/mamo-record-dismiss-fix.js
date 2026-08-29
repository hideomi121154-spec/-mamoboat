/* MAMO RECORD: remember an intentional X dismiss for a settled result check. */
(()=>{
  "use strict";
  if(window.__MAMO_RECORD_DISMISS_V4__)return;
  window.__MAMO_RECORD_DISMISS_V4__=true;

  const AK="mamoboat_v40_personal",RK="mamoboat_record_v1";
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||"null")||f}catch(_){return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
  const rid=r=>String(r?.id||[r?.time,r?.raceDate,r?.venueCode||r?.venue,r?.raceNo,r?.stake].filter(v=>v!=null&&v!=="").join(":"));
  const settled=r=>r?.settled===true||!!r?.resultEventAt||["hit","miss","refunded","won","lost"].includes(String(r?.status||"").toLowerCase());

  function eligible(){
    const app=read(AK,{}),s=read(RK,{}),records=Array.isArray(app.records)?app.records:[];
    s.postReflections=s.postReflections||{};
    return [...records].reverse().find(r=>{
      const id=rid(r);
      return id&&!s.postReflections[id]&&settled(r);
    })||null;
  }

  document.addEventListener("click",e=>{
    const close=e.target.closest?.("#mamoRecordSheetBg [data-close]");
    if(!close)return;
    if(!document.querySelector("#mamoRecordSheetBody .mr-result"))return;
    const r=eligible();
    if(!r)return;
    const id=rid(r),s=read(RK,{});
    s.postReflections=s.postReflections||{};
    if(!s.postReflections[id]){
      s.postReflections[id]={recordId:id,dismissed:true,recordedAt:new Date().toISOString(),status:r.status||null,source:"result_sheet_dismissed"};
      write(RK,s);
    }
  },true);
})();
