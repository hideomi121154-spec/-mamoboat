/* MAMO BOAT paid-plan conversion funnel */
(()=>{
  "use strict";
  if(window.__MAMO_PAID_FUNNEL__) return;
  window.__MAMO_PAID_FUNNEL__=true;

  const PLAN_RANK={free:0,bronze:1,silver:2,gold:3};
  const GATES={
    mamoAiSafeReport:{plan:"bronze",source:"locked_previous_self"},
    mamoDecisionPanel:{plan:"silver",source:"locked_decision_pattern"},
    mamoBaselinePanel:{plan:"silver",source:"locked_personal_baseline"},
    mamoTriggerPanel:{plan:"silver",source:"locked_trigger"},
    mamoPeriodTriggerSummary:{plan:"silver",source:"locked_weekly_analysis"},
    mamoPressIntel:{plan:"gold",source:"locked_press_intelligence"},
  };

  function currentPlan(){
    const key=document.body?.dataset?.mamoPlan||"free";
    return PLAN_RANK[key]==null?"free":key;
  }

  function needsUpgrade(required){
    return (PLAN_RANK[currentPlan()]||0)<(PLAN_RANK[required]||0);
  }

  function bindGate(id,config){
    const el=document.getElementById(id);
    if(!el||el.dataset.paidFunnelBound==="true") return;
    el.dataset.paidFunnelBound="true";
    el.setAttribute("role","button");
    el.setAttribute("tabindex","0");

    const open=event=>{
      if(!needsUpgrade(config.plan)) return;
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if(typeof window.openPaidPlanIntent==="function"){
        window.openPaidPlanIntent(config.plan,config.source);
      }else if(typeof window.openMembershipPlans==="function"){
        window.openMembershipPlans(config.source);
      }
    };

    el.addEventListener("click",open,false);
    el.addEventListener("keydown",event=>{
      if(event.key==="Enter"||event.key===" "){
        open(event);
      }
    },false);
  }

  function bindAll(){
    Object.entries(GATES).forEach(([id,config])=>bindGate(id,config));
  }

  function installStyles(){
    if(document.getElementById("mamoPaidFunnelStyles")) return;
    const style=document.createElement("style");
    style.id="mamoPaidFunnelStyles";
    style.textContent=`
      .paid-funnel-modal .plan-modal-grid,
      .paid-intent-confirm .paid-intent-features {
        display:grid;
        gap:10px;
      }
      .paid-intent-confirm .paid-intent-features {
        margin:14px 0;
      }
      .paid-intent-confirm .paid-intent-features > div {
        padding:10px 12px;
        border:1px solid rgba(8,43,74,.12);
        border-radius:10px;
        background:#fff;
        color:#082b4a;
        font-weight:800;
        line-height:1.45;
      }
      #mamoAiSafeReport,
      #mamoDecisionPanel,
      #mamoBaselinePanel,
      #mamoTriggerPanel,
      #mamoPeriodTriggerSummary,
      #mamoPressIntel {
        -webkit-tap-highlight-color: transparent;
      }
      body[data-mamo-plan="free"] #mamoAiSafeReport,
      body[data-mamo-plan="free"] #mamoDecisionPanel,
      body[data-mamo-plan="free"] #mamoBaselinePanel,
      body[data-mamo-plan="free"] #mamoTriggerPanel,
      body[data-mamo-plan="free"] #mamoPeriodTriggerSummary,
      body[data-mamo-plan="free"] #mamoPressIntel,
      body[data-mamo-plan="bronze"] #mamoDecisionPanel,
      body[data-mamo-plan="bronze"] #mamoBaselinePanel,
      body[data-mamo-plan="bronze"] #mamoTriggerPanel,
      body[data-mamo-plan="bronze"] #mamoPeriodTriggerSummary,
      body[data-mamo-plan="bronze"] #mamoPressIntel,
      body[data-mamo-plan="silver"] #mamoPressIntel {
        cursor:pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function boot(){
    installStyles();
    bindAll();
    const observer=new MutationObserver(()=>bindAll());
    observer.observe(document.documentElement,{subtree:true,childList:true});
    window.addEventListener("pageshow",bindAll);
    window.addEventListener("mamo:analysis-rendered",bindAll);
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot,{once:true});
  }else{
    boot();
  }
})();
