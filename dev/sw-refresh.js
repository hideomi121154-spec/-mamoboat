/* MAMO BOAT Service Worker refresh v15 — SW refresh + current JST date + compact plan tiers + modal back button + MAMO STORY. */
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
        display:none !important;height:0 !important;min-height:0 !important;max-height:0 !important;
        margin:0 !important;padding:0 !important;border:0 !important;overflow:hidden !important;
      }
      body:not([data-mamo-plan="gold"]) #analysis.active > .paper-tabs,
      body:not([data-mamo-plan="gold"]) #analysis.active > .section-head:has(+ .paper-tabs) {
        display:none !important;margin:0 !important;padding:0 !important;min-height:0 !important;
      }
    `;
    document.head.appendChild(style);
  };

  const installBetModalBackButton=()=>{
    if(!document.getElementById("mamoBetModalBackStyle")){
      const style=document.createElement("style");
      style.id="mamoBetModalBackStyle";
      style.textContent=`.mamo-bet-modal-back{display:inline-flex;align-items:center;gap:6px;margin:0 0 14px;padding:8px 12px;border:1px solid #cfd9e1;border-radius:999px;background:#fff;color:#08233d;font:900 14px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 2px 7px rgba(8,35,61,.06);cursor:pointer}.mamo-bet-modal-back:active{transform:translateY(1px);background:#f5f8fa}`;
      document.head.appendChild(style);
    }
    const sync=()=>{
      const bg=document.getElementById("modalBg");
      if(!bg?.classList.contains("show")) return;
      const modal=bg.querySelector(".modal");
      if(!modal || modal.querySelector(".mamo-bet-modal-back")) return;
      const text=modal.textContent||"";
      if(!text.includes("購入内容") || !text.includes("この選択への自分の納得度")) return;
      const button=document.createElement("button");
      button.type="button";button.className="mamo-bet-modal-back";button.textContent="← 戻る";
      button.setAttribute("aria-label","購入確認を閉じてレース画面へ戻る");
      button.addEventListener("click",()=>window.closeModal?.());modal.prepend(button);
    };
    sync();
    const root=document.getElementById("modalBg") || document.body;
    const observer=new MutationObserver(sync);
    observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
  };

  const syncHomeToday=()=>{const date=document.getElementById("homeDateText");if(date) date.textContent=currentJstLabel();};
  const loadMamokamo=()=>{if(document.querySelector('script[data-mamo-mamokamo="1"]')) return;const script=document.createElement("script");script.src="mamokamo.js?v=20260818-1";script.async=true;script.dataset.mamoMamokamo="1";document.head.appendChild(script);};
  const loadMamoStory=()=>{if(document.querySelector('script[data-mamo-story="1"]')) return;const script=document.createElement("script");script.src="mamo-story.js?v=20260822-6";script.async=true;script.dataset.mamoStory="1";document.head.appendChild(script);};

  const register=async()=>{
    installPlanCollapseFix();installBetModalBackButton();syncHomeToday();
    [250,800,1800,4000].forEach(ms=>setTimeout(syncHomeToday,ms));
    setInterval(syncHomeToday,60000);
    window.addEventListener("pageshow",()=>{installPlanCollapseFix();syncHomeToday();});
    loadMamokamo();loadMamoStory();
    if(!("serviceWorker" in navigator)) return;
    try{
      const reg=await navigator.serviceWorker.register("./sw.js",{scope:"./",updateViaCache:"none"});
      const refresh=()=>reg.update().catch(()=>{});
      if("requestIdleCallback" in window) requestIdleCallback(refresh,{timeout:4000});
      else setTimeout(refresh,2500);
    }catch(e){console.warn("MAMO SW refresh failed",e)}
  };
  installPlanCollapseFix();loadMamoStory();
  if(document.readyState==="complete") register(); else window.addEventListener("load",register,{once:true});
})();