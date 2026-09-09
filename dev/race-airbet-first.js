/* MAMO BOAT — race screen AIR BET first v4
 * Keep AIR BET visually ahead of the detailed raceboard without moving live DOM nodes.
 * Adds a compact top utility row for "24場へ戻る" and the planned close time.
 * The old lower return card is hidden after render so users do not need to scroll back down.
 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_AIRBET_FIRST_V4__) return;
  window.__MAMO_RACE_AIRBET_FIRST_V4__ = true;
  window.__MAMO_RACE_AIRBET_FIRST_V3__ = true;

  function installStyle() {
    if (document.getElementById("mamoRaceAirBetFirstV4")) return;
    const style = document.createElement("style");
    style.id = "mamoRaceAirBetFirstV4";
    style.textContent = `
      #raceView{display:flex;flex-direction:column}
      #raceView > *{order:20}
      #raceView > .racechips{order:1}
      #raceView > .mamo-race-quickbar{order:2}
      #raceView > .section-head.small:has(+ .panel.betdesk){order:3}
      #raceView > .panel.betdesk{order:4}
      #raceView > .panel.raceboard{order:5}
      .mamo-race-quickbar{display:flex;align-items:stretch;gap:10px;margin:8px 0 12px}
      .mamo-race-quickbar .mamo-race-back{flex:1;min-height:48px;border:1.5px solid #c9d7de;border-radius:14px;background:#fff;color:#0a3554;font:900 15px/1.2 system-ui,-apple-system,sans-serif;text-align:left;padding:0 14px}
      .mamo-race-quickbar .mamo-race-deadline{display:flex;min-width:118px;align-items:center;justify-content:center;border:1.5px solid #7bd5bf;border-radius:14px;background:#f2fffb;color:#087a63;font:900 13px/1.25 system-ui,-apple-system,sans-serif;text-align:center;padding:8px 10px}
      .mamo-race-old-back-card{display:none!important}
      @media(max-width:420px){
        .mamo-race-quickbar{gap:8px}
        .mamo-race-quickbar .mamo-race-back{font-size:14px;padding:0 12px}
        .mamo-race-quickbar .mamo-race-deadline{min-width:106px;font-size:12px}
      }
    `;
    document.head.appendChild(style);
  }

  function closeTimeText(root) {
    const tiny = root?.querySelector(":scope > .panel.raceboard .raceheadline .tiny");
    const text = String(tiny?.textContent || "");
    const match = text.match(/([0-2]?\d:[0-5]\d)/);
    return match ? `締切予定\n${match[1]}` : "締切時間\n確認中";
  }

  function markOldBackCard(root) {
    if (!root) return;
    const candidates = Array.from(root.querySelectorAll("button,a"));
    const back = candidates.find(node => String(node.textContent || "").includes("全国24場へ戻る"));
    if (!back) return;
    const card = back.closest(".panel") || back.parentElement;
    if (card && !card.classList.contains("mamo-race-quickbar")) {
      card.classList.add("mamo-race-old-back-card");
    }
  }

  function ensureQuickbar() {
    installStyle();
    const root = document.getElementById("raceView");
    if (!root) return false;

    let bar = root.querySelector(":scope > .mamo-race-quickbar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "mamo-race-quickbar";

      const back = document.createElement("button");
      back.type = "button";
      back.className = "mamo-race-back";
      back.textContent = "← 全国24場へ戻る";
      back.addEventListener("click", () => window.go?.("venues"));

      const deadline = document.createElement("div");
      deadline.className = "mamo-race-deadline";
      deadline.setAttribute("aria-label", "電話投票締切予定");

      bar.append(back, deadline);
      root.appendChild(bar);
    }

    const deadline = bar.querySelector(".mamo-race-deadline");
    if (deadline) deadline.innerText = closeTimeText(root);
    markOldBackCard(root);
    return true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureQuickbar, { once:true });
  } else {
    ensureQuickbar();
  }

  window.addEventListener("mamo:air-bet-rendered", ensureQuickbar);
  window.addEventListener("pageshow", ensureQuickbar);
  window.MAMO_RACE_AIRBET_FIRST = Object.freeze({ refresh: ensureQuickbar });
})();
