/* MAMO BOAT PRESS Intelligence v2 — behavior-first editorial analysis. */
(() => {
  "use strict";
  if (window.__MAMO_PRESS_INTEL_V2__) return;
  window.__MAMO_PRESS_INTEL_V2__ = true;

  const STATE_KEY="mamoboat_v40_personal", DECISION_KEY="mamoboat_decision_events_v1", JST=9*60*60*1000, DAY=86400000;
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch(_){return f}};
  const state=()=>read(STATE_KEY,{});
  const events=()=>{const x=read(DECISION_KEY,[]);return Array.isArray(x)?x:[]};
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const avg=a=>a.length?a.reduce((s,n)=>s+n,0)/a.length:0;
  const pct=n=>`${Math.round(n*100)}%`;
  const yen=n=>`${Math.round(Number(n)||0).toLocaleString("ja-JP")}円`;
  const bfmt=n=>`${Math.round(Number(n)||0).toLocaleString("ja-JP")}B`;
  const pad=n=>String(n).padStart(2,"0");

  function jstDate(ms=Date.now()){
    const d=new Date(ms+JST);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
  }
  function dateOf(value){
    const ms=new Date(value||0).getTime();
    return Number.isFinite(ms)&&ms>0?jstDate(ms):"";
  }
  function addDays(date,delta){
    const ms=new Date(`${date}T00:00:00+09:00`).getTime();
    return jstDate(ms+delta*DAY);
  }
  function previousDate(){return addDays(jstDate(),-1)}
  function shortDate(date){const [,m,d]=String(date).split("-");return `${Number(m)}月${Number(d)}日`}
  function hourOf(value){
    const ms=new Date(value||0).getTime(); if(!Number.isFinite(ms))return null;
    return new Date(ms+JST).getUTCHours();
  }
  function timeBand(hour){
    if(hour==null)return"不明";
    if(hour<9)return"朝";
    if(hour<12)return"午前";
    if(hour<17)return"昼〜夕方";
    if(hour<21)return"夜";
    return"深夜";
  }
  function recordDate(r){return String(r.raceDate||dateOf(r.time)||"")}
  function eventDate(e){return dateOf(e.at)}
  function allRecords(){const r=state().records;return Array.isArray(r)?r:[]}
  function recordsOn(date){return allRecords().filter(r=>recordDate(r)===date)}
  function eventsOn(date){return events().filter(e=>eventDate(e)===date)}
  function dateRange(endDate,days){return Array.from({length:days},(_,i)=>addDays(endDate,-(days-1-i)))}

  function mode(values){
    const map=new Map();
    for(const v of values.filter(Boolean))map.set(v,(map.get(v)||0)+1);
    return [...map.entries()].sort((a,b)=>b[1]-a[1])[0]||null;
  }
  function behaviorMetrics(dates){
    const set=new Set(dates), r=allRecords().filter(x=>set.has(recordDate(x))), e=events().filter(x=>set.has(eventDate(x)));
    const stakes=r.map(x=>Number(x.stake)||0).filter(n=>n>0);
    const urges=r.map(x=>Number(x.urge)).filter(Number.isFinite);
    const afterUrges=r.map(x=>Number(x.afterUrge)).filter(Number.isFinite);
    const starts=e.filter(x=>x.name==="race_session_start").length;
    const skips=e.filter(x=>x.name==="skip_detected").length;
    const transitions=e.filter(x=>x.name==="real_transition");
    const live=e.filter(x=>x.name==="decision_action"&&x.payload?.kind==="live").length;
    const reasons=r.map(x=>String(x.reason||"").trim()).filter(Boolean);
    const bands=r.map(x=>timeBand(hourOf(x.time)));
    const topReason=mode(reasons), topBand=mode(bands);
    return {
      days:dates.length, records:r, events:e, air:r.length, totalStake:stakes.reduce((a,b)=>a+b,0), avgStake:avg(stakes), maxStake:stakes.length?Math.max(...stakes):0,
      avgUrge:avg(urges), maxUrge:urges.length?Math.max(...urges):0, avgAfterUrge:avg(afterUrges),
      starts, skips, skipRate:starts?skips/starts:0, reals:transitions.length, realRate:starts?transitions.length/starts:0, live,
      hundred:r.filter(x=>Number(x.stake)===100).length, topReason:topReason?.[0]||null, topReasonCount:topReason?.[1]||0,
      topBand:topBand?.[0]||null, topBandCount:topBand?.[1]||0,
      reviewed:r.filter(x=>x.behaviorReviewed===true).length,
    };
  }
  function perDay(m,key){return m.days?Number(m[key]||0)/m.days:0}
  function diffText(current,baseline,key,label,unit=""){
    const cur=Number(current[key]||0), base=Number(baseline[key]||0);
    if(!base||!Number.isFinite(cur)||!Number.isFinite(base))return null;
    const d=(cur-base)/Math.abs(base);
    if(Math.abs(d)<.2)return null;
    return `${label}は最近の基準より${Math.round(Math.abs(d)*100)}%${d>0?"高め":"低め"}${unit}`;
  }
  function strongestSignal(cur,base){
    const signals=[];
    const stake=diffText(cur,{avgStake:base.avgStake},"avgStake","1回あたりのAIR BET");
    if(stake)signals.push({score:Math.abs((cur.avgStake-base.avgStake)/(base.avgStake||1)),text:stake});
    if(base.avgUrge>0&&cur.avgUrge>0){const d=(cur.avgUrge-base.avgUrge)/base.avgUrge;if(Math.abs(d)>=.15)signals.push({score:Math.abs(d)*1.2,text:`賭けたい気持ちは最近より${d>0?"強め":"弱め"}（${cur.avgUrge.toFixed(1)}/10）`})}
    if(base.starts>=3&&cur.starts){const d=cur.skipRate-base.skipRate;if(Math.abs(d)>=.15)signals.push({score:Math.abs(d)*1.3,text:`見送り率が最近より${Math.round(Math.abs(d)*100)}ポイント${d>0?"高い":"低い"}`})}
    if(cur.topReason&&cur.topReasonCount>=2)signals.push({score:.38+cur.topReasonCount*.03,text:`参加理由は「${cur.topReason}」に偏っている`});
    if(cur.topBand&&cur.topBandCount>=2)signals.push({score:.32+cur.topBandCount*.02,text:`AIR BETが「${cur.topBand}」に集中している`});
    return signals.sort((a,b)=>b.score-a.score)[0]?.text||null;
  }
  function confidence(m,base){
    const total=m.air+m.starts+base.air+base.starts;
    if(total>=60)return"傾向";
    if(total>=25)return"仮説";
    if(total>=8)return"参考";
    return"蓄積中";
  }
  function buildArticle(type){
    const target=previousDate();
    const isMorning=type==="morning";
    const curDates=isMorning?[target]:dateRange(target,type==="weekly"?7:30);
    const baseDays=type==="monthly"?60:type==="weekly"?21:7;
    const baseEnd=addDays(curDates[0],-1);
    const baseDates=dateRange(baseEnd,baseDays);
    const cur=behaviorMetrics(curDates), base=behaviorMetrics(baseDates);
    const label=type==="monthly"?"月刊":type==="weekly"?"週間":"朝刊";
    const signal=strongestSignal(cur,base);
    const level=confidence(cur,base);

    let headline="まだ勝負を決めつけない。記録を積み上げる。";
    if(signal)headline=signal+"。";
    else if(cur.air===0&&cur.skips>0)headline="賭けなかった日にも、選択の記録は残っている。";
    else if(cur.air>=2&&cur.avgUrge>=7)headline="参加回数より、強い衝動が重なった場面に注目したい。";
    else if(cur.air>=2)headline="AIR BETの使い方から、勝負を選ぶ輪郭が見え始めた。";

    const paragraphs=[];
    const periodLabel=isMorning?shortDate(target):`${shortDate(curDates[0])}〜${shortDate(curDates.at(-1))}`;
    paragraphs.push(`${periodLabel}はAIR BET ${cur.air}回、仮想投票へ置き換えた予定額は${yen(cur.totalStake)}。${cur.starts?`閲覧開始${cur.starts}回のうち見送り${cur.skips}回、公式投票サイトを開いた記録は${cur.reals}回です。`:"閲覧開始ログはまだ十分ではありません。"}`);

    if(cur.air){
      const bits=[`1回あたり平均${bfmt(cur.avgStake)}`,`最大${bfmt(cur.maxStake)}`];
      if(cur.avgUrge)bits.push(`平均の「現金で買いたい気持ち」${cur.avgUrge.toFixed(1)}/10`);
      paragraphs.push(bits.join("、")+"でした。");
    }
    if(cur.topReason)paragraphs.push(`もっとも多かった参加理由は「${cur.topReason}」${cur.topReasonCount>1?`（${cur.topReasonCount}回）`:""}。理由の偏りは、金額より先に見ておきたい行動情報です。`);
    if(cur.topBand)paragraphs.push(`AIR BETが最も集まった時間帯は「${cur.topBand}」${cur.topBandCount>1?`（${cur.topBandCount}回）`:""}でした。今後も同じ時間帯に衝動が重なるかを追います。`);

    if(base.air||base.starts){
      const baseAirPerDay=perDay(base,"air"), curAirPerDay=perDay(cur,"air");
      let compare=`直前${baseDays}日との比較では、AIR BETは1日平均${baseAirPerDay.toFixed(1)}回に対して今回は${curAirPerDay.toFixed(1)}回`;
      if(base.avgUrge&&cur.avgUrge)compare+=`、衝動値は${base.avgUrge.toFixed(1)}に対して${cur.avgUrge.toFixed(1)}`;
      paragraphs.push(compare+"です。");
    } else {
      paragraphs.push("比較できる過去データはまだ少ないため、今日は基準づくりの日です。");
    }

    if(signal)paragraphs.push(`加音 守が今日もっとも注目した変化は「${signal}」。勝敗ではなく、選択が起きる条件として記録します。`);
    paragraphs.push(level==="蓄積中"?"まだサンプルが少ないため、断定せず観察メモとして残します。":`現在の判定強度は「${level}」。データが増えるほど、あなた自身の普段との差を細かく見られるようになります。`);

    return {label,type,target,periodLabel,cur,base,baseDays,level,headline,paragraphs,signal};
  }

  function render(){
    const analysis=document.getElementById("analysis");if(!analysis)return;
    const anchor=document.getElementById("pressPaper")||document.getElementById("analysisList");if(!anchor)return;
    let panel=document.getElementById("mamoPressIntel");
    if(!panel){panel=document.createElement("section");panel.id="mamoPressIntel";panel.className="mamo-press-intel";anchor.insertAdjacentElement("afterend",panel)}
    const type=panel.dataset.type||"morning",a=buildArticle(type),c=a.cur;
    const reasonChip=c.topReason?`<span>主な理由<b>${esc(c.topReason)}</b></span>`:"";
    const timeChip=c.topBand?`<span>集中時間<b>${esc(c.topBand)}</b></span>`:"";
    panel.innerHTML=`<div class="mpi-mast"><div><span>MAMO BOAT PRESS / ${esc(a.label)}</span><h3>加音 守の行動記事</h3></div><b>${esc(a.level)}</b></div><div class="mpi-tabs"><button data-p="morning" class="${type==="morning"?"active":""}">朝刊</button><button data-p="weekly" class="${type==="weekly"?"active":""}">週間</button><button data-p="monthly" class="${type==="monthly"?"active":""}">月刊</button></div><article><small>${esc(a.periodLabel)} / HEADLINE</small><h2>${esc(a.headline)}</h2>${a.paragraphs.map(p=>`<p>${esc(p)}</p>`).join("")}<footer>― 加音 守 / MAMO BOAT PRESS</footer></article><div class="mpi-kpis"><span>AIR<b>${c.air}</b></span><span>置換予定額<b>${esc(yen(c.totalStake))}</b></span><span>衝動平均<b>${c.avgUrge?c.avgUrge.toFixed(1):"—"}</b></span><span>見送り<b>${c.skips}</b></span>${reasonChip}${timeChip}</div><small class="mpi-note">勝敗・艇・買い目・賭け金の良し悪しは評価しません。公式投票サイトを開いた記録も、実際の購入を意味しません。この記事は端末内の行動記録から「自分の普段との差」を観察するためのものです。</small>`;
    panel.querySelectorAll("[data-p]").forEach(btn=>btn.onclick=()=>{panel.dataset.type=btn.dataset.p;render()});
  }
  function style(){
    if(document.getElementById("mamoPressIntelStyle"))return;
    const s=document.createElement("style");s.id="mamoPressIntelStyle";
    s.textContent=`.mamo-press-intel{margin:14px 0 22px;background:#f7f3e8;border:1px solid #d8cfba;box-shadow:3px 4px 0 rgba(7,27,43,.08);padding:14px}.mpi-mast{display:flex;justify-content:space-between;border-bottom:4px double #071b2b;padding-bottom:8px}.mpi-mast span{font-size:9px;font-weight:1000;letter-spacing:.12em}.mpi-mast h3{margin:2px 0;font-size:20px}.mpi-mast>b{align-self:center;background:#071b2b;color:#fff;padding:5px 8px;font-size:10px}.mpi-tabs{display:flex;gap:5px;margin:10px 0}.mpi-tabs button{flex:1;border:1px solid #b9b09d;background:#fff;padding:8px;font-weight:900}.mpi-tabs button.active{background:#071b2b;color:#fff}.mamo-press-intel article{background:#fffdf6;padding:13px;border-top:5px solid #00a8a0}.mamo-press-intel article>small{font-size:8px;font-weight:1000;color:#007c78}.mamo-press-intel article h2{font-size:20px;line-height:1.35;margin:4px 0 10px}.mamo-press-intel article p{font-size:11px;line-height:1.78;margin:8px 0}.mamo-press-intel article footer{text-align:right;font-size:9px;font-weight:900;margin-top:12px}.mpi-kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:5px;margin-top:8px}.mpi-kpis span{background:#fff;padding:8px;font-size:8px;font-weight:900;min-width:0}.mpi-kpis b{display:block;font-size:15px;margin-top:3px;overflow-wrap:anywhere}.mpi-note{display:block;margin-top:9px;font-size:8px;line-height:1.6;color:#697a80}`;
    document.head.appendChild(s);
  }
  function boot(){
    style();render();
    document.addEventListener("click",()=>setTimeout(()=>{if(document.getElementById("analysis")?.classList.contains("active"))render()},80),false);
    window.addEventListener("mamo:state-synced",render);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
