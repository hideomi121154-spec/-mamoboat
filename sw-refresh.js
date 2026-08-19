/* MAMO BOAT Service Worker refresh v6 — lightweight post-load brand module + SW refresh. */
(()=>{
  "use strict";

  const installApprovedHomeHero=()=>{
    if(document.getElementById("mamoApprovedHomeHero")) return;
    const style=document.createElement("style");
    style.id="mamoApprovedHomeHero";
    style.textContent=`
      .home-masthead .masthead-character{
        transform:scale(1.78)!important;
        transform-origin:100% 55%!important;
        object-position:68% 24%!important;
      }
      @media (max-width:520px){
        .home-masthead .masthead-character{
          transform:scale(1.78)!important;
          transform-origin:100% 55%!important;
          object-position:68% 24%!important;
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
    installApprovedHomeHero();
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
