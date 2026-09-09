/* MAMO BOAT — race screen AIR BET first v3
 * Keep AIR BET visually ahead of the raceboard without moving live DOM nodes.
 * CSS ordering avoids the iPhone Safari jump caused when AIR BET was physically
 * reinserted after async builder/odds refreshes.
 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_AIRBET_FIRST_V3__) return;
  window.__MAMO_RACE_AIRBET_FIRST_V3__ = true;

  function installStyle() {
    if (document.getElementById("mamoRaceAirBetFirstV3")) return;
    const style = document.createElement("style");
    style.id = "mamoRaceAirBetFirstV3";
    style.textContent = `
      #raceView{display:flex;flex-direction:column}
      #raceView > *{order:20}
      #raceView > .racechips{order:1}
      #raceView > .section-head.small:has(+ .panel.betdesk){order:2}
      #raceView > .panel.betdesk{order:3}
      #raceView > .panel.raceboard{order:4}
    `;
    document.head.appendChild(style);
  }

  function markReady() {
    installStyle();
    return !!document.getElementById("raceView");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", markReady, { once:true });
  } else {
    markReady();
  }
  window.addEventListener("pageshow", markReady);

  window.MAMO_RACE_AIRBET_FIRST = Object.freeze({ refresh: markReady });
})();
