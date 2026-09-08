/* MAMO BOAT — AIR BET selection reset v1
 * After a successful draft add, clear only the current builder selection so
 * the next wager can be entered immediately on the same screen.
 * Keeps the tray, bet type, mode, venue and race untouched.
 * Uses only the public pick/add functions: no DOM re-render loop, timers,
 * MutationObserver, scroll adjustment, reviewBet/placeBet/navigation wrapping.
 */
(() => {
  "use strict";
  if (window.__MAMO_AIR_BET_SELECTION_RESET_V1__) return;
  window.__MAMO_AIR_BET_SELECTION_RESET_V1__ = true;

  const WRAPPED = Symbol("mamoAirBetSelectionResetWrapped");

  function selectedIds(kind) {
    const builder = document.getElementById("builder");
    if (!builder) return [];
    const prefix = kind === "normal" ? "n-" : kind === "box" ? "b-" : "f-";
    return [...builder.querySelectorAll("button.pick.sel")]
      .map((button) => button.id || "")
      .filter((id) => id.startsWith(prefix))
      .sort();
  }

  function sameSelection(kind, before) {
    const after = selectedIds(kind);
    return after.length === before.length && after.every((id, index) => id === before[index]);
  }

  function clearNormal(ids) {
    ids.forEach((id) => {
      const match = id.match(/^n-(\d+)-(\d+)$/);
      if (!match) return;
      const button = document.getElementById(id);
      if (!button?.classList.contains("sel")) return;
      window.pickNormal?.(Number(match[1]), Number(match[2]));
    });
  }

  function clearBox(ids) {
    ids.forEach((id) => {
      const match = id.match(/^b-(\d+)$/);
      if (!match) return;
      const button = document.getElementById(id);
      if (!button?.classList.contains("sel")) return;
      window.pickBox?.(Number(match[1]));
    });
  }

  function clearForm(ids) {
    ids.forEach((id) => {
      const match = id.match(/^f-(\d+)-(\d+)$/);
      if (!match) return;
      const button = document.getElementById(id);
      if (!button?.classList.contains("sel")) return;
      window.pickForm?.(Number(match[1]), Number(match[2]));
    });
  }

  function clearSelection(kind, ids) {
    if (kind === "normal") clearNormal(ids);
    else if (kind === "box") clearBox(ids);
    else clearForm(ids);
  }

  function wrapAdd(name, kind) {
    const original = window[name];
    if (typeof original !== "function" || original[WRAPPED]) return false;

    const wrapped = function(...args) {
      const before = selectedIds(kind);
      const result = original.apply(this, args);
      return Promise.resolve(result).then((added) => {
        // Clear only after at least one new line was actually added. If the
        // user changed the selection while an odds request was in flight,
        // leave the newer choice untouched.
        if (Number(added) > 0 && before.length && sameSelection(kind, before)) {
          clearSelection(kind, before);
        }
        return added;
      });
    };
    wrapped[WRAPPED] = true;
    wrapped.__mamoOriginal = original;
    window[name] = wrapped;
    return true;
  }

  function install() {
    const normal = wrapAdd("addNormal", "normal");
    const box = wrapAdd("addBox", "box");
    const form = wrapAdd("addForm", "form");
    return normal || box || form;
  }

  document.addEventListener("DOMContentLoaded", install, { once: true });
  window.addEventListener("mamo:air-bet-rendered", install);
  window.addEventListener("pageshow", install);
  install();

  window.MAMO_AIR_BET_SELECTION_RESET = Object.freeze({
    install,
    selectedIds,
  });
})();
