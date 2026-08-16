/* MAMO BOAT Page Swipe v3 — native iOS horizontal scroll-snap between bottom-nav pages. */
(() => {
  "use strict";
  if (window.__MAMO_PAGE_SWIPE_V3__) return;
  window.__MAMO_PAGE_SWIPE_V3__ = true;

  const ORDER = ["home", "venues", "race", "records", "analysis", "settings"];
  let main = null;
  let settling = false;
  let settleTimer = null;
  let currentIndex = 0;
  let originalGo = null;

  function indexOfActive() {
    const id = document.querySelector(".screen.active")?.id || "home";
    const i = ORDER.indexOf(id);
    return i >= 0 ? i : 0;
  }

  function sizeMainTo(index) {
    const screen = document.getElementById(ORDER[index]);
    if (!main || !screen) return;
    const h = Math.max(screen.scrollHeight, window.innerHeight - 130);
    main.style.height = `${h}px`;
  }

  function updateNav(index) {
    document.querySelectorAll(".bottom-nav .nav").forEach((btn) => btn.classList.remove("active"));
    document.getElementById(`nav-${ORDER[index]}`)?.classList.add("active");
  }

  function activateWithoutAnimation(index) {
    const id = ORDER[index];
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
    updateNav(index);
    currentIndex = index;
    sizeMainTo(index);
  }

  function scrollToIndex(index, behavior = "auto") {
    if (!main || index < 0 || index >= ORDER.length) return;
    main.scrollTo({ left: index * main.clientWidth, top: 0, behavior });
    currentIndex = index;
    sizeMainTo(index);
  }

  function settleFromScroll() {
    if (!main || settling) return;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      const width = main.clientWidth || 1;
      const index = Math.max(0, Math.min(ORDER.length - 1, Math.round(main.scrollLeft / width)));
      if (index !== currentIndex || !document.getElementById(ORDER[index])?.classList.contains("active")) {
        activateWithoutAnimation(index);
      }
      currentIndex = index;
      sizeMainTo(index);
    }, 55);
  }

  function patchGo() {
    if (typeof window.go !== "function" || window.go.__mamoNativeSwipePatched) return;
    originalGo = window.go;
    const patched = function(id) {
      const index = ORDER.indexOf(id);
      if (index < 0) return originalGo.apply(this, arguments);
      // Let original logic prepare/render the requested page, but suppress visual delay via CSS.
      originalGo.apply(this, arguments);
      requestAnimationFrame(() => {
        activateWithoutAnimation(index);
        scrollToIndex(index, "smooth");
      });
    };
    patched.__mamoNativeSwipePatched = true;
    window.go = patched;
  }

  function fixRaceSwipe() {
    const rv = document.getElementById("raceView");
    if (rv) rv.dataset.mamoSwipeBound = "1";
    const label = document.querySelector("#mamoRaceUx .mru-head span");
    if (label) label.textContent = "左右スワイプでメニュー移動";
  }

  function style() {
    if (document.getElementById("mamoNativeSwipeStyle")) return;
    const s = document.createElement("style");
    s.id = "mamoNativeSwipeStyle";
    s.textContent = `
      html,body{overflow-x:hidden}
      .app-shell{overflow:hidden}
      .app-shell>main{
        display:flex!important;
        align-items:flex-start;
        gap:0;
        overflow-x:auto!important;
        overflow-y:hidden!important;
        padding:0!important;
        scroll-snap-type:x mandatory;
        scroll-behavior:auto;
        -webkit-overflow-scrolling:touch;
        scrollbar-width:none;
        overscroll-behavior-x:contain;
        touch-action:pan-x pan-y;
      }
      .app-shell>main::-webkit-scrollbar{display:none}
      .app-shell>main>.screen{
        display:block!important;
        flex:0 0 100%!important;
        width:100%!important;
        min-width:100%!important;
        padding:14px!important;
        margin:0!important;
        scroll-snap-align:start;
        scroll-snap-stop:always;
        animation:none!important;
        transform:none!important;
        opacity:1!important;
      }
      .app-shell>main>.screen:not(.active){pointer-events:none}
      .bottom-nav{touch-action:manipulation}
    `;
    document.head.appendChild(s);
  }

  function boot() {
    main = document.querySelector(".app-shell > main");
    if (!main) return;
    style();
    patchGo();
    currentIndex = indexOfActive();
    requestAnimationFrame(() => {
      scrollToIndex(currentIndex, "auto");
      sizeMainTo(currentIndex);
    });
    main.addEventListener("scroll", settleFromScroll, { passive: true });
    window.addEventListener("resize", () => {
      scrollToIndex(currentIndex, "auto");
      sizeMainTo(currentIndex);
    }, { passive: true });
    setInterval(() => {
      patchGo();
      fixRaceSwipe();
      sizeMainTo(currentIndex);
    }, 900);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
