/* MAMO BOAT — iPhone record layout hotfix v1
 * Prevents narrow-screen bet rows from collapsing into the left edge.
 * Also keeps Race Carte analysis-only by removing the duplicated bet tab.
 */
(() => {
  "use strict";
  if (window.__MAMO_RECORD_MOBILE_LAYOUT_FIX_V1__) return;
  window.__MAMO_RECORD_MOBILE_LAYOUT_FIX_V1__ = true;

  function installStyle() {
    if (document.getElementById("mamoRecordMobileLayoutFixV1")) return;
    const style = document.createElement("style");
    style.id = "mamoRecordMobileLayoutFixV1";
    style.textContent = `
      /* Race Carte: betting details live in the unified record card. */
      .mamo-carte-tabs .mamo-carte-tab:nth-child(2){display:none!important}

      @media(max-width:520px){
        #records .rx-bets{overflow:hidden!important;padding:0 12px 12px!important}
        #records .rx-bets>div{min-width:0!important;width:100%!important}
        #records .rx2-table-head{display:none!important}
        #records .rx2-line{
          width:100%!important;
          min-width:0!important;
          box-sizing:border-box!important;
          display:grid!important;
          grid-template-columns:minmax(0,1fr) auto auto!important;
          grid-template-areas:
            "way way way"
            "combo stake odds"!important;
          column-gap:12px!important;
          row-gap:6px!important;
          align-items:center!important;
          min-height:78px!important;
          padding:12px 2px!important;
          overflow:hidden!important;
        }
        #records .rx2-no{display:none!important}
        #records .rx2-way{
          grid-area:way!important;
          display:flex!important;
          align-items:center!important;
          gap:6px!important;
          flex-wrap:nowrap!important;
          min-width:0!important;
          white-space:nowrap!important;
        }
        #records .rx2-way b{font-size:12px!important;line-height:1.25!important;white-space:nowrap!important}
        #records .rx2-way em{font-size:10px!important;line-height:1!important;padding:4px 7px!important;white-space:nowrap!important}
        #records .rx2-combo{
          grid-area:combo!important;
          min-width:0!important;
          font-size:22px!important;
          line-height:1.1!important;
          white-space:nowrap!important;
          overflow:visible!important;
          word-break:keep-all!important;
        }
        #records .rx2-stake{
          grid-area:stake!important;
          font-size:17px!important;
          line-height:1.1!important;
          text-align:right!important;
          white-space:nowrap!important;
        }
        #records .rx2-odds{
          grid-area:odds!important;
          min-width:70px!important;
          font-size:16px!important;
          line-height:1.1!important;
          text-align:right!important;
          white-space:nowrap!important;
          color:#0969b9!important;
        }
        #records .rx2-stats{grid-template-columns:1fr 1fr!important}
      }

      @media(max-width:390px){
        #records .rx2-line{column-gap:8px!important}
        #records .rx2-combo{font-size:20px!important}
        #records .rx2-stake{font-size:15px!important}
        #records .rx2-odds{min-width:62px!important;font-size:14px!important}
        #records .rx2-way b{font-size:11px!important}
        #records .rx2-way em{font-size:9px!important;padding:3px 6px!important}
        #records .rx2-stats{grid-template-columns:1fr!important}
      }
    `;
    document.head.appendChild(style);
  }

  function fixCarte() {
    const overlay = document.getElementById("mamoRaceCarteOverlay");
    if (!overlay || overlay.hidden) return;
    const tabs = Array.from(overlay.querySelectorAll(".mamo-carte-tab"));
    if (tabs.length < 2) return;

    const bet = tabs.find((tab) => /買い目/.test(tab.textContent || "")) || tabs[1];
    const betId = bet?.dataset?.carteTab;
    const wasActive = !!bet?.classList?.contains("active");
    if (bet) bet.hidden = true;

    if (betId) {
      overlay.querySelectorAll(".mamo-carte-panel").forEach((panel) => {
        if (panel.dataset.cartePanel === betId || panel.id === betId) panel.hidden = true;
      });
    }

    if (wasActive) {
      const carte = tabs.find((tab) => /カルテ/.test(tab.textContent || "") && tab !== bet);
      carte?.click();
    }
  }

  function fixCarteSoon() {
    [0, 60, 160, 350].forEach((ms) => setTimeout(fixCarte, ms));
  }

  document.addEventListener("click", (event) => {
    if (event.target?.closest?.("[data-rx-carte],.mamo-carte-btn")) fixCarteSoon();
  }, false);
  window.addEventListener("pageshow", fixCarteSoon);

  installStyle();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { installStyle(); fixCarteSoon(); }, { once:true });
  } else {
    fixCarteSoon();
  }
})();
