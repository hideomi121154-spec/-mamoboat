/* MAMO BOAT — AIR BET mode/type switch stability v3
 * iPhone Safari may apply scroll clamping/anchoring one or two paint frames AFTER
 * renderBuilder() replaces the selector DOM. Synchronous correction was therefore
 * too early and could still leave the race screen in a blank scroll position.
 * This version restores the AIR BET anchor after layout has settled.
 */
(() => {
  "use strict";
  if (window.__MAMO_AIR_BET_MODE_STABILITY_V3__) return;
  window.__MAMO_AIR_BET_MODE_STABILITY_V3__ = true;
  window.__MAMO_AIR_BET_MODE_STABILITY_V2__ = true;
  window.__MAMO_AIR_BET_MODE_STABILITY_V1__ = true;

  const WRAPPED = Symbol("mamoAirBetModeStabilityV3");

  function installStyle() {
    if (document.getElementById("mamoAirBetModeStabilityStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoAirBetModeStabilityStyle";
    style.textContent = `
      #race,#raceView,#modeTabs,#builder,.betdesk{overflow-anchor:none!important}
    `;
    document.head.appendChild(style);
  }

  function scroller() {
    return document.scrollingElement || document.documentElement;
  }

  function currentAnchor() {
    const tabs = document.getElementById("modeTabs");
    const desk = tabs?.closest?.(".betdesk") || document.querySelector("#race .betdesk");
    return tabs || desk || null;
  }

  function clampScroll(value) {
    const root = scroller();
    if (!root) return 0;
    const viewport = Number(window.innerHeight || root.clientHeight || 0);
    const max = Math.max(0, Number(root.scrollHeight || 0) - viewport);
    return Math.min(max, Math.max(0, Number(value || 0)));
  }

  function setScroll(value) {
    const target = clampScroll(value);
    // Use the window scroll API so Safari updates the visual viewport and layout
    // viewport together. Direct scrollTop writes can be overwritten after paint.
    window.scrollTo(0, target);
  }

  function restoreAfterPaint(beforeTop, beforeScroll) {
    const restore = () => {
      const anchor = currentAnchor();
      const afterTop = anchor?.getBoundingClientRect?.().top;
      if (Number.isFinite(beforeTop) && Number.isFinite(afterTop)) {
        setScroll(beforeScroll + (afterTop - beforeTop));
      } else {
        setScroll(beforeScroll);
      }
    };

    // Safari can defer its own clamp until the next paint. Correct after the
    // first paint and verify once more on the following paint.
    requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });
  }

  function stableInvoke(original, context, args) {
    const anchor = currentAnchor();
    const beforeTop = anchor?.getBoundingClientRect?.().top;
    const root = scroller();
    const beforeScroll = Number(window.scrollY || root?.scrollTop || 0);

    const result = original.apply(context, args);
    restoreAfterPaint(beforeTop, beforeScroll);
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
