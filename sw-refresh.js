/* MAMO BOAT Service Worker refresh v10 — SW refresh + current JST date + compact plan tiers. */
(()=>{
  "use strict";

  const currentJstLabel=()=>{
    const parts=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{
      timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"
    }).formatToParts(new Date()).map(p=>[p.type,p.value]));
    const y=Number(parts.year),m=Number(parts.month),d=Number(parts.day);
    const weekday=["SUN","MON","TUE","WED","THU","FRI","SAT"][new Date(Date.UTC(y,m-1,d)).getUTCDay()];
    return `${parts.year}.${parts.month}.${parts.day} ${weekday}`;
  };

  const installPlanCollapseFix=()=>{
    if(document.getElementById("mamoPlanCollapseFix")) return;
    const style=document.createElement("style");
    style.id="mamoPlanCollapseFix";
    style.textContent=`
      /* Do not reserve tall empty frames for features unavailable on the selected plan. */
      body[data-mamo-plan="free"] #mamoAiSafeReport,
      body[data-mamo-plan="free"] #mamoDecisionPanel,
      body[data-mamo-plan="free"] #mamoBaselinePanel,
      body[data-mamo-plan="free"] #mamoTriggerPanel,
      body[data-mamo-plan="free"] #mamoPeriodTriggerSummary,
      body[data-mamo-plan="bronze"] #mamoDecisionPanel,
      body[data-mamo-plan="bronze"] #mamoBaselinePanel,
      body[data-mamo-plan="bronze"] #mamoTriggerPanel,
      body[data-mamo-plan="bronze"] #mamoPeriodTriggerSummary,
      body:not([data-mamo-plan="gold"]) #pressPaper,
      body:not([data-mamo-plan="gold"]) #mamoPressIntel,
      body:not([data-mamo-plan="gold"]) #homePressTeaser {
        display:none !important;
        height:0 !important;
        min-height:0 !important;
        max-height:0 !important;
        margin:0 !important;
        padding:0 !important;
        border:0 !important;
        overflow:hidden !important;
      }

      body:not([data-mamo-plan="gold"]) #analysis.active > .paper-tabs,
      body:not([data-mamo-plan="gold"]) #analysis.active > .section-head:has(+ .paper-tabs) {
        display:none !important;
        margin:0 !important;
        padding:0 !important;
        min-height:0 !important;
      }
    `;
    document.head.appendChild(style);
  };

  const syncHomeToday=()=>{
    const date=document.getElementById("homeDateText");
    if(date) date.textContent=currentJstLabel();
  };

  const loadMamokamo=()=>{
    if(document.querySelector('script[data-mamo-mamokamo="1"]')) return;
    const script=document.createElement("script");
    script.src="mamokamo.js?v=20260818-1";
    script.async=true;
    script.dataset.mamoMamokamo="1";
    document.head.appendChild(script);
  };

  const register=async()=>{
    installPlanCollapseFix();
    syncHomeToday();
    [250,800,1800,4000].forEach(ms=>setTimeout(syncHomeToday,ms));
    setInterval(syncHomeToday,60000);
    window.addEventListener("pageshow",()=>{
      installPlanCollapseFix();
      syncHomeToday();
    });
    loadMamokamo();
    if(!("serviceWorker" in navigator)) return;
    try{
      const reg=await navigator.serviceWorker.register("./sw.js",{scope:"./",updateViaCache:"none"});
      const refresh=()=>reg.update().catch(()=>{});
      if("requestIdleCallback" in window) requestIdleCallback(refresh,{timeout:4000});
      else setTimeout(refresh,2500);
    }catch(e){console.warn("MAMO SW refresh failed",e)}
  };

  installPlanCollapseFix();
  if(document.readyState==="complete") register();
  else window.addEventListener("load",register,{once:true});
})();
