/* MAMO BOAT Morning Insight Bridge v1 — yesterday vs previous day + trigger summary */
(() => {
  "use strict";
  if (window.__MAMO_MORNING_INSIGHT_V1__) return;
  window.__MAMO_MORNING_INSIGHT_V1__ = true;

  const STATE_KEY="mamoboat_v40_personal";
  const DECISION_KEY="mamoboat_decision_events_v1";
  const JST=9*60*60*1000, DAY=86400000;
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch(_){return f}};
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const fmt=n=>Math.round(Number(n)||0).toLocaleString("ja-JP");
  const pad=n=>String(n).padStart(2,"0");
  const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;

  function jstDate(ms=Date.now()){const d=new Date(ms+JST);return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`}
  function addDays(date,delta){const ms=new Date(`${date}T00:00:00+09:00`).getTime();return jstDate(ms+delta*DAY)}
  function dateOf(value){const ms=new Date(value||0).getTime();return Number.isFinite(ms)&&ms>0?jstDate(ms):""}
  function recordDate(r){return String(r.raceDate||dateOf(r.time)||"")}
  function eventDate(e){return dateOf(e.at)}
  function hour(value){const ms=new Date(value||0).getTime();if(!Number.isFinite(ms))return -1;return new Date(ms+JST).getUTCHours()}
  function state(){return read(STATE_KEY,{})||{}}
  function records(){const r=state().records;return Array.isArray(r)?r:[]}
  function events(){const e=read(DECISION_KEY,[]);return Array.isArray(e)?e:[]}

  function stats(date){
    const r=records().filter(x=>recordDate(x)===date).sort((a,b)=>new Date(a.time||0)-new Date(b.time||0));
    const e=events().filter(x=>eventDate(x)===date);
    const stakes=r.map(x=>Number(x.stake)||0).filter(x=>x>0);
    const total=stakes.reduce((a,b)=>a+b,0);
    const night=r.filter(x=>hour(x.time)>=18).length;
    const liveActions=e.filter(x=>x.name==="decision_action"&&x.payload?.kind==="live");
    let hundredRun=0,run=0,rapid=0,afterMissRaise=0,liveBeforeAir=0;
    r.forEach((x,i)=>{
      if(Number(x.stake)===100){run++;hundredRun=Math.max(hundredRun,run)}else run=0;
      if(i>0){
        const prev=r[i-1];
        const gap=(new Date(x.time||0)-new Date(prev.time||0))/60000;
        if(Number.isFinite(gap)&&gap>=0&&gap<=10)rapid++;
        if(prev.status==="miss"&&(Number(x.stake)||0)>(Number(prev.stake)||0))afterMissRaise++;
      }
      const t=new Date(x.time||0).getTime();
      if(liveActions.some(l=>{const lt=new Date(l.at||0).getTime();return lt<=t&&t-lt<=30*60*1000&&String(l.venueCode||"")===String(x.venueCode||"")&&Number(l.raceNo)===Number(x.raceNo)}))liveBeforeAir++;
    });
    return {date,r,count:r.length,stakes,total,avg:mean(stakes),max:stakes.length?Math.max(...stakes):0,night,nightRate:r.length?night/r.length:0,hundredRun,rapid,afterMissRaise,liveBeforeAir};
  }

  function pct(cur,prev){if(!prev)return cur?null:0;return ((cur-prev)/Math.abs(prev))*100}
  function pctText(cur,prev){const d=pct(cur,prev);if(d===null)return "前日は0";if(Math.abs(d)<1)return "ほぼ同じ";return `${d>0?"+":""}${Math.round(d)}%`}

  function trigger(now,prev){
    const candidates=[];
    const push=(score,title,text)=>candidates.push({score,title,text});
    if(now.night>=2&&now.nightRate>prev.nightRate+.2)push(3+now.night,"夜の参加",`18時以降のAIR BETが${now.night}回。前日より夜への集中が強まりました。`);
    if(now.hundredRun>=3&&now.hundredRun>prev.hundredRun)push(2.8+now.hundredRun/10,"100B連続参加",`100B参加が最大${now.hundredRun}レース連続。少額でも連続する動きが前日より強く出ています。`);
    if(now.rapid>=2&&now.rapid>prev.rapid)push(3.2+now.rapid/10,"短時間の連続参加",`10分以内の次AIR BETが${now.rapid}回。参加間隔が短くなる場面が増えています。`);
    if(now.afterMissRaise>prev.afterMissRaise&&now.afterMissRaise>0)push(3.5+now.afterMissRaise/10,"不的中後の増額",`不的中の次にAIR BET額を上げた場面が${now.afterMissRaise}回ありました。`);
    if(now.liveBeforeAir>prev.liveBeforeAir&&now.liveBeforeAir>0)push(2.7+now.liveBeforeAir/10,"LIVE後の参加",`LIVE視聴から30分以内のAIR BETが${now.liveBeforeAir}回。映像視聴後の参加が増えています。`);
    return candidates.sort((a,b)=>b.score-a.score)[0]||null;
  }

  function reason(now,prev){
    if(!prev.count)return "前日のAIR BET記録がないため、比較はこれからです。";
    const td=pct(now.total,prev.total),cd=pct(now.count,prev.count),ad=pct(now.avg,prev.avg);
    if(td===null)return "前日からAIR BETが始まっているため、増減率はまだ参考扱いです。";
    if(Math.abs(td)<10)return "AIR総額は前日と大きく変わっていません。";
    const c=Math.abs(cd||0),a=Math.abs(ad||0);
    if(c>=a*1.25)return td>0?"総額増加の主因は、1回の金額より参加回数の増加です。":"総額減少の主因は、1回の金額より参加回数の減少です。";
    if(a>=c*1.25)return td>0?"総額増加の主因は、参加回数より1回平均額の上昇です。":"総額減少の主因は、参加回数より1回平均額の低下です。";
    return td>0?"総額増加には、参加回数と1回平均額の両方が影響しています。":"総額減少には、参加回数と1回平均額の両方が影響しています。";
  }

  function render(){
    const press=document.getElementById("mamoPressIntel");
    if(!press||press.dataset.type&&press.dataset.type!=="morning"){
      document.getElementById("mamoMorningInsight")?.remove();
      return;
    }
    const today=jstDate(),y=addDays(today,-1),p=addDays(today,-2),now=stats(y),prev=stats(p),t=trigger(now,prev);
    let box=document.getElementById("mamoMorningInsight");
    if(!box){box=document.createElement("section");box.id="mamoMorningInsight";box.className="mamo-morning-insight";const results=press.querySelector(".mpi-results");if(results)results.insertAdjacentElement("beforebegin",box);else press.appendChild(box)}
    const main=t?`${t.title}が最も目立った行動シグナルです。${t.text}`:"昨日は強いトリガーを断定できる差はまだありません。";
    box.innerHTML=`<div class="mmi-head"><span>YESTERDAY / COMPARISON</span><h4>昨日の変化</h4></div><div class="mmi-grid"><div><small>AIR総額</small><b>${fmt(now.total)}B</b><em>${esc(pctText(now.total,prev.total))}</em></div><div><small>回数</small><b>${now.count}回</b><em>${esc(pctText(now.count,prev.count))}</em></div><div><small>平均AIR</small><b>${now.count?fmt(now.avg)+"B":"—"}</b><em>${esc(pctText(now.avg,prev.avg))}</em></div><div><small>最大AIR</small><b>${now.count?fmt(now.max)+"B":"—"}</b><em>前日 ${prev.count?fmt(prev.max)+"B":"—"}</em></div></div><div class="mmi-note"><b>加音 守 / 昨日の読み</b><p>${esc(reason(now,prev))} ${esc(main)}</p></div><small class="mmi-foot">比較対象：昨日 vs 一昨日。勝敗予想ではなく、AIR BETの行動差を見ています。</small>`;
  }

  function style(){
    if(document.getElementById("mamoMorningInsightStyle"))return;
    const s=document.createElement("style");s.id="mamoMorningInsightStyle";s.textContent=`.mamo-morning-insight{margin-top:10px;background:#fffdf6;border:1px solid #d5ccb8;padding:12px;border-left:5px solid #ffc83d}.mmi-head span{font-size:8px;font-weight:1000;letter-spacing:.12em;color:#007c78}.mmi-head h4{font-size:17px;margin:2px 0 8px}.mmi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.mmi-grid>div{background:#f4f8f8;padding:7px}.mmi-grid small{display:block;font-size:8px;color:#68767e;font-weight:900}.mmi-grid b{display:block;font-size:14px;margin-top:2px}.mmi-grid em{display:block;font-style:normal;font-size:8px;color:#007c78;font-weight:900;margin-top:2px}.mmi-note{margin-top:8px;padding:9px;background:#f8f4e8}.mmi-note b{font-size:9px;color:#071b2b}.mmi-note p{margin:4px 0 0;font-size:10px;line-height:1.7}.mmi-foot{display:block;margin-top:6px;font-size:8px;color:#697a80}@media(max-width:520px){.mmi-grid{grid-template-columns:repeat(2,1fr)}}`;
    document.head.appendChild(s);
  }

  function boot(){
    style();
    render();
    window.addEventListener("mamo:press-intelligence-rendered",render);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
