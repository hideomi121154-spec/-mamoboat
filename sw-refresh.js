/* MAMO BOAT Service Worker refresh v5 — lightweight post-load brand module + SW refresh. */
(()=>{
  "use strict";

  const loadMamokamo=()=>{
    if(document.querySelector('script[data-mamo-mamokamo="1"]')) return;
    const script=document.createElement("script");
    script.src="mamokamo.js?v=20260818-1";
    script.async=true;
    script.dataset.mamoMamokamo="1";
    document.head.appendChild(script);
  };

  const register=async()=>{
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
