/* MAMO BOAT race AIR BET compact layout v7
 * Keeps venue, race selector and a separate AIR BET mark in one compact row.
 * Removes the large standalone AIR BET heading so the betting panel moves up.
 * Preserves racer name, class and the existing BOAT RACE official profile URL
 * in a presentation-only picker roster before lower raceboard details are removed.
 * Existing pick button IDs, handlers and betting state remain app.js-owned.
 * Official profile links are copied as URL data only; existing official DOM is not moved or cloned.
 * Preserves AIR BET before the official-information panel with direct DOM order only.
 * No stylesheet injection, scroll locking, timer loop, or unrelated UI changes.
 */
(() => {
  "use strict";
  /* Keep the established owner guard so stale/new PWA assets cannot both bind this helper. */
  if (window.__MAMO_RACE_AIRBET_COMPACT_V6__) return;
  window.__MAMO_RACE_AIRBET_COMPACT_V6__ = true;
  window.__MAMO_RACE_AIRBET_COMPACT_V7__ = true;
  window.__MAMO_RACE_AIRBET_COMPACT_V5__ = true;

  let cachedRosterKey = "";
  let cachedRoster = [];

  function currentRaceNumber(path) {
    const selected = Number(path.querySelector("select")?.value);
    if (selected >= 1 && selected <= 12) return selected;
    const raceText = [...path.querySelectorAll("span")]
      .map((node) => String(node.textContent || "").trim())
      .find((text) => /^\d{1,2}R$/.test(text));
    return Math.min(12, Math.max(1, Number(String(raceText || "1R").replace("R", "")) || 1));
  }

  function venueNameFromPath(path) {
    return String(path?.querySelector(".race-path-venue")?.textContent || "")
      .replace(/[⌄▼▽]$/u, "")
      .trim();
  }

  function rosterKey(path) {
    if (!path) return "";
    const venueName = venueNameFromPath(path);
    const raceNo = currentRaceNumber(path);
    return venueName ? `${venueName}:${raceNo}` : "";
  }

  function safeOfficialUrl(value) {
    const url = String(value || "").trim();
    return /^https:\/\/www\.boatrace\.jp\/owpc\/pc\/data\/racersearch\/profile\?/i.test(url)
      ? url
      : "";
  }

  function readLiveRoster(raceView) {
    const boats = [...raceView.querySelectorAll(":scope > .panel.raceboard .race-racer-details .boat")];
    if (boats.length !== 6) return [];
    const roster = boats.map((boat, index) => {
      const boatNumber = Number(boat.querySelector(".num")?.textContent) || index + 1;
      const name = String(boat.querySelector("div:nth-child(2) > b")?.textContent || "").trim();
      const racerClass = String(boat.dataset.racerClass || "").trim();
      const officialUrl = safeOfficialUrl(boat.getAttribute("href"));
      return { boatNumber, name, racerClass, officialUrl };
    }).sort((left, right) => left.boatNumber - right.boatNumber);
    const valid = roster.length === 6
      && roster.every((entry, index) => entry.boatNumber === index + 1 && entry.name);
    return valid ? roster : [];
  }

  function makeRosterRow(boatNumber, entry) {
    const name = entry?.name || "";
    const racerClass = entry?.racerClass || "";
    const officialUrl = entry?.officialUrl || "";

    const row = document.createElement("div");
    row.className = `mamo-racer-row${name ? "" : " is-missing"}`;
    row.dataset.boatNumber = String(boatNumber);

    const number = document.createElement("span");
    number.className = "mamo-racer-number";
    number.textContent = String(boatNumber);

    const classBadge = document.createElement("span");
    classBadge.className = "mamo-racer-class";
    classBadge.textContent = racerClass || "—";
    classBadge.setAttribute("aria-label", racerClass ? `級別 ${racerClass}` : "級別未取得");

    const racerName = document.createElement("strong");
    racerName.className = "mamo-racer-name";
    racerName.textContent = name || "—";
    if (name) racerName.title = name;

    let official;
    if (officialUrl && name) {
      official = document.createElement("a");
      official.className = "mamo-racer-official";
      official.href = officialUrl;
      official.target = "_blank";
      official.rel = "noopener noreferrer";
      official.textContent = "公式↗";
      official.setAttribute("aria-label", `${name}選手のBOAT RACE公式情報を開く`);
      /* Defensive separation from any future delegated picker click owner. */
      official.addEventListener("click", (event) => event.stopPropagation());
    } else {
      official = document.createElement("span");
      official.className = "mamo-racer-official is-disabled";
      official.textContent = "公式—";
      official.setAttribute("aria-label", "公式情報未取得");
    }

    row.append(number, classBadge, racerName, official);
    return row;
  }

  function syncRacerRoster(raceView, path) {
    const builder = raceView.querySelector(":scope > .panel.betdesk #builder");
    if (!builder) return;

    const ranks = [...builder.querySelectorAll(":scope > .rank")];
    const addButton = builder.querySelector(":scope > .add-current-draft");
    if (!ranks.length || !addButton) {
      builder.querySelector(":scope > .mamo-racer-roster")?.remove();
      builder.classList.remove("mamo-selection-matrix");
      delete builder.dataset.mamoPickerColumns;
      return;
    }

    const key = rosterKey(path);
    const liveRoster = readLiveRoster(raceView);
    if (liveRoster.length === 6 && key) {
      cachedRosterKey = key;
      cachedRoster = liveRoster;
    } else if (key !== cachedRosterKey) {
      /* Fail safe: never carry names, grades or URLs from another venue/race. */
      cachedRosterKey = key;
      cachedRoster = [];
    }
    const roster = key && key === cachedRosterKey ? cachedRoster : [];

    builder.classList.add("mamo-selection-matrix");
    builder.dataset.mamoPickerColumns = String(Math.min(3, ranks.length));

    let rosterNode = builder.querySelector(":scope > .mamo-racer-roster");
    if (!rosterNode) {
      rosterNode = document.createElement("div");
      rosterNode.className = "mamo-racer-roster";
      rosterNode.setAttribute("aria-label", "出走選手");
    }
    builder.insertBefore(rosterNode, ranks[0]);

    const head = document.createElement("div");
    head.className = "mamo-racer-head";
    head.textContent = "選手・級別";

    const rows = document.createElement("div");
    rows.className = "mamo-racer-rows";
    for (let boatNumber = 1; boatNumber <= 6; boatNumber += 1) {
      const entry = roster.find((item) => item.boatNumber === boatNumber) || null;
      rows.appendChild(makeRosterRow(boatNumber, entry));
    }
    /* Only our presentation node is rebuilt. Pick buttons are never copied or replaced. */
    rosterNode.replaceChildren(head, rows);
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

  function removeLowerRaceboardDetails(raceView) {
    const raceboard = raceView.querySelector(":scope > .panel.raceboard");
    if (!raceboard) return;
    raceboard.querySelector(":scope > .race-racer-details")?.remove();
    raceboard.querySelector(":scope > .source-note")?.remove();
  }

  function compactRaceAirBet() {
    const raceView = document.getElementById("raceView");
    if (!raceView) return;

    const path = raceView.querySelector(":scope > .race-path");
    if (path) {
      const venueName = venueNameFromPath(path) || "開催場";
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
    syncRacerRoster(raceView, path);
    keepAirBetBeforeOfficial(raceView);
    removeLowerRaceboardDetails(raceView);
  }

  window.addEventListener("mamo:air-bet-rendered", compactRaceAirBet);
})();
