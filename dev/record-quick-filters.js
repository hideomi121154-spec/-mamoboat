/* MAMO BOAT — quick past-record filters v1.
 * Adds one-tap history filters without changing the AIR outcome renderer.
 * No MutationObserver, no scroll correction, no full-screen re-render.
 */
(() => {
  "use strict";
  if (window.__MAMO_RECORD_QUICK_FILTERS_V1__) return;
  window.__MAMO_RECORD_QUICK_FILTERS_V1__ = true;

  const KEY = "mamoboat_v40_personal";
  const state = { recent7: false, outcome: "" };

  const readRecords = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY)) || {};
      return Array.isArray(saved.records) ? saved.records.filter(Boolean) : [];
    } catch (_) {
      return [];
    }
  };

  const fmt = (value) => Math.round(Number(value) || 0).toLocaleString("ja-JP");
  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

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
    const apiDate = window.MAMO_AIR_OUTCOME_VIEW?.recordDate?.(record);
    if (apiDate) return apiDate;
    const ms = recordTime(record);
    if (!Number.isFinite(ms)) return "";
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date(ms)).map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function todayKey() {
    return recordDate({ time: new Date().toISOString() });
  }

  function recentPastSevenKeys() {
    const keys = new Set();
    const now = Date.now();
    for (let days = 1; days <= 7; days += 1) {
      keys.add(recordDate({ time: new Date(now - days * 86400000).toISOString() }));
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

  function resultStatus(record) {
    if (!record?.settled || String(record?.status || "") === "pending") return "結果待ち";
    if (record.status === "hit") return "的中";
    if (record.status === "refunded") return "返還";
    return "不的中";
  }

  function matchesQuick(record, recentKeys) {
    const day = recordDate(record);
    if (!day || day >= todayKey()) return false;
    if (state.recent7 && !recentKeys.has(day)) return false;
    if (state.outcome === "hit" && record?.status !== "hit") return false;
    if (state.outcome === "miss" && record?.status !== "miss") return false;
    return true;
  }

  function syncButtons() {
    document.querySelectorAll("[data-rx-quick]").forEach((button) => {
      const key = button.dataset.rxQuick;
      const active = key === "recent7" ? state.recent7 : state.outcome === key;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function clearQuickState() {
    state.recent7 = false;
    state.outcome = "";
    syncButtons();
  }

  function renderQuickResults() {
    const out = document.getElementById("rxPastResults");
    const status = document.getElementById("rxPastStatus");
    if (!out || !status) return;

    if (!state.recent7 && !state.outcome) {
      out.replaceChildren();
      status.textContent = "日付または開催場を選んで検索してください。";
      return;
    }

    const all = readRecords().sort((a, b) => recordTime(b) - recordTime(a));
    const recentKeys = recentPastSevenKeys();
    const matches = all.filter((record) => matchesQuick(record, recentKeys));
    const labels = [];
    if (state.recent7) labels.push("直近7日");
    if (state.outcome === "hit") labels.push("的中");
    if (state.outcome === "miss") labels.push("不的中");

    status.textContent = matches.length
      ? `${labels.join("・")}：${matches.length}件見つかりました。`
      : `${labels.join("・")}に該当する過去の記録はありません。`;

    out.innerHTML = matches.map((record) => {
      const index = all.indexOf(record);
      const day = recordDate(record).replaceAll("-", "/");
      return `<details class="rx-past-row" data-rx-past-index="${index}"><summary><time>${esc(day)}</time><strong>${esc(venue(record))} ${Number(record?.raceNo || record?.race) || ""}R</strong><span>${fmt(stake(record))}B</span><b>${esc(resultStatus(record))}</b><span>詳細</span></summary><div class="rx-past-detail"></div></details>`;
    }).join("");
  }

  function ensureUI() {
    const panel = document.getElementById("rxPastRecordSearch");
    if (!panel || panel.querySelector("[data-rx-quick-wrap]")) return;
    const heading = panel.querySelector("h3");
    if (!heading) return;

    const wrap = document.createElement("div");
    wrap.dataset.rxQuickWrap = "1";
    wrap.className = "rx-quick-wrap";
    wrap.innerHTML = `<div class="rx-quick-label">すぐ見る</div><div class="rx-quick-buttons" role="group" aria-label="過去記録のクイック絞り込み"><button type="button" data-rx-quick="recent7" aria-pressed="false">直近7日</button><button type="button" data-rx-quick="hit" aria-pressed="false">的中</button><button type="button" data-rx-quick="miss" aria-pressed="false">不的中</button></div><small>日付・開催場を入れずに表示できます。</small><div class="rx-quick-divider"><span>または条件を指定</span></div>`;
    heading.insertAdjacentElement("afterend", wrap);
    syncButtons();
  }

  function style() {
    if (document.getElementById("mamoRecordQuickFilterStyle")) return;
    const sheet = document.createElement("style");
    sheet.id = "mamoRecordQuickFilterStyle";
    sheet.textContent = `
      #records .rx-quick-wrap{margin:12px 0 6px}
      #records .rx-quick-label{margin-bottom:7px;color:#526d79;font-size:11px;font-weight:1000}
      #records .rx-quick-buttons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      #records .rx-quick-buttons button{min-height:46px;border:1.5px solid #c9d7dd;border-radius:10px;background:#fff;color:#082b4a;font-size:13px;font-weight:1000;-webkit-tap-highlight-color:transparent}
      #records .rx-quick-buttons button.active{border-color:#082b4a;background:#082b4a;color:#fff}
      #records .rx-quick-wrap>small{display:block;margin-top:7px;color:#71858e;font-size:9px}
      #records .rx-quick-divider{display:flex;align-items:center;gap:9px;margin:13px 0 2px;color:#78909a;font-size:9px;font-weight:900}
      #records .rx-quick-divider:before,#records .rx-quick-divider:after{content:"";height:1px;flex:1;background:#dfe7ea}
      #records .rx-quick-divider span{white-space:nowrap}
    `;
    document.head.appendChild(sheet);
  }

  function onClick(event) {
    const button = event.target?.closest?.("[data-rx-quick]");
    if (button) {
      const key = button.dataset.rxQuick;
      if (key === "recent7") state.recent7 = !state.recent7;
      if (key === "hit") state.outcome = state.outcome === "hit" ? "" : "hit";
      if (key === "miss") state.outcome = state.outcome === "miss" ? "" : "miss";
      syncButtons();
      renderQuickResults();
      return;
    }
    if (event.target?.closest?.("[data-rx-past-clear]")) clearQuickState();
  }

  function boot() {
    style();
    ensureUI();
    document.addEventListener("click", onClick, false);
    document.addEventListener("submit", (event) => {
      if (event.target?.id === "rxPastForm") clearQuickState();
    }, false);
    window.addEventListener("pageshow", ensureUI);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
