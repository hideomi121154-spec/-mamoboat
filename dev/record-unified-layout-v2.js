/* MAMO BOAT — unified record layout compatibility layer v4.
 * Keeps record-card rendering owned by AIR Outcome and adds lightweight,
 * one-tap history filters without full-screen re-rendering or DOM observers.
 */
(() => {
  "use strict";
  if (window.__MAMO_RECORD_UNIFIED_LAYOUT_V4__) return;
  window.__MAMO_RECORD_UNIFIED_LAYOUT_V4__ = true;

  const KEY = "mamoboat_v40_personal";
  const quick = { recent7:false, outcome:"" };

  function boundedRefresh() {
    style();
    ensureQuickFilters();
  }

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

  function readRecords() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY)) || {};
      return Array.isArray(saved.records) ? saved.records.filter(Boolean) : [];
    } catch (_) {
      return [];
    }
  }

  function recordTime(record) {
    for (const value of [record?.placedAt, record?.createdAt, record?.time, record?.betAt, record?.submittedAt, record?.raceDate]) {
      if (value == null || value === "") continue;
      let input = value;
      if (typeof input === "string") {
        input = input.trim().replace(/\//g, "-");
        if (/^\d{4}-\d{2}-\d{2}$/.test(input)) input += "T00:00:00+09:00";
        else if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(input)) input = input.replace(" ", "T") + "+09:00";
      }
      const ms = new Date(input).getTime();
      if (Number.isFinite(ms)) return ms;
    }
    return NaN;
  }

  function recordDate(record) {
    const fromView = window.MAMO_AIR_OUTCOME_VIEW?.recordDate?.(record);
    if (fromView) return fromView;
    const ms = recordTime(record);
    if (!Number.isFinite(ms)) return "";
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en", {
      timeZone:"Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit"
    }).formatToParts(new Date(ms)).map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function todayKey() {
    return recordDate({ time:new Date().toISOString() });
  }

  function recentSevenKeys() {
    const keys = new Set();
    const now = Date.now();
    for (let days = 1; days <= 7; days += 1) {
      keys.add(recordDate({ time:new Date(now - days * 86400000).toISOString() }));
    }
    return keys;
  }

  function stake(record) {
    const direct = Number(record?.stake ?? record?.total ?? record?.intendedYen ?? 0);
    if (direct) return direct;
    return Array.isArray(record?.lines)
      ? record.lines.reduce((sum, line) => sum + (Number(line?.stake) || 0), 0)
      : 0;
  }

  function venue(record) {
    return String(record?.venue || record?.venueName || "").trim();
  }

  function statusLabel(record) {
    if (!record?.settled || String(record?.status || "") === "pending") return "結果待ち";
    if (record.status === "hit") return "的中";
    if (record.status === "refunded") return "返還";
    return "不的中";
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function matchesQuick(record, recentKeys) {
    const day = recordDate(record);
    if (!day || day >= todayKey()) return false;
    if (quick.recent7 && !recentKeys.has(day)) return false;
    if (quick.outcome === "hit" && record?.status !== "hit") return false;
    if (quick.outcome === "miss" && record?.status !== "miss") return false;
    return true;
  }

  function syncQuickButtons() {
    document.querySelectorAll("[data-rx-quick]").forEach((button) => {
      const key = button.dataset.rxQuick;
      const active = key === "recent7" ? quick.recent7 : quick.outcome === key;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function clearQuick() {
    quick.recent7 = false;
    quick.outcome = "";
    syncQuickButtons();
  }

  function renderQuickResults() {
    const out = document.getElementById("rxPastResults");
    const status = document.getElementById("rxPastStatus");
    if (!out || !status) return;

    if (!quick.recent7 && !quick.outcome) {
      out.replaceChildren();
      status.textContent = "日付または開催場を選んで検索してください。";
      return;
    }

    const all = readRecords().sort((a, b) => recordTime(b) - recordTime(a));
    const recentKeys = recentSevenKeys();
    const matches = all.filter((record) => matchesQuick(record, recentKeys));
    const labels = [];
    if (quick.recent7) labels.push("直近7日");
    if (quick.outcome === "hit") labels.push("的中");
    if (quick.outcome === "miss") labels.push("不的中");
    status.textContent = matches.length
      ? `${labels.join("・")}：${matches.length}件見つかりました。`
      : `${labels.join("・")}に該当する過去の記録はありません。`;

    out.innerHTML = matches.map((record) => {
      const index = all.indexOf(record);
      const day = recordDate(record).replaceAll("-", "/");
      const amount = Math.round(stake(record)).toLocaleString("ja-JP");
      return `<details class="rx-past-row" data-rx-past-index="${index}"><summary><time>${esc(day)}</time><strong>${esc(venue(record))} ${Number(record?.raceNo || record?.race) || ""}R</strong><span>${amount}B</span><b>${esc(statusLabel(record))}</b><span>詳細</span></summary><div class="rx-past-detail"></div></details>`;
    }).join("");
  }

  function ensureQuickFilters() {
    const panel = document.getElementById("rxPastRecordSearch");
    if (!panel || panel.querySelector("[data-rx-quick-wrap]")) return;
    const heading = panel.querySelector("h3");
    if (!heading) return;
    const wrap = document.createElement("div");
    wrap.dataset.rxQuickWrap = "1";
    wrap.className = "rx-quick-wrap";
    wrap.innerHTML = `<div class="rx-quick-label">すぐ見る</div><div class="rx-quick-buttons" role="group" aria-label="過去記録のクイック絞り込み"><button type="button" data-rx-quick="recent7" aria-pressed="false">直近7日</button><button type="button" data-rx-quick="hit" aria-pressed="false">的中</button><button type="button" data-rx-quick="miss" aria-pressed="false">不的中</button></div><small>日付・開催場を入れずに表示できます。</small><div class="rx-quick-divider"><span>または条件を指定</span></div>`;
    heading.insertAdjacentElement("afterend", wrap);
    syncQuickButtons();
  }

  function style() {
    if (document.getElementById("mamoRecordUnifiedReadableStyleV4")) return;
    document.getElementById("mamoRecordUnifiedReadableStyleV3")?.remove();
    const sheet = document.createElement("style");
    sheet.id = "mamoRecordUnifiedReadableStyleV4";
    sheet.textContent = `
      #records .rx-card.rx-readable-v2{padding:16px!important;border-radius:15px!important}
      #records .rx-card.rx-readable-v2 header h3{font-size:21px!important}
      #records .rx-card>.rx-financial-restore,#records .rx-card>.rx-unified-stats,#records .rx-card>.rx-details{display:none!important}
      #records .rx-fold>summary{min-height:56px!important;cursor:pointer!important;-webkit-tap-highlight-color:transparent!important}
      #records .rx-actions a,#records .rx-actions button{min-height:48px!important;font-size:12px!important;font-weight:1000!important}
      #records .rx-actions button[data-rx-carte]{background:#082b4a!important;color:#fff!important;border-color:#082b4a!important}
      .mamo-carte-tab[hidden]{display:none!important}
      #records .rx-quick-wrap{margin:12px 0 6px}
      #records .rx-quick-label{margin-bottom:7px;color:#526d79;font-size:11px;font-weight:1000}
      #records .rx-quick-buttons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      #records .rx-quick-buttons button{min-height:46px;border:1.5px solid #c9d7dd;border-radius:10px;background:#fff;color:#082b4a;font-size:13px;font-weight:1000;-webkit-tap-highlight-color:transparent}
      #records .rx-quick-buttons button.active{border-color:#082b4a;background:#082b4a;color:#fff}
      #records .rx-quick-wrap>small{display:block;margin-top:7px;color:#71858e;font-size:9px}
      #records .rx-quick-divider{display:flex;align-items:center;gap:9px;margin:13px 0 2px;color:#78909a;font-size:9px;font-weight:900}
      #records .rx-quick-divider:before,#records .rx-quick-divider:after{content:"";height:1px;flex:1;background:#dfe7ea}
      #records .rx-quick-divider span{white-space:nowrap}
      @media(max-width:520px){#records .rx-card.rx-readable-v2{padding:13px!important}#records .rx-fold>summary{min-height:58px!important}}
    `;
    document.head.appendChild(sheet);
  }

  document.addEventListener("click", (event) => {
    const quickButton = event.target?.closest?.("[data-rx-quick]");
    if (quickButton) {
      const key = quickButton.dataset.rxQuick;
      if (key === "recent7") quick.recent7 = !quick.recent7;
      if (key === "hit") quick.outcome = quick.outcome === "hit" ? "" : "hit";
      if (key === "miss") quick.outcome = quick.outcome === "miss" ? "" : "miss";
      syncQuickButtons();
      renderQuickResults();
      return;
    }
    if (event.target?.closest?.("[data-rx-past-clear]")) clearQuick();
    if (event.target?.closest?.("#nav-records,[data-rx-filter],[data-rec]")) boundedRefresh();
    if (event.target?.closest?.("[data-rx-carte],.mamo-carte-btn")) boundedCarteFix();
  }, false);

  document.addEventListener("submit", (event) => {
    if (event.target?.id === "rxPastForm") clearQuick();
  }, false);

  window.addEventListener("pageshow", boundedRefresh);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boundedRefresh, { once:true });
  else boundedRefresh();

  window.MAMO_RECORD_UNIFIED_LAYOUT = Object.freeze({ refresh:boundedRefresh, fixCarte:boundedCarteFix });
})();
