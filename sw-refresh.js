/* MAMO BOAT Service Worker refresh v9 — SW refresh + current JST date only. */
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
    syncHomeToday();
    [250,800,1800,4000].forEach(ms=>setTimeout(syncHomeToday,ms));
    setInterval(syncHomeToday,60000);
    window.addEventListener("pageshow",syncHomeToday);
    loadMamokamo();
    if(!("serviceWorker" in navigator)) return;
    try{
      const reg=await navigator.serviceWorker.register("./sw.js",{scope:"./",updateViaCache:"none"});
      const refresh=()=>reg.update().catch(()=>{});
      if("requestIdleCallback" in window) requestIdleCallback(refresh,{timeout:4000});
      else setTimeout(refresh,2500);
    }catch(e){console.warn("MAMO SW refresh failed",e)}
  };

  if(document.readyState==="complete") register();
  else window.addEventListener("load",register,{once:true});
})();
