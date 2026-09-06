/* MAMO BOAT — Race Carte v2
 * Adds a per-record "レースカルテ" button to the existing records list.
 * Read-only: does not touch race navigation, AIR BET rendering, or settlement.
 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_CARTE_V2__) return;
  window.__MAMO_RACE_CARTE_V2__ = true;

  const KEY = "mamoboat_v40_personal";
  const VENUES = {
    "01":"桐生","02":"戸田","03":"江戸川","04":"平和島","05":"多摩川","06":"浜名湖",
    "07":"蒲郡","08":"常滑","09":"津","10":"三国","11":"びわこ","12":"住之江",
    "13":"尼崎","14":"鳴門","15":"丸亀","16":"児島","17":"宮島","18":"徳山",
    "19":"下関","20":"若松","21":"芦屋","22":"福岡","23":"唐津","24":"大村"
  };
  const BET_LABEL = {
    trifecta:"3連単",trio:"3連複",exacta:"2連単",quinella:"2連複",
    wide:"拡連複",win:"単勝",place:"複勝"
  };
  const MODE_LABEL = { normal:"通常", box:"BOX", form:"フォーメーション" };

  const esc = (value) => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#39;");
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
    return list.filter(Boolean).slice().sort((a,b) => {
      const aa = String(a.time || a.createdAt || a.raceDate || a.date || "");
      const bb = String(b.time || b.createdAt || b.raceDate || b.date || "");
      return bb.localeCompare(aa);
    });
  }

  function lines(record) {
    if (Array.isArray(record?.lines) && record.lines.length) return record.lines;
    if (Array.isArray(record?.combo)) {
      return [{ combo:record.combo, stake:stake(record), betType:record.betType, mode:record.betMode }];
    }
    return [];
  }

  function stake(record) {
    const ls = Array.isArray(record?.lines) ? record.lines : [];
    return num(record?.stake ?? record?.total) || ls.reduce((sum,line) => sum + num(line?.stake), 0);
  }
  function payout(record) { return num(record?.payoutC ?? record?.payout ?? record?.refundC); }
  function returnRate(record) { const s = stake(record); return s > 0 ? payout(record) / s * 100 : NaN; }
  function settled(record) {
    const status = String(record?.status || "").toLowerCase();
    return record?.settled === true || ["hit","miss","refunded","won","lost"].includes(status);
  }
  function hit(record) { return ["hit","won"].includes(String(record?.status || "").toLowerCase()); }
  function venueName(record) {
    const raw = String(record?.venue || record?.venueName || "").trim();
    if (raw) return raw;
    return VENUES[String(record?.venueCode || "").padStart(2,"0")] || String(record?.venueCode || "開催場");
  }
  function raceNo(record) { return String(record?.raceNo ?? record?.race ?? "—").replace(/R$/i, ""); }
  function resultCombo(record) {
    const direct = String(record?.resultCombo || record?.result?.combo || "").match(/\d+/g);
    if (direct?.length) return direct.slice(0,3).join("-");
    const order = Array.isArray(record?.resultOrder) ? record.resultOrder : Array.isArray(record?.finishOrder) ? record.finishOrder : [];
    const boats = order.map(item => Number(item?.boatNumber ?? item)).filter(n => n >= 1 && n <= 6);
    return boats.length ? boats.slice(0,3).join("-") : "—";
  }
  function technique(record) {
    return record?.kimarite || record?.winningMethod || record?.resultTechnique || record?.result?.kimarite || record?.result?.winningMethod || "未保存";
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
  function racerName(record, boat) {
    const entries = Array.isArray(record?.entrySnapshot) ? record.entrySnapshot : [];
    const found = entries.find(entry => Number(entry?.boatNumber) === Number(boat));
    return found?.name || `${boat}号艇`;
  }
  function dateLabel(record) {
    const value = record?.raceDate || record?.date || record?.time || record?.createdAt;
    if (!value) return "日付不明";
    try {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        return new Intl.DateTimeFormat("ja-JP", { timeZone:"Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" }).format(d);
      }
    } catch (_) {}
    return String(value).slice(0,16);
  }

  function reviewText(record) {
    if (!settled(record)) return "結果確定後に、買い目と実結果を比較して振り返れます。";
    const target = resultCombo(record);
    const ls = lines(record);
    const exact = ls.some(line => (Array.isArray(line?.combo) ? line.combo.join("-") : "") === target);
    if (hit(record) || exact) return `結果 ${target} を買い目に含めています。買い目ごとの配分と回収率も確認できます。`;
    return `結果は ${target}。今回は不的中でした。今後のSILVER分析では、軸外し・相手抜け・着順違い・点数効率まで分解して蓄積します。`;
  }

  function injectStyle() {
    if (document.getElementById("mamoRaceCarteStyleV2")) return;
    const style = document.createElement("style");
    style.id = "mamoRaceCarteStyleV2";
    style.textContent = `
      .mamo-carte-action{display:flex;justify-content:flex-end;margin-top:10px}
      .mamo-carte-btn{appearance:none;min-height:42px;padding:0 14px;border:1.5px solid #0a3554;border-radius:10px;background:#fff;color:#0a3554;font:900 12px/1 system-ui,-apple-system,sans-serif;display:inline-flex;align-items:center;gap:7px;box-shadow:0 2px 0 rgba(8,43,74,.08)}
      .mamo-carte-btn::before{content:"▤";font-size:15px}.mamo-carte-btn:active{transform:translateY(1px)}
      .mamo-carte-overlay[hidden]{display:none!important}.mamo-carte-overlay{position:fixed;inset:0;z-index:14000;display:flex;align-items:flex-end;justify-content:center;background:rgba(3,18,30,.66);padding-top:env(safe-area-inset-top)}
      .mamo-carte-sheet{width:min(100%,620px);max-height:88dvh;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:#fff;border-radius:20px 20px 0 0;padding:0 14px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -18px 50px rgba(0,0,0,.24)}
      .mamo-carte-head{position:sticky;top:0;z-index:3;margin:0 -14px 0;padding:14px 14px 12px;background:#082b4a;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:12px}.mamo-carte-head small{display:block;color:#b9d3df;font-size:8px;font-weight:900;letter-spacing:.12em}.mamo-carte-head strong{font-size:16px}.mamo-carte-close{width:36px;height:36px;border:0;border-radius:50%;background:#fff;color:#082b4a;font-size:20px;font-weight:900}
      .mamo-carte-hero{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:14px 2px 10px}.mamo-carte-hero h2{margin:0;color:#082b4a;font-size:22px}.mamo-carte-hero p{margin:3px 0 0;color:#71838c;font-size:9px}.mamo-carte-status{padding:7px 10px;border-radius:9px;background:#eef4f7;color:#082b4a;font-size:11px;font-weight:1000}.mamo-carte-status.hit{background:#fff2ca;color:#9b6b00}.mamo-carte-status.miss{background:#fff0f2;color:#b4232d}
      .mamo-carte-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin:0 0 10px}.mamo-carte-tab{min-height:38px;border:1px solid #d5e1e7;border-radius:9px;background:#f6f9fb;color:#415f70;font-size:9px;font-weight:1000}.mamo-carte-tab.active{background:#082b4a;color:#fff;border-color:#082b4a}
      .mamo-carte-panel[hidden]{display:none!important}.mamo-carte-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.mamo-carte-kv{padding:10px 9px;border:1px solid #e0e8ec;border-radius:10px;background:#f8fbfc}.mamo-carte-kv span{display:block;color:#768891;font-size:8px;font-weight:900}.mamo-carte-kv b{display:block;margin-top:4px;color:#0b3150;font-size:14px;overflow-wrap:anywhere}.mamo-carte-kv.good b{color:#11823b}
      .mamo-carte-block{margin-top:10px;padding:11px;border:1px solid #dce5e9;border-radius:12px;background:#fff}.mamo-carte-block h3{margin:0 0 7px;color:#082b4a;font-size:12px}.mamo-carte-line{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid #e6ecef;color:#17394e;font-size:10px}.mamo-carte-line:last-child{border-bottom:0}.mamo-carte-line b{color:#082b4a}.mamo-carte-note{margin-top:10px;padding:10px 11px;border-left:4px solid #d3a331;border-radius:9px;background:#fffaf0;color:#17394e;font-size:10px;line-height:1.65}
      .mamo-carte-racers{display:grid;gap:6px}.mamo-carte-racer{display:grid;grid-template-columns:34px 1fr auto;gap:8px;align-items:center;padding:8px;border-radius:9px;background:#f8fbfc}.mamo-carte-racer i{width:30px;height:30px;display:grid;place-items:center;border-radius:50%;background:#082b4a;color:#fff;font-style:normal;font-weight:1000}.mamo-carte-racer b{font-size:10px;color:#14384e}.mamo-carte-racer span{font-size:8px;color:#7c8d95}
      .mamo-carte-foot{display:flex;justify-content:center;margin-top:12px}.mamo-carte-foot button{min-width:150px;min-height:44px;border:1px solid #cfdce2;border-radius:10px;background:#fff;color:#082b4a;font-weight:1000}
      @media(max-width:390px){.mamo-carte-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.mamo-carte-tabs{gap:4px}.mamo-carte-tab{font-size:8px}.mamo-carte-btn{min-height:40px;padding:0 12px}}
    `;
    document.head.appendChild(style);
  }

  function ensureOverlay() {
    let overlay = document.getElementById("mamoRaceCarteOverlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "mamoRaceCarteOverlay";
    overlay.className = "mamo-carte-overlay";
    overlay.hidden = true;
    overlay.innerHTML = '<section class="mamo-carte-sheet" role="dialog" aria-modal="true" aria-label="レースカルテ"><div id="mamoRaceCarteBody"></div></section>';
    overlay.addEventListener("click", event => { if (event.target === overlay) closeCarte(); });
    document.body.appendChild(overlay);
    return overlay;
  }

  function tabButton(id,label,active=false) {
    return `<button type="button" class="mamo-carte-tab${active?" active":""}" data-carte-tab="${id}">${label}</button>`;
  }

  function lineHtml(record) {
    const ls = lines(record);
    if (!ls.length) return '<div class="mamo-carte-line"><span>買い目記録なし</span><b>—</b><span>—</span></div>';
    return ls.map(line => {
      const combo = Array.isArray(line?.combo) ? line.combo.join("-") : "—";
      const type = BET_LABEL[line?.betType] || BET_LABEL[record?.betType] || "AIR BET";
      const mode = MODE_LABEL[line?.mode || record?.betMode] || "—";
      return `<div class="mamo-carte-line"><span>${esc(type)} ${esc(combo)}</span><b>${fmt(line?.stake)}B</b><span>${esc(mode)}</span></div>`;
    }).join("");
  }

  function racersHtml(record) {
    const entries = Array.isArray(record?.entrySnapshot) ? record.entrySnapshot : [];
    if (!entries.length) return '<div class="mamo-carte-note">AIR BET時点の選手スナップショットは、この過去記録には保存されていません。</div>';
    return `<div class="mamo-carte-racers">${entries.slice(0,6).map(entry => `<div class="mamo-carte-racer"><i>${esc(entry.boatNumber)}</i><b>${esc(entry.name || `${entry.boatNumber}号艇`)}</b><span>${esc(entry.racerNumber || "")}</span></div>`).join("")}</div>`;
  }

  function openCarte(index) {
    const list = records();
    const record = list[index];
    if (!record) return;
    const overlay = ensureOverlay();
    const env = environment(record);
    const body = overlay.querySelector("#mamoRaceCarteBody");
    const statusText = settled(record) ? (hit(record) ? "B的中" : String(record?.status).toLowerCase() === "refunded" ? "返還" : "不的中") : "結果待ち";
    const statusClass = hit(record) ? "hit" : settled(record) ? "miss" : "";
    const rr = returnRate(record);
    const result = resultCombo(record);

    body.innerHTML = `
      <header class="mamo-carte-head"><div><small>MAMO BOAT / RACE CARTE</small><strong>レースカルテ</strong></div><button class="mamo-carte-close" type="button" aria-label="閉じる">×</button></header>
      <div class="mamo-carte-hero"><div><h2>${esc(venueName(record))} ${esc(raceNo(record))}R</h2><p>${esc(dateLabel(record))}</p></div><span class="mamo-carte-status ${statusClass}">${esc(statusText)}</span></div>
      <nav class="mamo-carte-tabs" aria-label="カルテ表示切替">${tabButton("summary","サマリー",true)}${tabButton("bets","買い目")}${tabButton("racers","出走表")}${tabButton("env","環境情報")}</nav>
      <section class="mamo-carte-panel" data-carte-panel="summary">
        <div class="mamo-carte-grid">
          <div class="mamo-carte-kv"><span>実着順</span><b>${esc(result)}</b></div>
          <div class="mamo-carte-kv"><span>決まり手</span><b>${esc(technique(record))}</b></div>
          <div class="mamo-carte-kv"><span>参加額</span><b>${fmt(stake(record))}B</b></div>
          <div class="mamo-carte-kv good"><span>払戻</span><b>${settled(record)?`${fmt(payout(record))}B`:"—"}</b></div>
          <div class="mamo-carte-kv good"><span>回収率</span><b>${settled(record)?pct(rr):"—"}</b></div>
          <div class="mamo-carte-kv"><span>買い目数</span><b>${lines(record).length}点</b></div>
        </div>
        <div class="mamo-carte-note"><b>このレースの振り返り</b><br>${esc(reviewText(record))}</div>
      </section>
      <section class="mamo-carte-panel" data-carte-panel="bets" hidden><div class="mamo-carte-block"><h3>あなたのAIR BET</h3>${lineHtml(record)}</div></section>
      <section class="mamo-carte-panel" data-carte-panel="racers" hidden><div class="mamo-carte-block"><h3>AIR BET時点の選手情報</h3>${racersHtml(record)}</div></section>
      <section class="mamo-carte-panel" data-carte-panel="env" hidden>
        <div class="mamo-carte-grid">
          <div class="mamo-carte-kv"><span>天候</span><b>${esc(env.weather)}</b></div>
          <div class="mamo-carte-kv"><span>風向</span><b>${esc(env.windDirection)}</b></div>
          <div class="mamo-carte-kv"><span>風速</span><b>${env.windSpeed==null?"未保存":`${esc(env.windSpeed)}m`}</b></div>
          <div class="mamo-carte-kv"><span>波高</span><b>${env.wave==null?"未保存":`${esc(env.wave)}cm`}</b></div>
          <div class="mamo-carte-kv"><span>気温</span><b>${env.air==null?"未保存":`${esc(env.air)}℃`}</b></div>
          <div class="mamo-carte-kv"><span>水温</span><b>${env.water==null?"未保存":`${esc(env.water)}℃`}</b></div>
        </div>
      </section>
      <div class="mamo-carte-foot"><button type="button" data-carte-close>閉じる</button></div>`;

    body.querySelector(".mamo-carte-close")?.addEventListener("click", closeCarte);
    body.querySelector("[data-carte-close]")?.addEventListener("click", closeCarte);
    body.querySelectorAll("[data-carte-tab]").forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.carteTab;
      body.querySelectorAll("[data-carte-tab]").forEach(node => node.classList.toggle("active", node === button));
      body.querySelectorAll("[data-carte-panel]").forEach(panel => { panel.hidden = panel.dataset.cartePanel !== id; });
    }));
    overlay.hidden = false;
  }

  function closeCarte() {
    const overlay = document.getElementById("mamoRaceCarteOverlay");
    if (overlay) overlay.hidden = true;
  }

  function recordMatch(cardText, list, used) {
    const text = String(cardText || "").replace(/\s+/g, " ");
    for (let index = 0; index < list.length; index += 1) {
      if (used.has(index)) continue;
      const record = list[index];
      const venue = venueName(record);
      const race = `${raceNo(record)}R`;
      if (text.includes(venue) && text.includes(race)) return index;
    }
    return -1;
  }

  function injectButtons() {
    const recordList = document.getElementById("recordList");
    if (!recordList) return;
    const list = records();
    const used = new Set();
    const cards = Array.from(recordList.children).filter(node => node.nodeType === 1);
    cards.forEach((card, visualIndex) => {
      const existing = card.querySelector?.(".mamo-carte-action");
      if (existing) return;
      let index = recordMatch(card.textContent, list, used);
      if (index < 0 && visualIndex < list.length) index = visualIndex;
      if (index < 0 || !list[index]) return;
      used.add(index);
      const action = document.createElement("div");
      action.className = "mamo-carte-action";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "mamo-carte-btn";
      button.textContent = "レースカルテ";
      button.dataset.raceCarteIndex = String(index);
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openCarte(Number(button.dataset.raceCarteIndex));
      });
      action.appendChild(button);
      card.appendChild(action);
    });
  }

  function refreshSoon() {
    injectButtons();
    setTimeout(injectButtons, 0);
    setTimeout(injectButtons, 120);
  }

  function boot() {
    injectStyle();
    ensureOverlay();
    refreshSoon();
    document.addEventListener("click", event => {
      if (event.target?.closest?.("#nav-records,[data-rec]")) setTimeout(refreshSoon, 0);
    }, { passive:true });
    window.addEventListener("storage", event => { if (event.key === KEY) refreshSoon(); });
  }

  window.MAMO_RACE_CARTE = Object.freeze({ refresh:refreshSoon, open:openCarte, close:closeCarte });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeCarte(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
