/* MAMO BOAT AIR Outcome Experience v1 — connect AIR BET to official result and avoided-loss meaning. */
(() => {
  "use strict";
  if (window.__MAMO_AIR_OUTCOME_V1__) return;
  window.__MAMO_AIR_OUTCOME_V1__ = true;

  const KEY = "mamoboat_v40_personal";
  const DAY = 86400000;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; } };
  const esc = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const yen = (v) => `${Math.round(Number(v)||0).toLocaleString("ja-JP")}円`;
  const signed = (v) => `${Number(v) > 0 ? "+" : Number(v) < 0 ? "−" : "±"}${Math.abs(Math.round(Number(v)||0)).toLocaleString("ja-JP")}円`;
  const records = () => Array.isArray(read().records) ? read().records : [];
  const time = r => new Date(r.time || 0).getTime();
  const stake = r => Number(r.intendedYen ?? r.stake ?? 0) || 0;
  const payout = r => Number(r.payoutC ?? 0) || 0;
  const settled = r => !!r.settled && !["pending"].includes(String(r.status || "").toLowerCase());
  const hypotheticalNet = r => settled(r) ? payout(r) - stake(r) : null;
  const avoidedLoss = r => { const net = hypotheticalNet(r); return net == null ? 0 : Math.max(0, -net); };
  const unusedCash = r => stake(r);
  const fmtDate = r => { try { return new Date(r.time).toLocaleDateString("ja-JP",{month:"numeric",day:"numeric",weekday:"short"}); } catch (_) { return ""; } };

  function periodStart(kind){
    const now = new Date();
    if(kind === "today") return new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
    if(kind === "week") { const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()); const wd=(d.getDay()+6)%7; d.setDate(d.getDate()-wd); return d.getTime(); }
    return new Date(now.getFullYear(),now.getMonth(),1).getTime();
  }

  function totals(kind){
    const start = periodStart(kind);
    const rs = records().filter(r => time(r) >= start);
    const done = rs.filter(settled);
    return {
      count: rs.length,
      unused: rs.reduce((s,r)=>s+unusedCash(r),0),
      avoided: done.reduce((s,r)=>s+avoidedLoss(r),0),
      positive: done.reduce((s,r)=>s+Math.max(0,hypotheticalNet(r)||0),0),
      settled: done.length,
    };
  }

  function latestOutcomes(limit=5){ return records().filter(settled).sort((a,b)=>time(b)-time(a)).slice(0,limit); }

  function outcomeCopy(r){
    const net = hypotheticalNet(r);
    if(net == null) return {tone:"pending",label:"結果待ち",headline:"公式結果の反映待ち",detail:"確定後に、現金だった場合の損益と回避した損失を表示します。"};
    if(net < 0) return {tone:"defended",label:"LOSS AVOIDED",headline:`回避した損失 ${yen(-net)}`,detail:`現金で同じ買い方をしていた場合の参考損益は ${signed(net)}。今回は現金を使っていません。`};
    if(net > 0) return {tone:"hit",label:"AIR HIT",headline:`仮想では ${signed(net)} 相当`,detail:"これはAIR BET上の参考結果です。実際の現金利益ではありません。"};
    return {tone:"flat",label:"EVEN",headline:"参考損益は ±0円",detail:"AIR BETとして記録し、現金の入出金はありません。"};
  }

  function outcomeCard(r){
    const c=outcomeCopy(r), s=stake(r), p=payout(r), net=hypotheticalNet(r);
    return `<article class="ao-card ${c.tone}">
      <header><div><small>${esc(c.label)}</small><h3>${esc(r.venue||"")} ${Number(r.raceNo)||""}R</h3></div><time>${esc(fmtDate(r))}</time></header>
      <div class="ao-headline">${esc(c.headline)}</div>
      <div class="ao-flow"><span><small>AIR参加額</small><b>${yen(s)}</b></span><i>→</i><span><small>公式払戻相当</small><b>${yen(p)}</b></span><i>→</i><span><small>現金なら参考損益</small><b>${net==null?"結果待ち":signed(net)}</b></span></div>
      <p>${esc(c.detail)}</p>
      <footer><span>実際の現金支出 <b>0円</b></span>${avoidedLoss(r)>0?`<span>回避損失 <b>${yen(avoidedLoss(r))}</b></span>`:""}</footer>
    </article>`;
  }

  function renderHome(){
    const home=document.getElementById("home"); if(!home) return;
    const stats=home.querySelector(".three-stats"); if(!stats) return;
    let panel=document.getElementById("airDefenseSummary");
    if(!panel){ panel=document.createElement("section"); panel.id="airDefenseSummary"; panel.className="ao-summary"; stats.insertAdjacentElement("afterend",panel); }
    const t=totals("today"),w=totals("week"),m=totals("month");
    panel.innerHTML=`<div class="ao-summary-head"><div><small>AIR BET / MONEY VIEW</small><h3>現金を使わなかった意味</h3></div><button type="button" onclick="go('records')">結果を見る →</button></div>
      <div class="ao-summary-grid"><div><span>今日使わなかった現金</span><strong>${yen(t.unused)}</strong><small>${t.count}件のAIR BET</small></div><div><span>今日の回避損失</span><strong>${yen(t.avoided)}</strong><small>公式結果反映 ${t.settled}件</small></div><div><span>今週の回避損失</span><strong>${yen(w.avoided)}</strong><small>参考値</small></div><div><span>今月の回避損失</span><strong>${yen(m.avoided)}</strong><small>参考値</small></div></div>
      <p>「使わなかった現金」と「結果的に回避した損失」は別の数字です。的中したAIR BETは実際の利益として数えません。</p>`;
  }

  function renderRecords(){
    const screen=document.getElementById("records"); if(!screen) return;
    const heading=screen.querySelector(".section-head.small"); if(!heading) return;
    let block=document.getElementById("airOutcomeBlock");
    if(!block){ block=document.createElement("section"); block.id="airOutcomeBlock"; block.className="ao-record-block"; heading.insertAdjacentElement("beforebegin",block); }
    const m=totals("month"),list=latestOutcomes(5);
    block.innerHTML=`<div class="ao-record-hero"><small>AIR BET RESULT</small><h2>結果まで見て、守った意味を確認する。</h2><div class="ao-record-kpis"><span>今月使わなかった現金 <b>${yen(m.unused)}</b></span><span>今月の回避損失 <b>${yen(m.avoided)}</b></span><span>結果反映 <b>${m.settled}件</b></span></div><p>回避損失は、公式払戻を反映したAIR BETについて「現金ならマイナスだった額」を合計した参考値です。</p></div>
      <div class="ao-latest"><div class="ao-latest-title"><h3>直近のAIR結果</h3><span>最大5件</span></div>${list.length?list.map(outcomeCard).join(""):'<div class="ao-empty">公式結果が反映されたAIR BETがまだありません。</div>'}</div>`;
  }

  function style(){
    if(document.getElementById("airOutcomeStyle")) return;
    const s=document.createElement("style"); s.id="airOutcomeStyle";
    s.textContent=`
      .ao-summary{margin:11px 0 4px;padding:14px;background:#fff;border:1px solid #e2e3df;border-top:3px solid #d8a12a;border-radius:13px;box-shadow:0 4px 12px rgba(8,35,61,.055)}
      .ao-summary-head{display:flex;justify-content:space-between;align-items:end;gap:10px}.ao-summary-head small,.ao-record-hero>small{color:#087d77;font-size:8px;font-weight:1000;letter-spacing:.12em}.ao-summary-head h3{margin:3px 0 0;font-size:17px}.ao-summary-head button{border:0;background:transparent;color:#087d77;font-size:10px;font-weight:900}.ao-summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:11px}.ao-summary-grid>div{padding:10px;background:#faf9f5;border:1px solid #ece7dc;border-radius:9px}.ao-summary-grid span,.ao-summary-grid small{display:block;color:#718087;font-size:8px}.ao-summary-grid strong{display:block;margin:3px 0;font-size:18px;color:#08233d}.ao-summary>p{margin:9px 1px 0;color:#718087;font-size:8px;line-height:1.6}
      .ao-record-block{margin:0 0 18px}.ao-record-hero{padding:16px;background:linear-gradient(115deg,#08233d,#123c58);color:#fff;border-bottom:4px solid #d8a12a;border-radius:14px;box-shadow:0 7px 18px rgba(8,35,61,.12)}.ao-record-hero h2{margin:5px 0 12px;font-size:22px;line-height:1.3}.ao-record-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.ao-record-kpis span{padding:8px;background:rgba(255,255,255,.08);font-size:8px;color:#d4e2e7}.ao-record-kpis b{display:block;margin-top:4px;color:#f4c95f;font-size:14px}.ao-record-hero p{margin:10px 0 0;color:#c8d6dc;font-size:8px;line-height:1.6}.ao-latest{margin-top:13px}.ao-latest-title{display:flex;justify-content:space-between;align-items:end;margin-bottom:7px}.ao-latest-title h3{margin:0;font-size:17px}.ao-latest-title span{font-size:8px;color:#718087}
      .ao-card{margin:8px 0;padding:13px;background:#fff;border:1px solid #e1e4e4;border-left:5px solid #829199;border-radius:11px;box-shadow:0 3px 10px rgba(8,35,61,.05)}.ao-card.defended{border-left-color:#0aa39a;background:#fbfffd}.ao-card.hit{border-left-color:#d8a12a;background:#fffdf7}.ao-card header{display:flex;justify-content:space-between;align-items:start}.ao-card header small{font-size:7px;font-weight:1000;letter-spacing:.11em;color:#087d77}.ao-card header h3{margin:2px 0;font-size:15px}.ao-card time{font-size:8px;color:#829199}.ao-headline{margin:9px 0;font-size:20px;font-weight:1000;color:#08233d}.ao-card.defended .ao-headline{color:#087d77}.ao-flow{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;align-items:center;gap:5px;padding:8px;background:#f6f7f5;border-radius:8px}.ao-flow span small{display:block;font-size:7px;color:#7a878c}.ao-flow span b{display:block;margin-top:2px;font-size:11px}.ao-flow i{font-style:normal;color:#a4afb2}.ao-card p{margin:8px 0;color:#64757d;font-size:9px;line-height:1.55}.ao-card footer{display:flex;gap:7px;flex-wrap:wrap}.ao-card footer span{padding:5px 7px;background:#eef4f3;border-radius:6px;font-size:8px}.ao-card footer b{color:#08233d}.ao-empty{padding:15px;background:#fff;border:1px dashed #ccd5d6;color:#718087;font-size:10px;text-align:center;border-radius:10px}
      @media(max-width:520px){.ao-record-kpis{grid-template-columns:1fr}.ao-flow{grid-template-columns:1fr}.ao-flow i{display:none}.ao-summary-grid{grid-template-columns:1fr 1fr}.ao-headline{font-size:18px}}
    `; document.head.appendChild(s);
  }

  function render(){ renderHome(); renderRecords(); }
  function boot(){ style(); render(); document.addEventListener("click",()=>setTimeout(render,100),false); setInterval(render,5000); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
