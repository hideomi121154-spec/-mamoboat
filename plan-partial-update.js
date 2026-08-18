(() => {
  "use strict";

  const PLAN_META = {
    free: { label: "FREE", name: "無料", price: "0円" },
    bronze: { label: "BRONZE", name: "ブロンズ", price: "390円/月" },
    silver: { label: "SILVER", name: "シルバー", price: "690円/月" },
    gold: { label: "GOLD", name: "ゴールド", price: "1,190円/月" },
  };

  function lockInnerHTML(element) {
    if (!element) return () => {};
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
    if (!descriptor?.get || !descriptor?.set) return () => {};
    Object.defineProperty(element, "innerHTML", {
      configurable: true,
      get() { return descriptor.get.call(element); },
      set() { /* intentionally ignore full-block repaint during plan selection */ },
    });
    return () => {
      try { delete element.innerHTML; } catch (_) {}
    };
  }

  function updateVisiblePlan(key) {
    const meta = PLAN_META[key];
    if (!meta) return;

    const badge = document.getElementById("pressPlanBadge");
    if (badge) badge.textContent = `${meta.label} / ${meta.name}`;

    const membership = document.getElementById("membershipPanel");
    if (!membership) return;

    const leafNodes = Array.from(membership.querySelectorAll("*")).filter((node) => node.children.length === 0);
    const titleNode = leafNodes.find((node) => /^(FREE|BRONZE|SILVER|GOLD)[\s・]/.test(node.textContent.trim()));
    const priceNode = leafNodes.find((node) => /^(0円|390円|690円|1,190円)(\/月)?$/.test(node.textContent.trim()));
    if (titleNode) titleNode.textContent = `${meta.label}・${meta.name}`;
    if (priceNode) priceNode.textContent = meta.price;

    membership.querySelectorAll(".membership-selectable button").forEach((button) => {
      const selected = button.querySelector("b")?.textContent?.trim() === meta.label;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  }

  function install() {
    const original = window.selectPilotPlan;
    if (typeof original !== "function" || original.__mamoPartialUpdateV2) return false;

    const wrapped = function selectPilotPlanPartialV2(key) {
      if (!PLAN_META[key]) return;

      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

      const locked = [
        document.getElementById("pressPaper"),
        document.getElementById("analysisCards"),
        document.getElementById("analysisList"),
        document.getElementById("membershipPanel"),
      ].map(lockInnerHTML);

      const nativeScrollTo = window.scrollTo;
      window.scrollTo = () => {};

      try {
        // Let the core remain authoritative for state, persistence and event logs,
        // but block its full pressroom DOM repaint for this single transaction.
        original(key);
      } finally {
        locked.reverse().forEach((unlock) => unlock());
        // Keep scrollTo suppressed through the legacy requestAnimationFrame callback.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo = nativeScrollTo;
          });
        });
      }

      updateVisiblePlan(key);
    };

    wrapped.__mamoPartialUpdateV2 = true;
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
