/* MAMO BOAT — race screen AIR BET first v2
 * Goal: when a race is opened, AIR BET appears before the large official-info raceboard.
 * Existing AIR BET DOM nodes are moved, never cloned or re-rendered.
 * No timers, observers, scrollTo/scrollBy, requestAnimationFrame, or navigation override.
 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_AIRBET_FIRST_V2__) return;
  window.__MAMO_RACE_AIRBET_FIRST_V2__ = true;
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

    const raceboard = Array.from(root.children).find(node =>
      node?.classList?.contains("panel") && node?.classList?.contains("raceboard")
    ) || null;
    const head = findAirBetHead(root);
    const desk = head?.nextElementSibling?.classList?.contains("betdesk")
      ? head.nextElementSibling
      : Array.from(root.children).find(node => node?.classList?.contains("betdesk")) || null;

    if (!raceboard || !head || !desk) return false;

    // Desired order: race title/chips -> AIR BET heading -> AIR BET desk -> official raceboard.
    if (head.nextElementSibling === desk && desk.nextElementSibling === raceboard) return true;

    root.insertBefore(head, raceboard);
    root.insertBefore(desk, raceboard);
    return true;
  }

  // renderBuilder emits this after the AIR BET builder is ready.
  window.addEventListener("mamo:air-bet-rendered", moveAirBetFirst);
  window.addEventListener("pageshow", moveAirBetFirst);

  // Inline race/venue click handlers render synchronously before the event bubbles to document.
  // Running here catches the first opening of a race as well as switching 1R-12R.
  document.addEventListener("click", () => {
    const raceScreen = document.getElementById("race");
    if (raceScreen?.classList?.contains("active")) moveAirBetFirst();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", moveAirBetFirst, { once: true });
  } else {
    moveAirBetFirst();
  }

  window.MAMO_RACE_AIRBET_FIRST = Object.freeze({ refresh: moveAirBetFirst });
})();
