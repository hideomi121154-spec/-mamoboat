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

    .topbar{background:rgba(255,255,255,.97)!important;color:var(--navy)!important;border-bottom:1px solid #e8e1d3!important;box-shadow:0 3px 14px rgba(8,35,61,.06)!important;padding:10px 16px!important}
    .brand-mark{background:transparent!important;color:var(--navy)!important;border:0!important;clip-path:none!important;text-shadow:none!important;width:34px!important;height:34px!important;flex-basis:34px!important;font-size:25px!important;font-style:normal!important}
    .brand-copy strong{color:var(--navy);letter-spacing:-.045em}.brand-copy small{color:var(--teal-dark)!important}
    .wallet{background:#fff!important;color:var(--navy)!important;border:1px solid #e0e3e3!important;border-left:3px solid var(--gold)!important;border-radius:11px!important;transform:none!important;box-shadow:var(--shadow-soft)!important}
    .wallet>*{transform:none!important}.wallet span{color:var(--muted)!important}.wallet strong{color:var(--navy)}

    .home-masthead{background:linear-gradient(115deg,#fff 0%,#fff 57%,#f5f8fb 100%)!important;border-bottom:1px solid #e9e5dc!important}
    .masthead-brand strong,.masthead-brand small{color:var(--navy)!important}.masthead-callout{background:rgba(255,255,255,.94)!important;border:1px solid #dfe4e6!important;box-shadow:var(--shadow-soft)!important;border-radius:12px!important}.masthead-callout em{color:var(--teal-dark)!important}
    .masthead-wallet{background:linear-gradient(145deg,#0a2b47,#08233d)!important;border:1px solid #174466!important;border-radius:15px!important;box-shadow:0 8px 18px rgba(8,35,61,.16)!important}.masthead-wallet strong{color:#f4c95f!important}
    .home-titlebar{background:#fff!important;border-top:1px solid #eee9df;border-bottom:1px solid #dedede!important}.home-titlebar h1{color:var(--navy)!important}.home-titlebar h1 span{color:var(--teal)!important}

    .home-command{background:#fff!important;border:1px solid #e0e3e3!important;border-radius:13px!important;overflow:hidden!important;box-shadow:var(--shadow-soft)!important;margin:0 8px!important}
    .home-command button,.home-command a{background:#fff!important;color:var(--navy)!important;border-color:#e7e8e8!important}.home-command .active{background:var(--navy)!important;color:#fff!important;box-shadow:inset 0 -3px 0 var(--gold)!important}

    .filter{border-radius:10px!important;border-color:#d9dfe1!important;background:#fff!important;box-shadow:0 2px 7px rgba(8,35,61,.04)!important}
    .filter.active{background:var(--navy)!important;color:#fff!important;border-color:var(--navy)!important;box-shadow:0 3px 0 var(--gold)!important}
    .route-guide{background:transparent!important;color:var(--navy)!important;border-left:4px solid var(--gold)!important;border-bottom:1px solid #dfe3e3!important;padding-left:12px!important}.route-guide i{background:#aeb9bf!important}.route-guide b{background:transparent!important;color:var(--teal-dark)!important}

    .venue-grid{gap:11px!important}.venue-card{background:#fff!important;border:1px solid #dfe3e4!important;border-radius:13px!important;box-shadow:0 5px 14px rgba(8,35,61,.07)!important;overflow:hidden!important}
    .venue-card:nth-child(4n+1){border-top:4px solid var(--coral)!important}.venue-card:nth-child(4n+2){border-top:4px solid var(--royal)!important}.venue-card:nth-child(4n+3){border-top:4px solid #efb22d!important}.venue-card:nth-child(4n){border-top:4px solid var(--teal)!important}
    .venue-card-main{background:#fff!important}.venue-next{background:#f9fbfb!important;color:var(--navy)!important;border-top:1px solid #e7eaea!important}.venue-next strong{color:var(--teal-dark)!important}.venue-links{background:#fff}.venue-links a{color:var(--navy)!important}
    .grade{border-radius:14px!important;transform:none!important}.grade.g1{background:#b58a31!important}.grade.g2{background:#3567c9!important}.grade.g3{background:#2a9b68!important}

    .sync-strip,.sync-detail{border:1px solid #dce5e1!important;border-left:0!important;border-radius:10px!important;background:#effaf5!important;color:#304a53!important}
    .panel,.stat-card,.record-list>*,.analysis-list>*,.membership-panel{border-radius:13px!important;border-color:#e2e3df!important;box-shadow:0 4px 12px rgba(8,35,61,.055)!important;background:#fff!important}
    .section-head:after{background:linear-gradient(90deg,var(--gold),var(--teal),transparent 78%)!important;opacity:.65}.section-number{background:var(--navy)!important;border-radius:5px;transform:none!important}
    .tactical-note{background:#fff9e9!important;border-left:4px solid var(--gold)!important;border-radius:10px!important}

    .bottom-nav{position:fixed!important;left:50%!important;transform:translateX(-50%)!important;bottom:0!important;z-index:90!important;width:min(980px,100%)!important;display:grid!important;grid-template-columns:repeat(6,1fr)!important;background:rgba(255,253,248,.97)!important;border-top:1px solid #d8c99e!important;box-shadow:0 -6px 20px rgba(8,35,61,.08)!important;padding:7px 7px calc(7px + env(safe-area-inset-bottom))!important;backdrop-filter:blur(14px)!important;-webkit-backdrop-filter:blur(14px)!important}
    .bottom-nav .nav{position:relative!important;min-height:58px!important;padding:5px 2px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#18314a!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;box-shadow:none!important}
    .bottom-nav .nav b{display:grid!important;place-items:center!important;width:28px!important;height:28px!important;padding:0!important;background:transparent!important;border-radius:0!important;color:currentColor!important}
    .bottom-nav .nav b svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .bottom-nav .nav span{font-size:9px!important;font-weight:850!important;letter-spacing:.01em!important}
    .bottom-nav .nav.active{color:var(--teal-dark)!important;background:transparent!important;border:0!important}
    .bottom-nav .nav.active b{background:transparent!important;color:var(--teal-dark)!important;padding:0!important;border-radius:0!important}
    .bottom-nav .nav.active:after{content:"";position:absolute;left:24%;right:24%;bottom:1px;height:2px;border-radius:2px;background:var(--gold)}
    .bottom-nav .nav:active{background:rgba(216,161,42,.07)!important}

    /* Confirmation/modal must always sit above fixed navigation. */
    .modal-bg{z-index:220!important;padding-bottom:calc(18px + env(safe-area-inset-bottom))!important}
    .modal{position:relative;z-index:221!important;max-height:calc(100dvh - 28px)!important;padding-bottom:calc(24px + env(safe-area-inset-bottom))!important;overscroll-behavior:contain}
    .modal .btn.full:last-child{margin-bottom:8px!important}

    .paper-tabs button{border-radius:9px!important}.paper-tabs button.active{background:var(--navy)!important;color:#fff!important;box-shadow:0 3px 0 var(--gold)!important}
    .mamo-press-intel{background:#f7f1e3!important;border:1px solid #dfd2b7!important;border-radius:13px!important}.mamo-press-intel article{background:#fff!important;border-top:4px solid var(--gold)!important;border-radius:8px!important}

    /* Plan merchandising: unlocked value is fully readable; locked value is a compact teaser. */
    #mamoAiSafeReport{--mamo-plan-pitch:"過去の自分と比べて、金額・回数・時間帯の変化を見つける";--mamo-plan-accent:#a86d32}
    #mamoDecisionPanel{--mamo-plan-pitch:"見送りやREAL移行までの動きから、勝負の入り方を読む";--mamo-plan-accent:#8c9aa6}
    #mamoBaselinePanel{--mamo-plan-pitch:"今日と普段の自分を比べて、いつもとのズレを発見する";--mamo-plan-accent:#8c9aa6}
    #mamoTriggerPanel{--mamo-plan-pitch:"熱くなる条件や連続参加のきっかけを、本人データから整理する";--mamo-plan-accent:#8c9aa6}
    #mamoPeriodTriggerSummary{--mamo-plan-pitch:"7日間の変化をまとめて、今週の行動のクセを確認する";--mamo-plan-accent:#8c9aa6}
    #pressPaper{--mamo-plan-pitch:"朝刊・週間・月刊で、自分専用の記事として振り返る";--mamo-plan-accent:#d8a12a}
    #mamoPressIntel{--mamo-plan-pitch:"長期データをつないで、変化の背景まで編集部が深掘りする";--mamo-plan-accent:#d8a12a}
    #homePressTeaser{--mamo-plan-pitch:"次のレース予想ではなく、あなた自身の勝負の選び方を読む";--mamo-plan-accent:#d8a12a}

    #mamoAiSafeReport,#mamoDecisionPanel,#mamoBaselinePanel,#mamoTriggerPanel,
    #mamoPeriodTriggerSummary,#pressPaper,#mamoPressIntel,#homePressTeaser{
      height:auto!important;
      max-height:none!important;
      overflow:visible!important;
      overscroll-behavior:auto!important;
    }

    body[data-mamo-plan="free"] #mamoAiSafeReport,
    body[data-mamo-plan="free"] #mamoDecisionPanel,
    body[data-mamo-plan="free"] #mamoBaselinePanel,
    body[data-mamo-plan="free"] #mamoTriggerPanel,
    body[data-mamo-plan="free"] #mamoPeriodTriggerSummary,
    body[data-mamo-plan="bronze"] #mamoDecisionPanel,
    body[data-mamo-plan="bronze"] #mamoBaselinePanel,
    body[data-mamo-plan="bronze"] #mamoTriggerPanel,
    body[data-mamo-plan="bronze"] #mamoPeriodTriggerSummary,
    body:not([data-mamo-plan="gold"]) #pressPaper,
    body:not([data-mamo-plan="gold"]) #mamoPressIntel,
    body:not([data-mamo-plan="gold"]) #homePressTeaser{
      height:142px!important;
      max-height:142px!important;
      min-height:142px!important;
      overflow:hidden!important;
      background:linear-gradient(135deg,#fff 0%,#fbfaf6 100%)!important;
      border:1px solid #e6e1d7!important;
      border-left:5px solid var(--mamo-plan-accent)!important;
      box-shadow:0 5px 16px rgba(8,35,61,.06)!important;
    }

    body[data-mamo-plan="free"] #mamoAiSafeReport::before,
    body[data-mamo-plan="free"] #mamoDecisionPanel::before,
    body[data-mamo-plan="free"] #mamoBaselinePanel::before,
    body[data-mamo-plan="free"] #mamoTriggerPanel::before,
    body[data-mamo-plan="free"] #mamoPeriodTriggerSummary::before,
    body[data-mamo-plan="bronze"] #mamoDecisionPanel::before,
    body[data-mamo-plan="bronze"] #mamoBaselinePanel::before,
    body[data-mamo-plan="bronze"] #mamoTriggerPanel::before,
    body[data-mamo-plan="bronze"] #mamoPeriodTriggerSummary::before,
    body:not([data-mamo-plan="gold"]) #pressPaper::before,
    body:not([data-mamo-plan="gold"]) #mamoPressIntel::before,
    body:not([data-mamo-plan="gold"]) #homePressTeaser::before{
      top:17px!important;
      left:16px!important;
      right:16px!important;
      font-size:19px!important;
      line-height:1.3!important;
    }

    body[data-mamo-plan="free"] #mamoAiSafeReport::after,
    body[data-mamo-plan="free"] #mamoDecisionPanel::after,
    body[data-mamo-plan="free"] #mamoBaselinePanel::after,
    body[data-mamo-plan="free"] #mamoTriggerPanel::after,
    body[data-mamo-plan="free"] #mamoPeriodTriggerSummary::after,
    body[data-mamo-plan="bronze"] #mamoDecisionPanel::after,
    body[data-mamo-plan="bronze"] #mamoBaselinePanel::after,
    body[data-mamo-plan="bronze"] #mamoTriggerPanel::after,
    body[data-mamo-plan="bronze"] #mamoPeriodTriggerSummary::after,
    body:not([data-mamo-plan="gold"]) #pressPaper::after,
    body:not([data-mamo-plan="gold"]) #mamoPressIntel::after,
    body:not([data-mamo-plan="gold"]) #homePressTeaser::after{
      content:var(--mamo-plan-pitch) "\A→ " var(--mamo-plan-lock)!important;
      top:53px!important;
      left:16px!important;
      right:16px!important;
      padding:0!important;
      border:0!important;
      border-radius:0!important;
      background:transparent!important;
      box-shadow:none!important;
      color:#5c6d79!important;
      font-size:10.5px!important;
      line-height:1.55!important;
      font-weight:750!important;
      letter-spacing:0!important;
      white-space:pre-line!important;
    }

    /* Make the plan selector sell the value before the price. Card geometry never changes on selection. */
    #membershipPanel{
      padding:14px!important;
      overflow:visible!important;
    }
    #membershipPanel .membership-current{
      margin:0 0 12px!important;
      padding:13px 14px!important;
      border:1px solid #e7e1d5!important;
      border-left:4px solid var(--teal)!important;
      border-radius:12px!important;
      background:linear-gradient(120deg,#fff 0%,#f8fbfa 100%)!important;
    }
    #membershipPanel .membership-current>span{
      color:var(--teal-dark)!important;
      font-size:8px!important;
      font-weight:1000!important;
      letter-spacing:.12em!important;
    }
    #membershipPanel .membership-current h3{
      margin:5px 0 1px!important;
      color:var(--navy)!important;
      font-size:20px!important;
      letter-spacing:-.04em!important;
    }
    #membershipPanel .membership-current>b{
      display:block!important;
      color:var(--navy)!important;
      font-size:15px!important;
    }
    #membershipPanel .membership-current p{
      margin:7px 0 0!important;
      color:#61717c!important;
      font-size:9px!important;
      line-height:1.55!important;
    }
    #membershipPanel .membership-points.membership-selectable{
      display:grid!important;
      grid-template-columns:repeat(2,minmax(0,1fr))!important;
      gap:9px!important;
      margin:0 0 12px!important;
    }
    #membershipPanel [data-pilot-plan]{
      --tier-accent:#71818b;
      --tier-soft:#f5f7f8;
      --tier-price:"¥0";
      --tier-stage:"START / 記録する";
      --tier-copy:"AIR BETと基本記録。まず、自分の行動を残す。";
      position:relative!important;
      min-height:142px!important;
      margin:0!important;
      padding:39px 14px 39px!important;
      overflow:hidden!important;
      border:2px solid #e3e6e6!important;
      border-radius:14px!important;
      background:#fff!important;
      color:var(--navy)!important;
      box-shadow:0 4px 11px rgba(8,35,61,.05)!important;
      text-align:left!important;
      transform:none!important;
      transition:background-color .15s ease,border-color .15s ease,box-shadow .15s ease!important;
    }
    #membershipPanel [data-pilot-plan="bronze"]{
      --tier-accent:#a86d32;
      --tier-soft:#fbf4ea;
      --tier-price:"¥390 / 月";
      --tier-stage:"COMPARE / 比べる";
      --tier-copy:"過去の自分と比較して、増えた・減ったを見つける。";
    }
    #membershipPanel [data-pilot-plan="silver"]{
      --tier-accent:#718796;
      --tier-soft:#f1f5f7;
      --tier-price:"¥690 / 月";
      --tier-stage:"おすすめ / 理由を知る";
      --tier-copy:"勝負トリガーと普段との差から、なぜ動いたかを読む。";
    }
    #membershipPanel [data-pilot-plan="gold"]{
      --tier-accent:#c8941f;
      --tier-soft:#fff8e8;
      --tier-price:"¥1,190 / 月";
      --tier-stage:"EDITORIAL / 専属編集部";
      --tier-copy:"朝刊・週間・月刊と深掘りで、自分専用の編集部を持つ。";
    }
    #membershipPanel [data-pilot-plan]::before{
      content:var(--tier-stage)!important;
      position:absolute!important;
      left:13px!important;
      top:11px!important;
      max-width:calc(100% - 26px)!important;
      padding:3px 7px!important;
      border-radius:999px!important;
      background:var(--tier-soft)!important;
      color:var(--tier-accent)!important;
      font-size:7.5px!important;
      line-height:1.3!important;
      font-weight:1000!important;
      letter-spacing:.05em!important;
      white-space:nowrap!important;
    }
    #membershipPanel [data-pilot-plan]::after{
      content:var(--tier-price)!important;
      position:absolute!important;
      left:14px!important;
      bottom:12px!important;
      color:var(--navy)!important;
      font-size:13px!important;
      line-height:1!important;
      font-weight:1000!important;
      letter-spacing:-.02em!important;
    }
    #membershipPanel [data-pilot-plan]>b{
      display:block!important;
      margin:0 0 7px!important;
      color:var(--navy)!important;
      font-size:19px!important;
      line-height:1!important;
      letter-spacing:-.04em!important;
    }
    #membershipPanel [data-pilot-plan]>span{
      display:block!important;
      margin:0!important;
      color:transparent!important;
      font-size:0!important;
      line-height:0!important;
    }
    #membershipPanel [data-pilot-plan]>span::after{
      content:var(--tier-copy)!important;
      display:block!important;
      color:#5c6d79!important;
      font-size:9.5px!important;
      line-height:1.55!important;
      font-weight:750!important;
    }
    #membershipPanel [data-pilot-plan="silver"]{
      box-shadow:inset 0 3px 0 #718796,0 6px 16px rgba(8,35,61,.08)!important;
    }
    #membershipPanel [data-pilot-plan="gold"]{
      box-shadow:inset 0 3px 0 #c8941f,0 6px 16px rgba(8,35,61,.08)!important;
    }
    #membershipPanel [data-pilot-plan].selected{
      border-color:var(--tier-accent)!important;
      background:var(--tier-soft)!important;
      box-shadow:0 0 0 2px color-mix(in srgb,var(--tier-accent) 22%,transparent),0 7px 17px rgba(8,35,61,.09)!important;
    }
    #membershipPanel [data-pilot-plan].selected::before{
      background:var(--tier-accent)!important;
      color:#fff!important;
    }
    #membershipPanel .membership-deep-action{
      margin-top:4px!important;
    }
    .plan-modal-grid .plan-option{
      border-width:2px!important;
      border-radius:12px!important;
      transform:none!important;
    }
    .plan-modal-grid .plan-option:nth-child(3){
      border-color:#91a2ad!important;
      box-shadow:inset 0 3px 0 #718796!important;
    }
    .plan-modal-grid .plan-option:nth-child(4){
      border-color:#ddc071!important;
      background:#fffaf0!important;
      box-shadow:inset 0 3px 0 #c8941f!important;
    }

    /* Plan choice is above expandable reports, so unlocking grows content below the tap point. */
    #analysis.active > .section-head:has(+ #membershipPanel){order:15!important}
    #analysis.active > #membershipPanel{order:16!important}

    @media(max-width:620px){
      main{padding:12px!important}.bottom-nav .nav span{font-size:8px!important}.bottom-nav .nav b svg{width:23px;height:23px}.bottom-nav .nav{min-height:56px!important}.venue-name{font-size:20px!important}.home-command{margin:0!important}
      .modal-bg{align-items:stretch!important;padding:8px!important;padding-top:max(8px,env(safe-area-inset-top))!important;padding-bottom:max(8px,env(safe-area-inset-bottom))!important}
      .modal{margin:auto!important;width:100%!important;max-height:calc(100dvh - max(16px,env(safe-area-inset-top)) - max(16px,env(safe-area-inset-bottom)))!important;border-radius:14px!important}
      #membershipPanel .membership-points.membership-selectable{grid-template-columns:1fr!important}
      #membershipPanel [data-pilot-plan]{min-height:128px!important;padding-top:37px!important;padding-bottom:36px!important}
    }
  `;
  document.head.appendChild(style);

  function boot(){ installNavIcons(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();