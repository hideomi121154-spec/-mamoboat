/* MAMO BOAT Visual Refresh v2 — premium white/navy/gold editorial system. */
(() => {
  "use strict";
  if (window.__MAMO_VISUAL_REFRESH_V2__) return;
  window.__MAMO_VISUAL_REFRESH_V2__ = true;

  function installNavIcons(){
    const icons={
      home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.8 12 3l9 7.8v9.2h-6v-6H9v6H3z"/></svg>',
      venues:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V3m1 2h10l-2.2 3L16 11H6z"/></svg>',
      race:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14h16l-2 5H6zm3-4h10l-2-4H9zm5-7v3"/><path d="M3 21h18"/></svg>',
      records:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M6 18V9h3v9m3 0V5h3v13m3 0v-6h3v6"/></svg>',
      analysis:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19c5-1 10-6 13-14 2 6 0 12-5 15-3 2-6 1-8-1z"/><path d="M7 18c3-3 6-5 10-7"/></svg>',
      settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M4.9 4.9 7 7m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17m10-10 2.1-2.1"/></svg>'
    };
    Object.entries(icons).forEach(([id,svg])=>{
      const b=document.querySelector(`#nav-${id} b`);
      if(b && !b.dataset.premiumIcon){ b.innerHTML=svg; b.dataset.premiumIcon="1"; }
    });
  }

  const style=document.createElement("style");
  style.id="mamoVisualRefreshV2";
  style.textContent=`
    :root{
      --navy:#08233d;--navy-2:#103451;--teal:#0aa39a;--teal-dark:#087d77;
      --gold:#d8a12a;--gold-soft:#f4dfaa;--coral:#f25d50;--royal:#3567c9;
      --paper:#f7f4ed;--paper-2:#fffefa;--ink:#10263b;--muted:#6e7b85;
      --line:#d9dee0;--soft-line:#e8e4db;--shadow-soft:0 6px 18px rgba(8,35,61,.08);
    }
    html,body{overflow-x:hidden!important;max-width:100%!important}
    html{background:#efece5}
    body{background:linear-gradient(180deg,#fff 0,#faf8f3 22%,#f7f4ed 100%);color:var(--ink);touch-action:pan-y}
    .app-shell,.app-shell>main,.screen{max-width:100%!important;overflow-x:hidden!important}
    .app-shell{background:rgba(255,254,250,.98);box-shadow:0 0 36px rgba(8,35,61,.07)}

    /* Premium white header */
    .topbar{background:rgba(255,255,255,.97)!important;color:var(--navy)!important;border-bottom:1px solid #e8e1d3!important;box-shadow:0 3px 14px rgba(8,35,61,.06)!important;padding:10px 16px!important}
    .brand-mark{background:transparent!important;color:var(--navy)!important;border:0!important;clip-path:none!important;text-shadow:none!important;width:34px!important;height:34px!important;flex-basis:34px!important;font-size:25px!important;font-style:normal!important}
    .brand-copy strong{color:var(--navy);letter-spacing:-.045em}.brand-copy small{color:var(--teal-dark)!important}
    .wallet{background:#fff!important;color:var(--navy)!important;border:1px solid #e0e3e3!important;border-left:3px solid var(--gold)!important;border-radius:11px!important;transform:none!important;box-shadow:var(--shadow-soft)!important}
    .wallet>*{transform:none!important}.wallet span{color:var(--muted)!important}.wallet strong{color:var(--navy)}

    /* Home visual balance */
    .home-masthead{background:linear-gradient(115deg,#fff 0%,#fff 57%,#f5f8fb 100%)!important;border-bottom:1px solid #e9e5dc!important}
    .masthead-brand strong,.masthead-brand small{color:var(--navy)!important}.masthead-callout{background:rgba(255,255,255,.94)!important;border:1px solid #dfe4e6!important;box-shadow:var(--shadow-soft)!important;border-radius:12px!important}.masthead-callout em{color:var(--teal-dark)!important}
    .masthead-wallet{background:linear-gradient(145deg,#0a2b47,#08233d)!important;border:1px solid #174466!important;border-radius:15px!important;box-shadow:0 8px 18px rgba(8,35,61,.16)!important}.masthead-wallet strong{color:#f4c95f!important}
    .home-titlebar{background:#fff!important;border-top:1px solid #eee9df;border-bottom:1px solid #dedede!important}.home-titlebar h1{color:var(--navy)!important}.home-titlebar h1 span{color:var(--teal)!important}

    /* Navigation rows */
    .home-command{background:#fff!important;border:1px solid #e0e3e3!important;border-radius:13px!important;overflow:hidden!important;box-shadow:var(--shadow-soft)!important;margin:0 8px!important}
    .home-command button,.home-command a{background:#fff!important;color:var(--navy)!important;border-color:#e7e8e8!important}.home-command .active{background:var(--navy)!important;color:#fff!important;box-shadow:inset 0 -3px 0 var(--gold)!important}

    /* Filters and breadcrumb */
    .filter{border-radius:10px!important;border-color:#d9dfe1!important;background:#fff!important;box-shadow:0 2px 7px rgba(8,35,61,.04)!important}
    .filter.active{background:var(--navy)!important;color:#fff!important;border-color:var(--navy)!important;box-shadow:0 3px 0 var(--gold)!important}
    .route-guide{background:transparent!important;color:var(--navy)!important;border-left:4px solid var(--gold)!important;border-bottom:1px solid #dfe3e3!important;padding-left:12px!important}.route-guide i{background:#aeb9bf!important}.route-guide b{background:transparent!important;color:var(--teal-dark)!important}

    /* Cards: white, restrained, editorial */
    .venue-grid{gap:11px!important}.venue-card{background:#fff!important;border:1px solid #dfe3e4!important;border-radius:13px!important;box-shadow:0 5px 14px rgba(8,35,61,.07)!important;overflow:hidden!important}
    .venue-card:nth-child(4n+1){border-top:4px solid var(--coral)!important}.venue-card:nth-child(4n+2){border-top:4px solid var(--royal)!important}.venue-card:nth-child(4n+3){border-top:4px solid #efb22d!important}.venue-card:nth-child(4n){border-top:4px solid var(--teal)!important}
    .venue-card-main{background:#fff!important}.venue-next{background:#f9fbfb!important;color:var(--navy)!important;border-top:1px solid #e7eaea!important}.venue-next strong{color:var(--teal-dark)!important}.venue-links{background:#fff}.venue-links a{color:var(--navy)!important}
    .grade{border-radius:14px!important;transform:none!important}.grade.g1{background:#b58a31!important}.grade.g2{background:#3567c9!important}.grade.g3{background:#2a9b68!important}

    .sync-strip,.sync-detail{border:1px solid #dce5e1!important;border-left:0!important;border-radius:10px!important;background:#effaf5!important;color:#304a53!important}
    .panel,.stat-card,.record-list>*,.analysis-list>*,.membership-panel{border-radius:13px!important;border-color:#e2e3df!important;box-shadow:0 4px 12px rgba(8,35,61,.055)!important;background:#fff!important}
    .section-head:after{background:linear-gradient(90deg,var(--gold),var(--teal),transparent 78%)!important;opacity:.65}.section-number{background:var(--navy)!important;border-radius:5px;transform:none!important}
    .tactical-note{background:#fff9e9!important;border-left:4px solid var(--gold)!important;border-radius:10px!important}

    /* Bottom nav: remove the loud dark slab */
    .bottom-nav{position:fixed!important;left:50%!important;transform:translateX(-50%)!important;bottom:0!important;z-index:90!important;width:min(980px,100%)!important;display:grid!important;grid-template-columns:repeat(6,1fr)!important;background:rgba(255,253,248,.97)!important;border-top:1px solid #d8c99e!important;box-shadow:0 -6px 20px rgba(8,35,61,.08)!important;padding:7px 7px calc(7px + env(safe-area-inset-bottom))!important;backdrop-filter:blur(14px)!important;-webkit-backdrop-filter:blur(14px)!important}
    .bottom-nav .nav{position:relative!important;min-height:58px!important;padding:5px 2px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#18314a!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;box-shadow:none!important}
    .bottom-nav .nav b{display:grid!important;place-items:center!important;width:28px!important;height:28px!important;padding:0!important;background:transparent!important;border-radius:0!important;color:currentColor!important}
    .bottom-nav .nav b svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .bottom-nav .nav span{font-size:9px!important;font-weight:850!important;letter-spacing:.01em!important}
    .bottom-nav .nav.active{color:var(--teal-dark)!important;background:transparent!important;border:0!important}
    .bottom-nav .nav.active b{background:transparent!important;color:var(--teal-dark)!important;padding:0!important;border-radius:0!important}
    .bottom-nav .nav.active:after{content:"";position:absolute;left:24%;right:24%;bottom:1px;height:2px;border-radius:2px;background:var(--gold)}
    .bottom-nav .nav:active{background:rgba(216,161,42,.07)!important}

    .paper-tabs button{border-radius:9px!important}.paper-tabs button.active{background:var(--navy)!important;color:#fff!important;box-shadow:0 3px 0 var(--gold)!important}
    .mamo-press-intel{background:#f7f1e3!important;border:1px solid #dfd2b7!important;border-radius:13px!important}.mamo-press-intel article{background:#fff!important;border-top:4px solid var(--gold)!important;border-radius:8px!important}

    @media(max-width:620px){
      main{padding:12px!important}.bottom-nav .nav span{font-size:8px!important}.bottom-nav .nav b svg{width:23px;height:23px}.bottom-nav .nav{min-height:56px!important}.venue-name{font-size:20px!important}.home-command{margin:0!important}
    }
  `;
  document.head.appendChild(style);

  function boot(){ installNavIcons(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
