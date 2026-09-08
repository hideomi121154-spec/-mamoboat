/* MAMO BOAT — Today-first record view + past AIR BET search v2
 * Surface: today's participation records only.
 * Archive: search older personal AIR BET records by date / venue.
 * Stability: no MutationObserver, no interval, no scroll correction, no viewport hooks.
 */
(() => {
  "use strict";
  window.__MAMO_RECORD_TODAY_SEARCH_V2__ = true;

  const KEY = "mamoboat_v40_personal";
  const VENUES = ["桐生","戸田","江戸川","平和島","多摩川","浜名湖","蒲郡","常滑","津","三国","びわこ","住之江","尼崎","鳴門","丸亀","児島","宮島","徳山","下関","若松","芦屋","福岡","唐津","大村"];
  let todayFilter = "all";

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; } catch (_) { return {}; } };
  const records = () => Array.isArray(read().records) ? read().records.filter(Boolean) : [];
  const settled = r => !!r?.settled && String(r?.status || "") !== "pending";
  const stake = r => Number(r?.stake ?? r?.total ?? r?.intendedYen ?? 0) || (Array.isArray(r?.lines) ? r.lines.reduce((s,l)=>s+(Number(l?.stake)||0),0) : 0);
  const esc = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const fmt = v => Math.round(Number(v)||0).toLocaleString("ja-JP");

  function parseTime(r){
    const candidates = [r?.time, r?.createdAt, r?.placedAt, r?.betAt, r?.recordedAt, r?.timestamp, r?.raceDate];
    for (const value of candidates) {
      if (!value) continue;
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.getTime();
    }
    return 0;
  }
  function dateKeyFromMs(ms){
    if (!ms) return "";
    try { return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(ms)); }
    catch (_) { const d=new Date(ms); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  }
  const todayKey = () => dateKeyFromMs(Date.now());
  const participationDate = r => dateKeyFromMs(parseTime(r));
  const sorted = () => records().slice().sort((a,b)=>parseTime(b)-parseTime(a));
  const venueName = r => String(r?.venue || r?.venueName || r?.stadium || "").trim();
  const raceNo = r => Number(r?.raceNo || r?.race) || "";
  const statusInfo = r => !settled(r) ? {key:"pending",label:"結果待ち"} : r?.status==="hit" ? {key:"hit",label:"的中"} : r?.status==="refunded" ? {key:"refund",label:"返還"} : {key:"miss",label:"不的中"};
  const cardHtml = (r,index) => window.MAMO_AIR_OUTCOME_VIEW?.cardHtml?.(r,index) || "";

  function ensureArchivePanel(latest){
    let panel=document.getElementById("rxPastRecordSearch");
    if(panel) return panel;
    panel=document.createElement("section");
    panel.id="rxPastRecordSearch";
    panel.className="rx-past-search";
    panel.innerHTML=`<div class="rx-past-head"><small>PAST AIR BET</small><h3>過去の記録を探す</h3><p>過去分は表面に並べず、日付や開催場から検索できます。</p></div>
      <div class="rx-past-form"><label><span>日付</span><input id="rxPastDate" type="date"></label><label><span>開催場</span><select id="rxPastVenue"><option value="">すべての場</option>${VENUES.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("")}</select></label></div>
      <div class="rx-past-actions"><button type="button" data-rx-past-search>検索する</button><button type="button" class="sub" data-rx-past-clear>条件をクリア</button></div>
      <div id="rxPastStatus" class="rx-past-status">日付または開催場を選んで検索してください。</div><div id="rxPastResults" class="rx-past-results"></div>`;
    latest.insertAdjacentElement("afterend",panel);
    return panel;
  }

  function renderToday(){
    const block=document.getElementById("airOutcomeBlock");
    if(!block || !window.MAMO_AIR_OUTCOME_VIEW?.cardHtml) return false;
    const all=sorted();
    const today=all.filter(r=>participationDate(r)===todayKey());
    const shown=todayFilter==="pending"?today.filter(r=>!settled(r)):todayFilter==="settled"?today.filter(settled):today;
    const done=today.filter(settled).length, waiting=today.length-done;
    const hero=block.querySelector(".rx-record-hero");
    if(hero){
      const small=hero.querySelector(":scope > small"), h2=hero.querySelector("h2"), p=hero.querySelector("p"), stats=hero.querySelector(":scope > div");
      if(small) small.textContent="TODAY / MAMO RECORD";
      if(h2) h2.textContent="本日の参加記録";
      if(p) p.textContent="今日AIR BETした記録だけを表示しています。過去分は下の検索から確認できます。";
      if(stats) stats.innerHTML=`<span>本日 ${today.length}件</span><b>確定 ${done}</b><b>結果待ち ${waiting}</b>`;
    }
    const filter=block.querySelector(".rx-filter");
    if(filter){
      const a=filter.querySelector('[data-rx-filter="all"]'), b=filter.querySelector('[data-rx-filter="pending"]'), c=filter.querySelector('[data-rx-filter="settled"]');
      if(a){a.textContent=`本日すべて ${today.length}`;a.classList.toggle("active",todayFilter==="all");}
      if(b){b.textContent=`結果待ち ${waiting}`;b.classList.toggle("active",todayFilter==="pending");}
      if(c){c.textContent=`確定 ${done}`;c.classList.toggle("active",todayFilter==="settled");}
    }
    const latest=block.querySelector(".rx-latest");
    if(!latest) return false;
    latest.innerHTML=shown.length?shown.map(r=>cardHtml(r,all.indexOf(r))).join(""):'<div class="rx-empty">本日の該当する記録はありません。</div>';
    ensureArchivePanel(latest);
    return true;
  }

  function runSearch(){
    const date=document.getElementById("rxPastDate")?.value||"";
    const venue=document.getElementById("rxPastVenue")?.value||"";
    const out=document.getElementById("rxPastResults"), status=document.getElementById("rxPastStatus");
    if(!out||!status) return;
    if(!date&&!venue){out.replaceChildren();status.textContent="日付または開催場を選んで検索してください。";return;}
    const all=sorted();
    const matches=all.filter(r=>participationDate(r)!==todayKey() && (!date||participationDate(r)===date) && (!venue||venueName(r)===venue));
    status.textContent=matches.length?`${matches.length}件見つかりました。`:`条件に一致する過去の記録はありません。`;
    out.innerHTML=matches.map(r=>{const i=all.indexOf(r),s=statusInfo(r);return `<article class="rx-past-row ${s.key}"><button type="button" class="rx-past-main" data-rx-past-detail="${i}"><span class="date">${esc(participationDate(r).replaceAll("-","/"))}</span><strong>${esc(venueName(r))} ${esc(raceNo(r))}R</strong><span class="money">${fmt(stake(r))}B</span><b>${esc(s.label)}</b><i>詳細</i></button><div class="rx-past-detail" data-rx-past-detail-body="${i}" hidden></div></article>`;}).join("");
  }
  function toggleDetail(index){const body=document.querySelector(`[data-rx-past-detail-body="${index}"]`);if(!body)return;if(!body.hidden){body.hidden=true;body.replaceChildren();return;}const all=sorted(),r=all[index];if(!r)return;body.innerHTML=cardHtml(r,index);body.hidden=false;}
  function clearSearch(){const d=document.getElementById("rxPastDate"),v=document.getElementById("rxPastVenue");if(d)d.value="";if(v)v.value="";runSearch();}

  function style(){if(document.getElementById("rxPastRecordStyleV2"))return;const s=document.createElement("style");s.id="rxPastRecordStyleV2";s.textContent=`#records .rx-past-search{margin:16px 0 20px;padding:14px;background:#fff;border:1.5px solid #d7e3e8;border-radius:14px}#records .rx-past-head small{color:#087d77;font-size:8px;font-weight:1000}#records .rx-past-head h3{margin:4px 0;color:#082b4a;font-size:20px}#records .rx-past-head p{margin:0;color:#6e818b;font-size:10px}#records .rx-past-form{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:13px}#records .rx-past-form label{display:grid;gap:5px;color:#536d79;font-size:9px;font-weight:1000}#records .rx-past-form input,#records .rx-past-form select{width:100%;min-height:44px;border:1.5px solid #ccdbe2;border-radius:10px;background:#f8fafb;color:#082b4a;padding:8px 10px;box-sizing:border-box}#records .rx-past-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}#records .rx-past-actions button{min-height:44px;border:0;border-radius:10px;background:#082b4a;color:#fff;font-weight:1000}#records .rx-past-actions .sub{background:#fff;color:#536d79;border:1.5px solid #ccdbe2}#records .rx-past-status{margin:11px 0 7px;color:#6d818b;font-size:10px}#records .rx-past-results{display:grid;gap:8px}#records .rx-past-row{border:1px solid #dfe7ea;border-radius:11px;overflow:hidden}#records .rx-past-main{display:grid;grid-template-columns:68px minmax(0,1fr) auto auto auto;gap:8px;align-items:center;width:100%;min-height:58px;padding:10px 11px;border:0;background:#fff;text-align:left;color:#082b4a}#records .rx-past-main i{color:#087d77;font-style:normal;font-weight:1000}#records .rx-past-detail{padding:0 9px 9px;background:#f6f9fa}@media(max-width:520px){#records .rx-past-main{grid-template-columns:62px minmax(0,1fr) auto;grid-template-areas:'date title status' 'date money detail'}#records .rx-past-main .date{grid-area:date}#records .rx-past-main strong{grid-area:title}#records .rx-past-main .money{grid-area:money}#records .rx-past-main b{grid-area:status}#records .rx-past-main i{grid-area:detail;text-align:right}}`;document.head.appendChild(s);}

  function forceRender(){queueMicrotask(renderToday);setTimeout(renderToday,60);setTimeout(renderToday,250);}
  document.addEventListener("click",e=>{
    const f=e.target?.closest?.("#airOutcomeBlock [data-rx-filter]");
    if(f){e.preventDefault();e.stopImmediatePropagation();todayFilter=f.dataset.rxFilter||"all";renderToday();return;}
    if(e.target?.closest?.("[data-rx-past-search]")){runSearch();return;}
    if(e.target?.closest?.("[data-rx-past-clear]")){clearSearch();return;}
    const d=e.target?.closest?.("[data-rx-past-detail]");if(d){toggleDetail(Number(d.dataset.rxPastDetail));return;}
    if(e.target?.closest?.("#nav-records")) forceRender();
  },true);
  window.addEventListener("pageshow",()=>{if(document.getElementById("records")?.classList.contains("active"))forceRender();});
  window.addEventListener("storage",e=>{if(e.key===KEY&&document.getElementById("records")?.classList.contains("active"))forceRender();});
  style();forceRender();
  window.MAMO_RECORD_TODAY_SEARCH={render:forceRender,search:runSearch};
})();