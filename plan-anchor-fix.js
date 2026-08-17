(() => {
  "use strict";

  function installPlanAnchorFix() {
    const original = window.selectPilotPlan;
    if (typeof original !== "function" || original.__mamoPlanAnchorWrapped) return;

    function wrappedSelectPilotPlan(...args) {
      const beforePanel = document.getElementById("membershipPanel");
      const beforeTop = beforePanel ? beforePanel.getBoundingClientRect().top : null;
      const active = document.activeElement;
      if (active && typeof active.blur === "function") active.blur();

      const html = document.documentElement;
      const body = document.body;
      const prevHtmlAnchor = html.style.overflowAnchor;
      const prevBodyAnchor = body.style.overflowAnchor;
      html.style.overflowAnchor = "none";
      body.style.overflowAnchor = "none";

      const result = original.apply(this, args);

      if (beforeTop != null) {
        const correct = () => {
          const panel = document.getElementById("membershipPanel");
          if (!panel) return;
          const afterTop = panel.getBoundingClientRect().top;
          const delta = afterTop - beforeTop;
          if (Math.abs(delta) > 0.5) window.scrollBy(0, delta);
        };

        let frames = 0;
        const lockFrames = () => {
          correct();
          frames += 1;
          if (frames < 12) requestAnimationFrame(lockFrames);
        };
        requestAnimationFrame(lockFrames);
        [60, 120, 220, 320].forEach((delay) => setTimeout(correct, delay));
      }

      setTimeout(() => {
        html.style.overflowAnchor = prevHtmlAnchor;
        body.style.overflowAnchor = prevBodyAnchor;
      }, 380);

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
