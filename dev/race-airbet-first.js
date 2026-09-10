/* MAMO BOAT — targeted official-action dock v8
 * iPhone Safari/PWA structural fix:
 * - Restore the stable outer order: quickbar -> official actions -> AIR BET -> raceboard.
 * - NEVER move the whole raceboard above AIR BET.
 * - Move only the existing official action nodes; do not clone/copy innerHTML.
 * - Existing LIVE / REAL / official-link handlers stay attached to the same DOM nodes.
 * - Builder-only rerenders do not rebuild the outer race DOM.
 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_OFFICIAL_DOCK_V8__) return;
  window.__MAMO_RACE_OFFICIAL_DOCK_V8__ = true;
  window.__MAMO_RACE_AIRBET_FIRST_V7__ = true;
  window.__MAMO_RACE_AIRBET_FIRST_V6__ = true;
  window.__MAMO_RACE_AIRBET_FIRST_V5__ = true;
  window.__MAMO_RACE_AIRBET_FIRST_V4__ = true;
  window.__MAMO_RACE_AIRBET_FIRST_V3__ = true;

  let lastBetdesk = null;
  let lastRaceboard = null;

  function installStyle() {
    document.getElementById("mamoRaceAirBetFirstV4")?.remove();
    document.getElementById("mamoRaceAirBetFirstV5")?.remove();
    if (document.getElementById("mamoRaceAirBetFirstV6")) return;
    const style = document.createElement("style");
    style.id = "mamoRaceAirBetFirstV6";
    style.textContent = `
      #raceView{display:block!important}
      .mamo-race-quickbar{display:flex;align-items:stretch;gap:10px;margin:8px 0 10px}
      .mamo-race-quickbar .mamo-race-back{flex:1;min-height:48px;border:1.5px solid #c9d7de;border-radius:14px;background:#fff;color:#0a3554;font:900 15px/1.2 system-ui,-apple-system,sans-serif;text-align:left;padding:0 14px}
      .mamo-race-quickbar .mamo-race-deadline{display:flex;min-width:118px;align-items:center;justify-content:center;border:1.5px solid #7bd5bf;border-radius:14px;background:#f2fffb;color:#087a63;font:900 13px/1.25 system-ui,-apple-system,sans-serif;text-align:center;padding:8px 10px}
      .mamo-race-old-back-card{display:none!important}
      .mamo-race-official-dock{display:block;margin:0 0 10px}
      .mamo-race-official-dock:empty{display:none}
      #raceView>.panel.betdesk,#raceView>.panel.raceboard{overflow-anchor:none}
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

  function ensureQuickbar(root) {
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
    }
    const deadline = bar.querySelector(".mamo-race-deadline");
    if (deadline) deadline.innerText = closeTimeText(root);
    return bar;
  }

  function ensureOfficialDock(root, betdesk) {
    let dock = root.querySelector(":scope > .mamo-race-official-dock");
    if (!dock) {
      dock = document.createElement("div");
      dock.className = "mamo-race-official-dock";
      dock.setAttribute("aria-label", "公式情報・公式導線");
      root.insertBefore(dock, betdesk);
    }
    return dock;
  }

  function moveOfficialActions(root, dock) {
    const raceboard = root.querySelector(":scope > .panel.raceboard");
    const officialMenu = raceboard?.querySelector(":scope > .officialmenu")
      || root.querySelector(".officialmenu");
    const aiActions = root.querySelector(".mamo-ai-actions");
    const officialLink = root.querySelector(".mamo-official-link-row");

    // Move the original nodes themselves. No cloning, no innerHTML copying.
    [officialMenu, aiActions, officialLink].forEach((node) => {
      if (node && node.parentElement !== dock) dock.appendChild(node);
    });
  }

  function arrangeFreshRaceDom() {
    installStyle();
    const root = document.getElementById("raceView");
    if (!root) return false;

    const raceboard = root.querySelector(":scope > .panel.raceboard");
    const betdesk = root.querySelector(":scope > .panel.betdesk");
    if (!raceboard || !betdesk) return false;

    const bar = ensureQuickbar(root);
    const dock = ensureOfficialDock(root, betdesk);
    const freshRaceDom = betdesk !== lastBetdesk || raceboard !== lastRaceboard;

    // Restore only the outer order. Never move raceboard above AIR BET.
    const wrongOrder = !(
      bar.nextElementSibling === dock
      && dock.nextElementSibling === betdesk
      && betdesk.nextElementSibling === raceboard
    );

    if (freshRaceDom || wrongOrder) {
      root.insertBefore(bar, betdesk);
      root.insertBefore(dock, betdesk);
      root.insertBefore(betdesk, raceboard);
      lastBetdesk = betdesk;
      lastRaceboard = raceboard;
    }

    moveOfficialActions(root, dock);

    const deadline = bar.querySelector(".mamo-race-deadline");
    if (deadline) deadline.innerText = closeTimeText(root);
    markOldBackCard(root);
    return true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arrangeFreshRaceDom, { once:true });
  } else {
    arrangeFreshRaceDom();
  }

  window.addEventListener("mamo:air-bet-rendered", arrangeFreshRaceDom);
  window.addEventListener("pageshow", arrangeFreshRaceDom);
  window.MAMO_RACE_AIRBET_FIRST = Object.freeze({ refresh: arrangeFreshRaceDom });
})();
