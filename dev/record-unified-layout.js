/* MAMO BOAT — unified record readability polish v1
 * Keeps all bet/odds/payout information in the record card and removes the
 * duplicated "買い目" tab from Race Carte. No polling / no MutationObserver.
 */
(() => {
  "use strict";
  if (window.__MAMO_RECORD_UNIFIED_LAYOUT_V1__) return;
  window.__MAMO_RECORD_UNIFIED_LAYOUT_V1__ = true;

  const KEY = "mamoboat_v40_personal";

  const esc = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const fmt = (v) => Math.round(Number(v)||0).toLocaleString("ja-JP");

  function stateRecords(){
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
    const candidates = stateRecords().filter(r => {
      const venue = String(r.venue || r.venueName || "").trim();
      const raceNo = Number(r.raceNo || r.race || 0);
      return venue === key.venue && raceNo === key.raceNo;
    });
    if (!candidates.length) return null;
    return candidates.sort((a,b)=>new Date(b.time||b.createdAt||0)-new Date(a.time||a.createdAt||0))[0];
  }

  function oddsNumber(value){
    const m = String(value ?? "").match(/([0-9]+(?:\.[0-9]+)?)/);
    return m ? Number(m[1]) : NaN;
  }

  function officialPayout(record){
    if (!record) return null;
    const direct = Number(record.resultPayout || record?.result?.payout || 0);
    if (direct > 0) return { combo:String(record.resultCombo || record?.result?.combo || "").trim(), amount:direct };
    const ps = Array.isArray(record.resultPayouts) ? record.resultPayouts : [];
    const tri = ps.find(p => String(p.betType || "").toLowerCase() === "trifecta") || ps[0];
    if (!tri) return null;
    const amount = Number(tri.payout || tri.amount || 0);
    if (!(amount > 0)) return null;
    return { combo:String(tri.combo || tri.combination || record.resultCombo || "").trim(), amount };
  }

  function enhanceLines(card){
    const details = card.querySelector(".rx-bets");
    if (!details) return;
    details.open = true;
    const rows = [...details.querySelectorAll(".rx-line")];
    const summary = details.querySelector("summary");
    if (summary) summary.innerHTML = `あなたの買い目 <b>${rows.length}点</b>`;

    let head = details.querySelector(".rx-table-head");
    if (!head) {
      head = document.createElement("div");
      head.className = "rx-table-head";
      head.innerHTML = "<span>No</span><span>方式</span><span>買い目</span><span>購入金額</span><span>参加時オッズ</span>";
      const body = details.querySelector(":scope > div");
      if (body) body.prepend(head);
    }

    rows.forEach((row,index) => {
      if (row.dataset.mamoReadable === "1") return;
      const info = row.querySelector(":scope > div");
      const stake = row.querySelector(":scope > b")?.textContent?.trim() || "—";
      const small = info?.querySelector("small")?.textContent?.trim() || "AIR BET";
      const combo = info?.querySelector("strong")?.textContent?.trim() || "—";
      const oddsText = info?.querySelector("span")?.textContent || "";
      const odds = oddsNumber(oddsText);
      const parts = small.split("/").map(s=>s.trim()).filter(Boolean);
      const type = parts[0] || "AIR BET";
      const mode = parts[1] || "";
      row.innerHTML = `<span class="rx-no">${index+1}</span><span class="rx-way"><b>${esc(type)}</b>${mode?`<em>${esc(mode)}</em>`:""}</span><strong class="rx-combo">${esc(combo)}</strong><b class="rx-stake">${esc(stake)}</b><strong class="rx-odds">${Number.isFinite(odds)?`${odds.toFixed(1)}倍`:"—"}</strong>`;
      row.dataset.mamoReadable = "1";
    });

    const odds = rows.map(r => oddsNumber(r.querySelector(".rx-odds")?.textContent)).filter(Number.isFinite);
    const record = matchingRecord(card);
    const payout = officialPayout(record);

    let stats = card.querySelector(".rx-unified-stats");
    if (!stats) {
      stats = document.createElement("div");
      stats.className = "rx-unified-stats";
      details.insertAdjacentElement("afterend", stats);
    }
    const min = odds.length ? Math.min(...odds) : NaN;
    const max = odds.length ? Math.max(...odds) : NaN;
    stats.innerHTML = `
      <div><span>参加時参考オッズ</span><strong>${Number.isFinite(min)&&Number.isFinite(max)?`${min.toFixed(1)}〜${max.toFixed(1)}倍`:"—"}</strong><small>購入した${rows.length}点のオッズ範囲</small></div>
      <div><span>公式払戻（3連単）</span><b>${esc(payout?.combo || record?.resultCombo || "—")}</b><strong>${payout?`${fmt(payout.amount)}円`:"—"}</strong></div>`;

    const oldDetails = card.querySelector(".rx-details");
    if (oldDetails) oldDetails.hidden = true;
  }

  function enhanceCard(card){
    if (!card) return;
    card.classList.add("rx-readable-v1");
    enhanceLines(card);
    const actions = card.querySelector(".rx-actions");
    if (actions) {
      [...actions.querySelectorAll("button")].forEach(btn => {
        if (btn.matches("[data-rx-carte]")) btn.textContent = "▤ レースカルテで分析";
      });
    }
  }

  function removeDuplicateCarteBetTab(){
    const overlay = document.getElementById("mamoRaceCarteOverlay");
    if (!overlay || overlay.hidden) return;
    const tabs = [...overlay.querySelectorAll(".mamo-carte-tab")];
    const betTab = tabs.find(t => /買い目/.test(t.textContent || ""));
    if (!betTab) return;
    const wasActive = betTab.classList.contains("active");
    betTab.hidden = true;
    const id = betTab.dataset.carteTab;
    if (id) {
      const panel = overlay.querySelector(`[data-carte-panel="${CSS.escape(id)}"],#${CSS.escape(id)}`);
      if (panel) panel.hidden = true;
    }
    if (wasActive) {
      const carte = tabs.find(t => /カルテ/.test(t.textContent || "") && !t.hidden);
      carte?.click();
    }
  }

  function enhanceAll(){
    document.querySelectorAll("#records .rx-card.rx-unified").forEach(enhanceCard);
  }

  function style(){
    if (document.getElementById("mamoRecordUnifiedReadableStyleV1")) return;
    const s = document.createElement("style");
    s.id = "mamoRecordUnifiedReadableStyleV1";
    s.textContent = `
      #records .rx-card.rx-readable-v1{padding:16px!important;border-radius:15px!important}
      #records .rx-card.rx-readable-v1 header h3{font-size:20px!important}
      #records .rx-result-row span,#records .rx-summary-money span{font-size:10px!important}
      #records .rx-result-row strong{font-size:27px!important}
      #records .rx-summary-money{gap:9px!important;margin:12px 0!important}
      #records .rx-summary-money span{padding:8px 10px!important}
      #records .rx-bets{margin-top:12px!important;border:1.5px solid #d2e0e6!important;border-radius:13px!important;padding:0 12px 12px!important;background:#fff!important}
      #records .rx-bets>summary{padding:14px 0 12px!important;color:#082b4a!important;font-size:15px!important;font-weight:1000!important;list-style:none!important}
      #records .rx-bets>summary::-webkit-details-marker{display:none}
      #records .rx-bets>summary:before{content:"▼";margin-right:6px;font-size:9px}
      #records .rx-table-head,#records .rx-line{display:grid!important;grid-template-columns:34px minmax(78px,.9fr) minmax(86px,1.1fr) 82px 92px!important;gap:8px!important;align-items:center!important}
      #records .rx-table-head{padding:9px 7px!important;background:#f2f6f8!important;border-radius:8px!important;color:#657985!important;font-size:9px!important;font-weight:900!important}
      #records .rx-line{min-height:62px!important;padding:9px 7px!important;border-bottom:1px solid #e1e8ec!important}
      #records .rx-line:last-child{border-bottom:0!important}
      #records .rx-no{width:28px;height:28px;display:grid;place-items:center;border-radius:7px;background:#eef3f5;color:#082b4a;font-size:11px;font-weight:1000}
      #records .rx-way{display:flex;align-items:center;gap:5px;flex-wrap:wrap;color:#082b4a}
      #records .rx-way b{font-size:11px!important}
      #records .rx-way em{padding:3px 6px;border-radius:6px;background:#fff0f2;color:#d71926;font-style:normal;font-size:9px;font-weight:1000}
      #records .rx-combo{font-size:19px!important;letter-spacing:.01em;color:#082b4a!important}
      #records .rx-stake{font-size:16px!important;color:#082b4a!important;text-align:right}
      #records .rx-odds{font-size:15px!important;color:#0969b9!important;text-align:right;white-space:nowrap}
      #records .rx-unified-stats{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:10px 0}
      #records .rx-unified-stats>div{padding:12px;border-radius:10px;background:#f4f7f8}
      #records .rx-unified-stats span,#records .rx-unified-stats small{display:block;color:#6f828c;font-size:9px;font-weight:850}
      #records .rx-unified-stats b{display:block;margin-top:5px;color:#617784;font-size:11px}
      #records .rx-unified-stats strong{display:block;margin-top:3px;color:#082b4a;font-size:21px;font-weight:1000}
      #records .rx-actions a,#records .rx-actions button{min-height:48px!important;font-size:12px!important;font-weight:1000!important}
      #records .rx-actions button[data-rx-carte]{background:#082b4a!important;color:#fff!important;border-color:#082b4a!important}
      .mamo-carte-tab[hidden]{display:none!important}
      @media(max-width:520px){
        #records .rx-card.rx-readable-v1{padding:13px!important}
        #records .rx-table-head{display:none!important}
        #records .rx-line{grid-template-columns:30px 74px minmax(84px,1fr) 62px 70px!important;gap:6px!important;padding:10px 2px!important}
        #records .rx-combo{font-size:18px!important}
        #records .rx-stake{font-size:15px!important}
        #records .rx-odds{font-size:14px!important}
        #records .rx-way b{font-size:10px!important}
        #records .rx-way em{font-size:8px!important;padding:2px 4px}
        #records .rx-unified-stats strong{font-size:18px!important}
      }
      @media(max-width:390px){
        #records .rx-line{grid-template-columns:27px 64px minmax(76px,1fr) 56px 62px!important;gap:4px!important}
        #records .rx-no{width:25px;height:25px;font-size:10px}
        #records .rx-combo{font-size:16px!important}
        #records .rx-stake,#records .rx-odds{font-size:12px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function boot(){
    style();
    enhanceAll();
    document.addEventListener("click", (e) => {
      if (e.target?.closest?.("#nav-records,[data-rx-filter]")) setTimeout(enhanceAll, 0);
      if (e.target?.closest?.("[data-rx-carte]")) {
        setTimeout(removeDuplicateCarteBetTab, 0);
        setTimeout(removeDuplicateCarteBetTab, 80);
      }
    }, false);
    window.addEventListener("pageshow", () => {
      if (document.body?.dataset?.screen === "records") enhanceAll();
    });
    window.addEventListener("storage", e => { if (e.key === KEY) enhanceAll(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();
})();
