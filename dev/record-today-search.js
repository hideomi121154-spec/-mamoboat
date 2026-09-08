/* MAMO BOAT — Today-first record view + past AIR BET search v1
 * Surface: today's records only.
 * Archive: search older personal AIR BET records by date / venue.
 * Stability: no MutationObserver, no interval, no scroll correction, no viewport hooks.
 */
(() => {
  "use strict";
  if (window.__MAMO_RECORD_TODAY_SEARCH_V1__) return;
  window.__MAMO_RECORD_TODAY_SEARCH_V1__ = true;

  const KEY = "mamoboat_v40_personal";
  const VENUES = [
    "桐生","戸田","江戸川","平和島","多摩川","浜名湖","蒲郡","常滑","津","三国","びわこ","住之江",
    "尼崎","鳴門","丸亀","児島","宮島","徳山","下関","若松","芦屋","福岡","唐津","大村"
  ];
  let todayFilter = "all";
  let lastSearch = [];

  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; }
    catch (_) { return {}; }
  };
  const records = () => Array.isArray(read().records) ? read().records.filter(Boolean) : [];
  const time = r => new Date(r?.time || r?.createdAt || r?.raceDate || 0).getTime();
  const sorted = () => records().slice().sort((a,b) => time(b) - time(a));
  const settled = r => !!r?.settled && String(r?.status || "") !== "pending";
  const stake = r => Number(r?.stake ?? r?.total ?? r?.intendedYen ?? 0) || (Array.isArray(r?.lines) ? r.lines.reduce((s,l)=>s+(Number(l?.stake)||0),0) : 0);
  const esc = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const fmt = value => Math.round(Number(value)||0).toLocaleString("ja-JP");

  function dateKey(value){
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone:"Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit"
      }).format(d);
    } catch (_) {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
  }

  function todayKey(){ return dateKey(new Date()); }
  function recordDate(r){ return dateKey(r?.raceDate || r?.date || r?.time || r?.createdAt); }
  function venueName(r){ return String(r?.venue || r?.venueName || r?.stadium || "").trim(); }
  function raceNo(r){ return Number(r?.raceNo || r?.race) || ""; }
  function statusInfo(r){
    if (!settled(r)) return {key:"pending", label:"結果待ち"};
    if (r?.status === "hit") return {key:"hit", label:"的中"};
    if (r?.status === "refunded") return {key:"refund", label:"返還"};
    return {key:"miss", label:"不的中"};
  }

  function todayRecords(all){
    const key = todayKey();
    return all.filter(r => recordDate(r) === key);
  }

  function filteredToday(list){
    if (todayFilter === "pending") return list.filter(r => !settled(r));
    if (todayFilter === "settled") return list.filter(settled);
    return list;
  }

  function cardHtml(record,index){
    return window.MAMO_AIR_OUTCOME_VIEW?.cardHtml?.(record,index) || "";
  }

  function ensureArchivePanel(latest){
    let panel = document.getElementById("rxPastRecordSearch");
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = "rxPastRecordSearch";
    panel.className = "rx-past-search";
    panel.innerHTML = `
      <div class="rx-past-head">
        <div><small>PAST AIR BET</small><h3>過去の記録を探す</h3><p>過去分は表面に並べず、日付や開催場から検索できます。</p></div>
      </div>
      <div class="rx-past-form">
        <label><span>日付</span><input id="rxPastDate" type="date"></label>
        <label><span>開催場</span><select id="rxPastVenue"><option value="">すべての場</option>${VENUES.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("")}</select></label>
      </div>
      <div class="rx-past-actions">
        <button type="button" data-rx-past-search>検索する</button>
        <button type="button" class="sub" data-rx-past-clear>条件をクリア</button>
      </div>
      <div id="rxPastStatus" class="rx-past-status">日付または開催場を選んで検索してください。</div>
      <div id="rxPastResults" class="rx-past-results"></div>`;
    latest.insertAdjacentElement("afterend", panel);
    return panel;
  }

  function renderToday(){
    const screen = document.getElementById("records");
    const block = document.getElementById("airOutcomeBlock");
    if (!screen || !block) return;

    const all = sorted();
    const today = todayRecords(all);
    const shown = filteredToday(today);
    const done = today.filter(settled).length;
    const waiting = today.length - done;

    const hero = block.querySelector(".rx-record-hero");
    if (hero) {
      const small = hero.querySelector(":scope > small");
      const h2 = hero.querySelector("h2");
      const p = hero.querySelector("p");
      const stats = hero.querySelector(":scope > div");
      if (small) small.textContent = "TODAY / MAMO RECORD";
      if (h2) h2.textContent = "本日の参加記録";
      if (p) p.textContent = "今日のAIR BETだけを表示しています。過去分は下の検索から確認できます。";
      if (stats) stats.innerHTML = `<span>本日 ${today.length}件</span><b>確定 ${done}</b><b>結果待ち ${waiting}</b>`;
    }

    const filter = block.querySelector(".rx-filter");
    if (filter) {
      const allBtn = filter.querySelector('[data-rx-filter="all"]');
      const pendingBtn = filter.querySelector('[data-rx-filter="pending"]');
      const settledBtn = filter.querySelector('[data-rx-filter="settled"]');
      if (allBtn) { allBtn.textContent = `本日すべて ${today.length}`; allBtn.classList.toggle("active", todayFilter === "all"); }
      if (pendingBtn) { pendingBtn.textContent = `結果待ち ${waiting}`; pendingBtn.classList.toggle("active", todayFilter === "pending"); }
      if (settledBtn) { settledBtn.textContent = `確定 ${done}`; settledBtn.classList.toggle("active", todayFilter === "settled"); }
    }

    const latest = block.querySelector(".rx-latest");
    if (!latest) return;
    latest.innerHTML = shown.length
      ? shown.map(r => cardHtml(r, all.indexOf(r))).join("")
      : '<div class="rx-empty">本日の該当する記録はありません。</div>';
    ensureArchivePanel(latest);
  }

  function compactResult(record,index){
    const s = statusInfo(record);
    const date = recordDate(record).replaceAll("-","/");
    return `<article class="rx-past-row ${s.key}">
      <button type="button" class="rx-past-main" data-rx-past-detail="${index}">
        <span class="date">${esc(date)}</span>
        <strong>${esc(venueName(record))} ${esc(raceNo(record))}R</strong>
        <span class="money">${fmt(stake(record))}B</span>
        <b>${esc(s.label)}</b>
        <i>詳細</i>
      </button>
      <div class="rx-past-detail" data-rx-past-detail-body="${index}" hidden></div>
    </article>`;
  }

  function runSearch(){
    const date = document.getElementById("rxPastDate")?.value || "";
    const venue = document.getElementById("rxPastVenue")?.value || "";
    const status = document.getElementById("rxPastStatus");
    const out = document.getElementById("rxPastResults");
    if (!out || !status) return;

    if (!date && !venue) {
      lastSearch = [];
      out.replaceChildren();
      status.textContent = "日付または開催場を選んで検索してください。";
      return;
    }

    const all = sorted();
    const today = todayKey();
    lastSearch = all.filter(r => {
      if (recordDate(r) === today) return false;
      if (date && recordDate(r) !== date) return false;
      if (venue && venueName(r) !== venue) return false;
      return true;
    });

    status.textContent = lastSearch.length
      ? `${lastSearch.length}件見つかりました。タップすると詳細を開きます。`
      : "条件に一致する過去の記録はありません。";
    out.innerHTML = lastSearch.map(r => compactResult(r, all.indexOf(r))).join("");
  }

  function togglePastDetail(index){
    const body = document.querySelector(`[data-rx-past-detail-body="${index}"]`);
    if (!body) return;
    if (!body.hidden) {
      body.hidden = true;
      body.replaceChildren();
      return;
    }
    const all = sorted();
    const record = all[index];
    if (!record) return;
    body.innerHTML = cardHtml(record,index);
    body.hidden = false;
  }

  function clearSearch(){
    const date = document.getElementById("rxPastDate");
    const venue = document.getElementById("rxPastVenue");
    if (date) date.value = "";
    if (venue) venue.value = "";
    runSearch();
  }

  function onCapture(event){
    const todayBtn = event.target?.closest?.("#airOutcomeBlock [data-rx-filter]");
    if (todayBtn) {
      event.preventDefault();
      event.stopImmediatePropagation();
      todayFilter = todayBtn.dataset.rxFilter || "all";
      renderToday();
      return;
    }
  }

  function onClick(event){
    if (event.target?.closest?.("[data-rx-past-search]")) { runSearch(); return; }
    if (event.target?.closest?.("[data-rx-past-clear]")) { clearSearch(); return; }
    const detail = event.target?.closest?.("[data-rx-past-detail]");
    if (detail) { togglePastDetail(Number(detail.dataset.rxPastDetail)); return; }
    if (event.target?.closest?.("#nav-records")) queueMicrotask(renderToday);
  }

  function style(){
    if (document.getElementById("rxPastRecordStyle")) return;
    const s = document.createElement("style");
    s.id = "rxPastRecordStyle";
    s.textContent = `
      #records .rx-past-search{margin:16px 0 20px;padding:14px;background:#fff;border:1.5px solid #d7e3e8;border-radius:14px;box-shadow:0 4px 14px rgba(8,43,74,.05)}
      #records .rx-past-head small{color:#087d77;font-size:8px;font-weight:1000;letter-spacing:.12em}
      #records .rx-past-head h3{margin:4px 0 4px;color:#082b4a;font-size:20px}
      #records .rx-past-head p{margin:0;color:#6e818b;font-size:10px;line-height:1.55}
      #records .rx-past-form{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:13px}
      #records .rx-past-form label{display:grid;gap:5px;color:#536d79;font-size:9px;font-weight:1000}
      #records .rx-past-form input,#records .rx-past-form select{width:100%;min-height:44px;box-sizing:border-box;border:1.5px solid #ccdbe2;border-radius:10px;background:#f8fafb;color:#082b4a;padding:8px 10px;font:inherit;font-size:13px;font-weight:900}
      #records .rx-past-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
      #records .rx-past-actions button{min-height:44px;border:0;border-radius:10px;background:#082b4a;color:#fff;font-size:12px;font-weight:1000}
      #records .rx-past-actions button.sub{border:1.5px solid #ccdbe2;background:#fff;color:#536d79}
      #records .rx-past-status{margin:11px 0 7px;color:#6d818b;font-size:10px;font-weight:800}
      #records .rx-past-results{display:grid;gap:8px}
      #records .rx-past-row{border:1px solid #dfe7ea;border-radius:11px;background:#fff;overflow:hidden}
      #records .rx-past-main{display:grid;grid-template-columns:68px minmax(0,1fr) auto auto auto;gap:8px;align-items:center;width:100%;min-height:58px;padding:10px 11px;border:0;background:#fff;text-align:left;color:#082b4a}
      #records .rx-past-main .date{color:#778b94;font-size:9px;font-weight:900}
      #records .rx-past-main strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}
      #records .rx-past-main .money{font-size:11px;font-weight:1000;white-space:nowrap}
      #records .rx-past-main b{padding:4px 7px;border-radius:7px;background:#f1f5f6;color:#607581;font-size:9px;white-space:nowrap}
      #records .rx-past-row.hit .rx-past-main b{background:#fff5d9;color:#997012}
      #records .rx-past-row.pending .rx-past-main b{background:#eaf8f6;color:#087d77}
      #records .rx-past-main i{color:#087d77;font-size:9px;font-style:normal;font-weight:1000}
      #records .rx-past-detail{padding:0 9px 9px;background:#f6f9fa}
      #records .rx-past-detail .rx-card{margin:0}
      @media(max-width:520px){
        #records .rx-past-form{grid-template-columns:1fr 1fr}
        #records .rx-past-main{grid-template-columns:62px minmax(0,1fr) auto;grid-template-areas:"date title status" "date money detail";gap:4px 8px}
        #records .rx-past-main .date{grid-area:date}#records .rx-past-main strong{grid-area:title}#records .rx-past-main .money{grid-area:money}#records .rx-past-main b{grid-area:status}#records .rx-past-main i{grid-area:detail;text-align:right}
      }
    `;
    document.head.appendChild(s);
  }

  function boot(){
    style();
    renderToday();
    document.addEventListener("click", onCapture, true);
    document.addEventListener("click", onClick, false);
    window.addEventListener("storage", event => { if (event.key === KEY) renderToday(); });
    window.addEventListener("pageshow", () => { if (document.getElementById("records")?.classList.contains("active")) renderToday(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();
})();
