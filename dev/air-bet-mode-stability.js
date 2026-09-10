/* MAMO BOAT — AIR BET compact selector stability v6
 * Replaces the existing mode/type button rows in-place with two native selects.
 * No extra stylesheet, no scroll manipulation, no outer race DOM reordering.
 */
(() => {
  "use strict";
  if (window.__MAMO_AIR_BET_MODE_STABILITY_V6__) return;
  window.__MAMO_AIR_BET_MODE_STABILITY_V6__ = true;
  window.__MAMO_AIR_BET_MODE_STABILITY_V5__ = true;
  window.__MAMO_AIR_BET_MODE_STABILITY_V4__ = true;
  window.__MAMO_AIR_BET_MODE_STABILITY_V3__ = true;
  window.__MAMO_AIR_BET_MODE_STABILITY_V2__ = true;
  window.__MAMO_AIR_BET_MODE_STABILITY_V1__ = true;

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

  function applySelectStyle(select) {
    select.style.display = "block";
    select.style.width = "100%";
    select.style.minWidth = "0";
    select.style.height = "48px";
    select.style.boxSizing = "border-box";
    select.style.padding = "0 38px 0 14px";
    select.style.border = "1.5px solid #c8d6de";
    select.style.borderRadius = "12px";
    select.style.backgroundColor = "#fff";
    select.style.color = "#082b4a";
    select.style.font = "900 17px/1.2 system-ui,-apple-system,sans-serif";
    select.style.opacity = "1";
  }

  function currentType(typeBar) {
    const active = typeBar.querySelector(".bettypebtn.active[id^='type-']");
    const fromButton = active?.id.replace("type-", "");
    if (TYPE_VALUES.includes(fromButton)) return fromButton;
    const fromSelect = typeBar.querySelector("#mamoBetTypeSelect")?.value;
    return TYPE_VALUES.includes(fromSelect) ? fromSelect : "trifecta";
  }

  function currentMode(modeTabs) {
    const active = modeTabs.querySelector("button.active");
    if (active) {
      const label = String(active.textContent || "").trim();
      return Object.keys(MODE_LABELS).find((key) => MODE_LABELS[key] === label) || "normal";
    }
    const fromSelect = modeTabs.querySelector("#mamoModeSelect")?.value;
    return Object.prototype.hasOwnProperty.call(MODE_LABELS, fromSelect) ? fromSelect : "normal";
  }

  function buildTypeSelect(typeBar) {
    const selected = currentType(typeBar);
    let select = typeBar.querySelector("#mamoBetTypeSelect");
    if (!select) {
      select = document.createElement("select");
      select.id = "mamoBetTypeSelect";
      select.setAttribute("aria-label", "券種を選択");
      TYPE_VALUES.forEach((type) => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = TYPE_LABELS[type];
        select.appendChild(option);
      });
      select.addEventListener("change", () => window.setBetType?.(select.value));
      typeBar.replaceChildren(select);
    }
    applySelectStyle(select);
    select.value = TYPE_VALUES.includes(selected) ? selected : "trifecta";
    return select;
  }

  function buildModeSelect(modeTabs) {
    const selected = currentMode(modeTabs);
    let select = modeTabs.querySelector("#mamoModeSelect");
    if (!select) {
      select = document.createElement("select");
      select.id = "mamoModeSelect";
      select.setAttribute("aria-label", "買い方を選択");
      Object.entries(MODE_LABELS).forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
      });
      select.addEventListener("change", () => window.setMode?.(select.value));
      modeTabs.replaceChildren(select);
    }
    applySelectStyle(select);
    select.value = Object.prototype.hasOwnProperty.call(MODE_LABELS, selected) ? selected : "normal";
    return select;
  }

  function compactControls() {
    const betdesk = document.querySelector("#raceView .panel.betdesk");
    if (!betdesk) return false;
    const typeBar = betdesk.querySelector(".bettypebar");
    const modeTabs = betdesk.querySelector("#modeTabs");
    const guide = betdesk.querySelector("#betGuide");
    if (!typeBar || !modeTabs || !guide) return false;

    buildModeSelect(modeTabs);
    buildTypeSelect(typeBar);

    let row = betdesk.querySelector(".mamo-bet-selector-row");
    if (!row) {
      row = document.createElement("div");
      row.className = "mamo-bet-selector-row";
      betdesk.insertBefore(row, guide);
    }
    row.style.display = "grid";
    row.style.gridTemplateColumns = "minmax(0, 1fr) minmax(0, 1fr)";
    row.style.gap = "10px";
    row.style.width = "100%";
    row.style.margin = "0 0 6px";
    row.style.padding = "0";
    row.style.boxSizing = "border-box";

    if (modeTabs.parentElement !== row) row.appendChild(modeTabs);
    if (typeBar.parentElement !== row) row.appendChild(typeBar);

    [modeTabs, typeBar].forEach((node) => {
      node.style.display = "block";
      node.style.width = "100%";
      node.style.minWidth = "0";
      node.style.margin = "0";
      node.style.padding = "0";
      node.style.minHeight = "0";
      node.style.background = "transparent";
      node.style.border = "0";
      node.style.gridTemplateColumns = "none";
    });

    guide.hidden = true;
    guide.setAttribute("aria-hidden", "true");
    return true;
  }

  compactControls();
  window.addEventListener("mamo:air-bet-rendered", compactControls);
  window.addEventListener("pageshow", compactControls);
  window.MAMO_AIR_BET_MODE_STABILITY = Object.freeze({ refresh: compactControls });
})();
