/* MAMO BOAT AIR Outcome Experience v2 — result-first race experience. */
(() => {
  "use strict";
  if (window.__MAMO_AIR_OUTCOME_V2__) return;
  window.__MAMO_AIR_OUTCOME_V2__ = true;

  const KEY = "mamoboat_v40_personal";
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; } };
  const esc = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const fmt = (v) => Math.round(Number(v)||0).toLocaleString("ja-JP");
  const bfmt = (v) => `${fmt(v)}B`;
  const records = () => Array.isArray(read().records) ? read().records : [];
  const time = r => new Date(r.time || 0).getTime();
  const stake = r => Number(r.stake ?? r.intendedYen ?? 0) || 0;
  const payout = r => Number(r.payoutC ?? 0) || 0;
  const settled = r => !!r.settled && String(r.status || "") !== "pending";
  const fmtDate = r => { try { return new Date(r.time).toLocaleString("ja-JP",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}); } catch (_) { return ""; } };

  function todayRecords(){
    const now = new Date();
    const start = new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
    return records().filter(r => time(r) >= start);
  }

  function resultLabel(r){
    if(!settled(r)) return {tone:"pending",eyebrow:"RESULT WAIT",title:"実レース結果を確認中",status:"結果待ち"};
    if(r.status === "hit") return {tone:"hit",eyebrow:"AIR HIT",title:"B的中",status:"的中"};
    if(r.status === "refunded") return {tone:"refund",eyebrow:"REFUND",title:"不成立・返還",status:"返還"};
    return {tone:"miss",eyebrow:"RESULT",title:"不的中",status:"不的中"};
  }

  function resultCombo(r){
    return String(r.resultCombo || "").trim() || (settled(r) ? "確定" : "—");
  }

  function payoutLine(r){
    if(!settled(r)) return "公式払戻の確定待ち";
    if(r.status === "hit") return `AIR払戻 +${bfmt(payout(r))}`;
    if(r.status === "refunded") return `返還 +${bfmt(payout(r))}`;
    return `AIR払戻 0B`;
  }

  function betText(r){
    const lines = Array.isArray(r.lines) ? r.lines : [];
    if(!lines.length) return "買い目記録なし";
    const labels = lines.slice(0,3).map(line => {
      const combo = Array.isArray(line.combo) ? line.combo.join("-") : String(line.combo || "");
      return `${combo} / ${bfmt(line.stake || 0)}`;
    });
    return labels.join("　") + (lines.length > 3 ? `　ほか${lines.length-3}点` : "");
  }

  function card(r){
    const x = resultLabel(r);
    return `<article class="rx-card ${x.tone}">
      <header><div><small>${esc(x.eyebrow)}</small><h3>${esc(r.venue||"")} ${Number(r.raceNo)||""}R</h3></div><time>${esc(fmtDate(r))}</time></header>
      <div class="rx-result-row"><div><span>実着順</span><strong>${esc(resultCombo(r))}</strong></div><div><span>AIR結果</span><strong>${esc(x.title)}</strong></div></div>
      <div class="rx-bet"><span>あなたのAIR BET</span><b>${esc(betText(r))}</b></div>
      <div class="rx-money"><span>参加額 <b>${bfmt(stake(r))}</b></span><span>${esc(payoutLine(r))}</span>${Number(r.refundC)>0?`<span>一部返還 +${bfmt(r.refundC)}</span>`:""}</div>
      ${r.resultPayouts?.length ? `<details><summary>公式払戻を見る</summary><div class="rx-payouts">${r.resultPayouts.map(p=>`<span>${esc(p.combo||p.combination||"")} <b>${fmt(p.payout)}円</b></span>`).join("")}</div></details>` : ""}
      <footer><span>現金の入出金はありません</span>${r.resultLatencyMinutes!=null?`<span>締切→反映 約${Math.max(0,Math.round(Number(r.resultLatencyMinutes)))}分</span>`:""}</footer>
    </article>`;
  }

  function renderHome(){
    const home=document.getElementById("home"); if(!home) return;
    const stats=home.querySelector(".three-stats"); if(!stats) return;
    let panel=document.getElementById("airDefenseSummary");
    if(!panel){ panel=document.createElement("section"); panel.id="airDefenseSummary"; panel.className="rx-summary"; stats.insertAdjacentElement("afterend",panel); }
    const rs=todayRecords(); const done=rs.filter(settled); const waiting=rs.filter(r=>!settled(r)); const hits=done.filter(r=>r.status==="hit");
    panel.innerHTML=`<div class="rx-summary-head"><div><small>AIR BET / LIVE RESULT</small><h3>実レースの結果まで、ここで。</h3></div><button type="button" onclick="go('records')">結果センター →</button></div>
      <div class="rx-summary-grid"><div><span>今日のAIR BET</span><strong>${rs.length}</strong></div><div><span>結果反映</span><strong>${done.length}</strong></div><div><span>結果待ち</span><strong>${waiting.length}</strong></div><div><span>B的中</span><strong>${hits.length}</strong></div></div>
      <p>出走表・AIR BET・実結果・公式払戻・B精算までMAMO BOAT内で確認できます。現金投票だけは行いません。</p>`;
  }

  function renderRecords(){
    const screen=document.getElementById("records"); if(!screen) return;
    const intro=screen.querySelector(".record-intro");
    if(intro){
      const kicker=intro.querySelector(".kicker"); if(kicker) kicker.textContent="AIR RESULT CENTER";
      const h1=intro.querySelector("h1"); if(h1) h1.textContent="結果センター";
      const p=intro.querySelector("p"); if(p) p.textContent="AIR BETした実レースの着順・公式払戻・B精算をここで確認。";
    }
    const heading=screen.querySelector(".section-head.small"); if(!heading) return;
    let block=document.getElementById("airOutcomeBlock");
    if(!block){ block=document.createElement("section"); block.id="airOutcomeBlock"; block.className="rx-record-block"; heading.insertAdjacentElement("beforebegin",block); }
    const list=[...records()].sort((a,b)=>time(b)-time(a)).slice(0,6);
    const done=list.filter(settled).length; const waiting=list.length-done;
    block.innerHTML=`<div class="rx-record-hero"><small>LIVE RESULT DESK</small><h2>賭けたら、結果まで見る。</h2><p>AIR BETのあともMAMO BOATを離れる必要はありません。実レースの確定結果を取得し、Bを自動精算します。</p><div><span>直近${list.length}件</span><b>結果反映 ${done}</b><b>結果待ち ${waiting}</b></div></div>
      <div class="rx-latest">${list.length?list.map(card).join(""):'<div class="rx-empty">AIR BETの記録がまだありません。</div>'}</div>`;

    screen.querySelectorAll("button").forEach(btn=>{
      if(btn.textContent.trim()==="今すぐ公式結果を確認") btn.textContent="結果を更新";
    });
    screen.querySelectorAll("a").forEach(a=>{
      if(/公式結果/.test(a.textContent)) a.textContent="公式で照合 ↗";
    });
  }

  function style(){
    if(document.getElementById("airOutcomeStyleV2")) return;
    const s=document.createElement("style"); s.id="airOutcomeStyleV2";
    s.textContent=`
      .rx-summary{margin:11px 0 4px;padding:14px;background:#fff;border:1px solid #dde3e5;border-top:3px solid #0aa39a;border-radius:13px;box-shadow:0 4px 12px rgba(8,35,61,.055)}
      .rx-summary-head{display:flex;justify-content:space-between;align-items:end;gap:10px}.rx-summary-head small,.rx-record-hero>small{color:#087d77;font-size:8px;font-weight:1000;letter-spacing:.12em}.rx-summary-head h3{margin:3px 0 0;font-size:17px}.rx-summary-head button{border:0;background:transparent;color:#087d77;font-size:10px;font-weight:1000}.rx-summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:11px}.rx-summary-grid>div{padding:9px;background:#f6f8f8;border-radius:8px;text-align:center}.rx-summary-grid span{display:block;color:#718087;font-size:7px}.rx-summary-grid strong{display:block;margin-top:2px;color:#08233d;font-size:18px}.rx-summary>p{margin:9px 1px 0;color:#718087;font-size:8px;line-height:1.6}
      .rx-record-block{margin:0 0 18px}.rx-record-hero{padding:16px;background:linear-gradient(115deg,#071d31,#0d3f59);color:#fff;border-bottom:4px solid #0aa39a;border-radius:14px;box-shadow:0 7px 18px rgba(8,35,61,.12)}.rx-record-hero h2{margin:5px 0 5px;font-size:24px}.rx-record-hero p{margin:0;color:#c8d8de;font-size:9px;line-height:1.6}.rx-record-hero>div{display:flex;gap:10px;flex-wrap:wrap;margin-top:11px}.rx-record-hero>div span,.rx-record-hero>div b{font-size:9px;padding:5px 8px;background:rgba(255,255,255,.09);border-radius:6px}.rx-record-hero>div b{color:#8ce4dc}
      .rx-latest{margin-top:10px}.rx-card{margin:9px 0;padding:13px;background:#fff;border:1px solid #dfe5e6;border-left:5px solid #809099;border-radius:11px;box-shadow:0 3px 10px rgba(8,35,61,.05)}.rx-card.hit{border-left-color:#d8a12a}.rx-card.miss{border-left-color:#5c7180}.rx-card.refund{border-left-color:#9e7ad8}.rx-card.pending{border-left-color:#0aa39a}.rx-card header{display:flex;justify-content:space-between;gap:8px}.rx-card header small{color:#087d77;font-size:7px;font-weight:1000;letter-spacing:.11em}.rx-card header h3{margin:2px 0;font-size:15px}.rx-card time{color:#829199;font-size:8px}.rx-result-row{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:9px 0}.rx-result-row>div{padding:10px;background:#f4f6f6;border-radius:8px}.rx-result-row span,.rx-bet span{display:block;color:#77868c;font-size:7px;font-weight:900}.rx-result-row strong{display:block;margin-top:2px;color:#08233d;font-size:21px}.rx-card.hit .rx-result-row>div:last-child strong{color:#a4770d}.rx-card.pending .rx-result-row>div:last-child strong{color:#087d77}.rx-bet{padding:9px;border:1px solid #e5e9ea;border-radius:8px}.rx-bet b{display:block;margin-top:3px;color:#173447;font-size:10px;line-height:1.5}.rx-money{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.rx-money span{padding:5px 7px;background:#edf4f3;border-radius:6px;color:#52676e;font-size:8px}.rx-money b{color:#08233d}.rx-card details{margin-top:7px}.rx-card summary{cursor:pointer;color:#087d77;font-size:8px;font-weight:900}.rx-payouts{display:grid;gap:3px;margin-top:5px}.rx-payouts span{font-size:8px}.rx-card footer{display:flex;justify-content:space-between;gap:8px;margin-top:8px;color:#809096;font-size:7px}.rx-empty{padding:16px;border:1px dashed #cbd5d7;border-radius:10px;text-align:center;color:#718087;font-size:10px}
      @media(max-width:520px){.rx-summary-grid{grid-template-columns:1fr 1fr}.rx-result-row{grid-template-columns:1fr 1fr}.rx-record-hero h2{font-size:22px}}
    `; document.head.appendChild(s);
  }

  function render(){ renderHome(); renderRecords(); }
  function boot(){ style(); render(); document.addEventListener("click",()=>setTimeout(render,120),false); setInterval(render,4000); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
