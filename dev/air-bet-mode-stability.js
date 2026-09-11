/* MAMO BOAT — AIR BET compact selector stability v13
 * Keep the compact visible selector UI in lockstep with app.js state.
 * Preserve app.js-owned DOM hooks even when hidden so renderBuilder can complete.
 * Odds betting uses its own visible button instead of being hidden inside the mode select.
 * No scroll manipulation, timer loop, stylesheet injection, or outer DOM reordering.
 */
(() => {
  "use strict";
  if (window.__MAMO_AIR_BET_MODE_STABILITY_V13__) return;
  window.__MAMO_AIR_BET_MODE_STABILITY_V13__ = true;

  const TYPE_VALUES = ["trifecta", "trio", "exacta", "quinella", "wide", "win", "place"];
  const TYPE_LABELS = {
    trifecta: "3連単",
    trio: "3連複",
    exacta: "2連単",
    quinella: "2連複",
    wide: "拡連複",
    win: "単勝",
    place: "複勝"
  };
  const MODE_LABELS = {
    normal: "通常",
    box: "BOX",
    form: "フォーメーション",
    odds: "オッズ投票"
  };

  function allowedModesFor(type) {
    if (type === "win" || type === "place") return ["normal"];
    if (type === "wide") return ["normal", "box"];
    return ["normal", "box", "form"];
  }

  function readType(typeBar) {
    const active = typeBar?.querySelector(".bettypebtn.active[id^='type-']");
    const value = active?.id.replace("type-", "");
    return TYPE_VALUES.includes(value) ? value : "trifecta";
  }

  function readMode(modeTabs, type) {
    const allowed = allowedModesFor(type);
    const active = modeTabs?.querySelector("button.active");
    const label = String(active?.textContent || "").trim();
    const value = Object.keys(MODE_LABELS).find((key) => MODE_LABELS[key] === label);
    return allowed.includes(value) ? value : "normal";
  }

  function makeSelect(id, label, values, labels, value, onChange) {
    const select = document.createElement("select");
    select.id = id;
    select.setAttribute("aria-label", label);
    values.forEach((item) => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = labels[item];
      select.appendChild(option);
    });
    select.value = values.includes(value) ? value : values[0];
    select.addEventListener("change", () => onChange(select.value));

    select.style.display = "block";
    select.style.width = "100%";
    select.style.minWidth = "0";
    select.style.height = "40px";
    select.style.boxSizing = "border-box";
    select.style.padding = "0 32px 0 12px";
    select.style.border = "1.5px solid #c8d6de";
    select.style.borderRadius = "10px";
    select.style.background = "#fff";
    select.style.color = "#082b4a";
    select.style.font = "900 15px/1.15 -apple-system,BlinkMacSystemFont,'Hiragino Kaku Gothic ProN','Yu Gothic',Meiryo,sans-serif";
    select.style.opacity = "1";
    return select;
  }

  function makeOddsButton(isActive) {
    const button = document.createElement("button");
    button.id = "mamoOddsBetButton";
    button.type = "button";
    button.textContent = isActive ? "オッズ中" : "オッズ";
    button.setAttribute("aria-label", "3連単のオッズ投票を開く");
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.addEventListener("click", () => {
      const oddsTab = document.getElementById("bt-odds");
      if (oddsTab) oddsTab.click();
    });

    button.style.display = "block";
    button.style.width = "100%";
    button.style.minWidth = "0";
    button.style.height = "40px";
    button.style.boxSizing = "border-box";
    button.style.padding = "0 8px";
    button.style.border = isActive ? "1.5px solid #d8a62f" : "1.5px solid #c8d6de";
    button.style.borderRadius = "10px";
    button.style.background = isActive ? "#d8a62f" : "#fff";
    button.style.color = "#082b4a";
    button.style.font = "900 13px/1.1 -apple-system,BlinkMacSystemFont,'Hiragino Kaku Gothic ProN','Yu Gothic',Meiryo,sans-serif";
    button.style.whiteSpace = "nowrap";
    return button;
  }

  function hideLegacyHook(node) {
    if (!node) return;
    node.hidden = true;
    node.setAttribute("aria-hidden", "true");
    node.style.display = "none";
  }

  function rebuildControls() {
    const betdesk = document.querySelector("#raceView .panel.betdesk");
    if (!betdesk) return false;

    const legacyTypeBar = betdesk.querySelector(":scope > .bettypebar");
    const legacyModeTabs = betdesk.querySelector(":scope > #modeTabs");
    const guide = betdesk.querySelector(":scope > #betGuide");
    const builder = betdesk.querySelector(":scope > #builder");
    if (!legacyTypeBar || !legacyModeTabs || !guide || !builder) return false;

    const currentType = readType(legacyTypeBar);
    const allowedModes = allowedModesFor(currentType);
    const currentMode = readMode(legacyModeTabs, currentType);
    const oddsActive = Boolean(legacyModeTabs.querySelector("#bt-odds.active"));

    let row = betdesk.querySelector(":scope > .mamo-bet-selector-row");
    if (!row) {
      row = document.createElement("div");
      row.className = "mamo-bet-selector-row";
      betdesk.insertBefore(row, legacyTypeBar);
    }

    const modeSelect = makeSelect("mamoModeSelect", "買い方を選択", allowedModes, MODE_LABELS, currentMode, (value) => {
      if (!allowedModes.includes(value)) return;
      const legacyButton = document.getElementById(`bt-${value}`);
      if (legacyButton) legacyButton.click();
      else window.setMode?.(value);
    });
    const typeSelect = makeSelect("mamoBetTypeSelect", "券種を選択", TYPE_VALUES, TYPE_LABELS, currentType, (value) => {
      const legacyButton = document.getElementById(`type-${value}`);
      if (legacyButton) legacyButton.click();
      else window.setBetType?.(value);
    });
    const oddsButton = makeOddsButton(oddsActive);

    modeSelect.style.fontSize = currentMode === "form" ? "13px" : "15px";
    modeSelect.style.paddingLeft = "11px";
    modeSelect.style.paddingRight = "30px";
    typeSelect.style.fontSize = "15px";

    row.replaceChildren(modeSelect, typeSelect, oddsButton);
    row.style.display = "grid";
    row.style.gridTemplateColumns = "minmax(0,1.08fr) minmax(0,.82fr) minmax(74px,.52fr)";
    row.style.gap = "6px";
    row.style.width = "100%";
    row.style.margin = "0 0 5px";
    row.style.padding = "0";
    row.style.boxSizing = "border-box";

    hideLegacyHook(legacyTypeBar);
    hideLegacyHook(legacyModeTabs);
    hideLegacyHook(guide);
    return true;
  }

  rebuildControls();
  window.addEventListener("mamo:air-bet-rendered", rebuildControls);
  window.addEventListener("pageshow", rebuildControls);
  window.MAMO_AIR_BET_MODE_STABILITY = Object.freeze({ refresh: rebuildControls });
})();
