/* MAMO BOAT bottom nav stability v2 — no continuous observers. */
(()=>{
  "use strict";
  if(window.__MAMO_NAV_STABILITY_V2__) return;
  window.__MAMO_NAV_STABILITY_V2__=true;

  function stabilize(){
    const nav=document.querySelector('.bottom-nav');
    if(!nav) return;
    if(nav.parentElement!==document.body) document.body.appendChild(nav);
    nav.style.position='fixed';
    nav.style.left='0';
    nav.style.right='0';
    nav.style.bottom='0';
    nav.style.top='auto';
    nav.style.margin='0 auto';
    nav.style.transform='none';
    nav.style.width='min(720px, 100%)';
    nav.style.maxWidth='100vw';
    nav.style.zIndex='90';
    nav.style.contain='layout paint';
    nav.style.willChange='auto';
    document.documentElement.style.setProperty('--mamo-bottom-nav-space','92px');
    const shell=document.querySelector('.app-shell');
    if(shell) shell.style.paddingBottom='calc(var(--mamo-bottom-nav-space) + env(safe-area-inset-bottom))';
  }

  function boot(){
    stabilize();
    window.addEventListener('pageshow',stabilize,{passive:true});
    window.addEventListener('orientationchange',()=>setTimeout(stabilize,120),{passive:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();