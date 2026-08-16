/* MAMO BOAT Page Swipe v2 — direct, finger-tracking page navigation. */
(() => {
  "use strict";
  if (window.__MAMO_PAGE_SWIPE_V2__) return;
  window.__MAMO_PAGE_SWIPE_V2__ = true;

  const ORDER = ["home", "venues", "race", "records", "analysis", "settings"];
  let gesture = null;
  let locked = false;

  function activeScreen() { return document.querySelector(".screen.active"); }
  function activeId() { return activeScreen()?.id || "home"; }
  function isInteractive(target) {
    return !!target.closest?.("button,a,input,select,textarea,label,[role='button'],.mru-races,.filter-rail,.deadline-rail");
  }
  function resetTransform(el, animate=true) {
    if (!el) return;
    el.style.transition = animate ? "transform 120ms ease-out, opacity 120ms ease-out" : "none";
    el.style.transform = "translate3d(0,0,0)";
    el.style.opacity = "1";
    if (animate) setTimeout(()=>{el.style.transition="";el.style.transform="";el.style.opacity="";},130);
    else { el.style.transition=""; el.style.transform=""; el.style.opacity=""; }
  }
  function switchPage(id, direction) {
    if (locked || typeof window.go !== "function") return;
    locked = true;
    const current = activeScreen();
    if (current) {
      current.style.transition = "transform 90ms ease-out, opacity 90ms ease-out";
      current.style.transform = `translate3d(${direction < 0 ? -18 : 18}%,0,0)`;
      current.style.opacity = ".45";
    }
    // No artificial pre-delay: switch immediately.
    window.go(id);
    const next = document.getElementById(id);
    if (next) {
      next.style.transition = "none";
      next.style.transform = `translate3d(${direction < 0 ? 7 : -7}%,0,0)`;
      next.style.opacity = ".75";
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        next.style.transition = "transform 120ms ease-out, opacity 120ms ease-out";
        next.style.transform = "translate3d(0,0,0)";
        next.style.opacity = "1";
      }));
      setTimeout(()=>{next.style.transition="";next.style.transform="";next.style.opacity="";},140);
    }
    if (current) { current.style.transition=""; current.style.transform=""; current.style.opacity=""; }
    window.scrollTo(0,0);
    setTimeout(()=>{locked=false;},130);
  }

  function onStart(e) {
    if (locked || e.touches?.length !== 1 || isInteractive(e.target)) { gesture=null; return; }
    const t=e.touches[0];
    gesture={x:t.clientX,y:t.clientY,lastX:t.clientX,time:Date.now(),id:activeId(),axis:null};
  }
  function onMove(e) {
    if (!gesture || locked) return;
    const t=e.touches?.[0]; if(!t) return;
    const dx=t.clientX-gesture.x, dy=t.clientY-gesture.y;
    if (!gesture.axis && (Math.abs(dx)>8 || Math.abs(dy)>8)) gesture.axis = Math.abs(dx)>Math.abs(dy)*1.15 ? "x" : "y";
    if (gesture.axis !== "x") return;
    const idx=ORDER.indexOf(gesture.id);
    if ((dx>0&&idx===0)||(dx<0&&idx===ORDER.length-1)) return;
    const el=activeScreen(); if(!el)return;
    const capped=Math.max(-110,Math.min(110,dx));
    el.style.transition="none";
    el.style.transform=`translate3d(${capped*.55}px,0,0)`;
    el.style.opacity=String(Math.max(.72,1-Math.abs(capped)/420));
    gesture.lastX=t.clientX;
  }
  function onEnd(e) {
    if (!gesture || locked) { gesture=null; return; }
    const t=e.changedTouches?.[0]; if(!t){gesture=null;return;}
    const dx=t.clientX-gesture.x, dy=t.clientY-gesture.y, dt=Date.now()-gesture.time;
    const from=gesture.id, axis=gesture.axis; gesture=null;
    const el=activeScreen();
    if (axis!=="x" || dt>900 || Math.abs(dx)<48 || Math.abs(dx)<Math.abs(dy)*1.15) { resetTransform(el,true); return; }
    const idx=ORDER.indexOf(from);
    if (dx<0 && idx<ORDER.length-1) switchPage(ORDER[idx+1],-1);
    else if (dx>0 && idx>0) switchPage(ORDER[idx-1],1);
    else resetTransform(el,true);
  }
  function fixRaceGuide(){const span=document.querySelector("#mamoRaceUx .mru-head span");if(span)span.textContent="左右スワイプでメニュー移動";const rv=document.getElementById("raceView");if(rv)rv.dataset.mamoSwipeBound="1";}
  function style(){if(document.getElementById("mamoPageSwipeStyleV2"))return;const s=document.createElement("style");s.id="mamoPageSwipeStyleV2";s.textContent=`.screen.active{will-change:transform,opacity;backface-visibility:hidden;transform:translateZ(0)}main{overflow-x:hidden}.bottom-nav{touch-action:manipulation}`;document.head.appendChild(s)}
  function boot(){style();document.addEventListener("touchstart",onStart,{passive:true,capture:true});document.addEventListener("touchmove",onMove,{passive:true,capture:true});document.addEventListener("touchend",onEnd,{passive:true,capture:true});fixRaceGuide();setInterval(fixRaceGuide,1200)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
