/* MAMO BOAT PRESS Intelligence v3 — behavior analysis + factual AIR BET race results. */
(() => {
  "use strict";
  if (window.__MAMO_PRESS_INTEL_V3__) return;
  window.__MAMO_PRESS_INTEL_V3__ = true;

  const STATE_KEY="mamoboat_v40_personal", DECISION_KEY="mamoboat_decision_events_v1", JST=9*60*60*1000, DAY=86400000;
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch(_){return f}};
  const state=()=>read(STATE_KEY,{});
  const events=()=>{const x=read(DECISION_KEY,[]);return Array.isArray(x)?x:[]};
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const avg=a=>a.length?a.reduce((s,n)=>s+n,0)/a.length:0;
  const yen=n=>`${Math.round(Number(n)||0).toLocaleString("ja-JP")}円`;
  const bfmt=n=>`${Math.round(Number(n)||0).toLocaleString("ja-JP")}B`;
  const pad=n=>String(n).padStart(2,"0");

  function jstDate(ms=Date.now()){const d=new Date(ms+JST);return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`}
  function dateOf(value){const ms=new Date(value||0).getTime();return Number.isFinite(ms)&&ms>0?jstDate(ms):""}
  function addDays(date,delta){const ms=new Date(`${date}T00:00:00+09:00`).getTime();return jstDate(ms+delta*DAY)}
  function previousDate(){return addDays(jstDate(),-1)}
  function shortDate(date){const [,m,d]=String(date).split("-");return `${Number(m)}月${Number(d)}日`}
  function hourOf(value){const ms=new Date(value||0).getTime();if(!Number.isFinite(ms))return null;return new Date(ms+JST).getUTCHours()}
  function timeBand(hour){if(hour==null)return"不明";if(hour<9)return"朝";if(hour<12)return"午前";if(hour<17)return"昼〜夕方";if(hour<21)return"夜";return"深夜"}
  function recordDate(r){return String(r.raceDate||dateOf(r.time)||"")}
  function eventDate(e){return dateOf(e.at)}
  function allRecords(){const r=state().records;return Array.isArray(r)?r:[]}
  function dateRange(endDate,days){return Array.from({length:days},(_,i)=>addDays(endDate,-(days-1-i)))}

  function mode(values){const map=new Map();for(const v of values.filter(Boolean))map.set(v,(map.get(v)||0)+1);return [...map.entries()].sort((a,b)=>b[1]-a[1])[0]||null}
  function behaviorMetrics(dates){
    const set=new Set(dates),r=allRecords().filter(x=>set.has(recordDate(x))),e=events().filter(x=>set.has(eventDate(x)));
    const stakes=r.map(x=>Number(x.stake)||0).filter(n=>n>0),urges=r.map(x=>Number(x.urge)).filter(Number.isFinite),afterUrges=r.map(x=>Number(x.afterUrge)).filter(Number.isFinite);
    const starts=e.filter(x=>x.name==="race_session_start").length,skips=e.filter(x=>x.name==="skip_detected").length,transitions=e.filter(x=>x.name==="real_transition"),live=e.filter(x=>x.name==="decision_action"&&x.payload?.kind==="live").length;
    const reasons=r.map(x=>String(x.reason||"").trim()).filter(Boolean),bands=r.map(x=>timeBand(hourOf(x.time))),topReason=mode(reasons),topBand=mode(bands);
    return {days:dates.length,records:r,events:e,air:r.length,totalStake:stakes.reduce((a,b)=>a+b,0),avgStake:avg(stakes),maxStake:stakes.length?Math.max(...stakes):0,avgUrge:avg(urges),maxUrge:urges.length?Math.max(...urges):0,avgAfterUrge:avg(afterUrges),starts,skips,skipRate:starts?skips/starts:0,reals:transitions.length,realRate:starts?transitions.length/starts:0,live,hundred:r.filter(x=>Number(x.stake)===100).length,topReason:topReason?.[0]||null,topReasonCount:topReason?.[1]||0,topBand:topBand?.[0]||null,topBandCount:topBand?.[1]||0,reviewed:r.filter(x=>x.behaviorReviewed===true).length};
  }
  function perDay(m,key){return m.days?Number(m[key]||0)/m.days:0}
  function diffText(current,baseline,key,label){const cur=Number(current[key]||0),base=Number(baseline[key]||0);if(!base||!Number.isFinite(cur)||!Number.isFinite(base))return null;const d=(cur-base)/Math.abs(base);if(Math.abs(d)<.2)return null;return `${label}は最近の基準より${Math.round(Math.abs(d)*100)}%${d>0?"高め":"低め"}`}
  function strongestSignal(cur,base){
    const signals=[],stake=diffText(cur,{avgStake:base.avgStake},"avgStake","1回あたりのAIR BET");
    if(stake)signals.push({score:Math.abs((cur.avgStake-base.avgStake)/(base.avgStake||1)),text:stake});
    if(base.avgUrge>0&&cur.avgUrge>0){const d=(cur.avgUrge-base.avgUrge)/base.avgUrge;if(Math.abs(d)>=.15)signals.push({score:Math.abs(d)*1.2,text:`賭けたい気持ちは最近より${d>0?"強め":"弱め"}（${cur.avgUrge.toFixed(1)}/10）`})}
    if(base.starts>=3&&cur.starts){const d=cur.skipRate-base.skipRate;if(Math.abs(d)>=.15)signals.push({score:Math.abs(d)*1.3,text:`見送り率が最近より${Math.round(Math.abs(d)*100)}ポイント${d>0?"高い":"低い"}`})}
    if(cur.topReason&&cur.topReasonCount>=2)signals.push({score:.38+cur.topReasonCount*.03,text:`参加理由は「${cur.topReason}」に偏っている`});
    if(cur.topBand&&cur.topBandCount>=2)signals.push({score:.32+cur.topBandCount*.02,text:`AIR BETが「${cur.topBand}」に集中している`});
    return signals.sort((a,b)=>b.score-a.score)[0]?.text||null;
  }
  function confidence(m,base){const total=m.air+m.starts+base.air+base.starts;if(total>=60)return"傾向";if(total>=25)return"仮説";if(total>=8)return"参考";return"蓄積中"}

  function goldUnderstanding(){
    const s=state(),records=Array.isArray(s.records)?s.records:[];
    const reviewed=records.filter(r=>r.behaviorReviewed===true).length;
    const settled=records.filter(r=>r.settled===true||["hit","miss","refunded"].includes(String(r.status||""))).length;
    const reasons=new Set(records.map(r=>String(r.reason||"").trim()).filter(Boolean));
    const decisionCount=events().length;
    const score=Math.min(100,Math.round(
      Math.min(50,records.length*2.2)+
      Math.min(20,reviewed*4)+
      Math.min(15,settled*1.2)+
      Math.min(15,reasons.size*3)
    ));
    let label="取材開始",next="まず5件のAIR BET記録を集めると、比較の輪郭が見え始めます。";
    if(score>=80){label="長期傾向を読める段階";next="十分な記録があります。月ごとの変化と長期トリガーを追います。"}
    else if(score>=60){label="個人パターンを比較中";next="事後レビューを増やすと、勝負前後の変化をさらに深く読めます。"}
    else if(score>=40){label="行動の輪郭を確認中";next="参加理由と事後レビューが増えるほど、トリガーの精度が上がります。"}
    else if(score>=20){label="傾向を集めています";next="10件以上の記録を目安に、時間帯や参加理由の偏りを比較します。"}
    const themes=[records.length>0,reasons.size>0,reviewed>0,decisionCount>0].filter(Boolean).length;
    return {score,label,next,total:records.length,reviewed,settled,themes};
  }

  function ensureGoldDesk(){
    const analysis=document.getElementById("analysis");if(!analysis)return null;
    let desk=document.getElementById("goldEditorialDesk");
    if(desk)return desk;
    desk=document.createElement("section");
    desk.id="goldEditorialDesk";
    desk.className="gold-editorial-desk";
    desk.innerHTML=`<div class="ged-live">
      <div class="ged-mast"><span>GOLD / PRIVATE EDITORIAL</span><b>専属編集部</b></div>
      <div class="ged-head"><div><small>MAMO BOAT編集部</small><h2>あなたを知るほど、記事は深くなる。</h2><p>勝敗ではなく、あなた自身の勝負の選び方を継続取材します。</p></div><div class="ged-ring"><strong id="goldUnderstandingScore">0%</strong><span>編集部の理解度</span></div></div>
      <div class="ged-status"><span>現在</span><b id="goldUnderstandingLabel">取材開始</b></div>
      <div class="ged-kpis"><div><span>取材記録</span><b id="goldRecordCount">0件</b></div><div><span>事後レビュー</span><b id="goldReviewCount">0件</b></div><div><span>分析テーマ</span><b id="goldThemeCount">0項目</b></div></div>
      <div class="ged-next"><span>NEXT INTERVIEW</span><b id="goldNextTarget">記録を集めています。</b></div>
      <div class="ged-actions"><button type="button" onclick="setReportType('morning')">今朝の朝刊を読む →</button><button type="button" onclick="openDeepInterview()">編集部に深掘りを依頼 →</button></div>
      <small class="ged-note">理解度は記録量・事後レビュー・参加理由・結果反映の揃い方から算出する「分析準備度」です。勝率や的中可能性ではありません。</small>
    </div><div class="ged-lock"><span>GOLD / PRIVATE EDITORIAL</span><h3>🔒 あなた専属のMAMO BOAT編集部</h3><p>朝刊・週間・月刊に加え、使うほど蓄積する「編集部の理解度」で長期変化まで追います。</p><b>→ GOLDで開放</b></div>`;
    const paper=document.getElementById("pressPaper");
    if(paper?.parentElement===analysis)analysis.insertBefore(desk,paper);else analysis.appendChild(desk);
    return desk;
  }

  function renderGoldDesk(){
    const desk=ensureGoldDesk();if(!desk)return;
    const info=goldUnderstanding();
    desk.style.setProperty("--gold-understanding",`${info.score}%`);
    const setText=(id,value)=>{const node=document.getElementById(id);if(node)node.textContent=value};
    setText("goldUnderstandingScore",`${info.score}%`);
    setText("goldUnderstandingLabel",info.label);
    setText("goldRecordCount",`${info.total}件`);
    setText("goldReviewCount",`${info.reviewed}件`);
    setText("goldThemeCount",`${info.themes}項目`);
    setText("goldNextTarget",info.next);
  }

  function winningOrder(record){
    const direct=record.finishOrder||record.resultOrder||record.result?.finishOrder||record.result?.order||record.result?.top3;
    if(Array.isArray(direct)&&direct.length>=3)return direct.slice(0,3).join("-");
    if(typeof direct==="string"&&direct.trim())return direct.trim();
    const payouts=Array.isArray(record.resultPayouts)?record.resultPayouts:[];
    for(const p of payouts){
      const type=String(p.betType||p.type||p.kind||"").toLowerCase();
      if(!type.includes("trifecta")&&!type.includes("3連単")&&!type.includes("sanrentan"))continue;
      const combo=p.combo||p.selection||p.winningCombo||p.number;
      if(Array.isArray(combo)&&combo.length>=3)return combo.slice(0,3).join("-");
      if(typeof combo==="string"&&combo.trim())return combo.replace(/[→>]/g,"-").trim();
    }
    return "";
  }
  function betText(record){
    const lines=Array.isArray(record.lines)?record.lines:[];
    if(!lines.length)return "買い目詳細なし";
    return lines.slice(0,4).map(l=>{const c=Array.isArray(l.combo)?l.combo.join("-"):String(l.combo||"—");return `${c} / ${bfmt(l.stake||100)}`}).join("、")+(lines.length>4?` ほか${lines.length-4}点`:"");
  }
  function venueText(record){return String(record.venueName||record.venueLabel||record.venue||record.venueCode||"会場")}
  function raceNoText(record){const n=record.raceNo??record.raceNumber??record.number;return n?`${n}R`:""}
  function outcomeText(record){
    const status=String(record.status||"");
    if(status==="hit")return `的中 / 仮想払戻 ${bfmt(record.payoutC||record.payout||0)}`;
    if(status==="miss")return "不的中 / 仮想払戻 0B";
    if(status==="refunded")return `返還 / ${bfmt(record.refundC||record.stake||0)}`;
    return record.settled?"結果確定":"結果待ち";
  }
  function resultCards(records){
    if(!records.length)return "";
    return `<section class="mpi-results"><div class="mpi-results-head"><span>RESULTS / 事実欄</span><h4>昨日のAIR BET結果</h4><small>勝敗の良し悪しは評価せず、公式結果と仮想投票の事実だけを掲載します。</small></div>${records.map((r,i)=>{const order=winningOrder(r);return `<div class="mpi-result-card"><div class="mpi-result-title"><b>${esc(venueText(r))} ${esc(raceNoText(r))}</b><span>${esc(recordDate(r))}</span></div><dl><div><dt>公式結果</dt><dd>${order?esc(order):r.settled||["hit","miss","refunded"].includes(String(r.status||""))?"確定済み（着順詳細は記録に未保存）":"結果待ち"}</dd></div><div><dt>AIR BET</dt><dd>${esc(betText(r))}</dd></div><div><dt>仮想結果</dt><dd>${esc(outcomeText(r))}</dd></div></dl></div>`}).join("")}</section>`;
  }

  function buildArticle(type){
    const target=previousDate(),isMorning=type==="morning",curDates=isMorning?[target]:dateRange(target,type==="weekly"?7:30),baseDays=type==="monthly"?60:type==="weekly"?21:7,baseEnd=addDays(curDates[0],-1),baseDates=dateRange(baseEnd,baseDays),cur=behaviorMetrics(curDates),base=behaviorMetrics(baseDates),label=type==="monthly"?"月刊":type==="weekly"?"週間":"朝刊",signal=strongestSignal(cur,base),level=confidence(cur,base);
    let headline="まだ勝負を決めつけない。記録を積み上げる。";
    if(signal)headline=signal+"。";else if(cur.air===0&&cur.skips>0)headline="賭けなかった日にも、選択の記録は残っている。";else if(cur.air>=2&&cur.avgUrge>=7)headline="参加回数より、強い衝動が重なった場面に注目したい。";else if(cur.air>=2)headline="AIR BETの使い方から、勝負を選ぶ輪郭が見え始めた。";
    const paragraphs=[],periodLabel=isMorning?shortDate(target):`${shortDate(curDates[0])}〜${shortDate(curDates.at(-1))}`;
    paragraphs.push(`${periodLabel}はAIR BET ${cur.air}回、仮想投票へ置き換えた予定額は${yen(cur.totalStake)}。${cur.starts?`閲覧開始${cur.starts}回のうち見送り${cur.skips}回、公式投票サイトを開いた記録は${cur.reals}回です。`:"閲覧開始ログはまだ十分ではありません。"}`);
    if(cur.air){const bits=[`1回あたり平均${bfmt(cur.avgStake)}`,`最大${bfmt(cur.maxStake)}`];if(cur.avgUrge)bits.push(`平均の「現金で買いたい気持ち」${cur.avgUrge.toFixed(1)}/10`);paragraphs.push(bits.join("、")+"でした。")}
    if(cur.topReason)paragraphs.push(`もっとも多かった参加理由は「${cur.topReason}」${cur.topReasonCount>1?`（${cur.topReasonCount}回）`:""}。理由の偏りは、金額より先に見ておきたい行動情報です。`);
    if(cur.topBand)paragraphs.push(`AIR BETが最も集まった時間帯は「${cur.topBand}」${cur.topBandCount>1?`（${cur.topBandCount}回）`:""}でした。今後も同じ時間帯に衝動が重なるかを追います。`);
    if(base.air||base.starts){const baseAirPerDay=perDay(base,"air"),curAirPerDay=perDay(cur,"air");let compare=`直前${baseDays}日との比較では、AIR BETは1日平均${baseAirPerDay.toFixed(1)}回に対して今回は${curAirPerDay.toFixed(1)}回`;if(base.avgUrge&&cur.avgUrge)compare+=`、衝動値は${base.avgUrge.toFixed(1)}に対して${cur.avgUrge.toFixed(1)}`;paragraphs.push(compare+"です。")}else paragraphs.push("比較できる過去データはまだ少ないため、今日は基準づくりの日です。");
    if(signal)paragraphs.push(`加音 守が今日もっとも注目した変化は「${signal}」。勝敗ではなく、選択が起きる条件として記録します。`);
    paragraphs.push(level==="蓄積中"?"まだサンプルが少ないため、断定せず観察メモとして残します。":`現在の判定強度は「${level}」。データが増えるほど、あなた自身の普段との差を細かく見られるようになります。`);
    return {label,type,target,periodLabel,cur,base,baseDays,level,headline,paragraphs,signal};
  }

  function render(){
    const analysis=document.getElementById("analysis");if(!analysis)return;
    const anchor=document.getElementById("pressPaper")||document.getElementById("analysisList");if(!anchor)return;
    let panel=document.getElementById("mamoPressIntel");if(!panel){panel=document.createElement("section");panel.id="mamoPressIntel";panel.className="mamo-press-intel";anchor.insertAdjacentElement("afterend",panel)}
    const type=panel.dataset.type||"morning",a=buildArticle(type),c=a.cur,reasonChip=c.topReason?`<span>主な理由<b>${esc(c.topReason)}</b></span>`:"",timeChip=c.topBand?`<span>集中時間<b>${esc(c.topBand)}</b></span>`:"";
    panel.innerHTML=`<div class="mpi-mast"><div><span>MAMO BOAT PRESS / ${esc(a.label)}</span><h3>加音 守の行動記事</h3></div><b>${esc(a.level)}</b></div><div class="mpi-tabs"><button data-p="morning" class="${type==="morning"?"active":""}">朝刊</button><button data-p="weekly" class="${type==="weekly"?"active":""}">週間</button><button data-p="monthly" class="${type==="monthly"?"active":""}">月刊</button></div><article><small>${esc(a.periodLabel)} / HEADLINE</small><h2>${esc(a.headline)}</h2>${a.paragraphs.map(p=>`<p>${esc(p)}</p>`).join("")}<footer>― 加音 守 / MAMO BOAT PRESS</footer></article>${type==="morning"?resultCards(c.records):""}<div class="mpi-kpis"><span>AIR<b>${c.air}</b></span><span>置換予定額<b>${esc(yen(c.totalStake))}</b></span><span>衝動平均<b>${c.avgUrge?c.avgUrge.toFixed(1):"—"}</b></span><span>見送り<b>${c.skips}</b></span>${reasonChip}${timeChip}</div><small class="mpi-note">勝敗・艇・買い目・賭け金の良し悪しは評価しません。結果欄は公式結果と仮想投票結果の事実表示です。この記事は端末内の行動記録から「自分の普段との差」を観察するためのものです。</small>`;
    panel.querySelectorAll("[data-p]").forEach(btn=>btn.onclick=()=>{panel.dataset.type=btn.dataset.p;render()});
    renderGoldDesk();
    window.dispatchEvent(new CustomEvent("mamo:press-intelligence-rendered",{detail:{type}}));
  }

  function style(){
    if(document.getElementById("mamoPressIntelStyle"))return;
    const s=document.createElement("style");s.id="mamoPressIntelStyle";
    s.textContent=`.mamo-press-intel{margin:14px 0 22px;background:#f7f3e8;border:1px solid #d8cfba;box-shadow:3px 4px 0 rgba(7,27,43,.08);padding:14px}.mpi-mast{display:flex;justify-content:space-between;border-bottom:4px double #071b2b;padding-bottom:8px}.mpi-mast span{font-size:9px;font-weight:1000;letter-spacing:.12em}.mpi-mast h3{margin:2px 0;font-size:20px}.mpi-mast>b{align-self:center;background:#071b2b;color:#fff;padding:5px 8px;font-size:10px}.mpi-tabs{display:flex;gap:5px;margin:10px 0}.mpi-tabs button{flex:1;border:1px solid #b9b09d;background:#fff;padding:8px;font-weight:900}.mpi-tabs button.active{background:#071b2b;color:#fff}.mamo-press-intel article{background:#fffdf6;padding:13px;border-top:5px solid #00a8a0}.mamo-press-intel article>small{font-size:8px;font-weight:1000;color:#007c78}.mamo-press-intel article h2{font-size:20px;line-height:1.35;margin:4px 0 10px}.mamo-press-intel article p{font-size:11px;line-height:1.75;margin:7px 0}.mamo-press-intel article footer{text-align:right;font-size:9px;font-weight:900;margin-top:12px}.mpi-results{margin-top:10px;background:#fff;border:1px solid #d5ccb8}.mpi-results-head{padding:11px 12px;border-bottom:3px double #071b2b}.mpi-results-head>span{font-size:8px;font-weight:1000;letter-spacing:.12em;color:#007c78}.mpi-results-head h4{font-size:17px;margin:2px 0}.mpi-results-head small{font-size:8px;color:#68767e}.mpi-result-card{padding:11px 12px;border-bottom:1px solid #ded7c8}.mpi-result-card:last-child{border-bottom:0}.mpi-result-title{display:flex;justify-content:space-between;gap:8px;margin-bottom:7px}.mpi-result-title b{font-size:13px}.mpi-result-title span{font-size:8px;color:#6c7a80}.mpi-result-card dl{margin:0}.mpi-result-card dl>div{display:grid;grid-template-columns:70px 1fr;gap:7px;padding:5px 0;border-top:1px dotted #d8d1c4}.mpi-result-card dt{font-size:8px;font-weight:1000;color:#6a777d}.mpi-result-card dd{margin:0;font-size:10px;font-weight:800}.mpi-kpis{display:grid;grid-template-columns:repeat(2,1fr);gap:5px;margin-top:8px}.mpi-kpis span{background:#fff;padding:7px;font-size:8px;font-weight:900;min-width:0}.mpi-kpis b{display:block;font-size:14px;margin-top:2px;overflow-wrap:anywhere}.mpi-note{display:block;margin-top:9px;font-size:8px;line-height:1.6;color:#697a80}
    #analysis.active>#goldEditorialDesk{order:49!important}
    .gold-editorial-desk{--gold-understanding:0%;position:relative;margin:14px 0 18px;border-radius:16px;overflow:hidden;box-shadow:0 10px 26px rgba(7,27,43,.13)}
    .ged-live{display:none;padding:17px;background:linear-gradient(145deg,#071b2b 0%,#0d3047 68%,#103f51 100%);color:#fff;border-top:4px solid #d8a12a}
    body[data-mamo-plan="gold"] .gold-editorial-desk .ged-live{display:block}body[data-mamo-plan="gold"] .gold-editorial-desk .ged-lock{display:none}
    .ged-mast{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.18)}.ged-mast span{color:#f0c45a;font-size:8px;font-weight:1000;letter-spacing:.15em}.ged-mast b{padding:4px 8px;border:1px solid rgba(240,196,90,.55);border-radius:999px;color:#f4d889;font-size:8px}
    .ged-head{display:grid;grid-template-columns:minmax(0,1fr) 112px;gap:14px;align-items:center;padding:16px 0 12px}.ged-head small{color:#8fd9d3;font-size:8px;font-weight:900}.ged-head h2{margin:4px 0 7px;color:#fff;font-size:24px;line-height:1.22;letter-spacing:-.055em}.ged-head p{margin:0;color:#d3e0e5;font-size:10px;line-height:1.6}
    .ged-ring{width:108px;height:108px;border-radius:50%;display:grid;place-items:center;align-content:center;background:radial-gradient(circle at center,#0b2d45 57%,transparent 58%),conic-gradient(#d8a12a var(--gold-understanding),rgba(255,255,255,.13) 0);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}.ged-ring strong{font-size:23px;color:#fff;line-height:1}.ged-ring span{margin-top:5px;color:#e7cf91;font-size:7px;font-weight:900}
    .ged-status{display:flex;align-items:center;gap:8px;margin:2px 0 10px;padding:9px 10px;background:rgba(255,255,255,.07);border-left:3px solid #d8a12a}.ged-status span{color:#9db1bd;font-size:8px;font-weight:900}.ged-status b{font-size:11px}
    .ged-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.ged-kpis div{padding:10px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);border-radius:9px}.ged-kpis span{display:block;color:#9fb4bf;font-size:7px;font-weight:900}.ged-kpis b{display:block;margin-top:3px;color:#fff;font-size:15px}
    .ged-next{margin:9px 0 10px;padding:11px 12px;background:#fffaf0;color:#071b2b;border-radius:10px}.ged-next span{display:block;color:#a87719;font-size:7px;font-weight:1000;letter-spacing:.12em}.ged-next b{display:block;margin-top:4px;font-size:10px;line-height:1.55}
    .ged-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.ged-actions button{min-height:42px;border:1px solid rgba(255,255,255,.25);border-radius:9px;background:#fff;color:#071b2b;font-size:9px;font-weight:1000}.ged-actions button:last-child{background:transparent;color:#fff}
    .ged-note{display:block;margin-top:10px;color:#9eb1bb;font-size:7px;line-height:1.55}
    .ged-lock{padding:18px 17px;background:linear-gradient(135deg,#fffdf8,#f8f3e6);border:1px solid #e4d7b7;border-left:5px solid #c8941f;color:#071b2b}.ged-lock>span{color:#a87719;font-size:7px;font-weight:1000;letter-spacing:.14em}.ged-lock h3{margin:5px 0 7px;font-size:19px;letter-spacing:-.035em}.ged-lock p{margin:0;color:#61717c;font-size:10px;line-height:1.6}.ged-lock b{display:block;margin-top:9px;color:#8c6513;font-size:10px}
    @media(max-width:520px){.ged-head{grid-template-columns:minmax(0,1fr) 92px;gap:9px}.ged-ring{width:90px;height:90px}.ged-ring strong{font-size:20px}.ged-head h2{font-size:21px}.ged-kpis{gap:5px}.ged-kpis div{padding:8px 6px}.ged-kpis b{font-size:13px}.ged-actions{grid-template-columns:1fr}.ged-actions button{min-height:40px}}
    @media(min-width:640px){.mpi-kpis{grid-template-columns:repeat(4,1fr)}}`;
    document.head.appendChild(s);
  }
  function boot(){
    style();
    render();
    renderGoldDesk();
    window.addEventListener("mamo:analysis-rendered",()=>{render();renderGoldDesk()});
    window.addEventListener("pageshow",renderGoldDesk);
    window.addEventListener("storage",e=>{if(e.key===STATE_KEY)renderGoldDesk()});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();