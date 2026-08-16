/* MAMO BOAT Service Worker refresh v1 */
(()=>{
  "use strict";
  if(!("serviceWorker" in navigator)) return;
  const register=async()=>{
    try{
      const reg=await navigator.serviceWorker.register("./sw.js",{scope:"./",updateViaCache:"none"});
      await reg.update();
      if(reg.waiting){try{reg.waiting.postMessage({type:"SKIP_WAITING"})}catch(_){}}
    }catch(e){console.warn("MAMO SW refresh failed",e)}
  };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",register,{once:true}); else register();
  window.addEventListener("pageshow",()=>register());
})();