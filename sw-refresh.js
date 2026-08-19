/* MAMO BOAT Service Worker refresh v4 — lightweight post-load brand module + SW refresh. */
(()=>{
  "use strict";

  const installHomeMamoruScale=()=>{
    if(document.getElementById("mamoHomeMamoruScale")) return;
    const style=document.createElement("style");
    style.id="mamoHomeMamoruScale";
    style.textContent=`
      /* Home only: enlarge Mamoru without changing masthead/card/layout dimensions. */
      .home-masthead .masthead-character{
        transform:translateX(14%) scale(1.55)!important;
        transform-origin:68% 56%!important;
      }
      @media (max-width:390px){
        .home-masthead .masthead-character{
          transform:translateX(16%) scale(1.55)!important;
          transform-origin:68% 56%!important;
        }
      }
    `;
    document.head.appendChild(style);
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
    installHomeMamoruScale();
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