(() => {
  "use strict";

  const KEY = "mamoboat_v40_personal";
  const META = {
    free:   { label: "FREE",   name: "無料",     price: "0円" },
    bronze: { label: "BRONZE", name: "ブロンズ", price: "390円/月" },
    silver: { label: "SILVER", name: "シルバー", price: "690円/月" },
    gold:   { label: "GOLD",   name: "ゴールド", price: "1,190円/月" },
  };

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function savePlan(key) {
    const state = readState();
    state.pressroom = state.pressroom && typeof state.pressroom === "object"
      ? state.pressroom
      : {};
    state.pressroom.plan = key;
    if (key === "free") {
      state.pressroom.morningEnabled = false;
      state.pressroom.weeklyEnabled = false;
      state.pressroom.monthlyEnabled = false;
    } else if (key === "bronze") {
      state.pressroom.morningEnabled = true;
      state.pressroom.weeklyEnabled = false;
      state.pressroom.monthlyEnabled = false;
    } else {
      state.pressroom.morningEnabled = true;
      state.pressroom.weeklyEnabled = true;
      state.pressroom.monthlyEnabled = true;
    }
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
  }

  function updateMembership(key) {
    const meta = META[key];
    if (!meta) return;

    const badge = document.getElementById("pressPlanBadge");
    if (badge) badge.textContent = `${meta.label} / ${meta.name}`;

    const panel = document.getElementById("membershipPanel");
    if (panel) {
      const current = panel.querySelector(".membership-current");
      const title = current?.querySelector("h3");
      const price = current?.querySelector("b");
      if (title) title.textContent = `${meta.label}・${meta.name}`;
      if (price) price.textContent = meta.price;

      panel.querySelectorAll(".membership-selectable button").forEach((button) => {
        const selected = button.querySelector("b")?.textContent?.trim() === meta.label;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
    }

    document.querySelectorAll("[data-report-type]").forEach((button) => {
      const type = button.dataset.reportType;
      const unlocked = type === "morning" ? key !== "free" : ["silver", "gold"].includes(key);
      button.classList.toggle("locked", !unlocked);
    });
  }

  function closePlanModalIfOpen() {
    const bg = document.getElementById("modalBg");
    if (!bg) return;
    bg.classList.remove("show", "open", "active");
    bg.style.display = "none";
    document.body.classList.remove("modal-open");
  }

  function install() {
    // Important: do NOT call the legacy selectPilotPlan. It performs a full
    // pressroom repaint and scroll correction. This controller is authoritative
    // for plan selection and updates only the affected UI nodes.
    window.selectPilotPlan = function selectPilotPlanStable(key) {
      if (!META[key]) return;
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      savePlan(key);
      updateMembership(key);
      closePlanModalIfOpen();
      window.dispatchEvent(new CustomEvent("mamo:plan-changed", { detail: { plan: key } }));
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }

  // app.js is loaded before this module, but keep one short retry window in
  // case an iOS cached startup delays script evaluation.
  setTimeout(install, 0);
  setTimeout(install, 250);
})();
