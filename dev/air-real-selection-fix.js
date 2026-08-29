/* MAMO BOAT AIR/REAL self-report selection hotfix v1.
 * Makes the three choices visibly tappable and keeps an explicit AIR-only
 * correction consistent with the stored decision journey.
 */
(() => {
  "use strict";
  if (window.__MAMO_AIR_REAL_SELECTION_FIX_V1__) return;
  window.__MAMO_AIR_REAL_SELECTION_FIX_V1__ = true;

  const JOURNEY_KEY = "mamoboat_decision_journeys_v1";
  const STYLE_ID = "mamoAirRealSelectionFixV1Style";

  const readRows = () => {
    try {
      const value = JSON.parse(localStorage.getItem(JOURNEY_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  };

  const writeRows = (rows) => {
    try {
      localStorage.setItem(JOURNEY_KEY, JSON.stringify(rows.slice(-300)));
      window.dispatchEvent(new CustomEvent("mamo:decision-journey-updated"));
    } catch (_) {}
  };

  function derive(actions) {
    const list = Array.isArray(actions) ? actions : [];
    const firstAir = list.findIndex((item) => item?.kind === "air");
    const firstReal = list.findIndex((item) => item?.kind === "real");
    const firstSkip = list.findIndex((item) => item?.kind === "skip");
    if (firstAir >= 0 && firstReal >= 0) return firstAir < firstReal ? "AIR_TO_REAL" : "REAL_TO_AIR";
    if (firstAir >= 0 && firstSkip >= 0) return firstAir < firstSkip ? "AIR_TO_SKIP" : "SKIP_TO_AIR";
    if (firstReal >= 0 && firstSkip >= 0) return firstReal < firstSkip ? "REAL_TO_SKIP" : "SKIP_TO_REAL";
    if (firstAir >= 0) return "AIR_ONLY";
    if (firstReal >= 0) return "REAL_ONLY";
    if (firstSkip >= 0) return "SKIP_ONLY";
    return null;
  }

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #mamoAirRealBridge .marb-actions button:first-child{
        border-color:rgba(7,27,43,.16)!important;
        background:#fff!important;
      }
      #mamoAirRealBridge .marb-actions button{
        cursor:pointer!important;
        pointer-events:auto!important;
        -webkit-tap-highlight-color:rgba(10,163,154,.16);
        touch-action:manipulation;
      }
      #mamoAirRealBridge .marb-actions button:active{
        transform:translateY(1px);
      }
      #mamoAirRealBridge .marb-actions button.is-selected{
        border:2px solid #0aa39a!important;
        background:#ecfffc!important;
        box-shadow:0 0 0 2px rgba(10,163,154,.08)!important;
      }
      #mamoAirRealBridge .marb-actions button.is-selected strong{
        color:#075f5a!important;
      }
      #mamoAirRealBridge .marb-actions button.is-pending{
        border-color:#7ba9a6!important;
        background:#f5fffd!important;
      }
    `;
    document.head.appendChild(style);
  }

  function rowFor(panel) {
    const key = String(panel?.dataset?.raceKey || "");
    if (!key) return null;
    return readRows().find((row) => row?.key === key) || null;
  }

  function buttons(panel) {
    return {
      same: panel?.querySelector?.("[data-marb-same]"),
      manual: panel?.querySelector?.("[data-marb-real]"),
      air: panel?.querySelector?.("[data-marb-air]"),
    };
  }

  function clearVisual(panel) {
    Object.values(buttons(panel)).filter(Boolean).forEach((button) => {
      button.classList.remove("is-selected", "is-pending");
      button.setAttribute("aria-pressed", "false");
    });
  }

  function syncPanel(panel = document.getElementById("mamoAirRealBridge")) {
    if (!panel) return;
    installStyle();
    clearVisual(panel);
    const row = rowFor(panel);
    const choice = String(row?.realDecisionChoice || "");
    const map = buttons(panel);
    const selected = choice === "same" ? map.same : choice === "manual" ? map.manual : choice === "air" ? map.air : null;
    if (selected) {
      selected.classList.add("is-selected");
      selected.setAttribute("aria-pressed", "true");
    }
  }

  function persistAirOnly(panel) {
    const key = String(panel?.dataset?.raceKey || "");
    if (!key) return;
    const rows = readRows();
    const index = rows.findIndex((row) => row?.key === key);
    if (index < 0) return;
    const row = rows[index];
    row.actions = (Array.isArray(row.actions) ? row.actions : []).filter((action) => action?.kind !== "real");
    row.real = null;
    row.final = "air";
    row.transition = derive(row.actions);
    row.realDecisionChoice = "air";
    row.realDecisionRecordedAt = new Date().toISOString();
    row.updatedAt = row.realDecisionRecordedAt;
    rows[index] = row;
    writeRows(rows);

    const form = panel.querySelector("[data-marb-form]");
    if (form) form.hidden = true;
    const input = panel.querySelector("[data-marb-amount]");
    if (input) input.value = "";
    const status = panel.querySelector("[data-marb-status]");
    if (status) status.textContent = "✓ AIRのみとして記録しました。";
    syncPanel(panel);
  }

  function persistRealChoice(panel, choice) {
    const key = String(panel?.dataset?.raceKey || "");
    if (!key || !["same", "manual"].includes(choice)) return;
    const rows = readRows();
    const index = rows.findIndex((row) => row?.key === key);
    if (index < 0 || !rows[index]?.real) return;
    rows[index].realDecisionChoice = choice;
    rows[index].realDecisionRecordedAt = new Date().toISOString();
    rows[index].updatedAt = rows[index].realDecisionRecordedAt;
    writeRows(rows);
    syncPanel(panel);
  }

  function onClick(event) {
    const panel = event.target?.closest?.("#mamoAirRealBridge");
    if (!panel) return;

    const same = event.target.closest?.("[data-marb-same]");
    const manual = event.target.closest?.("[data-marb-real]");
    const air = event.target.closest?.("[data-marb-air]");
    const save = event.target.closest?.("[data-marb-save]");
    const cancel = event.target.closest?.("[data-marb-cancel]");

    if (air) {
      clearVisual(panel);
      air.classList.add("is-pending");
      setTimeout(() => persistAirOnly(panel), 0);
      return;
    }

    if (same || manual) {
      clearVisual(panel);
      (same || manual).classList.add("is-pending");
      return;
    }

    if (save) {
      const choice = panel.dataset.mode === "same" ? "same" : "manual";
      setTimeout(() => persistRealChoice(panel, choice), 0);
      return;
    }

    if (cancel) setTimeout(() => syncPanel(panel), 0);
  }

  function boot() {
    installStyle();
    document.addEventListener("click", onClick, true);
    const observer = new MutationObserver(() => syncPanel());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("mamo:decision-journey-updated", () => syncPanel());
    window.addEventListener("pageshow", () => syncPanel());
    syncPanel();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
