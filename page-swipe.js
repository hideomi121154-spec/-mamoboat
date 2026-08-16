/* MAMO BOAT Page Swipe v1 — swipe between bottom-nav pages, not between races. */
(() => {
  "use strict";
  if (window.__MAMO_PAGE_SWIPE_V1__) return;
  window.__MAMO_PAGE_SWIPE_V1__ = true;

  const ORDER = ["home", "venues", "race", "records", "analysis", "settings"];
  let start = null;
  let locked = false;

  // Disable the old race-only swipe binder before it can attach.
  const raceView = document.getElementById("raceView");
  if (raceView) raceView.dataset.mamoSwipeBound = "1";

  function activeId() {
    return document.querySelector(".screen.active")?.id || "home";
  }

  function isInteractive(target) {
    return !!target.closest?.("button,a,input,select,textarea,label,[role='button'],.mru-races,.filter-rail,.deadline-rail");
  }

  function goPage(id, direction) {
    if (!ORDER.includes(id) || typeof window.go !== "function" || locked) return;
    locked = true;
    const current = document.querySelector(".screen.active");
    if (current?.animate) {
      current.animate(
        [{ transform: "translateX(0)", opacity: 1 }, { transform: `translateX(${direction < 0 ? "-12%" : "12%"})`, opacity: .35 }],
        { duration: 120, easing: "ease-out" }
      );
    }
    window.setTimeout(() => {
      window.go(id);
      const next = document.getElementById(id);
      next?.animate?.(
        [{ transform: `translateX(${direction < 0 ? "10%" : "-10%"})`, opacity: .4 }, { transform: "translateX(0)", opacity: 1 }],
        { duration: 170, easing: "ease-out" }
      );
      window.scrollTo({ top: 0, behavior: "instant" });
      window.setTimeout(() => { locked = false; }, 190);
    }, 100);
  }

  function onStart(e) {
    if (e.touches?.length !== 1 || isInteractive(e.target)) { start = null; return; }
    const t = e.touches[0];
    start = { x: t.clientX, y: t.clientY, time: Date.now(), id: activeId() };
  }

  function onEnd(e) {
    if (!start || locked) { start = null; return; }
    const t = e.changedTouches?.[0];
    if (!t) { start = null; return; }
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const dt = Date.now() - start.time;
    const from = start.id;
    start = null;
    if (dt > 800 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.35) return;
    const index = ORDER.indexOf(from);
    if (dx < 0 && index < ORDER.length - 1) goPage(ORDER[index + 1], -1);
    else if (dx > 0 && index > 0) goPage(ORDER[index - 1], 1);
  }

  function fixRaceGuide() {
    const span = document.querySelector("#mamoRaceUx .mru-head span");
    if (span && span.textContent !== "画面スワイプでメニュー移動") span.textContent = "画面スワイプでメニュー移動";
    const rv = document.getElementById("raceView");
    if (rv) rv.dataset.mamoSwipeBound = "1";
  }

  function style() {
    if (document.getElementById("mamoPageSwipeStyle")) return;
    const s = document.createElement("style");
    s.id = "mamoPageSwipeStyle";
    s.textContent = `.screen.active{will-change:transform,opacity}.bottom-nav{touch-action:manipulation}`;
    document.head.appendChild(s);
  }

  function boot() {
    style();
    document.addEventListener("touchstart", onStart, { passive: true, capture: true });
    document.addEventListener("touchend", onEnd, { passive: true, capture: true });
    fixRaceGuide();
    window.setInterval(fixRaceGuide, 700);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
