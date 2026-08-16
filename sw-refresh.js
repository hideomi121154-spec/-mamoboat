/* MAMO BOAT Service Worker refresh v2 — do not compete with startup rendering. */
(()=>{
  "use strict";
  if(!("serviceWorker" in navigator)) return;
  const register=async()=>{
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