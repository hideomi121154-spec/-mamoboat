/* MAMO BOAT — AIR BET compact selector stability v9
 * Keep the compact two-select UI in lockstep with app.js state.
 * Preserve app.js-owned DOM hooks even when hidden so renderBuilder can complete.
 * No injected stylesheet, no scroll manipulation, no outer race DOM reordering.
 */
(() => {
  "use strict";
  if (window.__MAMO_AIR_BET_MODE_STABILITY_V9__) return;
  window.__MAMO_AIR_BET_MODE_STABILITY_V9__ = true;

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
    form: "フォーメーション"
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
    select.style.height = "48px";
    select.style.boxSizing = "border-box";
    select.style.padding = "0 42px 0 16px";
    select.style.border = "1.5px solid #c8d6de";
    select.style.borderRadius = "12px";
    select.style.background = "#fff";
    select.style.color = "#082b4a";
    select.style.font = "900 17px/1.2 -apple-system,BlinkMacSystemFont,'Hiragino Kaku Gothic ProN','Yu Gothic',Meiryo,sans-serif";
    select.style.opacity = "1";
    return select;
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

    let row = betdesk.querySelector(":scope > .mamo-bet-selector-row");
    if (!row) {
      row = document.createElement("div");
      row.className = "mamo-bet-selector-row";
      betdesk.insertBefore(row, legacyTypeBar);
    }

    row.replaceChildren(
      makeSelect("mamoModeSelect", "買い方を選択", allowedModes, MODE_LABELS, currentMode, (value) => {
        if (!allowedModes.includes(value)) return;
        window.setMode?.(value);
      }),
      makeSelect("mamoBetTypeSelect", "券種を選択", TYPE_VALUES, TYPE_LABELS, currentType, (value) => {
        window.setBetType?.(value);
      })
    );
    row.style.display = "grid";
    row.style.gridTemplateColumns = "minmax(0,1fr) minmax(0,1fr)";
    row.style.gap = "10px";
    row.style.width = "100%";
    row.style.margin = "0 0 8px";
    row.style.padding = "0";
    row.style.boxSizing = "border-box";

    // These nodes are app.js state/render hooks. Keep them in the DOM and only hide them.
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
