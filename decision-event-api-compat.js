/* MAMO BOAT Decision Event API compatibility shim */
(() => {
  "use strict";
  const api = window.MAMO_DECISION_EVENTS;
  if (!api || api.send || !api.track) return;
  window.MAMO_DECISION_EVENTS = Object.freeze({ ...api, send: api.track });
})();

/* User behavior UI filter: system latency belongs in admin/master monitoring, not user behavior. */
(() => {
  "use strict";
  const SYSTEM_ONLY_LABELS = new Set(["結果の反映時間"]);

  function removeSystemOnlyBehaviorCards() {
    const list = document.getElementById("analysisList");
    if (!list) return;
    [...list.children].forEach((card) => {
      const label = card.querySelector("b")?.textContent?.trim();
      if (SYSTEM_ONLY_LABELS.has(label)) card.remove();
    });
  }

  function boot() {
    removeSystemOnlyBehaviorCards();
    const list = document.getElementById("analysisList");
    if (list) {
      new MutationObserver(() => queueMicrotask(removeSystemOnlyBehaviorCards))
        .observe(list, { childList: true, subtree: false });
    }
    window.addEventListener("mamo:analysis-rendered", removeSystemOnlyBehaviorCards);
    window.addEventListener("pageshow", removeSystemOnlyBehaviorCards);
    document.addEventListener("click", (event) => {
      if (event.target?.closest?.("#nav-analysis")) {
        setTimeout(removeSystemOnlyBehaviorCards, 0);
      }
    }, false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
