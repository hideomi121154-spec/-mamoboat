/* MAMO BOAT — unified record readability polish v2
 * Reliable late-load enhancement for async AIR result UI.
 * No interval / no MutationObserver. Uses bounded retries only.
 */
(() => {
  "use strict";
  if (window.__MAMO_RECORD_UNIFIED_LAYOUT_V2__) return;
  window.__MAMO_RECORD_UNIFIED_LAYOUT_V2__ = true;

  const KEY = "mamoboat_v40_personal";
  const esc = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const fmt = (v) => Math.round(Number(v)||0).toLocaleString("ja-JP");

  function records(){
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null") || {};
      return Array.isArray(s.records) ? s.records : [];
    } catch (_) { return []; }
  }

  function cardKey(card){
    const h = card.querySelector("header h3")?.textContent || "";
    const m = h.match(/^(.+?)\s+(\d+)R/);
    return m ? { venue:m[1].trim(), raceNo:Number(m[2]) } : null;
  }

  function matchingRecord(card){
    const key = cardKey(card);
    if (!key) return null;
    return records().filter(r => {
      const venue = String(r.venue || r.venueName || "").trim();
      const raceNo = Number(r.raceNo || r.race || 0);
      return venue === key.venue && raceNo === key.raceNo;
    }).sort((a,b)=>new Date(b.time||b.createdAt||0)-new Date(a.time||a.createdAt||0))[0] || null;
  }

  function oddsNumber(value){
    const m = String(value ?? "").match(/([0-9]+(?:\.[0-9]+)?)/);
    return m ? Number(m[1]) : NaN;
  }

  function lineOdds(line){
    const n = oddsNumber(line?.referenceOdds ?? line?.odds ?? line?.referenceOddsValue);
    return Number.isFinite(n) ? n : NaN;
  }

  function officialPayout(record){
    if (!record) return null;
    const direct = Number(record.resultPayout ?? record.officialPayout ?? record?.result?.payout);
    const combo = String(record.resultCombo || record?.result?.combo || "").trim();
    if (Number.isFinite(direct) && direct > 0) return { combo, amount:direct };
    const ps = Array.isArray(record.resultPayouts) ? record.resultPayouts : [];
    const exact = ps.find(p => String(p.combo || p.combination || "").trim() === combo && Number(p.payout)>0)
      || ps.find(p => String(p.betType || p.type || "").toLowerCase() === "trifecta" && Number(p.payout)>0)
      || ps.find(p => Number(p.payout)>0);
    return exact ? { combo:String(exact.combo || exact.combination || combo).trim(), amount:Number(exact.payout)||0 } : null;
  }

  function normalizeMode(text){
    const s = String(text || "").trim();
    if (/フォーメーション/.test(s)) return "フォーメーション";
    if (/BOX/i.test(s)) return "BOX";
    if (/通常/.test(s)) return "通常";
    return s;
  }

  function rebuildBetRows(card, record){
    const details = card.querySelector(".rx-bets");
    if (!details) return;
    details.open = true;
    const sourceLines = Array.isArray(record?.lines) ? record.lines : [];
    const existing = [...details.querySelectorAll(".rx-line")];
    const rows = sourceLines.length ? sourceLines : existing.map(row => ({
      combo: row.querySelector("strong")?.textContent?.trim() || row.querySelector(".rx-combo")?.textContent?.trim() || "—",
      stake: Number(String(row.querySelector(":scope > b")?.textContent || row.querySelector(".rx-stake")?.textContent || "0").replace(/[^0-9.-]/g,"")) || 0,
      referenceOdds: oddsNumber(row.textContent),
      mode: row.querySelector("small")?.textContent || row.querySelector(".rx-way")?.textContent || "",
      betType: "trifecta"
    }));

    const summary = details.querySelector("summary");
    if (summary) summary.innerHTML = `あなたの買い目 <b>${rows.length}点</b>`;

    let body = details.querySelector(":scope > div");
    if (!body) {
      body = document.createElement("div");
      details.appendChild(body);
    }

    const head = `<div class="rx2-table-head"><span>No</span><span>方式</span><span>買い目</span><span>金額</span><span>オッズ</span></div>`;
    const html = rows.map((line,index) => {
      const combo = Array.isArray(line?.combo) ? line.combo.join("-") : String(line?.combo || "—");
      const stake = Number(line?.stake || 0) || 0;
      const odds = lineOdds(line);
      const type = ({trifecta:"3連単",trio:"3連複",exacta:"2連単",quinella:"2連複",wide:"拡連複",win:"単勝",place:"複勝"})[String(line?.betType || record?.betType || "")] || "AIR BET";
      const mode = normalizeMode(({normal:"通常",box:"BOX",form:"フォーメーション"})[String(line?.mode || record?.betMode || "")] || line?.mode || "");
      return `<div class="rx2-line"><span class="rx2-no">${index+1}</span><span class="rx2-way"><b>${esc(type)}</b>${mode?`<em>${esc(mode)}</em>`:""}</span><strong class="rx2-combo">${esc(combo)}</strong><b class="rx2-stake">${fmt(stake)}B</b><strong class="rx2-odds">${Number.isFinite(odds)?`${odds.toFixed(1)}倍`:"—"}</strong></div>`;
    }).join("");
    body.innerHTML = head + html;

    const odds = rows.map(lineOdds).filter(Number.isFinite);
    const payout = officialPayout(record);
    let stats = card.querySelector(".rx2-stats");
    if (!stats) {
      stats = document.createElement("div");
      stats.className = "rx2-stats";
      details.insertAdjacentElement("afterend", stats);
    }
    const min = odds.length ? Math.min(...odds) : NaN;
    const max = odds.length ? Math.max(...odds) : NaN;
    const resultCombo = String(record?.resultCombo || record?.result?.combo || "—").trim() || "—";
    stats.innerHTML = `<div><span>参加時参考オッズ</span><strong>${Number.isFinite(min)&&Number.isFinite(max)?`${min.toFixed(1)}〜${max.toFixed(1)}倍`:"—"}</strong><small>購入した${rows.length}点のオッズ範囲</small></div><div class="official"><span>公式払戻（3連単）</span><b>${esc(payout?.combo || resultCombo)}</b><strong>${payout?.amount?`${fmt(payout.amount)}円`:"—"}</strong></div>`;

    card.querySelectorAll(":scope > .rx-financial-restore, :scope > .rx-unified-stats, :scope > .rx-details").forEach(el => { if (el !== stats) el.hidden = true; });
  }

  function enhanceCard(card){
    const record = matchingRecord(card);
    if (!record) return;
    card.classList.add("rx-readable-v2");
    rebuildBetRows(card, record);
    const actions = card.querySelector(".rx-actions");
    if (actions) actions.querySelectorAll("[data-rx-carte]").forEach(btn => { btn.textContent = "▤ レースカルテで分析"; });
  }

  function removeDuplicateCarteBetTab(){
    const overlay = document.getElementById("mamoRaceCarteOverlay");
    if (!overlay || overlay.hidden) return;
    const tabs = [...overlay.querySelectorAll(".mamo-carte-tab")];
    const bet = tabs.find(t => /買い目/.test(t.textContent || ""));
    if (!bet) return;
    const wasActive = bet.classList.contains("active");
    const id = bet.dataset.carteTab;
    bet.hidden = true;
    if (id) {
      const panels = [...overlay.querySelectorAll(".mamo-carte-panel")];
      panels.forEach(p => { if (p.dataset.cartePanel === id || p.id === id) p.hidden = true; });
    }
    if (wasActive) {
      const carte = tabs.find(t => /カルテ/.test(t.textContent || "") && !t.hidden);
      carte?.click();
    }
  }

  function enhanceAll(){
    style();
    document.querySelectorAll("#records .rx-card.rx-unified").forEach(enhanceCard);
  }

  function boundedRefresh(){
    [0,100,300,700,1500,3000,5000].forEach(ms => setTimeout(enhanceAll, ms));
  }

  function boundedCarteFix(){
    [0,50,120,300].forEach(ms => setTimeout(removeDuplicateCarteBetTab, ms));
  }

  function style(){
    if (document.getElementById("mamoRecordUnifiedReadableStyleV2")) return;
    const s = document.createElement("style");
    s.id = "mamoRecordUnifiedReadableStyleV2";
    s.textContent = `
      #records .rx-card.rx-readable-v2{padding:16px!important;border-radius:15px!important}
      #records .rx-card.rx-readable-v2 header h3{font-size:21px!important}
      #records .rx-result-row span,#records .rx-summary-money span{font-size:10px!important}
      #records .rx-result-row strong{font-size:28px!important}
      #records .rx-summary-money{gap:9px!important;margin:12px 0!important}
      #records .rx-summary-money span{padding:8px 10px!important}
      #records .rx-bets{margin-top:12px!important;border:1.5px solid #d2e0e6!important;border-radius:13px!important;padding:0 12px 12px!important;background:#fff!important}
      #records .rx-bets>summary{padding:14px 0 12px!important;color:#082b4a!important;font-size:16px!important;font-weight:1000!important;list-style:none!important}
      #records .rx-bets>summary::-webkit-details-marker{display:none}
      #records .rx-bets>summary:before{content:"▼";margin-right:6px;font-size:9px}
      #records .rx2-table-head,#records .rx2-line{display:grid;grid-template-columns:34px minmax(86px,.9fr) minmax(96px,1.1fr) 78px 86px;gap:8px;align-items:center}
      #records .rx2-table-head{padding:9px 7px;background:#f2f6f8;border-radius:8px;color:#657985;font-size:10px;font-weight:900}
      #records .rx2-line{min-height:64px;padding:9px 7px;border-bottom:1px solid #e1e8ec}
      #records .rx2-line:last-child{border-bottom:0}
      #records .rx2-no{width:29px;height:29px;display:grid;place-items:center;border-radius:7px;background:#eef3f5;color:#082b4a;font-size:11px;font-weight:1000}
      #records .rx2-way{display:flex;align-items:center;gap:5px;flex-wrap:wrap;color:#082b4a}
      #records .rx2-way b{font-size:11px}.rx2-way em{padding:3px 6px;border-radius:6px;background:#fff0f2;color:#d71926;font-style:normal;font-size:9px;font-weight:1000}
      #records .rx2-combo{font-size:20px;color:#082b4a;letter-spacing:.01em}
      #records .rx2-stake{font-size:17px;color:#082b4a;text-align:right}
      #records .rx2-odds{font-size:16px;color:#0969b9;text-align:right;white-space:nowrap}
      #records .rx2-stats{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:11px 0}
      #records .rx2-stats>div{padding:13px;border-radius:10px;background:#f4f7f8;border:1px solid #e3eaed}
      #records .rx2-stats>div.official{background:#fff8ee;border-color:#efd6ad}
      #records .rx2-stats span,#records .rx2-stats small{display:block;color:#6f828c;font-size:10px;font-weight:850}
      #records .rx2-stats b{display:block;margin-top:5px;color:#617784;font-size:12px}
      #records .rx2-stats strong{display:block;margin-top:3px;color:#082b4a;font-size:22px;font-weight:1000}
      #records .rx2-stats .official strong{color:#b45a00}
      #records .rx-actions a,#records .rx-actions button{min-height:48px!important;font-size:12px!important;font-weight:1000!important}
      #records .rx-actions button[data-rx-carte]{background:#082b4a!important;color:#fff!important;border-color:#082b4a!important}
      .mamo-carte-tab[hidden]{display:none!important}
      @media(max-width:520px){
        #records .rx-card.rx-readable-v2{padding:13px!important}
        #records .rx2-table-head{display:none}
        #records .rx2-line{grid-template-columns:29px 76px minmax(84px,1fr) 62px 72px;gap:6px;padding:11px 2px}
        #records .rx2-combo{font-size:19px}.rx2-stake{font-size:15px!important}.rx2-odds{font-size:15px!important}.rx2-way b{font-size:10px!important}.rx2-way em{font-size:8px;padding:2px 4px}
      }
      @media(max-width:390px){
        #records .rx2-line{grid-template-columns:27px 66px minmax(76px,1fr) 55px 63px;gap:4px}
        #records .rx2-no{width:25px;height:25px;font-size:10px}
        #records .rx2-combo{font-size:17px}.rx2-stake,.rx2-odds{font-size:13px!important}
        #records .rx2-stats{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(s);
  }

  document.addEventListener("click", (event) => {
    if (event.target?.closest?.("#nav-records,[data-rx-filter],[data-rec]")) boundedRefresh();
    if (event.target?.closest?.("[data-rx-carte],.mamo-carte-btn")) boundedCarteFix();
  }, false);
  window.addEventListener("pageshow", boundedRefresh);
  window.addEventListener("storage", e => { if (e.key === KEY) boundedRefresh(); });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boundedRefresh, {once:true});
  else boundedRefresh();

  window.MAMO_RECORD_UNIFIED_LAYOUT = Object.freeze({ refresh:boundedRefresh, fixCarte:boundedCarteFix });
})();
