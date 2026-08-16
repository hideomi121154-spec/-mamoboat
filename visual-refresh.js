/* MAMO BOAT Visual Refresh v1 — richer color hierarchy without changing app logic. */
(() => {
  "use strict";
  if (window.__MAMO_VISUAL_REFRESH_V1__) return;
  window.__MAMO_VISUAL_REFRESH_V1__ = true;
  const style = document.createElement("style");
  style.id = "mamoVisualRefreshV1";
  style.textContent = `
    :root{
      --navy:#071b2b;--navy-2:#102f46;--teal:#0aa59d;--teal-dark:#08756f;
      --coral:#ff654f;--gold:#f5b82e;--royal:#3157c8;--purple:#7655b7;
      --paper:#f6f2ea;--paper-2:#fffdf8;--ink:#102331;--muted:#68767e;
      --lane1:#f7f7f2;--lane2:#3b4250;--lane3:#e84a43;--lane4:#3978dc;--lane5:#f1c73f;--lane6:#38a462;
    }
    body{background:linear-gradient(135deg,rgba(245,184,46,.055),transparent 28%),linear-gradient(315deg,rgba(255,101,79,.045),transparent 32%),var(--paper);}
    .app-shell{background:rgba(250,248,242,.97)}
    .topbar{background:linear-gradient(100deg,#071b2b 0%,#0d3047 67%,#142f3a 100%);border-bottom-color:var(--gold)}
    .brand-mark{background:var(--coral)}
    .wallet{border-left-color:var(--gold);box-shadow:3px 3px 0 rgba(245,184,46,.2)}
    .home-titlebar,.section-head{position:relative}.section-head:after{content:"";position:absolute;left:0;right:0;bottom:-7px;height:1px;background:linear-gradient(90deg,var(--coral),var(--gold),var(--teal),transparent 85%)}
    .section-number{background:var(--navy)}
    .section-head:nth-of-type(3n+1) .section-number{background:var(--coral)}
    .section-head:nth-of-type(3n+2) .section-number{background:var(--royal)}
    .section-head:nth-of-type(3n) .section-number{background:var(--teal-dark)}
    .filter.active{background:var(--navy);box-shadow:3px 3px 0 var(--gold)}
    .venue-card{background:var(--paper-2);border-color:#172d3a;box-shadow:4px 5px 0 rgba(49,87,200,.09)}
    .venue-card:nth-child(4n+1){border-top:5px solid var(--coral)}
    .venue-card:nth-child(4n+2){border-top:5px solid var(--royal)}
    .venue-card:nth-child(4n+3){border-top:5px solid var(--gold)}
    .venue-card:nth-child(4n){border-top:5px solid var(--teal)}
    .venue-next{background:linear-gradient(90deg,#071b2b,#17364a)}
    .grade.sg{background:#d51f45}.grade.pg1{background:#bb4d9b}.grade.g1{background:#ef7f1a}.grade.g2{background:#3157c8}.grade.g3{background:#2a9b64}.grade.general{background:#6b7479}
    .route-guide{background:linear-gradient(100deg,#071b2b,#17364a);border-left:5px solid var(--gold)}
    .panel,.stat-card,.analysis-list>*,.record-list>*,.press-paper,.membership-panel{background:var(--paper-2)!important}
    .stat-card:nth-child(4n+1){border-top:4px solid var(--teal)}
    .stat-card:nth-child(4n+2){border-top:4px solid var(--coral)}
    .stat-card:nth-child(4n+3){border-top:4px solid var(--gold)}
    .stat-card:nth-child(4n){border-top:4px solid var(--royal)}
    .tactical-note{background:linear-gradient(110deg,#fff8df,#fffdf8);border-left:5px solid var(--gold)}
    .home-command button:nth-child(1),.bottom-nav button:nth-child(1){--nav-accent:var(--coral)}
    .home-command button:nth-child(2),.bottom-nav button:nth-child(2){--nav-accent:var(--royal)}
    .home-command button:nth-child(3),.bottom-nav button:nth-child(3){--nav-accent:var(--teal)}
    .home-command button:nth-child(4),.bottom-nav button:nth-child(4){--nav-accent:var(--gold)}
    .bottom-nav button:nth-child(5){--nav-accent:var(--purple)}.bottom-nav button:nth-child(6){--nav-accent:#6f7b81}
    .bottom-nav .nav.active{color:var(--nav-accent,var(--teal));border-top-color:var(--nav-accent,var(--teal))}
    .bottom-nav .nav.active b{background:var(--nav-accent,var(--teal));color:#fff;border-radius:50%;padding:4px 7px}
    .paper-tabs button.active{background:var(--navy)!important;color:#fff!important;box-shadow:0 3px 0 var(--gold)}
    .newsroom-cast .cast-card:nth-child(1){border-top:5px solid var(--coral)}
    .newsroom-cast .cast-card:nth-child(2){border-top:5px solid var(--gold)}
    .newsroom-cast .cast-card:nth-child(3){border-top:5px solid var(--royal)}
    .mamo-press-intel{background:#f5ecda!important;border-color:#d6c7a6!important}.mamo-press-intel article{border-top-color:var(--coral)!important}
    #raceView .boat:nth-of-type(6n+1),#raceView [data-boat='1'],#raceView [data-lane='1']{border-left:6px solid var(--lane1)!important}
    #raceView .boat:nth-of-type(6n+2),#raceView [data-boat='2'],#raceView [data-lane='2']{border-left:6px solid var(--lane2)!important}
    #raceView .boat:nth-of-type(6n+3),#raceView [data-boat='3'],#raceView [data-lane='3']{border-left:6px solid var(--lane3)!important}
    #raceView .boat:nth-of-type(6n+4),#raceView [data-boat='4'],#raceView [data-lane='4']{border-left:6px solid var(--lane4)!important}
    #raceView .boat:nth-of-type(6n+5),#raceView [data-boat='5'],#raceView [data-lane='5']{border-left:6px solid var(--lane5)!important}
    #raceView .boat:nth-of-type(6n),#raceView [data-boat='6'],#raceView [data-lane='6']{border-left:6px solid var(--lane6)!important}
    #raceView button{transition:transform .08s ease,box-shadow .08s ease}#raceView button:active{transform:translateY(1px)}
    .btn.primary{background:linear-gradient(90deg,var(--navy),#173e57)!important}.coral-btn{background:linear-gradient(90deg,var(--coral),#ff8a55)!important}.btn.secondary{border-color:var(--royal)!important}
    @media(max-width:620px){.section-head h2{font-size:20px}.venue-name{font-size:20px}}
  `;
  document.head.appendChild(style);
})();
