/* MAMO BOAT Race Layout Refresh v2 — tap-only race UI, stronger hierarchy, no horizontal swipe/rails. */
(() => {
  "use strict";
  if (window.__MAMO_RACE_LAYOUT_REFRESH_V2__) return;
  window.__MAMO_RACE_LAYOUT_REFRESH_V2__ = true;

  const s = document.createElement("style");
  s.id = "mamoRaceLayoutRefreshV2";
  s.textContent = `
    #raceView{--r-navy:#082238;--r-teal:#0c8f88;--r-gold:#d3a23a;--r-paper:#fffdf8;--r-line:#dde3e4;overflow-x:hidden!important;}

    /* Event/race header */
    #raceView .event-banner{border-radius:16px 16px 0 0;padding:15px 16px 16px;background:linear-gradient(112deg,#082238 0%,#12344d 68%,#17394d 100%);border-bottom:3px solid var(--r-gold);box-shadow:0 5px 16px rgba(8,34,56,.11);}
    #raceView .event-banner h1{font-size:clamp(20px,5vw,28px);max-width:78%;}

    /* 1–12R: fixed grid, tap only */
    #raceView .racechips{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:6px!important;margin:10px 0 12px!important;padding:0!important;overflow:visible!important;scroll-snap-type:none!important;}
    #raceView .racechip{min-width:0!important;width:auto!important;min-height:40px;border-radius:9px;background:#fff;border:1px solid #d7dfe1;box-shadow:0 2px 5px rgba(8,34,56,.035);font-size:11px;}
    #raceView .racechip.active{background:var(--r-navy);color:#fff;border-color:var(--r-navy);box-shadow:0 3px 0 var(--r-gold);}
    #raceView .racechip.closed{background:#eef1f1;color:#8a9599;box-shadow:none;}

    /* Race board */
    #raceView .raceboard{border:1px solid var(--r-line);border-top:0!important;border-radius:0 0 16px 16px;background:var(--r-paper)!important;box-shadow:0 7px 20px rgba(8,34,56,.07);padding:14px;}
    #raceView .raceheadline{align-items:center;padding-bottom:11px;border-bottom:1px solid #e3e8e9;}
    #raceView .racename{font-size:19px;line-height:1.2;}
    #raceView .racename strong{display:inline-block;color:var(--r-teal);font-size:24px;margin:0 3px;}
    #raceView .raceclock{border-radius:10px;min-width:116px;flex-basis:116px;padding:8px;background:#f6f8f8;}

    /* Six racers: number > racer name > profile > class/machine */
    #raceView .boats{display:grid!important;grid-template-columns:1fr!important;gap:8px;margin-top:13px;overflow:visible!important;}
    #raceView .boat{position:relative;display:grid;grid-template-columns:52px minmax(0,1fr) 88px;gap:11px;align-items:center;min-height:72px;padding:9px 10px 9px 8px;border:1px solid #dce3e4;border-left-width:1px!important;border-radius:12px;background:#fff;box-shadow:0 3px 10px rgba(8,34,56,.045);overflow:hidden;}
    #raceView .boat::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:#ddd;}
    #raceView .boat:nth-child(1)::before{background:#c7c9c5;}#raceView .boat:nth-child(2)::before{background:#252a31;}#raceView .boat:nth-child(3)::before{background:#d94444;}#raceView .boat:nth-child(4)::before{background:#356fcf;}#raceView .boat:nth-child(5)::before{background:#dfb92e;}#raceView .boat:nth-child(6)::before{background:#34955c;}
    #raceView .boat:active{background:#f7fbfa;transform:translateY(1px);}
    #raceView .num{height:50px;width:50px;border-radius:11px;font-size:23px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06);}
    #raceView .boat>div:nth-child(2)>b{display:block;font-size:17px;line-height:1.25;letter-spacing:-.035em;color:#0b2235;margin-bottom:5px;}
    #raceView .boat>div:nth-child(2) .tiny{font-size:9px;line-height:1.55;color:#6a787f;}
    #raceView .boat>div:nth-child(3){text-align:right;padding-left:6px;border-left:1px solid #edf0f0;}
    #raceView .boat>div:nth-child(3)>b{display:inline-block;padding:3px 6px;border-radius:999px;background:#eef4f4;color:#0b5f5b!important;font-size:9px!important;}
    #raceView .boat>div:nth-child(3) .tiny{margin-top:5px;font-size:9px;line-height:1.45;}
    #raceView .racerlinkhint{margin-top:5px;font-size:8px;color:#879398;font-weight:800;}

    /* Official information: secondary, fixed 2x2 on mobile */
    #raceView .officialmenu{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:13px;overflow:visible!important;}
    #raceView .officiallink{border-radius:10px;padding:9px 4px;background:#fafbfb;border:1px solid #dce3e4;}
    #raceView .officiallink span{font-size:8px;color:#79868c;}#raceView .officiallink b{font-size:9px;color:#0b2a42;}
    #raceView .source-note{border-left-color:var(--r-gold);background:#fffaf0;border-radius:0 8px 8px 0;padding:8px 9px;}

    /* AIR BET: strongest hierarchy */
    #race .section-head.small{margin-top:24px;}
    #race .section-head.small .section-number{background:var(--r-gold);color:#082238;border-radius:7px;transform:none;}
    #race .section-head.small h2{font-size:22px;color:#082238;}
    #race .betdesk{border:1px solid #dce3e4!important;border-top:3px solid var(--r-gold)!important;border-radius:14px;background:#fffdf8!important;box-shadow:0 6px 18px rgba(8,34,56,.06);}
    #raceView .bettypebar{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px!important;padding:2px 0 10px!important;overflow:visible!important;}
    #raceView .bettypebtn{min-width:0!important;width:auto!important;border-radius:9px;background:#fff;min-height:40px;padding:7px 4px;font-size:10px;}
    #raceView .bettypebtn.active{background:var(--r-navy);border-color:var(--r-navy);box-shadow:0 3px 0 var(--r-gold);}
    #raceView .bet-tabs{border-radius:10px;background:#edf1f1;padding:4px;}
    #raceView .bet-tab.active{border-radius:8px;box-shadow:none;}
    #raceView .pick{border-radius:10px;min-height:48px;}
    #raceView .pick.sel{outline:2px solid var(--r-gold);border-color:#082238;}
    #raceView .odds-now{border-color:#cbd9da;border-radius:9px;background:#fafcfc;}
    #raceView .cart-tools{display:flex!important;flex-wrap:wrap!important;gap:6px!important;overflow:visible!important;align-items:center;}
    #raceView .cart-tools span{width:100%;font-size:9px;color:#6b777d;font-weight:900;}
    #raceView .cart-tools button{flex:1 1 calc(25% - 6px);min-width:64px;min-height:38px;border-radius:9px;}
    #raceView .cart-tools button:not(.clear){background:#fff;border:1px solid #d8dfe0;color:#082238;font-weight:900;}
    #raceView .cart-tools .clear{flex-basis:100%;background:#f5f5f2;color:#6f797e;}
    #raceView .cartrow{border-radius:10px;background:#fff;}
    #raceView .btn.teal.full{min-height:52px;border-radius:12px;background:linear-gradient(100deg,#0b8f88,#08766f)!important;box-shadow:0 4px 0 #075b57;font-size:14px;letter-spacing:.03em;}

    /* Never allow horizontal gesture UI on race screen */
    #raceView *,#race .betdesk *{scroll-snap-type:none!important;scroll-snap-align:none!important;}

    @media(max-width:520px){
      #raceView .boat{grid-template-columns:48px minmax(0,1fr) 76px;gap:8px;padding:8px 8px 8px 7px;min-height:68px;}
      #raceView .num{width:46px;height:46px;font-size:21px;}
      #raceView .boat>div:nth-child(2)>b{font-size:15px;}
      #raceView .raceclock{min-width:98px;flex-basis:98px;}
      #raceView .officialmenu{grid-template-columns:repeat(2,minmax(0,1fr))!important;}
      #raceView .bettypebar{grid-template-columns:repeat(4,minmax(0,1fr))!important;}
    }
  `;
  document.head.appendChild(s);
})();
