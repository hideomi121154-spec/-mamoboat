/* MAMO BOAT — allocation keypad height stability.
 * Keeps one visible interaction owner inside the fixed iPhone review modal:
 * while the in-app budget keypad is open, the allocation result section is
 * temporarily hidden; it is restored as soon as the keypad closes.
 */
(() => {
  "use strict";
  if (window.__MAMO_ALLOCATION_KEYPAD_STABILITY__) return;
  window.__MAMO_ALLOCATION_KEYPAD_STABILITY__ = true;

  function sync(shell) {
    if (!shell) return;
    const keypad = shell.querySelector('[data-mamo-allocation-keypad="1"]');
    const results = shell.querySelector('.mamo-allocation-results');
    if (!keypad || !results) return;
    results.hidden = !keypad.hidden;
  }

  function reviewShellFrom(target) {
    return target?.closest?.('.air-bet-review-shell[data-air-bet-review="1"]') || null;
  }

  document.addEventListener("click", (event) => {
    const target = event.target?.closest?.(
      '[data-mamo-budget-toggle="1"],[data-mamo-budget-close="1"],[data-mamo-budget-key],[data-mamo-budget-add],[data-mamo-auto-allocate="1"]'
    );
    if (!target) return;
    const shell = reviewShellFrom(target);
    if (!shell) return;
    queueMicrotask(() => sync(shell));
  }, false);

  window.addEventListener("mamo:air-bet-allocation-applied", () => {
    const shell = document.querySelector('.air-bet-review-shell[data-air-bet-review="1"]');
    if (shell) sync(shell);
  });
})();
