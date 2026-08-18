(() => {
  "use strict";

  const PLAN_META = {
    free: { label: "FREE", name: "無料", price: "0円" },
    bronze: { label: "BRONZE", name: "ブロンズ", price: "390円/月" },
    silver: { label: "SILVER", name: "シルバー", price: "690円/月" },
    gold: { label: "GOLD", name: "ゴールド", price: "1,190円/月" },
  };

  function install() {
    const original = window.selectPilotPlan;
    if (typeof original !== "function" || original.__mamoPartialUpdate) return false;

    const wrapped = function selectPilotPlanPartial(key) {
      const meta = PLAN_META[key];
      if (!meta) return;

      const paper = document.getElementById("pressPaper");
      const membership = document.getElementById("membershipPanel");
      const paperSnapshot = paper ? paper.innerHTML : null;
      const membershipSnapshot = membership ? membership.innerHTML : null;

      // iOS Safari can scroll when the focused button is removed by innerHTML.
      // Remove focus before the legacy renderer runs.
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

      const nativeRaf = window.requestAnimationFrame;
      const nativeScrollTo = window.scrollTo;
      let suppressedLegacyRaf = false;

      // The current core handler schedules one scroll correction after its full
      // pressroom repaint. Suppress that legacy correction only for this action.
      window.requestAnimationFrame = (callback) => {
        if (!suppressedLegacyRaf) {
          suppressedLegacyRaf = true;
          return 0;
        }
        return nativeRaf.call(window, callback);
      };
      window.scrollTo = () => {};

      try {
        // Keep the core state/save/event logic authoritative.
        original(key);
      } finally {
        window.requestAnimationFrame = nativeRaf;
        window.scrollTo = nativeScrollTo;
      }

      // Restore the reading DOM before the browser paints. This prevents a
      // layout-height change above/below the reader and preserves the article.
      if (paper && paperSnapshot !== null) paper.innerHTML = paperSnapshot;
      if (membership && membershipSnapshot !== null) membership.innerHTML = membershipSnapshot;

      // Update only the nodes that actually represent the selected plan.
      const badge = document.getElementById("pressPlanBadge");
      if (badge) badge.textContent = `${meta.label} / ${meta.name}`;

      if (membership) {
        const current = membership.querySelector(".membership-current");
        const title = current?.querySelector("h3");
        const price = current?.querySelector("b");
        if (title) title.textContent = `${meta.label}・${meta.name}`;
        if (price) price.textContent = meta.price;

        membership.querySelectorAll(".membership-selectable button").forEach((button) => {
          const selected = button.querySelector("b")?.textContent?.trim() === meta.label;
          button.classList.toggle("selected", selected);
          button.setAttribute("aria-pressed", selected ? "true" : "false");
        });
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
