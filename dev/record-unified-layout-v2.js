/* MAMO BOAT — unified record layout compatibility layer v3.
 * The AIR outcome renderer owns the record-card markup. This late-loaded layer
 * only supplies styles; it never rebuilds the record list or its cards.
 */
(() => {
  "use strict";
  if (window.__MAMO_RECORD_UNIFIED_LAYOUT_V3__) return;
  window.__MAMO_RECORD_UNIFIED_LAYOUT_V3__ = true;

  function boundedRefresh() { style(); }

  function removeDuplicateCarteBetTab() {
    const overlay = document.getElementById("mamoRaceCarteOverlay");
    if (!overlay || overlay.hidden) return;
    const tabs = [...overlay.querySelectorAll(".mamo-carte-tab")];
    const bet = tabs.find((tab) => /買い目/.test(tab.textContent || ""));
    if (!bet) return;
    const wasActive = bet.classList.contains("active");
    const id = bet.dataset.carteTab;
    bet.hidden = true;
    if (id) {
      overlay.querySelectorAll(".mamo-carte-panel").forEach((panel) => {
        if (panel.dataset.cartePanel === id || panel.id === id) panel.hidden = true;
      });
    }
    if (wasActive) tabs.find((tab) => /カルテ/.test(tab.textContent || "") && !tab.hidden)?.click();
  }

  function boundedCarteFix() {
    [0, 50, 120, 300].forEach((ms) => setTimeout(removeDuplicateCarteBetTab, ms));
  }

  function style() {
    if (document.getElementById("mamoRecordUnifiedReadableStyleV3")) return;
    const sheet = document.createElement("style");
    sheet.id = "mamoRecordUnifiedReadableStyleV3";
    sheet.textContent = `
      #records .rx-card.rx-readable-v2{padding:16px!important;border-radius:15px!important}
      #records .rx-card.rx-readable-v2 header h3{font-size:21px!important}
      #records .rx-card>.rx-financial-restore,#records .rx-card>.rx-unified-stats,#records .rx-card>.rx-details{display:none!important}
      #records .rx-fold>summary{min-height:56px!important;cursor:pointer!important;-webkit-tap-highlight-color:transparent!important}
      #records .rx-actions a,#records .rx-actions button{min-height:48px!important;font-size:12px!important;font-weight:1000!important}
      #records .rx-actions button[data-rx-carte]{background:#082b4a!important;color:#fff!important;border-color:#082b4a!important}
      .mamo-carte-tab[hidden]{display:none!important}
      @media(max-width:520px){#records .rx-card.rx-readable-v2{padding:13px!important}#records .rx-fold>summary{min-height:58px!important}}
    `;
    document.head.appendChild(sheet);
  }

  document.addEventListener("click", (event) => {
    if (event.target?.closest?.("#nav-records,[data-rx-filter],[data-rec]")) boundedRefresh();
    if (event.target?.closest?.("[data-rx-carte],.mamo-carte-btn")) boundedCarteFix();
  }, false);
  window.addEventListener("pageshow", boundedRefresh);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boundedRefresh, { once:true });
  else boundedRefresh();

  window.MAMO_RECORD_UNIFIED_LAYOUT = Object.freeze({ refresh:boundedRefresh, fixCarte:boundedCarteFix });
})();
