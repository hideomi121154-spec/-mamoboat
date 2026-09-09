/* MAMO BOAT — race screen AIR BET first v1
 * Moves the existing AIR BET section above the raceboard after the race screen is rendered.
 * DOM nodes are moved, not cloned/re-rendered, so existing AIR BET state and event handlers stay intact.
 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_AIRBET_FIRST_V1__) return;
  window.__MAMO_RACE_AIRBET_FIRST_V1__ = true;

  function findAirBetHead(root) {
    return Array.from(root?.children || []).find(node =>
      node?.classList?.contains("section-head") &&
      String(node.querySelector("h2")?.textContent || "").trim() === "AIR BET"
    ) || null;
  }

  function moveAirBetFirst() {
    const root = document.getElementById("raceView");
    if (!root) return false;

    const raceboard = root.querySelector(":scope > .panel.raceboard");
    const head = findAirBetHead(root);
    const desk = head?.nextElementSibling?.classList?.contains("betdesk")
      ? head.nextElementSibling
      : root.querySelector(":scope > .panel.betdesk");

    if (!raceboard || !head || !desk) return false;

    // Already in the desired order.
    if (head.nextElementSibling === desk && desk.nextElementSibling === raceboard) return true;

    // Move the existing nodes as one pair. No innerHTML, clone, scroll, timer, or navigation hook.
    root.insertBefore(head, raceboard);
    root.insertBefore(desk, raceboard);
    return true;
  }

  window.addEventListener("mamo:air-bet-rendered", moveAirBetFirst);
  window.addEventListener("pageshow", moveAirBetFirst);
  document.addEventListener("DOMContentLoaded", moveAirBetFirst, { once: true });

  window.MAMO_RACE_AIRBET_FIRST = Object.freeze({ refresh: moveAirBetFirst });
})();
