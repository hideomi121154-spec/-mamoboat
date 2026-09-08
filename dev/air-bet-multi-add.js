/* MAMO BOAT — legacy AIR BET multi-add compatibility v3.
 * The canonical draft flow now lives in app.js. This file only preserves the
 * existing one-tap venue return for cached and current pages; it never wraps
 * reviewBet, placeBet, or navigation functions.
 */
(() => {
  "use strict";
  if (window.__MAMO_AIR_BET_MULTI_ADD_V3__) return;
  window.__MAMO_AIR_BET_MULTI_ADD_V3__ = true;

  function ensureVenueBackButton() {
    if (document.body?.dataset?.screen !== "race") return;
    const raceView = document.getElementById("raceView");
    if (!raceView || raceView.querySelector("[data-mamo-back-venues]")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.mamoBackVenues = "1";
    button.className = "mamo-back-venues";
    button.setAttribute("aria-label", "全国24場の一覧へ戻る");

    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "←";
    const label = document.createElement("b");
    label.textContent = "全国24場へ戻る";
    const hint = document.createElement("small");
    hint.textContent = "別の開催場を見る";
    button.append(arrow, label, hint);
    button.addEventListener("click", () => {
      window.go?.("venues");
      window.MAMO_VENUE_LIVE_PRIORITY?.refresh?.();
    });

    const path = raceView.querySelector(".race-path");
    if (path) path.before(button);
    else raceView.prepend(button);
  }

  const refresh = () => {
    ensureVenueBackButton();
    window.MAMO_AIR_BET_DRAFT?.refresh?.();
  };
  document.addEventListener("click", (event) => {
    if (event.target?.closest?.("#nav-race, .racechip, .venue-card-main, .venue-switch-card, [onclick^='jumpRace']")) refresh();
  });
  window.addEventListener("mamo:air-bet-rendered", refresh);
  window.addEventListener("pageshow", refresh);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh, { once: true });
  else refresh();
  window.MAMO_AIR_BET_MULTI_ADD = Object.freeze({ refresh });
})();
