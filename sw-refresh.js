/* MAMO BOAT Service Worker refresh v8 — stable home layout + current JST date. */
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

  const lockHomeLayout=()=>{
    const hero=document.querySelector("#home .home-masthead .masthead-character");
    if(hero){
      hero.style.setProperty("position","absolute","important");
      hero.style.setProperty("inset","0","important");
      hero.style.setProperty("width","100%","important");
      hero.style.setProperty("height","100%","important");
      hero.style.setProperty("max-width","none","important");
      hero.style.setProperty("object-fit","cover","important");
      hero.style.setProperty("object-position",window.matchMedia("(max-width:390px)").matches?"53% 23%":"center 24%","important");
      hero.style.setProperty("transform",window.matchMedia("(max-width:390px)").matches?"translateX(7%)":"translateX(5%)","important");
    }
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
    lockHomeLayout();
    [250,800,1800,4000].forEach(ms=>setTimeout(lockHomeLayout,ms));
    setInterval(lockHomeLayout,60000);
    window.addEventListener("pageshow",lockHomeLayout);
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
