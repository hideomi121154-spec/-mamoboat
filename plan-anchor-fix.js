(() => {
  "use strict";

  function installPlanAnchorFix() {
    const original = window.selectPilotPlan;
    if (typeof original !== "function" || original.__mamoPlanAnchorWrapped) return;

    function wrappedSelectPilotPlan(...args) {
      const beforePanel = document.getElementById("membershipPanel");
      const beforeTop = beforePanel ? beforePanel.getBoundingClientRect().top : null;
      const result = original.apply(this, args);

      if (beforeTop != null) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const afterPanel = document.getElementById("membershipPanel");
            if (!afterPanel) return;
            const afterTop = afterPanel.getBoundingClientRect().top;
            const delta = afterTop - beforeTop;
            if (Math.abs(delta) > 0.5) window.scrollBy(0, delta);
          });
        });
      }
      return result;
    }

    wrappedSelectPilotPlan.__mamoPlanAnchorWrapped = true;
    window.selectPilotPlan = wrappedSelectPilotPlan;
  }

  installPlanAnchorFix();
  window.addEventListener("load", installPlanAnchorFix, { once: true });
  setTimeout(installPlanAnchorFix, 0);
  setTimeout(installPlanAnchorFix, 800);
})();
