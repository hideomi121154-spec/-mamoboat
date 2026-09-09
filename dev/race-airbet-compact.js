/* MAMO BOAT race AIR BET compact layout v1
 * Removes only the event banner and 1R-12R race tabs after the AIR BET screen renders.
 * No CSS overrides, scroll locking, or other UI changes.
 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_AIRBET_COMPACT_V1__) return;
  window.__MAMO_RACE_AIRBET_COMPACT_V1__ = true;

  function compactRaceAirBet() {
    const raceView = document.getElementById("raceView");
    if (!raceView) return;
    raceView.querySelector(":scope > .event-banner")?.remove();
    raceView.querySelector(":scope > .racechips")?.remove();
  }

  window.addEventListener("mamo:air-bet-rendered", compactRaceAirBet);
})();
