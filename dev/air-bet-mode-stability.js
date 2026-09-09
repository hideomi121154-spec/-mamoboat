/* MAMO BOAT — AIR BET mode/type switch stability v2
 * Keep the AIR BET selector visually anchored while renderBuilder replaces only the builder DOM.
 * Covers both Normal/BOX/Formation changes and ticket-type changes such as 3連単→単勝.
 * This avoids iPhone Safari/PWA jumping to a distant blank area when the builder height changes.
 */
(() => {
  "use strict";
  if (window.__MAMO_AIR_BET_MODE_STABILITY_V2__) return;
  window.__MAMO_AIR_BET_MODE_STABILITY_V2__ = true;
  window.__MAMO_AIR_BET_MODE_STABILITY_V1__ = true;

  const WRAPPED = Symbol("mamoAirBetModeStabilityV2");

  function installStyle() {
    if (document.getElementById("mamoAirBetModeStabilityStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoAirBetModeStabilityStyle";
    style.textContent = `
      #modeTabs,#builder,.betdesk,#raceView{overflow-anchor:none}
    `;
    document.head.appendChild(style);
  }

  function stableInvoke(original, context, args) {
    const tabs = document.getElementById("modeTabs");
    const desk = tabs?.closest?.(".betdesk") || document.querySelector(".betdesk");
    const anchor = tabs || desk;
    const scroller = document.scrollingElement || document.documentElement;
    const beforeTop = anchor?.getBoundingClientRect?.().top;
    const beforeScroll = Number(scroller?.scrollTop || 0);

    const result = original.apply(context, args);

    const nextTabs = document.getElementById("modeTabs");
    const nextDesk = nextTabs?.closest?.(".betdesk") || document.querySelector(".betdesk");
    const nextAnchor = nextTabs || nextDesk;
    const afterTop = nextAnchor?.getBoundingClientRect?.().top;

    if (scroller && Number.isFinite(beforeTop) && Number.isFinite(afterTop)) {
      const delta = afterTop - beforeTop;
      const currentScroll = Number(scroller.scrollTop || 0);
      const maxScroll = Math.max(0, Number(scroller.scrollHeight || 0) - Number(scroller.clientHeight || 0));

      if (Math.abs(delta) > 0.5) {
        scroller.scrollTop = Math.min(maxScroll, Math.max(0, currentScroll + delta));
      } else if (Math.abs(currentScroll - beforeScroll) > Math.max(240, window.innerHeight * 0.5)) {
        scroller.scrollTop = Math.min(maxScroll, Math.max(0, beforeScroll));
      } else if (currentScroll > maxScroll) {
        scroller.scrollTop = maxScroll;
      }
    }
    return result;
  }

  function wrap(name) {
    const original = window[name];
    if (typeof original !== "function" || original[WRAPPED]) return;

    const wrapped = function (...args) {
      return stableInvoke(original, this, args);
    };
    wrapped[WRAPPED] = true;
    window[name] = wrapped;
  }

  function install() {
    installStyle();
    wrap("setMode");
    wrap("setBetType");
  }

  install();
  window.addEventListener("pageshow", install);
  window.MAMO_AIR_BET_MODE_STABILITY = Object.freeze({ refresh: install });
})();
