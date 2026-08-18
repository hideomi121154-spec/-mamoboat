(() => {
  "use strict";

  function install() {
    const original = window.selectPilotPlan;
    if (typeof original !== "function" || original.__mamoPartialUpdate) return false;

    const wrapped = function selectPilotPlanPartial(key) {
      const paper = document.getElementById("pressPaper");
      const paperSnapshot = paper ? paper.innerHTML : null;
      const paperClass = paper ? paper.className : null;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      // The legacy handler schedules a scroll correction after rebuilding the
      // whole pressroom. Suppress only that scheduled correction during this
      // synchronous plan-selection transaction.
      const nativeRaf = window.requestAnimationFrame;
      const nativeScrollTo = window.scrollTo;
      let suppressedRaf = false;

      window.requestAnimationFrame = (callback) => {
        if (!suppressedRaf) {
          suppressedRaf = true;
          return 0;
        }
        return nativeRaf.call(window, callback);
      };
      window.scrollTo = () => {};

      try {
        original(key);
      } finally {
        window.requestAnimationFrame = nativeRaf;
        window.scrollTo = nativeScrollTo;
      }

      // Keep the article the user is currently reading untouched. The plan
      // state and membership panel were already updated by the core handler.
      if (paper && paperSnapshot !== null) {
        paper.innerHTML = paperSnapshot;
        if (paperClass !== null) paper.className = paperClass;
      }

      const labels = { free: "FREE", bronze: "BRONZE", silver: "SILVER", gold: "GOLD" };
      document.querySelectorAll("#membershipPanel .membership-selectable button").forEach((button) => {
        const selected = button.querySelector("b")?.textContent?.trim() === labels[key];
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });

      // Do not scroll. If Safari changed the visual position synchronously,
      // restore only the exact pre-click position once, without animation.
      if (window.scrollX !== scrollX || window.scrollY !== scrollY) {
        nativeScrollTo.call(window, scrollX, scrollY);
      }
    };

    wrapped.__mamoPartialUpdate = true;
    wrapped.__mamoOriginal = original;
    window.selectPilotPlan = wrapped;
    return true;
  }

  if (!install()) {
    const start = Date.now();
    const timer = window.setInterval(() => {
      if (install() || Date.now() - start > 5000) window.clearInterval(timer);
    }, 50);
  }
})();
