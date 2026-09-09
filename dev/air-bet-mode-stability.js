/* MAMO BOAT — AIR BET mode/type switch stability v4
 * Structural version: outer AIR BET/raceboard order is now fixed by race-airbet-first v5.
 * Ticket/mode switches only rebuild #builder, so do not fight Safari with scrollTo/rAF.
 */
(() => {
  "use strict";
  if (window.__MAMO_AIR_BET_MODE_STABILITY_V4__) return;
  window.__MAMO_AIR_BET_MODE_STABILITY_V4__ = true;
  window.__MAMO_AIR_BET_MODE_STABILITY_V3__ = true;
  window.__MAMO_AIR_BET_MODE_STABILITY_V2__ = true;
  window.__MAMO_AIR_BET_MODE_STABILITY_V1__ = true;

  function installStyle() {
    document.getElementById("mamoAirBetModeStabilityStyle")?.remove();
    const style = document.createElement("style");
    style.id = "mamoAirBetModeStabilityStyle";
    style.textContent = `
      #modeTabs,#builder,.betdesk{overflow-anchor:none!important}
    `;
    document.head.appendChild(style);
  }

  installStyle();
  window.addEventListener("pageshow", installStyle);
  window.MAMO_AIR_BET_MODE_STABILITY = Object.freeze({ refresh: installStyle });
})();
