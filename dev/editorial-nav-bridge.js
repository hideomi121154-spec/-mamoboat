/* MAMO BOAT — editorial placeholder navigation bridge.
 * Keeps the user-facing Editorial icon working even when an older controlling
 * service worker rewrites app.js to a cached version that still redirected
 * "analysis" back to Home.
 */
(() => {
  "use strict";
  if (window.__MAMO_EDITORIAL_NAV_BRIDGE__) return;
  window.__MAMO_EDITORIAL_NAV_BRIDGE__ = true;

  const SCREEN_ID = "analysis";
  const NAV_ID = "nav-analysis";
  const originalGo = typeof window.go === "function" ? window.go.bind(window) : null;

  function activateEditorial(event) {
    event?.preventDefault?.();

    const target = document.getElementById(SCREEN_ID);
    if (!target) return false;

    document.body.dataset.screen = SCREEN_ID;
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.toggle("active", screen === target);
    });
    document.querySelectorAll(".bottom-nav .nav, .bottom-nav .nav-item").forEach((item) => {
      item.classList.toggle("active", item.id === NAV_ID);
    });

    window.scrollTo?.(0, 0);
    window.dispatchEvent?.(new CustomEvent("mamo:editorial-placeholder-opened"));
    requestAnimationFrame?.(() => window.MAMO_SECONDARY_MENU?.place?.());
    return true;
  }

  function bridgedGo(id, ...args) {
    if (id === SCREEN_ID && activateEditorial()) return;
    return originalGo?.(id, ...args);
  }

  function bindButton() {
    const button = document.getElementById(NAV_ID);
    if (!button) return;
    button.onclick = activateEditorial;
    button.dataset.mamoEditorialNavOwner = "bridge";
  }

  window.go = bridgedGo;
  window.openEditorialPlaceholder = activateEditorial;

  function boot() {
    bindButton();
    const nav = document.querySelector(".bottom-nav");
    if (nav && typeof MutationObserver === "function") {
      new MutationObserver(bindButton).observe(nav, { childList: true, subtree: false });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
  window.addEventListener?.("pageshow", bindButton);
})();
