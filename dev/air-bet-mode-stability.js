/* MAMO BOAT — AIR BET mode switch stability v1
 * Keep the mode selector visually anchored while renderBuilder replaces only the builder DOM.
 * This avoids iPhone Safari/PWA jumping to a blank area when Normal/BOX/Formation have different heights.
 */
(() => {
  "use strict";
  if (window.__MAMO_AIR_BET_MODE_STABILITY_V1__) return;
  window.__MAMO_AIR_BET_MODE_STABILITY_V1__ = true;

  const WRAPPED = Symbol("mamoAirBetModeStability");

  function installStyle() {
    if (document.getElementById("mamoAirBetModeStabilityStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoAirBetModeStabilityStyle";
    style.textContent = `
      #modeTabs,#builder,.betdesk{overflow-anchor:none}
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyle();
    const original = window.setMode;
    if (typeof original !== "function" || original[WRAPPED]) return;

    const wrapped = function (...args) {
      const tabs = document.getElementById("modeTabs");
      const scroller = document.scrollingElement || document.documentElement;
      const beforeTop = tabs?.getBoundingClientRect?.().top;
      const beforeScroll = Number(scroller?.scrollTop || 0);

      const result = original.apply(this, args);

      const nextTabs = document.getElementById("modeTabs");
      const afterTop = nextTabs?.getBoundingClientRect?.().top;
      if (scroller && Number.isFinite(beforeTop) && Number.isFinite(afterTop)) {
        const delta = afterTop - beforeTop;
        if (Math.abs(delta) > 0.5) {
          scroller.scrollTop = Math.max(0, Number(scroller.scrollTop || 0) + delta);
        } else if (Math.abs(Number(scroller.scrollTop || 0) - beforeScroll) > window.innerHeight) {
          // Safari can occasionally clamp to a distant blank position when the builder shrinks.
          scroller.scrollTop = beforeScroll;
        }
      }
      return result;
    };

    wrapped[WRAPPED] = true;
    window.setMode = wrapped;
  }

  install();
  window.addEventListener("pageshow", install);
  window.MAMO_AIR_BET_MODE_STABILITY = Object.freeze({ refresh: install });
})();
