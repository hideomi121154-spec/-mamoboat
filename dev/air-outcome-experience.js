/* MAMO BOAT AIR Outcome Experience v3 — one race, one unified record card. */
(() => {
  "use strict";
  if (window.__MAMO_AIR_OUTCOME_V3__) return;
  window.__MAMO_AIR_OUTCOME_V3__ = true;

  const KEY = "mamoboat_v40_personal";
  let unifiedFilter = "all";

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; } };
  const esc = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const fmt = (v) => Math.round(Number(v)||0).toLocaleString("ja-JP");
  const bfmt = (v) => `${fmt(v)}B`;
  const records = () => Array.isArray(read().records) ? read().records : [];
  const time = r => new Date(r.time || r.createdAt || 0).getTime();
  const stake = r => Number(r.stake ?? r.total ?? r.intendedYen ?? 0) || (Array.isArray(r.lines) ? r.lines.reduce((s,l)=>s+(Number(l?.stake)||0),0) : 0);
  const payout = r => Number(r.payoutC ?? r.payout ?? 0) || 0;
  const settled = r => !!r.settled && String(r.status || "") !== "pending";
  const fmtDate = r => { try { return new Date(r.time || r.createdAt).toLocaleString("ja-JP",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}); } catch (_) { return ""; } };
  const sortedRecords = () => [...records()].sort((a,b)=>time(b)-time(a));

  function todayRecords(){
    const now = new Date();
    const start = new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
    return records().filter(r => time(r) >= start);
  }

  function resultLabel(r){
    if(!settled(r)) return {tone:"pending",eyebrow:"RESULT WAIT",title:"結果待ち",status:"結果待ち"};
    if(r.status === "hit") return {tone:"hit",eyebrow:"AIR HIT",title:"的中",status:"的中"};
    if(r.status === "refunded") return {tone:"refund",eyebrow:"REFUND",title:"返還",status:"返還"};
    return {tone:"miss",eyebrow:"RESULT",title:"不的中",status:"不的中"};
  }

  function resultCombo(r){
    return String(r.resultCombo || r?.result?.combo || "").trim() || (settled(r) ? "確定" : "—");
  }

  function payoutLine(r){
    if(!settled(r)) return "公式払戻の確定待ち";
    if(r.status === "hit") return `AIR払戻 +${bfmt(payout(r))}`;
    if(r.status === "refunded") return `返還 +${bfmt(payout(r))}`;
    return "AIR払戻 0B";
  }

  function comboText(line){
    return Array.isArray(line?.combo) ? line.combo.join("-") : String(line?.combo || "—");
  }

  const BET_LABELS = Object.freeze({
    win:"単勝", place:"複勝", exacta:"2連単", quinella:"2連複",
    wide:"拡連複", trifecta:"3連単", trio:"3連複"
  });
  const PAYOUT_ORDER = Object.freeze(Object.keys(BET_LABELS));

  function betTypeKey(value){
    const raw = String(value || "").trim();
    if (BET_LABELS[raw]) return raw;
    return ({"単勝":"win","複勝":"place","2連単":"exacta","２連単":"exacta","2連複":"quinella","２連複":"quinella","拡連複":"wide","3連単":"trifecta","３連単":"trifecta","3連複":"trio","３連複":"trio"})[raw] || "";
  }

  function betTypeLabel(line,r){
    return BET_LABELS[betTypeKey(line?.betType || r?.betType)] || "AIR BET";
  }

  function modeLabel(line,r){
    const m = String(line?.mode || r?.betMode || "");
    return ({normal:"通常",box:"BOX",form:"フォーメーション"})[m] || m;
  }

  function oddsNumber(value){
    const match = String(value ?? "").match(/([0-9]+(?:\.[0-9]+)?)/);
    const number = match ? Number(match[1]) : NaN;
    return Number.isFinite(number) && number > 0 ? number : NaN;
  }

  function lineOdds(line){
    return oddsNumber(line?.referenceOdds ?? line?.odds ?? line?.referenceOddsValue);
  }

  function oddsText(value){
    return Number.isFinite(value) ? `${value.toFixed(1)}倍` : "未保存";
  }

  function oddsSummary(r){
    const values = (Array.isArray(r?.lines) ? r.lines : []).map(lineOdds).filter(Number.isFinite);
    if (!values.length) return "—";
    const min = Math.min(...values);
    const max = Math.max(...values);
    return min === max ? oddsText(min) : `${min.toFixed(1)}〜${max.toFixed(1)}倍`;
  }

  function purchaseRowsHtml(r){
    const lines = Array.isArray(r.lines) ? r.lines : [];
    if(!lines.length) return '<div class="rx-detail-empty">買い目記録なし</div>';
    return `<div class="rx-purchase-head"><span>券種 / モード</span><span>組み合わせ</span><span>参加額</span></div>${lines.map((line)=>{
      const mode = modeLabel(line,r);
      return `<div class="rx-purchase-row"><span><b>${esc(betTypeLabel(line,r))}</b>${mode?`<em>${esc(mode)}</em>`:""}</span><strong>${esc(comboText(line))}</strong><b>${bfmt(line?.stake || 0)}</b></div>`;
    }).join("")}`;
  }

  function oddsRowsHtml(r){
    const lines = Array.isArray(r.lines) ? r.lines : [];
    if(!lines.length) return '<div class="rx-detail-empty">参考オッズの記録はありません。</div>';
    return `<div class="rx-odds-head"><span>券種</span><span>モード</span><span>組み合わせ</span><span>参考オッズ</span></div>${lines.map((line)=>`<div class="rx-odds-row"><b>${esc(betTypeLabel(line,r))}</b><span>${esc(modeLabel(line,r) || "未保存")}</span><strong>${esc(comboText(line))}</strong><b>${esc(oddsText(lineOdds(line)))}</b></div>`).join("")}`;
  }

  function payoutRows(r){
    return (Array.isArray(r?.resultPayouts) ? r.resultPayouts : [])
      .map((item,index)=>({
        betType:betTypeKey(item?.betType || item?.type || item?.kind),
        combo:String(item?.combo || item?.combination || "").trim(),
        payout:Number(item?.payout ?? item?.amount),
        popularity:item?.popularity == null || item?.popularity === "" ? null : Number(item.popularity),
        index
      }))
      .filter(item=>item.betType && item.combo && Number.isFinite(item.payout) && item.payout > 0)
      .sort((a,b)=>PAYOUT_ORDER.indexOf(a.betType)-PAYOUT_ORDER.indexOf(b.betType) || a.index-b.index);
  }

  function primaryPayout(r){
    const rows = payoutRows(r);
    const winning = resultCombo(r);
    const row = rows.find(item=>item.betType === "trifecta" && item.combo === winning)
      || rows.find(item=>item.betType === "trifecta")
      || rows[0];
    if (row) return row;
    const direct = Number(r?.resultPayout ?? r?.officialPayout ?? r?.result?.payout);
    return Number.isFinite(direct) && direct > 0
      ? {betType:"trifecta",combo:winning,payout:direct,popularity:null}
      : null;
  }

  function payoutRowsHtml(r){
    const rows = payoutRows(r);
    if(!rows.length) return `<div class="rx-detail-empty">${settled(r)?"公式払戻データは未保存です。":"公式払戻の確定待ちです。"}</div>`;
    return `<div class="rx-payout-head"><span>券種</span><span>組み合わせ</span><span>払戻金</span><span>人気</span></div>${rows.map(item=>`<div class="rx-payout-row" data-payout-type="${item.betType}"><b>${BET_LABELS[item.betType]}</b><strong>${esc(item.combo)}</strong><b>${fmt(item.payout)}円</b><span>${Number.isFinite(item.popularity)&&item.popularity>0?`${fmt(item.popularity)}番人気`:"—"}</span></div>`).join("")}<small class="rx-payout-note">払戻金は100円あたりの公式値です。</small>`;
  }

  function financialHtml(r){
    const lines = Array.isArray(r?.lines) ? r.lines : [];
    const payouts = payoutRows(r);
    const primary = primaryPayout(r);
    const payoutState = primary ? `${fmt(primary.payout)}円` : (settled(r) ? "—" : "確定待ち");
    return `<div class="rx2-stats">
      <div><span>参加時参考オッズ</span><strong>${esc(oddsSummary(r))}</strong><small>購入した${lines.length}点のオッズ範囲</small></div>
      <div class="official"><span>公式払戻${primary?`（${BET_LABELS[primary.betType]}）`:""}</span>${primary?.combo?`<b>${esc(primary.combo)}</b>`:""}<strong>${esc(payoutState)}</strong></div>
    </div>
    <details class="rx-fold rx-odds-details" data-rx-collapse-init="1"><summary><span>参加時参考オッズの内訳</span><b>${lines.length}点</b></summary><div>${oddsRowsHtml(r)}</div></details>
    <details class="rx-fold rx-payout-details" data-rx-collapse-init="1"><summary><span>公式払戻の内訳</span><b>${payouts.length?`${payouts.length}件`:settled(r)?"未保存":"確定待ち"}</b></summary><div>${payoutRowsHtml(r)}</div></details>`;
  }

  function officialUrl(r){
    return String(r.officialResultUrl || r.resultUrl || r.officialUrl || r?.result?.officialUrl || "").trim();
  }

  function actionButtons(r,index){
    const url = officialUrl(r);
    return `<div class="rx-actions">
      ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">公式で照合 ↗</a>` : '<button type="button" class="rx-disabled" disabled>公式結果待ち</button>'}
      <button type="button" data-rx-carte="${index}">▤ レースカルテ</button>
    </div>`;
  }

  function unifiedCard(r,index){
    const x = resultLabel(r);
    const s = stake(r);
    const shiftYen = Number(r.virtualShiftYen ?? r.intendedYen ?? s) || s;
    return `<article class="rx-card rx-unified ${x.tone}">
      <header><div><small>${esc(x.eyebrow)}</small><h3>${esc(r.venue||r.venueName||"")} ${Number(r.raceNo||r.race)||""}R</h3></div><time>${esc(fmtDate(r))}</time></header>
      <div class="rx-result-row"><div><span>実着順</span><strong>${esc(resultCombo(r))}</strong></div><div><span>AIR結果</span><strong>${esc(x.title)}</strong></div></div>
      <div class="rx-summary-money"><span>参加額 <b>${bfmt(s)}</b></span><span>${esc(payoutLine(r))}</span>${Number(r.refundC)>0?`<span>一部返還 +${bfmt(r.refundC)}</span>`:""}</div>
      <details class="rx-bets rx-fold" data-rx-collapse-init="1"><summary><span>購入した買い目</span><b>${Array.isArray(r.lines)?r.lines.length:0}点</b></summary><div>${purchaseRowsHtml(r)}</div></details>
      ${financialHtml(r)}
      <div class="rx-shift"><small>VIRTUAL SHIFT</small><b>${fmt(shiftYen)}円分をB投票へ置き換え</b></div>
      ${r.resultLatencyMinutes!=null?`<div class="rx-latency">締切→MAMO BOAT反映 約${Math.max(0,Math.round(Number(r.resultLatencyMinutes)))}分</div>`:""}
      ${actionButtons(r,index)}
    </article>`;
  }

  function filtered(list){
    if(unifiedFilter === "pending") return list.filter(r=>!settled(r));
    if(unifiedFilter === "settled") return list.filter(settled);
    return list;
  }

  function renderHome(){
    const home=document.getElementById("home"); if(!home) return;
    const stats=home.querySelector(".three-stats"); if(!stats) return;
    let panel=document.getElementById("airDefenseSummary");
    if(!panel){ panel=document.createElement("section"); panel.id="airDefenseSummary"; panel.className="rx-summary"; stats.insertAdjacentElement("afterend",panel); }
    const rs=todayRecords(), done=rs.filter(settled), waiting=rs.filter(r=>!settled(r)), hits=done.filter(r=>r.status==="hit");
    panel.innerHTML=`<div class="rx-summary-head"><div><small>AIR BET / LIVE RESULT</small><h3>実レースの結果まで、ここで。</h3></div><button type="button" onclick="go('records')">記録を見る →</button></div>
      <div class="rx-summary-grid"><div><span>今日のAIR BET</span><strong>${rs.length}</strong></div><div><span>結果反映</span><strong>${done.length}</strong></div><div><span>結果待ち</span><strong>${waiting.length}</strong></div><div><span>B的中</span><strong>${hits.length}</strong></div></div>`;
  }

  function markLegacyRecordArea(screen){
    const list = document.getElementById("recordList");
    if(!list) return;
    list.classList.add("rx-legacy-hidden");
    const filter = list.previousElementSibling;
    if(filter?.classList?.contains("filter-rail")) filter.classList.add("rx-legacy-hidden");
    const heading = filter?.previousElementSibling;
    if(heading?.classList?.contains("section-head")) heading.classList.add("rx-legacy-hidden");
  }

  function renderRecords(){
    const screen=document.getElementById("records"); if(!screen) return;
    const intro=screen.querySelector(".record-intro");
    if(intro){
      const kicker=intro.querySelector(".kicker"); if(kicker) kicker.textContent="MAMO RECORD";
      const h1=intro.querySelector("h1"); if(h1) h1.textContent="参加記録";
      const p=intro.querySelector("p"); if(p) p.textContent="AIR BETした内容・実着順・公式払戻・B精算・レースカルテを1レース1枚で確認。";
    }

    markLegacyRecordArea(screen);
    const legacyHeading = screen.querySelector(".section-head.small.rx-legacy-hidden") || screen.querySelector(".section-head.small");
    let block=document.getElementById("airOutcomeBlock");
    if(!block){ block=document.createElement("section"); block.id="airOutcomeBlock"; block.className="rx-record-block"; (legacyHeading || screen.firstElementChild)?.insertAdjacentElement("beforebegin",block); }

    const all=sortedRecords();
    const shown=filtered(all);
    const done=all.filter(settled).length;
    const waiting=all.length-done;
    block.innerHTML=`<div class="rx-record-hero"><small>MAMO RECORD / ONE RACE ONE CARD</small><h2>参加から結果まで、1枚で。</h2><p>買い目・金額・実着順・払戻・仮想置換・レースカルテを同じ記録にまとめました。</p><div><span>全${all.length}件</span><b>確定 ${done}</b><b>結果待ち ${waiting}</b></div></div>
      <div class="rx-filter" role="tablist" aria-label="記録の絞り込み">
        <button type="button" data-rx-filter="all" class="${unifiedFilter==="all"?"active":""}">すべて ${all.length}</button>
        <button type="button" data-rx-filter="pending" class="${unifiedFilter==="pending"?"active":""}">結果待ち ${waiting}</button>
        <button type="button" data-rx-filter="settled" class="${unifiedFilter==="settled"?"active":""}">確定 ${done}</button>
      </div>
      <div class="rx-latest">${shown.length?shown.map(r=>unifiedCard(r,all.indexOf(r))).join(""):'<div class="rx-empty">該当する記録はありません。</div>'}</div>`;
  }

  function style(){
    if(document.getElementById("airOutcomeStyleV3")) return;
    document.getElementById("airOutcomeStyleV2")?.remove();
    const s=document.createElement("style"); s.id="airOutcomeStyleV3";
    s.textContent=`
      #records .rx-legacy-hidden{display:none!important}
      .rx-summary{margin:11px 0 4px;padding:14px;background:#fff;border:1px solid #dde3e5;border-top:3px solid #0aa39a;border-radius:13px;box-shadow:0 4px 12px rgba(8,35,61,.055)}
      .rx-summary-head{display:flex;justify-content:space-between;align-items:end;gap:10px}.rx-summary-head small,.rx-record-hero>small{color:#087d77;font-size:8px;font-weight:1000;letter-spacing:.12em}.rx-summary-head h3{margin:3px 0 0;font-size:17px}.rx-summary-head button{border:0;background:transparent;color:#087d77;font-size:10px;font-weight:1000}.rx-summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:11px}.rx-summary-grid>div{padding:9px;background:#f6f8f8;border-radius:8px;text-align:center}.rx-summary-grid span{display:block;color:#718087;font-size:7px}.rx-summary-grid strong{display:block;margin-top:2px;color:#08233d;font-size:18px}
      .rx-record-block{margin:0 0 18px}.rx-record-hero{padding:16px;background:linear-gradient(115deg,#071d31,#0d3f59);color:#fff;border-bottom:4px solid #0aa39a;border-radius:14px;box-shadow:0 7px 18px rgba(8,35,61,.12)}.rx-record-hero h2{margin:5px 0 5px;font-size:24px}.rx-record-hero p{margin:0;color:#c8d8de;font-size:9px;line-height:1.6}.rx-record-hero>div{display:flex;gap:10px;flex-wrap:wrap;margin-top:11px}.rx-record-hero>div span,.rx-record-hero>div b{font-size:9px;padding:5px 8px;background:rgba(255,255,255,.09);border-radius:6px}.rx-record-hero>div b{color:#8ce4dc}
      .rx-filter{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0}.rx-filter button{min-height:42px;border:1px solid #ccd9de;border-radius:9px;background:#fff;color:#617680;font-size:10px;font-weight:1000}.rx-filter button.active{background:#082b4a;border-color:#082b4a;color:#fff}
      .rx-latest{margin-top:8px}.rx-card{margin:9px 0;padding:13px;background:#fff;border:1px solid #dfe5e6;border-left:5px solid #809099;border-radius:12px;box-shadow:0 3px 10px rgba(8,35,61,.05)}.rx-card.hit{border-left-color:#d8a12a}.rx-card.miss{border-left-color:#5c7180}.rx-card.refund{border-left-color:#9e7ad8}.rx-card.pending{border-left-color:#0aa39a}.rx-card header{display:flex;justify-content:space-between;gap:8px}.rx-card header small{color:#087d77;font-size:7px;font-weight:1000;letter-spacing:.11em}.rx-card header h3{margin:2px 0;font-size:17px}.rx-card time{color:#829199;font-size:8px}.rx-result-row{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:10px 0}.rx-result-row>div{padding:10px;background:#f4f6f6;border-radius:9px}.rx-result-row span{display:block;color:#77868c;font-size:7px;font-weight:900}.rx-result-row strong{display:block;margin-top:2px;color:#08233d;font-size:22px}.rx-card.hit .rx-result-row>div:last-child strong{color:#a4770d}.rx-card.pending .rx-result-row>div:last-child strong{color:#087d77}
      .rx-summary-money{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.rx-summary-money span{padding:6px 8px;background:#edf4f3;border-radius:7px;color:#52676e;font-size:8px}.rx-summary-money b{color:#08233d}
      #records .rx-card>.rx-financial-restore,#records .rx-card>.rx-unified-stats,#records .rx-card>.rx-details{display:none!important}
      #records .rx-fold{margin-top:9px;border:1.5px solid #d8e3e8;border-radius:12px;background:#fff;overflow:hidden}
      #records .rx-fold>summary{display:flex;align-items:center;gap:10px;width:100%;min-height:56px;padding:10px 12px;box-sizing:border-box;list-style:none;cursor:pointer;color:#082b4a;font-size:13px;font-weight:1000;user-select:none;-webkit-tap-highlight-color:transparent}
      #records .rx-fold>summary::-webkit-details-marker{display:none}
      #records .rx-fold>summary::before{content:"▶";display:grid;place-items:center;width:32px;height:32px;flex:0 0 32px;border-radius:9px;background:#082b4a;color:#fff;font-size:15px;line-height:1;box-shadow:0 3px 8px rgba(8,43,74,.22)}
      #records .rx-fold[open]>summary::before{content:"▼"}
      #records .rx-fold>summary::after{content:"開く";flex:0 0 auto;margin-left:2px;color:#536d7b;font-size:11px;font-weight:1000;letter-spacing:.03em}
      #records .rx-fold[open]>summary::after{content:"閉じる"}
      #records .rx-fold>summary>span{flex:1;min-width:0}
      #records .rx-fold>summary>b{flex:0 0 auto;padding:4px 7px;border-radius:999px;background:#edf3f6;color:#58707d;font-size:9px}
      #records .rx-fold>div{padding:0 12px 12px}
      #records .rx-purchase-head,#records .rx-purchase-row{display:grid;grid-template-columns:minmax(118px,1fr) minmax(100px,1fr) auto;gap:10px;align-items:center}
      #records .rx-purchase-head,#records .rx-odds-head,#records .rx-payout-head{padding:8px;background:#f1f5f7;border-radius:8px;color:#6b7f89;font-size:9px;font-weight:900}
      #records .rx-purchase-row{min-height:58px;padding:8px;border-bottom:1px solid #e7edef}
      #records .rx-purchase-row:last-child{border-bottom:0}
      #records .rx-purchase-row>span{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
      #records .rx-purchase-row>span>b{font-size:11px;color:#082b4a}
      #records .rx-purchase-row em{padding:3px 6px;border-radius:6px;background:#fff0f2;color:#c6222e;font-style:normal;font-size:9px;font-weight:1000}
      #records .rx-purchase-row>strong{color:#082b4a;font-size:19px}
      #records .rx-purchase-row>b{text-align:right;color:#082b4a;font-size:15px;white-space:nowrap}
      #records .rx2-stats{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:10px 0}
      #records .rx2-stats>div{min-width:0;padding:12px;border:1px solid #e0e9ed;border-radius:11px;background:#f4f7f8}
      #records .rx2-stats>div.official{background:#fff8ee;border-color:#efd6ad}
      #records .rx2-stats span,#records .rx2-stats small{display:block;color:#6d818c;font-size:9px;font-weight:900}
      #records .rx2-stats b{display:block;margin-top:4px;color:#637985;font-size:12px}
      #records .rx2-stats strong{display:block;margin-top:3px;color:#082b4a;font-size:20px;font-weight:1000;line-height:1.15}
      #records .rx2-stats .official strong{color:#ae5700}
      #records .rx-odds-head,#records .rx-odds-row{display:grid;grid-template-columns:64px 92px minmax(82px,1fr) auto;gap:8px;align-items:center}
      #records .rx-odds-row{min-height:51px;padding:8px;border-bottom:1px solid #e7edef;color:#526b78;font-size:10px}
      #records .rx-odds-row:last-child{border-bottom:0}
      #records .rx-odds-row>strong{color:#082b4a;font-size:16px}
      #records .rx-odds-row>b:last-child{color:#0969b9;font-size:14px;text-align:right;white-space:nowrap}
      #records .rx-payout-head,#records .rx-payout-row{display:grid;grid-template-columns:64px minmax(92px,1fr) 92px 72px;gap:8px;align-items:center}
      #records .rx-payout-row{min-height:49px;padding:8px;border-bottom:1px solid #e7edef;color:#5f7480;font-size:10px}
      #records .rx-payout-row>strong{color:#082b4a;font-size:15px}
      #records .rx-payout-row>b:nth-child(3){color:#11823b;font-size:13px;text-align:right;white-space:nowrap}
      #records .rx-payout-row>span{text-align:right;white-space:nowrap}
      #records .rx-payout-note{display:block;margin:8px 2px 0;color:#748892;font-size:8px}
      #records .rx-detail-empty{padding:12px 3px 3px;color:#748892;font-size:10px}
      .rx-shift{display:flex;align-items:center;gap:8px;margin-top:9px;padding:9px 10px;background:#eef8f3;border-radius:8px}.rx-shift small{padding:3px 6px;background:#082b4a;color:#fff;font-size:7px;font-weight:1000;letter-spacing:.12em}.rx-shift b{color:#11734d;font-size:10px}.rx-latency{margin-top:7px;color:#7a8b92;font-size:8px}
      .rx-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.rx-actions a,.rx-actions button{display:grid;place-items:center;min-height:43px;border:1.5px solid #0a3554;border-radius:9px;background:#fff;color:#0a3554;text-decoration:none;font-size:10px;font-weight:1000}.rx-actions a{color:#b4232d;border-color:#c9d5da}.rx-actions .rx-disabled{opacity:.45}.rx-empty{padding:16px;border:1px dashed #cbd5d7;border-radius:10px;text-align:center;color:#718087;font-size:10px}
      @media(max-width:520px){
        .rx-summary-grid{grid-template-columns:1fr 1fr}.rx-record-hero h2{font-size:22px}.rx-actions{grid-template-columns:1fr 1fr}
        #records .rx-fold>summary{min-height:58px;padding:11px 10px;font-size:14px}
        #records .rx-fold>summary::before{width:34px;height:34px;flex-basis:34px;font-size:16px}
        #records .rx-fold>summary::after{font-size:11px}
        #records .rx-fold>div{padding:0 9px 10px}
        #records .rx-purchase-head{display:none}
        #records .rx-purchase-row{grid-template-columns:1fr auto;grid-template-areas:"type stake" "combo combo";gap:5px 8px;min-height:68px;padding:10px 4px}
        #records .rx-purchase-row>span{grid-area:type}#records .rx-purchase-row>strong{grid-area:combo;font-size:20px}#records .rx-purchase-row>b{grid-area:stake}
        #records .rx-odds-head,#records .rx-payout-head{display:none}
        #records .rx-odds-row{grid-template-columns:1fr auto;grid-template-areas:"type mode" "combo odds";gap:5px 8px;min-height:64px;padding:9px 4px}
        #records .rx-odds-row>b:first-child{grid-area:type}#records .rx-odds-row>span{grid-area:mode;text-align:right}#records .rx-odds-row>strong{grid-area:combo;font-size:18px}#records .rx-odds-row>b:last-child{grid-area:odds}
        #records .rx-payout-row{grid-template-columns:1fr auto;grid-template-areas:"type popularity" "combo amount";gap:5px 8px;min-height:62px;padding:9px 4px}
        #records .rx-payout-row>b:first-child{grid-area:type}#records .rx-payout-row>strong{grid-area:combo;font-size:18px}#records .rx-payout-row>b:nth-child(3){grid-area:amount;font-size:15px}#records .rx-payout-row>span{grid-area:popularity}
      }
      @media(max-width:350px){#records .rx2-stats{grid-template-columns:1fr}}
    `; document.head.appendChild(s);
  }

  function render(){ renderHome(); renderRecords(); }

  function onClick(event){
    const filter = event.target?.closest?.("[data-rx-filter]");
    if(filter){ unifiedFilter = filter.dataset.rxFilter || "all"; renderRecords(); return; }
    const carte = event.target?.closest?.("[data-rx-carte]");
    if(carte){
      const index = Number(carte.dataset.rxCarte);
      if(Number.isFinite(index) && window.MAMO_RACE_CARTE?.open) window.MAMO_RACE_CARTE.open(index);
      return;
    }
    if(event.target?.closest?.("#nav-records")) queueMicrotask(renderRecords);
  }

  function boot(){
    style();
    render();
    document.addEventListener("click",onClick,false);
    window.addEventListener("storage",e=>{ if(e.key===KEY) render(); });
    window.addEventListener("pageshow",()=>{ if(document.getElementById("records")?.classList.contains("active")) renderRecords(); });
  }

  window.MAMO_AIR_OUTCOME_VIEW = Object.freeze({
    cardHtml: unifiedCard,
    financialHtml,
    payoutRows,
    refresh: renderRecords,
  });

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
