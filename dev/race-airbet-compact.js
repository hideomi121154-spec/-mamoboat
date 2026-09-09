/* MAMO BOAT race AIR BET compact layout v3
 * Keeps only the venue and race selector in the race path.
 * The existing AIR BET-first structural controller remains responsible for outer DOM order.
 * No stylesheet overrides, scroll locking, or unrelated UI changes.
 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_AIRBET_COMPACT_V3__) return;
  window.__MAMO_RACE_AIRBET_COMPACT_V3__ = true;

  function currentRaceNumber(path) {
    const raceText = [...path.querySelectorAll("span")]
      .map((node) => String(node.textContent || "").trim())
      .find((text) => /^\d{1,2}R$/.test(text));
    return Math.min(12, Math.max(1, Number(String(raceText || "1R").replace("R", "")) || 1));
  }

  function sizeControl(node) {
    node.style.boxSizing = "border-box";
    node.style.width = "116px";
    node.style.height = "48px";
    node.style.minWidth = "116px";
    node.style.minHeight = "48px";
    node.style.margin = "0";
    node.style.padding = "0 16px";
    node.style.fontSize = "20px";
    node.style.fontWeight = "900";
    node.style.lineHeight = "1";
  }

  function compactRaceAirBet() {
    const raceView = document.getElementById("raceView");
    if (!raceView) return;

    const path = raceView.querySelector(":scope > .race-path");
    if (path) {
      const sourceVenue = path.querySelector(".race-path-venue");
      const venueName = String(sourceVenue?.textContent || "開催場")
        .replace(/[⌄▼▽]$/u, "")
        .trim();
      const raceNo = currentRaceNumber(path);

      const venueButton = document.createElement("button");
      venueButton.type = "button";
      venueButton.className = "race-path-venue";
      venueButton.textContent = `${venueName}⌄`;
      venueButton.setAttribute("aria-label", "開催場を選択");
      venueButton.onclick = () => window.openVenueSwitcher?.();
      sizeControl(venueButton);

      const raceSelect = document.createElement("select");
      raceSelect.setAttribute("aria-label", "レースを選択");
      sizeControl(raceSelect);
      raceSelect.style.color = "#111";
      raceSelect.style.background = "#fff";
      raceSelect.style.border = "2px solid #aeb9c2";
      raceSelect.style.borderRadius = "10px";
      raceSelect.style.padding = "0 34px 0 16px";
      raceSelect.style.appearance = "auto";
      for (let number = 1; number <= 12; number += 1) {
        const option = document.createElement("option");
        option.value = String(number);
        option.textContent = `${number}R`;
        option.selected = number === raceNo;
        raceSelect.appendChild(option);
      }
      raceSelect.onchange = () => window.selectRace?.(Number(raceSelect.value));

      path.replaceChildren(venueButton, raceSelect);
      path.style.display = "flex";
      path.style.alignItems = "center";
      path.style.gap = "12px";
      path.style.color = "#111";
      path.style.fontSize = "20px";
      path.style.fontWeight = "900";
    }

    raceView.querySelector(":scope > .event-banner")?.remove();
    raceView.querySelector(":scope > .racechips")?.remove();
  }

  window.addEventListener("mamo:air-bet-rendered", compactRaceAirBet);
})();
