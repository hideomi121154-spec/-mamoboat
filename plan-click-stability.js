/* MAMO BOAT: prevent membership plan taps from moving the pressroom. */
(() => {
  "use strict";
  if (window.__MAMO_PLAN_CLICK_STABILITY__) return;
  window.__MAMO_PLAN_CLICK_STABILITY__ = true;

  function install() {
    const original = window.selectPilotPlan;
    if (typeof original !== "function" || original.__mamoClickStable) return;

    const wrapped = function (...args) {
      const panel = document.getElementById("membershipPanel");
      const beforeTop = panel?.getBoundingClientRect().top ?? null;
      const nativeScrollTo = window.scrollTo.bind(window);
      const nativeScrollBy = window.scrollBy.bind(window);
      const oldScrollTo = window.scrollTo;
      let blocking = true;

      // app.js currently schedules scrollTo() after plan selection. Suppress only that
      // short-lived programmatic jump; normal user scrolling remains untouched afterward.
      window.scrollTo = (...scrollArgs) => {
        if (blocking) return;
        return oldScrollTo.apply(window, scrollArgs);
      };

      const result = original.apply(this, args);

      const restoreAnchor = () => {
        if (beforeTop == null) return;
        const current = document.getElementById("membershipPanel");
        if (!current) return;
        const delta = current.getBoundingClientRect().top - beforeTop;
        if (Math.abs(delta) > 0.5) nativeScrollBy(0, delta);
      };

      restoreAnchor();
      requestAnimationFrame(restoreAnchor);
      setTimeout(restoreAnchor, 40);
      setTimeout(() => {
        restoreAnchor();
        blocking = false;
        window.scrollTo = oldScrollTo;
      }, 120);

      return result;
    };

    wrapped.__mamoClickStable = true;
    window.selectPilotPlan = wrapped;
  }

  install();
  window.addEventListener("load", install, { once: true });
  setTimeout(install, 0);
  setTimeout(install, 700);
})();
