/* MAMO BOAT — iPhone deadline rail / CTA interaction fix v2 */
(() => {
  "use strict";
  if (window.__MAMO_HOME_DEADLINE_TOUCH_FIX_V2__) return;
  window.__MAMO_HOME_DEADLINE_TOUCH_FIX_V2__ = true;

  function parseJump(button) {
    const raw = String(button?.getAttribute?.("onclick") || "");
    const match = raw.match(/jumpRace\(['\"](\d{2})['\"],\s*(\d+)\)/);
    return match ? { code: match[1], raceNo: Number(match[2]) } : null;
  }

  function ensureVisibleScreen(preferred = null) {
    const active = document.querySelector(".screen.active");
    if (active && active.offsetHeight > 0) return true;
    const id = preferred || document.body.dataset.screen || "home";
    if (typeof window.go === "function") {
      window.go(id);
      return true;
    }
    return false;
  }

  /* Let the native inline onclick run first. If an iOS in-app browser drops
     the click, recover on the next task without cancelling the original event. */
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("#nextRaces .deadline-card button");
    if (!button) return;
    const target = parseJump(button);
    if (!target) return;
    setTimeout(() => {
      const raceActive = document.getElementById("race")?.classList.contains("active");
      if (!raceActive && typeof window.jumpRace === "function") {
        window.jumpRace(target.code, target.raceNo);
      }
      setTimeout(() => ensureVisibleScreen("race"), 40);
    }, 0);
  }, false);

  /* Recover from iOS back/forward cache or transient all-hidden screen states. */
  window.addEventListener("pageshow", () => setTimeout(() => ensureVisibleScreen(), 0));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") setTimeout(() => ensureVisibleScreen(), 0);
  });

  const style = document.createElement("style");
  style.id = "mamoHomeDeadlineTouchFixStyle";
  style.textContent = `
    #nextRaces.deadline-rail{
      -webkit-overflow-scrolling:touch;
      touch-action:auto;
      overscroll-behavior-x:contain;
    }
    #nextRaces .deadline-card{touch-action:auto;}
    #nextRaces .deadline-card button{
      touch-action:manipulation;
      -webkit-tap-highlight-color:rgba(8,43,74,.12);
      position:relative;
      z-index:2;
    }
    body[data-screen="home"] #home.active,
    body[data-screen="race"] #race.active,
    body[data-screen="venues"] #venues.active,
    body[data-screen="records"] #records.active,
    body[data-screen="analysis"] #analysis.active{
      visibility:visible!important;
      opacity:1!important;
    }
  `;
  document.head.appendChild(style);
})();
