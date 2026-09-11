/* MAMO BOAT — AIR BET safe delete controls v1
 * Presentation-only shortcuts for the canonical AIR BET review state.
 * Uses the existing review APIs; never replaces cart, placeBet, reviewBet, or navigation.
 */
(() => {
  "use strict";
  if (window.__MAMO_AIR_BET_REVIEW_DELETE_CONTROLS_V1__) return;
  window.__MAMO_AIR_BET_REVIEW_DELETE_CONTROLS_V1__ = true;

  const SHELL_SELECTOR = '.air-bet-review-shell[data-air-bet-review="1"]';
  let started = false;

  function draftLines() {
    try {
      const lines = window.MAMO_AIR_BET_DRAFT?.snapshot?.();
      return Array.isArray(lines) ? lines : [];
    } catch (_) {
      return [];
    }
  }

  function flowRefresh() {
    try {
      window.MAMO_BET_REVIEW_ALLOCATION?.refresh?.();
    } catch (_) {}
  }

  function statusText(shell, text) {
    const status = shell?.querySelector?.('[data-mamo-allocation-status="1"]');
    if (status) status.textContent = text;
  }

  function buttonBase(button) {
    button.type = "button";
    button.classList.add("mamo-review-detail-toggle");
    return button;
  }

  function ensureBudgetClear(shell) {
    const wrap = shell.querySelector(".mamo-allocation-budget-display-wrap");
    if (!wrap || wrap.querySelector('[data-mamo-budget-clear-shortcut="1"]')) return;
    wrap.style.gridTemplateColumns = "minmax(0,1fr) auto auto";
    const clear = buttonBase(document.createElement("button"));
    clear.dataset.mamoBudgetClearShortcut = "1";
    clear.textContent = "×";
    clear.setAttribute("aria-label", "今回使う予算をクリア");
    clear.style.minHeight = "42px";
    clear.style.minWidth = "42px";
    clear.style.padding = "4px";
    clear.style.fontSize = "18px";
    wrap.append(clear);
  }

  function ensureHeaderActions(shell) {
    const title = shell.querySelector(".mamo-allocation-results-title");
    if (!title) return;
    let actions = title.querySelector('[data-mamo-result-actions="1"]');
    if (!actions) {
      actions = document.createElement("div");
      actions.dataset.mamoResultActions = "1";
      actions.style.display = "flex";
      actions.style.alignItems = "center";
      actions.style.justifyContent = "flex-end";
      actions.style.gap = "6px";
      actions.style.flexWrap = "wrap";
      const detail = title.querySelector('[data-mamo-review-detail-toggle="1"]');
      if (detail) actions.append(detail);
      title.append(actions);
    }
    let clearAll = actions.querySelector('[data-mamo-clear-all-lines="1"]');
    if (!clearAll) {
      clearAll = buttonBase(document.createElement("button"));
      clearAll.dataset.mamoClearAllLines = "1";
      clearAll.textContent = "全点削除";
      clearAll.setAttribute("aria-label", "買い目を全点削除");
      actions.append(clearAll);
    }
    clearAll.disabled = draftLines().length === 0;
  }

  function ensureRowDeletes(shell) {
    const rows = shell.querySelectorAll?.('[data-mamo-allocation-rows="1"] > tr') || [];
    rows.forEach((row, index) => {
      const money = row.lastElementChild;
      if (!money || money.querySelector('[data-mamo-remove-line-shortcut="1"]')) return;
      const remove = buttonBase(document.createElement("button"));
      remove.dataset.mamoRemoveLineShortcut = "1";
      remove.dataset.cartIndex = String(index);
      remove.textContent = "削除";
      remove.setAttribute("aria-label", `${index + 1}番目の買い目を削除`);
      remove.style.minHeight = "28px";
      remove.style.marginTop = "5px";
      remove.style.padding = "3px 7px";
      remove.style.fontSize = "9px";
      money.append(remove);
    });
  }

  function enhance(shell = document.querySelector(SHELL_SELECTOR)) {
    if (!shell) return;
    ensureBudgetClear(shell);
    ensureHeaderActions(shell);
    ensureRowDeletes(shell);
  }

  function clearBudget(shell) {
    const clearKey = shell.querySelector('[data-mamo-budget-key="clear"]');
    if (!clearKey) return;
    clearKey.click();
    const close = shell.querySelector('[data-mamo-budget-close="1"]');
    const keypad = shell.querySelector('[data-mamo-allocation-keypad="1"]');
    if (close && keypad && !keypad.hidden) close.click();
    flowRefresh();
    enhance(document.querySelector(SHELL_SELECTOR) || shell);
    statusText(document.querySelector(SHELL_SELECTOR) || shell, "今回使う予算をクリアしました。買い目のBET額はそのままです。");
  }

  function removeLine(shell, button) {
    const index = Number(button.dataset.cartIndex);
    if (!Number.isInteger(index) || index < 0 || typeof window.removeReviewLine !== "function") return;
    const before = draftLines().length;
    window.removeReviewLine(index);
    const after = draftLines().length;
    if (after >= before) return;
    flowRefresh();
    const currentShell = document.querySelector(SHELL_SELECTOR) || shell;
    enhance(currentShell);
    if (!after) {
      clearBudget(currentShell);
      statusText(currentShell, "買い目をすべて削除しました。");
    } else {
      statusText(currentShell, "買い目を1点削除しました。必要なら予算をそのまま再配分できます。");
    }
  }

  function deleteAllLines(shell) {
    if (typeof window.deleteAllReviewLines !== "function") return;
    const before = draftLines().length;
    window.deleteAllReviewLines();
    const after = draftLines().length;
    if (!before || after === before) return;
    flowRefresh();
    const currentShell = document.querySelector(SHELL_SELECTOR) || shell;
    enhance(currentShell);
    if (!after) {
      clearBudget(currentShell);
      statusText(currentShell, "買い目をすべて削除しました。");
    }
  }

  function onDocumentClick(event) {
    const target = event.target;
    if (!target?.closest) return;
    if (target.closest("#reviewBetButton")) {
      enhance();
      return;
    }
    const shell = target.closest(SHELL_SELECTOR);
    if (!shell) return;
    const budgetClear = target.closest('[data-mamo-budget-clear-shortcut="1"]');
    if (budgetClear) {
      event.preventDefault();
      clearBudget(shell);
      return;
    }
    const remove = target.closest('[data-mamo-remove-line-shortcut="1"]');
    if (remove) {
      event.preventDefault();
      removeLine(shell, remove);
      return;
    }
    const clearAll = target.closest('[data-mamo-clear-all-lines="1"]');
    if (clearAll) {
      event.preventDefault();
      deleteAllLines(shell);
      return;
    }
    enhance(shell);
  }

  function onDocumentInput(event) {
    const shell = event.target?.closest?.(SHELL_SELECTOR);
    if (shell) enhance(shell);
  }

  function start() {
    if (started) return;
    started = true;
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("input", onDocumentInput);
    window.addEventListener("mamo:air-bet-allocation-applied", () => enhance());
    window.addEventListener("pageshow", () => enhance());
    enhance();
  }

  function boot() {
    if (window.MAMO_BET_REVIEW_ALLOCATION?.refresh) {
      start();
      return;
    }
    const flow = document.querySelector('script[data-mamo-bet-review-flow]');
    if (flow) flow.addEventListener("load", start, { once: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
