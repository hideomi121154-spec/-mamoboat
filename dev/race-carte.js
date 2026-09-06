/* MAMO BOAT — Race Carte v1
 * Read-only archive view for AIR BET records.
 * Keeps race navigation / AIR BET rendering untouched.
 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_CARTE_V1__) return;
  window.__MAMO_RACE_CARTE_V1__ = true;

  const KEY = "mamoboat_v40_personal";
  const BET_LABEL = {
    trifecta: "3連単", trio: "3連複", exacta: "2連単", quinella: "2連複",
    wide: "拡連複", win: "単勝", place: "複勝"
  };
  const MODE_LABEL = { normal: "通常", box: "BOX", form: "フォーメーション" };

  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const num = (value) => Number(value || 0) || 0;
  const fmt = (value) => Math.round(num(value)).toLocaleString("ja-JP");
  const pct = (value) => Number.isFinite(value) ? `${value.toFixed(1)}%` : "—";

  function readState() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "null");
      return raw && typeof raw === "object" ? raw : { records: [] };
    } catch (_) {
      return { records: [] };
    }
  }

  function records() {
    const state = readState();
    const list = Array.isArray(state.records) ? state.records : Array.isArray(state.sets) ? state.sets : [];
    return list.filter(Boolean).slice().sort((a, b) => String(b.time || b.createdAt || b.raceDate || "").localeCompare(String(a.time || a.createdAt || a.raceDate || "")));
  }

  function settled(record) {
    const status = String(record?.status || "").toLowerCase();
    return record?.settled === true || ["hit", "miss", "refunded", "won", "lost"].includes(status);
  }
  function hit(record) {
    return ["hit", "won"].includes(String(record?.status || "").toLowerCase());
  }
  function stake(record) {
    const lines = Array.isArray(record?.lines) ? record.lines : [];
    return num(record?.stake ?? record?.total) || lines.reduce((sum, line) => sum + num(line?.stake), 0);
  }
  function payout(record) {
    return num(record?.payoutC ?? record?.payout ?? record?.refundC);
  }
  function returnRate(record) {
    const s = stake(record);
    return s > 0 ? payout(record) / s * 100 : NaN;
  }
  function resultCombo(record) {
    const direct = String(record?.resultCombo || record?.result?.combo || "").match(/\d+/g);
    if (direct?.length) return direct.slice(0, 3).join("-");
    const order = Array.isArray(record?.resultOrder) ? record.resultOrder : Array.isArray(record?.finishOrder) ? record.finishOrder : [];
    const boats = order.map((item) => Number(item?.boatNumber ?? item)).filter((n) => n >= 1 && n <= 6);
    return boats.length ? boats.slice(0, 3).join("-") : "結果待ち";
  }
  function technique(record) {
    return record?.kimarite || record?.winningMethod || record?.resultTechnique || record?.result?.kimarite || record?.result?.winningMethod || "未保存";
  }
  function modeLabel(record, line) {
    return MODE_LABEL[line?.mode || record?.betMode] || "—";
  }
  function lines(record) {
    if (Array.isArray(record?.lines) && record.lines.length) return record.lines;
    if (Array.isArray(record?.combo)) return [{ combo: record.combo, stake: stake(record), betType: record.betType, mode: record.betMode }];
    return [];
  }
  function racerName(record, boat) {
    const list = Array.isArray(record?.entrySnapshot) ? record.entrySnapshot : [];
    const found = list.find((entry) => Number(entry?.boatNumber) === Number(boat));
    return found?.name || `${boat}号艇`;
  }
  function environment(record) {
    const source = record?.environmentSnapshot || record?.weatherSnapshot || record?.conditions || record?.environment || {};
    return {
      weather: source.weather || source.condition || record?.weather || "未保存",
      windDirection: source.windDirection || source.wind || record?.windDirection || "未保存",
      windSpeed: source.windSpeed ?? record?.windSpeed ?? null,
      wave: source.waveHeight ?? source.wave ?? record?.waveHeight ?? null,
      air: source.airTemperature ?? source.temperature ?? record?.airTemperature ?? null,
      water: source.waterTemperature ?? record?.waterTemperature ?? null,
    };
  }

  function injectStyle() {
    if (document.getElementById("mamoRaceCarteStyleV1")) return;
    const style = document.createElement("style");
    style.id = "mamoRaceCarteStyleV1";
    style.textContent = `
      .race-carte-section{margin-top:18px}.race-carte-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0 12px}.race-carte-stat{padding:12px 10px;border:1px solid #d8e3e8;border-radius:13px;background:#fff}.race-carte-stat small{display:block;color:#72838a;font-size:8px;font-weight:900}.race-carte-stat strong{display:block;margin-top:4px;color:#082b4a;font-size:20px}.race-carte-list{display:grid;gap:9px}.race-carte-card{width:100%;padding:12px;border:1px solid #d8e3e8;border-left:5px solid #0a948c;border-radius:14px;background:#fff;text-align:left;color:#082b4a}.race-carte-card.hit{border-left-color:#d3a331}.race-carte-card.miss{border-left-color:#c52b38}.race-carte-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.race-carte-top small{color:#74858d;font-size:8px;font-weight:900}.race-carte-top strong{display:block;font-size:16px}.race-carte-badges{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.race-carte-badge{padding:4px 7px;border-radius:999px;background:#eef4f7;color:#173b52;font-size:8px;font-weight:900}.race-carte-outcome{margin-top:9px;display:flex;justify-content:space-between;gap:10px;font-size:10px;font-weight:900}.race-carte-empty{padding:18px;border:1px dashed #cbd8df;border-radius:14px;color:#667b86;text-align:center;font-size:11px}.race-carte-overlay[hidden]{display:none!important}.race-carte-overlay{position:fixed;inset:0;z-index:130;display:grid;align-items:end;background:rgba(3,18,30,.62);padding-top:env(safe-area-inset-top)}.race-carte-sheet{width:min(100%,620px);max-height:90dvh;margin:0 auto;overflow:auto;overscroll-behavior:contain;background:#fff;border-radius:22px 22px 0 0;padding:18px 16px calc(20px + env(safe-area-inset-bottom));-webkit-overflow-scrolling:touch}.race-carte-head{display:flex;justify-content:space-between;gap:12px}.race-carte-head h2{margin:3px 0;color:#082b4a}.race-carte-close{width:38px;height:38px;border:0;border-radius:50%;background:#082b4a;color:#fff;font-size:22px}.race-carte-block{margin-top:12px;padding:12px;border:1px solid #dbe5e9;border-radius:13px;background:#f8fbfc}.race-carte-block h3{margin:0 0 8px;color:#082b4a;font-size:13px}.race-carte-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.race-carte-kv{padding:8px;border-radius:9px;background:#fff}.race-carte-kv span{display:block;color:#77878e;font-size:8px;font-weight:900}.race-carte-kv b{display:block;margin-top:3px;color:#12364b;font-size:11px}.race-carte-line{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #e4ebee;font-size:10px}.race-carte-line:last-child{border-bottom:0}.race-carte-line b{color:#082b4a}.race-carte-racers{display:grid;gap:5px}.race-carte-racer{display:flex;justify-content:space-between;gap:8px;padding:7px 8px;background:#fff;border-radius:8px;font-size:9px}.race-carte-note{color:#6d7f87;font-size:9px;line-height:1.6}.race-carte-review{padding:11px;border-left:4px solid #d3a331;background:#fffdf5;border-radius:9px;color:#17374a;font-size:10px;line-height:1.6}
      @media(max-width:390px){.race-carte-summary{gap:6px}.race-carte-stat{padding:10px 8px}.race-carte-stat strong{font-size:17px}}
    `;
    document.head.appendChild(style);
  }

  function summary(list) {
    const done = list.filter(settled);
    const hits = done.filter(hit).length;
    const totalStake = done.reduce((sum, record) => sum + stake(record), 0);
    const totalPayout = done.reduce((sum, record) => sum + payout(record), 0);
    return {
      count: done.length,
      hitRate: done.length ? hits / done.length * 100 : NaN,
      returnRate: totalStake ? totalPayout / totalStake * 100 : NaN,
    };
  }

  function ensureSection() {
    const recordsScreen = document.getElementById("records");
    const recordList = document.getElementById("recordList");
    if (!recordsScreen || !recordList) return null;
    let section = document.getElementById("raceCarteSection");
    if (section) return section;
    section = document.createElement("section");
    section.id = "raceCarteSection";
    section.className = "race-carte-section";
    section.innerHTML = `
      <div class="section-head small"><div><span class="section-number">RC</span><h2>レースカルテ</h2></div><span class="section-meta">AIR BET ARCHIVE</span></div>
      <div id="raceCarteSummary" class="race-carte-summary"></div>
      <div id="raceCarteList" class="race-carte-list"></div>`;
    const searchHeading = recordsScreen.querySelector(".result-search-heading");
    recordsScreen.insertBefore(section, searchHeading || null);
    return section;
  }

  function card(record, index) {
    const status = String(record?.status || "pending").toLowerCase();
    const date = record?.raceDate || record?.date || (record?.time ? String(record.time).slice(0, 10) : "日付不明");
    const venue = record?.venue || record?.venueName || record?.venueCode || "開催場";
    const raceNo = record?.raceNo || record?.race || "—";
    const ls = lines(record);
    const firstType = ls[0]?.betType || record?.betType;
    const rr = returnRate(record);
    return `<button class="race-carte-card ${hit(record) ? "hit" : settled(record) ? "miss" : ""}" type="button" data-race-carte-index="${index}">
      <span class="race-carte-top"><span><small>${esc(date)}</small><strong>${esc(venue)} ${esc(raceNo)}R</strong></span><small>${settled(record) ? (hit(record) ? "的中" : status === "refunded" ? "返還" : "不的中") : "結果待ち"}</small></span>
      <span class="race-carte-badges"><span class="race-carte-badge">${esc(BET_LABEL[firstType] || "AIR BET")}</span><span class="race-carte-badge">${ls.length}点</span><span class="race-carte-badge">${fmt(stake(record))}B</span></span>
      <span class="race-carte-outcome"><span>結果 ${esc(resultCombo(record))}</span><span>回収率 ${settled(record) ? pct(rr) : "—"}</span></span>
    </button>`;
  }

  function render() {
    const section = ensureSection();
    if (!section) return;
    const list = records();
    const s = summary(list);
    const summaryEl = document.getElementById("raceCarteSummary");
    const listEl = document.getElementById("raceCarteList");
    if (summaryEl) summaryEl.innerHTML = `
      <div class="race-carte-stat"><small>確定レース</small><strong>${s.count}</strong></div>
      <div class="race-carte-stat"><small>的中率</small><strong>${pct(s.hitRate)}</strong></div>
      <div class="race-carte-stat"><small>回収率</small><strong>${pct(s.returnRate)}</strong></div>`;
    if (listEl) listEl.innerHTML = list.length ? list.slice(0, 60).map(card).join("") : '<div class="race-carte-empty">AIR BETすると、ここに1レース1枚のカルテが自動で残ります。</div>';
  }

  function reviewText(record) {
    if (!settled(record)) return "結果確定後に、買い目・結果・配分を比較できるようになります。";
    const ls = lines(record);
    const target = resultCombo(record);
    const exact = ls.some((line) => (Array.isArray(line?.combo) ? line.combo.join("-") : "") === target);
    if (hit(record) || exact) return `結果 ${target} を買い目に含めています。次は、どの買い目にどれだけBを配分していたかまで振り返れます。`;
    return `結果は ${target}。今回は不的中でした。今後のSILVER分析では、軸外し・相手抜け・着順違い・点数効率などに分解して蓄積します。`;
  }

  function ensureOverlay() {
    let overlay = document.getElementById("raceCarteOverlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "raceCarteOverlay";
    overlay.className = "race-carte-overlay";
    overlay.hidden = true;
    overlay.innerHTML = '<div class="race-carte-sheet" role="dialog" aria-modal="true" aria-label="レースカルテ詳細"><div id="raceCarteBody"></div></div>';
    overlay.addEventListener("click", (event) => { if (event.target === overlay) closeCarte(); });
    document.body.appendChild(overlay);
    return overlay;
  }

  function openCarte(index) {
    const list = records();
    const record = list[index];
    if (!record) return;
    const overlay = ensureOverlay();
    const env = environment(record);
    const ls = lines(record);
    const entries = Array.isArray(record?.entrySnapshot) ? record.entrySnapshot : [];
    const body = overlay.querySelector("#raceCarteBody");
    const date = record?.raceDate || record?.date || "—";
    const venue = record?.venue || record?.venueName || record?.venueCode || "開催場";
    const raceNo = record?.raceNo || record?.race || "—";
    const rr = returnRate(record);
    body.innerHTML = `
      <div class="race-carte-head"><div><small>RACE CARTE / AIR BET ARCHIVE</small><h2>${esc(venue)} ${esc(raceNo)}R</h2><div>${esc(date)}</div></div><button class="race-carte-close" type="button" data-race-carte-close aria-label="閉じる">×</button></div>
      <section class="race-carte-block"><h3>このレースのAIR BET</h3><div class="race-carte-grid"><div class="race-carte-kv"><span>買い目数</span><b>${ls.length}点</b></div><div class="race-carte-kv"><span>総BET</span><b>${fmt(stake(record))}B</b></div><div class="race-carte-kv"><span>結果</span><b>${esc(resultCombo(record))}</b></div><div class="race-carte-kv"><span>回収率</span><b>${settled(record) ? pct(rr) : "—"}</b></div><div class="race-carte-kv"><span>払戻</span><b>${fmt(payout(record))}B</b></div><div class="race-carte-kv"><span>決まり手</span><b>${esc(technique(record))}</b></div></div></section>
      <section class="race-carte-block"><h3>全買い目</h3>${ls.length ? ls.map((line) => `<div class="race-carte-line"><span>${esc(BET_LABEL[line?.betType] || BET_LABEL[record?.betType] || "AIR BET")} / ${esc(modeLabel(record, line))}<br><b>${esc(Array.isArray(line?.combo) ? line.combo.join("-") : "—")}</b></span><b>${fmt(line?.stake)}B</b></div>`).join("") : '<p class="race-carte-note">買い目データが保存されていません。</p>'}</section>
      <section class="race-carte-block"><h3>選手スナップショット</h3><div class="race-carte-racers">${entries.length ? entries.map((entry) => `<div class="race-carte-racer"><span>${esc(entry?.boatNumber)}号艇</span><b>${esc(entry?.name || racerName(record, entry?.boatNumber))}</b></div>`).join("") : '<p class="race-carte-note">この記録では選手情報が保存されていません。今後のAIR BETではカルテ用スナップショットを拡張できます。</p>'}</div></section>
      <section class="race-carte-block"><h3>レース環境</h3><div class="race-carte-grid"><div class="race-carte-kv"><span>天候</span><b>${esc(env.weather)}</b></div><div class="race-carte-kv"><span>風向</span><b>${esc(env.windDirection)}</b></div><div class="race-carte-kv"><span>風速</span><b>${env.windSpeed == null ? "未保存" : `${esc(env.windSpeed)}m/s`}</b></div><div class="race-carte-kv"><span>波高</span><b>${env.wave == null ? "未保存" : `${esc(env.wave)}cm`}</b></div><div class="race-carte-kv"><span>気温</span><b>${env.air == null ? "未保存" : `${esc(env.air)}℃`}</b></div><div class="race-carte-kv"><span>水温</span><b>${env.water == null ? "未保存" : `${esc(env.water)}℃`}</b></div></div></section>
      <section class="race-carte-block"><h3>予想を振り返る</h3><div class="race-carte-review">${esc(reviewText(record))}</div><p class="race-carte-note">レースカルテv1は既存データを読み取るだけです。レース画面やAIR BETのDOMは再描画しません。</p></section>`;
    body.querySelector("[data-race-carte-close]")?.addEventListener("click", closeCarte, { once: true });
    overlay.hidden = false;
  }

  function closeCarte() {
    const overlay = document.getElementById("raceCarteOverlay");
    if (overlay) overlay.hidden = true;
  }

  function boot() {
    injectStyle();
    ensureOverlay();
    render();
    document.addEventListener("click", (event) => {
      const card = event.target.closest?.("[data-race-carte-index]");
      if (card) openCarte(Number(card.dataset.raceCarteIndex));
    });
    window.addEventListener("storage", (event) => { if (event.key === KEY) render(); });
    window.addEventListener("mamo:air-bet-recorded", render);
    window.addEventListener("mamo:result-settled", render);
    window.MAMO_RACE_CARTE = Object.freeze({ render, open: openCarte, close: closeCarte });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
