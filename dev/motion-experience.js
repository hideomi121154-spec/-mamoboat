/* MAMO BOAT Motion Experience v1 — calm, action-triggered feedback only. */
(() => {
  "use strict";
  if (window.__MAMO_MOTION_EXPERIENCE_V1__) return;
  window.__MAMO_MOTION_EXPERIENCE_V1__ = true;

  const APP_KEY = "mamoboat_v40_personal";
  const RECORD_KEY = "mamoboat_record_v1";
  const snapshots = new WeakMap();
  let resultArmedUntil = 0;
  let momentTimer = 0;

  const read = (key) => {
    try { return JSON.parse(localStorage.getItem(key) || "null") || {}; }
    catch (_) { return {}; }
  };
  const appRecordCount = () => {
    const state = read(APP_KEY);
    return Array.isArray(state.records) ? state.records.length : 0;
  };
  const recordState = () => {
    const state = read(RECORD_KEY);
    return {
      balance: Math.max(0, Number(state.balance) || 0),
      reflections: Object.keys(state.reflections || {}).length,
      postReflections: Object.keys(state.postReflections || {}).length,
      skips: Object.keys(state.skipReflections || {}).length,
    };
  };
  const recordTotal = (state) => state.reflections + state.postReflections + state.skips;
  const text = (node) => String(node?.textContent || "").replace(/\s+/g, " ").trim();
  const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

  function installStyles() {
    if (document.getElementById("mamoMotionExperienceStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoMotionExperienceStyle";
    style.textContent = `
      :root{--mamo-motion-red:#dc2029;--mamo-motion-blue:#082b4a;--mamo-motion-white:#fff}
      button,.btn,.nav,.filter,.bettypebtn,.pick,.paper-tabs button{
        -webkit-tap-highlight-color:transparent;
      }
      button:not(:disabled),.btn:not([aria-disabled="true"]),.nav,.filter,.bettypebtn,.pick{
        transition:transform .16s cubic-bezier(.2,.8,.2,1),box-shadow .16s ease,filter .16s ease;
      }
      button:not(:disabled):active,.btn:not([aria-disabled="true"]):active,.nav:active,.filter:active,.bettypebtn:active,.pick:active{
        transform:translateY(2px) scale(.985);
        filter:saturate(1.06);
      }
      .nav{position:relative;overflow:hidden}
      .nav b{transition:transform .2s cubic-bezier(.2,.8,.2,1)}
      .nav:active b{transform:translateY(-2px) scale(1.08)}
      .nav.active::after{
        content:"";position:absolute;left:18%;right:18%;bottom:2px;height:3px;border-radius:4px;
        background:#fff;transform-origin:left;animation:mamo-motion-nav-line .28s cubic-bezier(.2,.8,.2,1) both;
      }
      .screen.active{animation:mamo-motion-screen-in .24s cubic-bezier(.2,.8,.2,1) both}
      #modalBg.show .modal{animation:mamo-motion-sheet-up .23s cubic-bezier(.2,.8,.2,1) both}
      #mamoHomeRecordBalance .mrh-bar i,.msrb-bar i{transition:width .48s cubic-bezier(.2,.8,.2,1)!important}
      .mamo-decision-note.show{animation:mamo-motion-note-in .28s cubic-bezier(.2,.8,.2,1) both}

      #mamoMotionMoment{
        position:fixed;inset:0;z-index:10080;display:grid;place-items:center;padding:22px;
        pointer-events:none;background:rgba(8,43,74,.12);animation:mamo-motion-backdrop-in .18s ease both;
      }
      #mamoMotionMoment.is-leaving{animation:mamo-motion-backdrop-out .2s ease both}
      #mamoMotionMoment .mamo-motion-card{
        position:relative;isolation:isolate;width:min(365px,calc(100vw - 36px));overflow:hidden;
        padding:22px 20px 20px;border:2px solid var(--mamo-motion-blue);border-top:7px solid var(--mamo-motion-red);
        border-radius:18px;background:rgba(255,255,255,.98);color:var(--mamo-motion-blue);
        box-shadow:0 18px 44px rgba(8,43,74,.24);animation:mamo-motion-card-in .34s cubic-bezier(.16,1,.3,1) both;
      }
      #mamoMotionMoment.is-leaving .mamo-motion-card{animation:mamo-motion-card-out .2s ease both}
      #mamoMotionMoment .mamo-motion-card::before{
        content:"";position:absolute;z-index:-1;left:-22%;right:-22%;bottom:-72px;height:126px;
        border-radius:50%;background:linear-gradient(180deg,rgba(8,43,74,.05),rgba(8,43,74,.13));
        animation:mamo-motion-wave .7s cubic-bezier(.2,.8,.2,1) both;
      }
      #mamoMotionMoment .mamo-motion-speedline{
        position:absolute;top:0;left:-35%;width:46%;height:7px;background:var(--mamo-motion-red);
        transform:skewX(-24deg);animation:mamo-motion-speedline .55s cubic-bezier(.2,.8,.2,1) both;
      }
      #mamoMotionMoment .mamo-motion-copy{position:relative;z-index:2;padding-right:72px}
      #mamoMotionMoment .mamo-motion-eyebrow{
        display:block;color:var(--mamo-motion-red);font-size:10px;font-weight:1000;letter-spacing:.17em;
      }
      #mamoMotionMoment .mamo-motion-title{
        display:block;margin-top:6px;font-size:27px;line-height:1.18;font-weight:1000;letter-spacing:-.055em;
      }
      #mamoMotionMoment .mamo-motion-detail{
        display:block;margin-top:7px;color:#5d7182;font-size:12px;line-height:1.55;font-weight:800;
      }
      #mamoMotionMoment .mamo-motion-badge{
        position:absolute;z-index:3;right:18px;top:23px;display:grid;place-items:center;min-width:58px;height:58px;
        padding:7px;border:3px solid var(--mamo-motion-red);border-radius:50%;color:var(--mamo-motion-red);
        background:white;font-size:11px;line-height:1.05;font-weight:1000;text-align:center;
        transform:rotate(-7deg);animation:mamo-motion-stamp .42s .1s cubic-bezier(.16,1,.3,1) both;
      }
      #mamoMotionMoment .mamo-motion-mascot{
        display:none;position:absolute;right:8px;bottom:-2px;z-index:1;width:78px;height:78px;object-fit:contain;
        filter:drop-shadow(0 5px 7px rgba(8,43,74,.16));animation:mamo-motion-mascot .45s .08s cubic-bezier(.16,1,.3,1) both;
      }
      #mamoMotionMoment[data-kind="skip"] .mamo-motion-card{border-top-color:var(--mamo-motion-blue)}
      #mamoMotionMoment[data-kind="skip"] .mamo-motion-copy{padding-right:82px}
      #mamoMotionMoment[data-kind="skip"] .mamo-motion-badge{display:none}
      #mamoMotionMoment[data-kind="skip"] .mamo-motion-mascot{display:block}
      #mamoMotionMoment[data-kind="result"] .mamo-motion-card{
        border-radius:4px;background:
          linear-gradient(rgba(255,255,255,.97),rgba(255,255,255,.97)),
          repeating-linear-gradient(0deg,transparent 0 21px,rgba(8,43,74,.08) 22px);
      }
      #mamoMotionMoment[data-kind="result"] .mamo-motion-badge{border-radius:4px;transform:rotate(-3deg)}
      #mamoMotionMoment[data-kind="record"] .mamo-motion-card::after{
        content:"";position:absolute;left:20px;right:20px;bottom:10px;height:4px;border-radius:5px;
        background:linear-gradient(90deg,var(--mamo-motion-red) 0 72%,#dfe7ee 72%);
        transform-origin:left;animation:mamo-motion-progress .58s .08s cubic-bezier(.2,.8,.2,1) both;
      }

      @keyframes mamo-motion-screen-in{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
      @keyframes mamo-motion-sheet-up{from{opacity:0;transform:translateY(18px) scale(.99)}to{opacity:1;transform:none}}
      @keyframes mamo-motion-note-in{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:none}}
      @keyframes mamo-motion-nav-line{from{transform:scaleX(0)}to{transform:scaleX(1)}}
      @keyframes mamo-motion-backdrop-in{from{opacity:0}to{opacity:1}}
      @keyframes mamo-motion-backdrop-out{from{opacity:1}to{opacity:0}}
      @keyframes mamo-motion-card-in{from{opacity:0;transform:translateY(16px) scale(.965)}to{opacity:1;transform:none}}
      @keyframes mamo-motion-card-out{from{opacity:1;transform:none}to{opacity:0;transform:translateY(-7px) scale(.99)}}
      @keyframes mamo-motion-speedline{0%{transform:translateX(0) skewX(-24deg)}100%{transform:translateX(305%) skewX(-24deg)}}
      @keyframes mamo-motion-stamp{from{opacity:0;transform:rotate(-7deg) scale(1.5)}to{opacity:1;transform:rotate(-7deg) scale(1)}}
      @keyframes mamo-motion-mascot{from{opacity:0;transform:translateY(14px) scale(.92)}to{opacity:1;transform:none}}
      @keyframes mamo-motion-wave{from{transform:translateX(-10%) scaleX(.9);opacity:0}to{transform:translateX(8%) scaleX(1.1);opacity:1}}
      @keyframes mamo-motion-progress{from{transform:scaleX(0)}to{transform:scaleX(1)}}

      @media(prefers-reduced-motion:reduce){
        button,.btn,.nav,.filter,.bettypebtn,.pick,.paper-tabs button,
        .screen.active,#modalBg.show .modal,#mamoHomeRecordBalance .mrh-bar i,.msrb-bar i,
        #mamoMotionMoment,#mamoMotionMoment *{animation:none!important;transition:none!important;transform:none!important}
        #mamoMotionMoment .mamo-motion-speedline{display:none}
      }
    `;
    document.head.appendChild(style);
  }

  function showMoment(kind, eyebrow, title, detail, badge) {
    installStyles();
    document.getElementById("mamoMotionMoment")?.remove();
    clearTimeout(momentTimer);

    const layer = document.createElement("div");
    layer.id = "mamoMotionMoment";
    layer.dataset.kind = kind;
    layer.setAttribute("role", "status");
    layer.setAttribute("aria-live", "polite");
    layer.innerHTML = `<div class="mamo-motion-card">
      <i class="mamo-motion-speedline" aria-hidden="true"></i>
      <div class="mamo-motion-copy"><span class="mamo-motion-eyebrow"></span><strong class="mamo-motion-title"></strong><span class="mamo-motion-detail"></span></div>
      <b class="mamo-motion-badge" aria-hidden="true"></b>
      <img class="mamo-motion-mascot" src="assets/mamokamo.webp?v=20260823-4" alt="">
    </div>`;
    layer.querySelector(".mamo-motion-eyebrow").textContent = eyebrow;
    layer.querySelector(".mamo-motion-title").textContent = title;
    layer.querySelector(".mamo-motion-detail").textContent = detail;
    layer.querySelector(".mamo-motion-badge").textContent = badge;
    document.body.appendChild(layer);

    const hold = reduceMotion() ? 850 : kind === "skip" ? 1320 : kind === "bet" ? 920 : 1120;
    momentTimer = window.setTimeout(() => {
      layer.classList.add("is-leaving");
      window.setTimeout(() => layer.remove(), reduceMotion() ? 0 : 220);
    }, hold);
  }

  function capture(event) {
    const target = event.target?.closest?.("button,[data-decision-skip-reason],[data-answer],[data-emotion]");
    if (!target) return;
    const label = text(target);
    if (label === "AIR BETを確定する") snapshots.set(target, { type: "bet", count: appRecordCount() });
    else if (target.matches("[data-decision-skip-reason]")) snapshots.set(target, { type: "skip", record: recordState() });
    else if (target.matches("[data-answer],[data-emotion]")) snapshots.set(target, { type: "record", record: recordState() });
    if (/^(結果を更新|今すぐ公式結果を確認)$/.test(label)) resultArmedUntil = Date.now() + 15000;
  }

  function respond(event) {
    const target = event.target?.closest?.("button,[data-decision-skip-reason],[data-answer],[data-emotion]");
    if (!target) return;
    const snapshot = snapshots.get(target);
    if (!snapshot) return;

    if (snapshot.type === "bet") {
      window.setTimeout(() => {
        if (appRecordCount() <= snapshot.count) return;
        showMoment("bet", "AIR BET / ACCEPTED", "AIR BETを記録", "現金は使わず、結果までMAMO BOATで確認します。", "受付");
      }, 40);
      return;
    }

    if (snapshot.type === "skip") {
      window.setTimeout(() => {
        const after = recordState();
        if (after.skips <= snapshot.record.skips) return;
        const gain = Math.max(0, after.balance - snapshot.record.balance);
        showMoment("skip", "CONTROL KEPT", "主導権を守った", gain ? `見送ると決めた行動を記録。MAMO RECORD +${gain}R` : "見送ると決めた行動を記録しました。", "");
      }, 90);
      return;
    }

    window.setTimeout(() => {
      const after = recordState();
      if (recordTotal(after) <= recordTotal(snapshot.record)) return;
      const gain = Math.max(0, after.balance - snapshot.record.balance);
      showMoment("record", "MAMO RECORD", "振り返りを記録", gain ? `MAMO RECORD +${gain}R。あとはMAMOがまとめます。` : "記録を残しました。あとはMAMOがまとめます。", gain ? `+${gain}R` : "記録");
    }, target.matches("[data-answer]") ? 340 : 60);
  }

  function watchResults() {
    const modal = document.getElementById("modal");
    if (!modal || typeof MutationObserver === "undefined") return;
    new MutationObserver(() => {
      if (Date.now() > resultArmedUntil) return;
      const success = modal.querySelector(".instant-result.success");
      if (!success || success.dataset.mamoMotionShown === "1") return;
      success.dataset.mamoMotionShown = "1";
      resultArmedUntil = 0;
      showMoment("result", "MAMO BOAT PRESS", "結果を反映", "実レースの確定結果とB精算を更新しました。", "号外");
    }).observe(modal, { childList: true, subtree: true });
  }

  function boot() {
    installStyles();
    document.addEventListener("click", capture, true);
    document.addEventListener("click", respond, false);
    watchResults();
    window.MAMO_MOTION_EXPERIENCE = Object.freeze({ version: 1, show: showMoment });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
