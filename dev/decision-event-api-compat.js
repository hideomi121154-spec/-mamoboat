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
    if (list) new MutationObserver(() => queueMicrotask(removeSystemOnlyBehaviorCards)).observe(list, { childList: true, subtree: false });
    window.addEventListener("mamo:analysis-rendered", removeSystemOnlyBehaviorCards);
    window.addEventListener("pageshow", removeSystemOnlyBehaviorCards);
    document.addEventListener("click", (event) => {
      if (event.target?.closest?.("#nav-analysis")) setTimeout(removeSystemOnlyBehaviorCards, 0);
    }, false);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();
})();

(() => {"use strict";if(document.querySelector('script[data-mamo-shop="pilot"]'))return;const script=document.createElement("script");script.src="mamo-shop.js?v=20260820-1";script.async=true;script.dataset.mamoShop="pilot";document.head.appendChild(script);})();
(() => {"use strict";if(document.querySelector('script[data-mamo-record="phase1"]'))return;const script=document.createElement("script");script.src="mamo-record.js?v=20260829-2";script.async=true;script.dataset.mamoRecord="phase1";document.head.appendChild(script);})();
(() => {"use strict";if(document.querySelector('script[data-mamo-record-dismiss-fix]'))return;const script=document.createElement("script");script.src="mamo-record-dismiss-fix.js?v=20260829-2";script.async=true;script.dataset.mamoRecordDismissFix="1";document.head.appendChild(script);})();
(() => {"use strict";if(document.querySelector('script[data-mamo-bottom-nav="horizontal"]'))return;const script=document.createElement("script");script.src="bottom-nav-horizontal.js?v=20260820-1";script.async=true;script.dataset.mamoBottomNav="horizontal";document.head.appendChild(script);})();
(() => {"use strict";if(document.querySelector('script[data-mamo-record-insights="phase4"]'))return;const script=document.createElement("script");script.src="mamo-record-insights.js?v=20260821-2";script.async=true;script.dataset.mamoRecordInsights="phase4";document.head.appendChild(script);})();
(() => {"use strict";if(document.querySelector('script[data-mamo-shop-record-benefits="phase5"]'))return;const script=document.createElement("script");script.src="mamo-shop-record-benefits.js?v=20260828-1";script.async=true;script.dataset.mamoShopRecordBenefits="phase5";document.head.appendChild(script);})();
(() => {"use strict";if(document.querySelector('script[data-mamo-home-record-balance]'))return;const script=document.createElement("script");script.src="home-record-balance.js?v=20260828-1";script.async=true;script.dataset.mamoHomeRecordBalance="1";document.head.appendChild(script);})();

/* MAMO VALUE marketplace: factual AIR BET amount comparison + live or fallback market links. */
(() => {
  "use strict";
  if (document.querySelector('script[data-mamo-shop-marketplace]')) return;
  const marketplace = () => {
    if (document.querySelector('script[data-mamo-shop-marketplace]')) return;
    const script = document.createElement("script");
    script.src = "mamo-shop-marketplace.js?v=20260828-8";
    script.async = true;
    script.dataset.mamoShopMarketplace = "1";
    document.head.appendChild(script);
  };
  if (window.MamoShopValueCore) return marketplace();
  const core = document.createElement("script");
  core.src = "mamo-shop-value-core.js?v=20260822-1";
  core.async = true;
  core.dataset.mamoShopValueCore = "1";
  core.onload = marketplace;
  document.head.appendChild(core);
})();
