/* MAMO BOAT — user editorial placeholder guard.
 * The user-facing Editorial screen intentionally contains only the two
 * COMING SOON blocks. Legacy editorial modules may still be delivered by an
 * older PWA cache, so remove any content they try to inject.
 */
(() => {
  "use strict";
  if (window.__MAMO_EDITORIAL_PLACEHOLDER_GUARD__) return;
  window.__MAMO_EDITORIAL_PLACEHOLDER_GUARD__ = true;

  const LEGACY_SELECTORS = [
    "#goldEditorialDesk",
    "#mamoSpecialAnalysis",
    "#mamoPressIntel",
    "#mamoMorningInsight",
    "#mamoMorningIntervention",
    "#mamoPeriodIntervention",
    "#mamoDecisionPanel",
    "#mamoBaselineIntel",
    "#mamoValuePanel",
    "#mamoValueEditorialSlot",
    "#pressPaper",
    "#membershipPanel",
    "#analysisCards",
    "#analysisList",
    ".newsroom-cast",
  ];

  function placeholder() {
    const analysis = document.getElementById("analysis");
    return analysis?.dataset?.editorialPlaceholder === "1" ? analysis : null;
  }

  function sanitize() {
    const analysis = placeholder();
    if (!analysis) return;

    for (const selector of LEGACY_SELECTORS) {
      document.querySelectorAll(selector).forEach((node) => node.remove());
    }

    [...analysis.children].forEach((node) => {
      if (node.dataset?.editorialPlaceholderCore === "1") return;
      node.remove();
    });
  }

  function boot() {
    sanitize();
    if (typeof MutationObserver !== "function") return;
    const observer = new MutationObserver(() => queueMicrotask(sanitize));
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.addEventListener?.("pageshow", sanitize);
  window.addEventListener?.("mamo:editorial-placeholder-opened", sanitize);
  window.MAMO_EDITORIAL_PLACEHOLDER_GUARD = Object.freeze({ sanitize });
})();
