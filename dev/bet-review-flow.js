/* MAMO BOAT — AIR BET layout v6
 * Presentation-only enhancement for the canonical draft tray in app.js.
 * It never wraps selection, review, wallet, record, or navigation functions.
 */
(() => {
  "use strict";
  if (window.__MAMO_BET_REVIEW_FLOW_V6__) return;
  window.__MAMO_BET_REVIEW_FLOW_V6__ = true;

  const AIR_BET_RENDERED_EVENT = "mamo:air-bet-rendered";
  const escapeHtml = (value) => String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  function racerRows() {
    return Array.from(document.querySelectorAll("#raceView .boats .boat")).map((item) => {
      const number = Number(item.querySelector(".num")?.textContent?.trim());
      const name = String(item.querySelector(":scope > div:nth-child(2) > b")?.textContent || "").trim();
      return {
        number,
        name,
        href: String(item.getAttribute("href") || "").trim(),
        racerClass: String(item.dataset.racerClass || "").trim(),
        motorNumber: String(item.dataset.motorNumber || "").trim(),
        boatPart: String(item.dataset.boatPart || "").trim(),
      };
    }).filter((item) => Number.isFinite(item.number) && item.number >= 1 && item.number <= 6 && item.name);
  }

  function ensureRacerColumn(builder) {
    const rows = racerRows();
    const existing = builder.querySelector(":scope > .mamo-racer-list");
    if (!rows.length) {
      existing?.remove();
      builder.dataset.mamoHasRacers = "false";
      return;
    }
    const signature = rows.map((item) => [
      item.number,
      item.name,
      item.href,
      item.racerClass,
      item.motorNumber,
      item.boatPart,
    ].join(":")).join("|");
    if (existing?.dataset.signature === signature) {
      builder.dataset.mamoHasRacers = "true";
      return;
    }

    existing?.remove();
    const column = document.createElement("div");
    column.className = "mamo-racer-list";
    column.dataset.signature = signature;
    column.innerHTML = `<div class="mamo-racer-head">選手</div><div class="mamo-racer-rows">${rows.map((item) => {
      const equipment = [
        item.motorNumber ? `M${item.motorNumber}` : "",
        item.boatPart ? `B${item.boatPart}` : "",
      ].filter(Boolean).join(" / ");
      const meta = [item.racerClass, equipment].filter(Boolean).join(" · ");
      return `<div class="mamo-racer-row"><span class="mamo-lane b${item.number}">${item.number}</span><span class="mamo-racer-copy"><span class="mamo-racer-identity"><b>${escapeHtml(item.name)}</b><small class="mamo-racer-meta">${escapeHtml(meta)}</small></span>${item.href ? `<a class="mamo-official-button" href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">公式情報 ↗</a>` : ""}</span></div>`;
    }).join("")}</div>`;
    builder.insertBefore(column, builder.firstChild);
    builder.dataset.mamoHasRacers = "true";
  }

  let enhancing = false;
  function enhanceBuilder() {
    if (enhancing) return;
    enhancing = true;
    try {
      const builder = document.getElementById("builder");
      if (!builder) return;
      const betdesk = builder.closest(".betdesk");
      const modeTabs = document.getElementById("modeTabs");
      const betTypeBar = betdesk?.querySelector(".bettypebar");
      if (betdesk && modeTabs && betTypeBar && modeTabs.nextElementSibling !== betTypeBar) {
        betdesk.insertBefore(modeTabs, betTypeBar);
      }

      const ranks = Array.from(builder.children || []).filter((node) =>
        node.classList?.contains("rank") && node.querySelector?.(".pick")
      );
      const pickerMode = ranks.some((rank) => rank.querySelector?.('[id^="f-"]'))
        ? "formation"
        : ranks.some((rank) => rank.querySelector?.('[id^="b-"]'))
          ? "box"
          : ranks.some((rank) => rank.querySelector?.('[id^="n-"]'))
            ? "normal"
            : "";

      builder.classList.toggle("mamo-selection-matrix", Boolean(pickerMode && ranks.length));
      ranks.forEach((rank, index) => { rank.dataset.mamoPickerRank = String(index + 1); });
      if (pickerMode && ranks.length) {
        builder.dataset.mamoPickerMode = pickerMode;
        builder.dataset.mamoPickerColumns = String(pickerMode === "box" ? 1 : ranks.length);
        ensureRacerColumn(builder);
      } else {
        delete builder.dataset.mamoPickerMode;
        delete builder.dataset.mamoPickerColumns;
        builder.querySelector(":scope > .mamo-racer-list")?.remove();
      }
      builder.querySelector("[data-add-current]")?.classList.add("mamo-add-current-draft");
      document.getElementById("reviewBetButton")?.classList.add("mamo-final-review");
    } finally {
      enhancing = false;
    }
  }

  function boot() {
    enhanceBuilder();
    window.addEventListener(AIR_BET_RENDERED_EVENT, enhanceBuilder);
    window.addEventListener("pageshow", enhanceBuilder);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.MAMO_BET_REVIEW_LAYOUT = Object.freeze({ refresh: enhanceBuilder });
})();
