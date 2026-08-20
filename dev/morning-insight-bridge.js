/* MAMO BOAT GOLD Morning Edition v2 — daily personal editorial + archive. */
(() => {
  "use strict";
  if (window.__MAMO_GOLD_MORNING_V2__) return;
  window.__MAMO_GOLD_MORNING_V2__ = true;

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
  function state(){return read(STATE_KEY,{})||{}}
  function records(){const r=state().records;return Array.isArray(r)?r:[]}
  function events(){const e=read(DECISION_KEY,[]);return Array.isArray(e)?e:[]}
  function shortDate(date){const [,m,d]=String(date).split("-");return `${Number(m)}月${Number(d)}日`}
  function issueLabel(date){const [y,m,d]=String(date).split("-");return `${y}.${m}.${d}`}
  function hour(value){const ms=new Date(value||0).getTime();if(!Number.isFinite(ms))return -1;return new Date(ms+JST).getUTCHours()}

  function stats(date){
    const r=records().filter(x=>recordDate(x)===date).sort((a,b)=>new Date(a.time||0)-new Date(b.time||0));
    const e=events().filter(x=>eventDate(x)===date);
    const stakes=r.map(x=>Number(x.stake)||0).filter(x=>x>0);
    const starts=e.filter(x=>x.name==="race_session_start").length;
    const skips=e.filter(x=>x.name==="skip_detected").length;
    const reals=e.filter(x=>x.name==="real_transition").length;
    const liveActions=e.filter(x=>x.name==="decision_action"&&x.payload?.kind==="live");
    const intervals=[];
    let hundredRun=0,run=0,rapid=0,afterMissRaise=0,liveBeforeAir=0;
    r.forEach((x,i)=>{
      if(Number(x.stake)===100){run++;hundredRun=Math.max(hundredRun,run)}else run=0;
      if(i>0){
        const prev=r[i-1],gap=(new Date(x.time||0)-new Date(prev.time||0))/60000;
        if(Number.isFinite(gap)&&gap>=0){intervals.push(gap);if(gap<=10)rapid++}
        if(prev.status==="miss"&&(Number(x.stake)||0)>(Number(prev.stake)||0))afterMissRaise++;
      }
      const t=new Date(x.time||0).getTime();
      if(liveActions.some(l=>{const lt=new Date(l.at||0).getTime();return lt<=t&&t-lt<=30*60*1000&&String(l.venueCode||"")===String(x.venueCode||"")&&Number(l.raceNo)===Number(x.raceNo)}))liveBeforeAir++;
    });
    const settled=r.filter(x=>x.settled===true||["hit","miss","refunded"].includes(String(x.status||"")));
    return {
      date,r,e,count:r.length,stakes,total:stakes.reduce((a,b)=>a+b,0),avg:mean(stakes),max:stakes.length?Math.max(...stakes):0,
      starts,skips,skipRate:starts?skips/starts:0,reals,night:r.filter(x=>hour(x.time)>=18).length,
      hundredRun,rapid,afterMissRaise,liveBeforeAir,avgGap:intervals.length?mean(intervals):null,
      reviewed:r.filter(x=>x.behaviorReviewed===true).length,
      hit:settled.filter(x=>x.status==="hit").length,miss:settled.filter(x=>x.status==="miss").length,
      refunded:settled.filter(x=>x.status==="refunded").length,pending:r.length-settled.length
    };
  }

  function baseline(endDate,days=7){
    const list=Array.from({length:days},(_,i)=>stats(addDays(endDate,-(days-i))));
    const stakes=list.flatMap(x=>x.stakes),gaps=list.map(x=>x.avgGap).filter(Number.isFinite);
    const starts=list.reduce((s,x)=>s+x.starts,0),skips=list.reduce((s,x)=>s+x.skips,0);
    return {
      days,list,countPerDay:mean(list.map(x=>x.count)),totalPerDay:mean(list.map(x=>x.total)),
      avgStake:mean(stakes),avgGap:gaps.length?mean(gaps):null,skipRate:starts?skips/starts:0,
      realPerDay:mean(list.map(x=>x.reals)),rapidPerDay:mean(list.map(x=>x.rapid))
    };
  }

  function understandingThrough(date){
    const r=records().filter(x=>recordDate(x)&&recordDate(x)<=date);
    const reviewed=r.filter(x=>x.behaviorReviewed===true).length;
    const settled=r.filter(x=>x.settled===true||["hit","miss","refunded"].includes(String(x.status||""))).length;
    const reasons=new Set(r.map(x=>String(x.reason||"").trim()).filter(Boolean));
    return Math.min(100,Math.round(
      Math.min(50,r.length*2.2)+Math.min(20,reviewed*4)+Math.min(15,settled*1.2)+Math.min(15,reasons.size*3)
    ));
  }

  function ratioText(cur,base,suffix=""){
    if(!Number.isFinite(base)||base<=0)return cur?"比較データ蓄積中":"—";
    const d=(cur-base)/base;
    if(Math.abs(d)<.1)return `普段とほぼ同じ${suffix}`;
    return `普段より${Math.round(Math.abs(d)*100)}%${d>0?"高い":"低い"}${suffix}`;
  }

  function signal(now,base){
    const candidates=[];
    const push=(score,key,headline,mamoru,miru)=>candidates.push({score,key,headline,mamoru,miru});
    if(now.afterMissRaise>0)push(6+now.afterMissRaise,"afterMiss","不的中後、次のAIR BET額が上がった場面があった一日",`不的中後の増額が${now.afterMissRaise}回。結果の直後に金額が変わる動きは、レース選びとは別に追う価値があります。`,`最初の不的中がなかったとしても、次のレースに同じ金額で参加していましたか？`);
    if(now.avgGap!=null&&base.avgGap!=null&&now.avgGap<base.avgGap*.65)push(5.5,"gap","次の参加までの間隔が、普段より短くなった一日",`昨日の参加間隔は平均${Math.round(now.avgGap)}分。最近7日間の基準${Math.round(base.avgGap)}分より短く、次へ向かう速さに特徴が出ています。`,`次のレースは、前の結果を見る前から参加する予定でしたか？`);
    if(now.rapid>=2&&now.rapid>base.rapidPerDay+.8)push(5.2,"rapid","短時間の連続参加が目立った一日",`10分以内の次AIR BETが${now.rapid}回。少額かどうかより、参加間隔が詰まった場面を編集部は見ています。`,`連続した中で「このレースだけは最初から参加するつもりだった」と言えるレースは何本ありましたか？`);
    if(base.avgStake>0&&now.avg>base.avgStake*1.35)push(4.8,"stake","1回あたりのAIR BET額が、普段より大きくなった一日",`昨日の平均AIR BETは${fmt(now.avg)}B。最近の基準${fmt(base.avgStake)}Bを上回りました。回数とは分けて金額の変化を見ます。`,`昨日の金額は、レースを見る前に決めていた金額でしたか？`);
    if(base.countPerDay>0&&now.count>base.countPerDay*1.45)push(4.5,"count","参加回数が、普段より増えた一日",`昨日はAIR BET ${now.count}回。最近7日間の1日平均${base.countPerDay.toFixed(1)}回より多く、参加本数に変化があります。`,`見たいレースが多かったからですか？ それとも、1回参加したあと自然に次へ進んだからですか？`);
    if(now.starts>=2&&now.skipRate>base.skipRate+.2)push(4.2,"skip","見送る判断が、普段より多かった一日",`昨日の見送り率は${Math.round(now.skipRate*100)}%。最近の基準${Math.round(base.skipRate*100)}%より高く、参加しない判断も記録に残っています。`,`見送れたレースでは、何が「今日はやめる」の判断材料になりましたか？`);
    if(now.reals>base.realPerDay+1)push(4,"real","公式投票への移動が、普段より多かった一日",`公式投票サイトを開いた記録は${now.reals}回。AIR BETとは別に、REALへ向かうタイミングを追います。`,`REALを開いた時、買う金額やレースはその前から決まっていましたか？`);
    if(now.count===0&&now.skips>0)push(3.5,"skipOnly","賭けなかった選択も、昨日の記事になる。",`AIR BETは0回でしたが、見送りが${now.skips}回記録されています。何もしなかったのではなく、参加しない判断が残った一日です。`,`見送れた一番大きな理由を1つ挙げるなら、何でしたか？`);
    if(now.count===0&&now.skips===0&&now.reals===0)push(1,"quiet","昨日は静かな一日。記録がないことも基準になる。","昨日は目立った参加記録がありませんでした。静かな日も、普段の自分を知る基準として残ります。","昨日は意識して見送ったのか、そもそもレースを見なかったのか、どちらに近いですか？");
    if(!candidates.length)push(2,"steady","大きな変化より、いつもの勝負の輪郭を確認する一日",`昨日はAIR BET ${now.count}回、平均${now.count?fmt(now.avg)+"B":"—"}。強い変化を断定せず、普段との差を積み上げます。`,`昨日の中で「予定通りだった」と思える参加はどのレースでしたか？`);
    return candidates.sort((a,b)=>b.score-a.score)[0];
  }

  function activity(date){const s=stats(date);return s.count+s.skips+s.reals+s.starts}
  function archiveDates(){
    const y=addDays(jstDate(),-1),dates=[];
    for(let i=0;i<30&&dates.length<12;i++){
      const d=addDays(y,-i);if(i===0||activity(d)>0)dates.push(d);
    }
    return dates;
  }

  function resultSummary(now){
    if(!now.count)return "AIR BET記録なし";
    const parts=[];
    if(now.hit)parts.push(`的中 ${now.hit}`);
    if(now.miss)parts.push(`不的中 ${now.miss}`);
    if(now.refunded)parts.push(`返還 ${now.refunded}`);
    if(now.pending)parts.push(`結果待ち ${now.pending}`);
    return parts.length?parts.join(" / "):"結果確定情報を確認中";
  }

  function render(issueDate){
    const press=document.getElementById("mamoPressIntel");
    if(!press||press.dataset.type&&press.dataset.type!=="morning"){
      document.getElementById("mamoMorningInsight")?.remove();
      press?.classList.remove("mmi-product-mode","mmi-archive-mode");
      return;
    }
    const latest=addDays(jstDate(),-1),selected=issueDate||document.getElementById("mamoMorningInsight")?.dataset.issue||latest;
    const now=stats(selected),base=baseline(selected,7),lead=signal(now,base);
    const score=understandingThrough(selected),prevScore=understandingThrough(addDays(selected,-1)),delta=score-prevScore;
    const isArchive=selected!==latest;
    let box=document.getElementById("mamoMorningInsight");
    if(!box){box=document.createElement("section");box.id="mamoMorningInsight";box.className="mamo-morning-insight";const results=press.querySelector(".mpi-results");if(results)results.insertAdjacentElement("beforebegin",box);else press.appendChild(box)}
    box.dataset.issue=selected;
    press.classList.add("mmi-product-mode");
    press.classList.toggle("mmi-archive-mode",isArchive);
    const archives=archiveDates();
    box.innerHTML=`
      <div class="mmi-edition-head"><div><span>MAMO BOAT PRESS / GOLD MORNING</span><b>${esc(issueLabel(selected))} 朝刊</b></div>${isArchive?'<button type="button" data-mmi-latest>今朝に戻る</button>':'<em>THIS MORNING</em>'}</div>
      <section class="mmi-front"><small>一面 / TOP STORY</small><h2>${esc(lead.headline)}</h2><p>${esc(lead.mamoru)}</p><footer>― 加音 守 / MAMO BOAT PRESS</footer></section>
      <div class="mmi-numbers"><div><span>AIR BET</span><b>${now.count}回</b><em>${esc(ratioText(now.count,base.countPerDay))}</em></div><div><span>予定額</span><b>${fmt(now.total)}B</b><em>${esc(ratioText(now.total,base.totalPerDay))}</em></div><div><span>平均AIR</span><b>${now.count?fmt(now.avg)+"B":"—"}</b><em>${esc(ratioText(now.avg,base.avgStake))}</em></div><div><span>見送り</span><b>${now.skips}回</b><em>${now.starts?`率 ${Math.round(now.skipRate*100)}%`:"閲覧ログ蓄積中"}</em></div></div>
      <section class="mmi-baseline"><div class="mmi-section-title"><span>USUAL / 7 DAYS</span><h3>普段の自分との違い</h3></div><div class="mmi-compare"><div><small>1日平均AIR</small><b>${base.countPerDay.toFixed(1)}回</b></div><div><small>1日平均予定額</small><b>${fmt(base.totalPerDay)}B</b></div><div><small>平均AIR額</small><b>${base.avgStake?fmt(base.avgStake)+"B":"—"}</b></div><div><small>平均参加間隔</small><b>${base.avgGap!=null?Math.round(base.avgGap)+"分":"—"}</b></div></div></section>
      <section class="mmi-voices"><article><span>加音 守 / EDITOR</span><b>昨日の読み</b><p>${esc(lead.mamoru)}</p></article><article class="mmi-miru"><span>木月 美留 / QUESTION</span><b>今日の1問</b><p>${esc(lead.miru)}</p></article></section>
      <section class="mmi-understanding"><div><span>編集部の理解度</span><strong>${score}%</strong><em>${delta===0?"前日から変化なし":`前日から ${delta>0?"+":""}${delta}pt`}</em></div><p>理解度は勝率ではなく、AIR BET記録・事後レビュー・参加理由・結果反映の蓄積度です。</p></section>
      <section class="mmi-result-summary"><div class="mmi-section-title"><span>RESULTS / FACT</span><h3>${esc(shortDate(selected))}のAIR BET結果</h3></div><b>${esc(resultSummary(now))}</b><p>勝敗の良し悪しは評価しません。現在の朝刊では、公式結果と仮想投票結果の事実だけを扱います。</p></section>
      <section class="mmi-archive"><div class="mmi-section-title"><span>ARCHIVE</span><h3>朝刊アーカイブ</h3></div><div class="mmi-archive-list">${archives.map(d=>`<button type="button" data-mmi-issue="${d}" class="${d===selected?"active":""}">${esc(shortDate(d))}</button>`).join("")}</div></section>
    `;
    box.querySelector("[data-mmi-latest]")?.addEventListener("click",()=>render(latest),{once:true});
    box.querySelectorAll("[data-mmi-issue]").forEach(btn=>btn.addEventListener("click",()=>render(btn.dataset.mmiIssue),{once:true}));
  }

  function style(){
    if(document.getElementById("mamoMorningInsightStyle"))return;
    const s=document.createElement("style");s.id="mamoMorningInsightStyle";
    s.textContent=`
      .mamo-press-intel.mmi-product-mode>article,.mamo-press-intel.mmi-product-mode>.mpi-kpis,.mamo-press-intel.mmi-product-mode>.mpi-note{display:none}
      .mamo-press-intel.mmi-archive-mode>.mpi-results{display:none}
      .mamo-morning-insight{margin-top:10px;background:#f7f3e8;border:1px solid #d5ccb8;padding:12px;color:#10263b}
      .mmi-edition-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:3px 2px 10px;border-bottom:4px double #071b2b}.mmi-edition-head span{display:block;color:#8b6b23;font-size:7px;font-weight:1000;letter-spacing:.13em}.mmi-edition-head b{display:block;margin-top:2px;font-size:15px}.mmi-edition-head em{font-style:normal;color:#087d77;font-size:7px;font-weight:1000}.mmi-edition-head button{border:1px solid #cfc5af;background:#fff;padding:6px 8px;border-radius:8px;color:#08233d;font-size:8px;font-weight:900}
      .mmi-front{margin-top:11px;padding:15px 14px;background:#fffdf6;border-top:6px solid #d8a12a}.mmi-front small{color:#087d77;font-size:8px;font-weight:1000;letter-spacing:.12em}.mmi-front h2{margin:4px 0 8px;font-size:23px;line-height:1.3;letter-spacing:-.045em}.mmi-front p{margin:0;font-size:10.5px;line-height:1.75}.mmi-front footer{text-align:right;margin-top:10px;font-size:8px;font-weight:900}
      .mmi-numbers{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:9px}.mmi-numbers>div{padding:9px;background:#fff;border:1px solid #e0dacb}.mmi-numbers span{display:block;color:#6a777d;font-size:7px;font-weight:900}.mmi-numbers b{display:block;margin-top:3px;font-size:15px}.mmi-numbers em{display:block;margin-top:3px;color:#087d77;font-size:7px;font-style:normal;font-weight:900;line-height:1.35}
      .mmi-baseline,.mmi-result-summary,.mmi-archive{margin-top:9px;padding:11px 12px;background:#fff;border:1px solid #ded6c5}.mmi-section-title span{color:#9a7220;font-size:7px;font-weight:1000;letter-spacing:.12em}.mmi-section-title h3{margin:2px 0 8px;font-size:15px}.mmi-compare{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.mmi-compare>div{padding:8px;background:#f5f8f8}.mmi-compare small{display:block;color:#68767e;font-size:7px;font-weight:900}.mmi-compare b{display:block;margin-top:2px;font-size:12px}
      .mmi-voices{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.mmi-voices article{padding:12px;background:#f1f7f7;border-left:4px solid #0aa39a}.mmi-voices article.mmi-miru{background:#fff8e9;border-left-color:#d8a12a}.mmi-voices span{display:block;color:#087d77;font-size:7px;font-weight:1000;letter-spacing:.08em}.mmi-voices .mmi-miru span{color:#9a7220}.mmi-voices b{display:block;margin-top:4px;font-size:12px}.mmi-voices p{margin:5px 0 0;font-size:9.5px;line-height:1.7}
      .mmi-understanding{display:grid;grid-template-columns:140px 1fr;gap:10px;align-items:center;margin-top:9px;padding:12px;background:linear-gradient(120deg,#071b2b,#0d3047);color:#fff;border-top:3px solid #d8a12a}.mmi-understanding span{display:block;color:#e8cf8f;font-size:7px;font-weight:1000}.mmi-understanding strong{display:block;margin-top:2px;font-size:25px}.mmi-understanding em{display:block;color:#8fd9d3;font-size:8px;font-style:normal;font-weight:900}.mmi-understanding p{margin:0;color:#d6e0e4;font-size:8px;line-height:1.6}
      .mmi-result-summary>b{display:block;font-size:13px}.mmi-result-summary>p{margin:5px 0 0;color:#68767e;font-size:8px;line-height:1.55}
      .mmi-archive-list{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;-webkit-overflow-scrolling:touch}.mmi-archive-list button{flex:0 0 auto;border:1px solid #d7d0c1;background:#fff;padding:7px 9px;border-radius:999px;color:#52636d;font-size:8px;font-weight:900}.mmi-archive-list button.active{background:#08233d;color:#fff;border-color:#08233d}
      @media(max-width:520px){.mmi-numbers,.mmi-compare{grid-template-columns:repeat(2,1fr)}.mmi-voices{grid-template-columns:1fr}.mmi-understanding{grid-template-columns:105px 1fr}.mmi-front h2{font-size:21px}}
    `;
    document.head.appendChild(s);
  }

  function boot(){
    style();
    render();
    window.addEventListener("mamo:press-intelligence-rendered",event=>{
      if(event.detail?.type==="morning")render(addDays(jstDate(),-1));
      else render();
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
