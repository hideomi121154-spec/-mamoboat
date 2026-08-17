(() => {
  "use strict";

  function install() {
    const original = window.selectPilotPlan;
    if (typeof original !== "function" || original.__mamoStablePlanWrapped) return;

    function stableSelectPilotPlan(...args) {
      const panel = document.getElementById("membershipPanel");
      const beforeTop = panel ? panel.getBoundingClientRect().top : null;
      const active = document.activeElement;
      if (active && typeof active.blur === "function") active.blur();

      const nativeScrollTo = window.scrollTo;
      let suppressScrollTo = true;
      window.scrollTo = function(...scrollArgs) {
        if (suppressScrollTo) return;
        return nativeScrollTo.apply(window, scrollArgs);
      };

      const result = original.apply(this, args);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const afterPanel = document.getElementById("membershipPanel");
          if (beforeTop != null && afterPanel) {
            const delta = afterPanel.getBoundingClientRect().top - beforeTop;
            if (Math.abs(delta) > 0.5) window.scrollBy(0, delta);
          }
          suppressScrollTo = false;
          window.scrollTo = nativeScrollTo;
        });
      });

      return result;
    }

    stableSelectPilotPlan.__mamoStablePlanWrapped = true;
    window.selectPilotPlan = stableSelectPilotPlan;
  }

  install();
  window.addEventListener("load", install, { once: true });
  setTimeout(install, 0);
})();
