/* MAMO BOAT race AIR BET compact layout v4
 * Keeps venue, race selector and a separate AIR BET mark in one compact row.
 * Removes the large standalone AIR BET heading so the betting panel moves up.
 * Preserves AIR BET before the official-information panel with direct DOM order only.
 * No stylesheet overrides, scroll locking, or unrelated UI changes.
 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_AIRBET_COMPACT_V4__) return;
  window.__MAMO_RACE_AIRBET_COMPACT_V4__ = true;

  function currentRaceNumber(path) {
    const raceText = [...path.querySelectorAll("span")]
      .map((node) => String(node.textContent || "").trim())
      .find((text) => /^\d{1,2}R$/.test(text));
    return Math.min(12, Math.max(1, Number(String(raceText || "1R").replace("R", "")) || 1));
  }

  function sizeControl(node) {
    node.style.boxSizing = "border-box";
    node.style.height = "48px";
    node.style.minHeight = "48px";
    node.style.margin = "0";
    node.style.padding = "0 14px";
    node.style.fontSize = "20px";
    node.style.fontWeight = "900";
    node.style.lineHeight = "1";
  }

  function keepAirBetBeforeOfficial(raceView) {
    const raceboard = raceView.querySelector(":scope > .panel.raceboard");
    const betdesk = raceView.querySelector(":scope > .panel.betdesk");
    if (!raceboard || !betdesk) return;
    const heading = Array.from(raceView.querySelectorAll(":scope > .section-head.small"))
      .find((node) => node.querySelector("h2")?.textContent?.trim() === "AIR BET")
      || (betdesk.previousElementSibling?.classList?.contains("section-head") ? betdesk.previousElementSibling : null);
    heading?.remove();
    raceView.insertBefore(betdesk, raceboard);
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
      venueButton.style.flex = "1 1 0";
      venueButton.style.minWidth = "0";

      const raceSelect = document.createElement("select");
      raceSelect.setAttribute("aria-label", "レースを選択");
      sizeControl(raceSelect);
      raceSelect.style.flex = "1 1 0";
      raceSelect.style.minWidth = "0";
      raceSelect.style.color = "#111";
      raceSelect.style.background = "#fff";
      raceSelect.style.border = "2px solid #aeb9c2";
      raceSelect.style.borderRadius = "10px";
      raceSelect.style.padding = "0 30px 0 14px";
      raceSelect.style.appearance = "auto";
      for (let number = 1; number <= 12; number += 1) {
        const option = document.createElement("option");
        option.value = String(number);
        option.textContent = `${number}R`;
        option.selected = number === raceNo;
        raceSelect.appendChild(option);
      }
      raceSelect.onchange = () => window.selectRace?.(Number(raceSelect.value));

      const airBetMark = document.createElement("div");
      airBetMark.className = "mamo-race-airbet-mark";
      airBetMark.textContent = "AIR BET";
      airBetMark.setAttribute("aria-label", "AIR BET");
      sizeControl(airBetMark);
      airBetMark.style.display = "flex";
      airBetMark.style.alignItems = "center";
      airBetMark.style.justifyContent = "center";
      airBetMark.style.flex = "0 0 96px";
      airBetMark.style.minWidth = "88px";
      airBetMark.style.padding = "0 10px";
      airBetMark.style.borderRadius = "10px";
      airBetMark.style.background = "#d8a62f";
      airBetMark.style.color = "#082b4a";
      airBetMark.style.fontSize = "17px";
      airBetMark.style.fontStyle = "italic";
      airBetMark.style.whiteSpace = "nowrap";

      path.replaceChildren(venueButton, raceSelect, airBetMark);
      path.style.display = "flex";
      path.style.alignItems = "center";
      path.style.gap = "8px";
      path.style.width = "100%";
      path.style.color = "#111";
      path.style.fontSize = "20px";
      path.style.fontWeight = "900";
    }

    raceView.querySelector(":scope > .event-banner")?.remove();
    raceView.querySelector(":scope > .racechips")?.remove();
    keepAirBetBeforeOfficial(raceView);
  }

  window.addEventListener("mamo:air-bet-rendered", compactRaceAirBet);
})();
