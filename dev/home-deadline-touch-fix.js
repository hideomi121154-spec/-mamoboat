/* MAMO BOAT — iPhone deadline rail / CTA interaction fix */
(() => {
  "use strict";
  if (window.__MAMO_HOME_DEADLINE_TOUCH_FIX__) return;
  window.__MAMO_HOME_DEADLINE_TOUCH_FIX__ = true;

  function parseJump(button) {
    const raw = String(button?.getAttribute?.("onclick") || "");
    const match = raw.match(/jumpRace\(['\"](\d{2})['\"],\s*(\d+)\)/);
    return match ? { code: match[1], raceNo: Number(match[2]) } : null;
  }

  function activate(button) {
    const target = parseJump(button);
    if (!target || typeof window.jumpRace !== "function") return false;
    window.jumpRace(target.code, target.raceNo);
    return true;
  }

  /* Inline onclick can be unreliable in some iOS in-app browser surfaces.
     Own the CTA through delegated listeners without touching rendering. */
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("#nextRaces .deadline-card button");
    if (!button) return;
    if (!parseJump(button)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    activate(button);
  }, true);

  /* Keep horizontal rail natively swipeable on iPhone. */
  const style = document.createElement("style");
  style.id = "mamoHomeDeadlineTouchFixStyle";
  style.textContent = `
    #nextRaces.deadline-rail{
      -webkit-overflow-scrolling:touch;
      touch-action:pan-x;
      overscroll-behavior-x:contain;
      scroll-behavior:smooth;
    }
    #nextRaces .deadline-card{touch-action:pan-x;}
    #nextRaces .deadline-card button{
      touch-action:manipulation;
      -webkit-tap-highlight-color:rgba(8,43,74,.12);
      position:relative;
      z-index:2;
    }
  `;
  document.head.appendChild(style);
})();
