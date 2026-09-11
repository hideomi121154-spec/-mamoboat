/* MAMO BOAT — Race Carte official payout bridge v3
 * Adds a read-only composite-odds view derived from the odds snapshots already
 * stored on each AIR BET line. It does not mutate AIR BET, wallet or records.
 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_CARTE_OFFICIAL_PAYOUTS_V3__) return;
  window.__MAMO_RACE_CARTE_OFFICIAL_PAYOUTS_V3__ = true;
  const KEY="mamoboat_v40_personal",VENUES={"01":"桐生","02":"戸田","03":"江戸川","04":"平和島","05":"多摩川","06":"浜名湖","07":"蒲郡","08":"常滑","09":"津","10":"三国","11":"びわこ","12":"住之江","13":"尼崎","14":"鳴門","15":"丸亀","16":"児島","17":"宮島","18":"徳山","19":"下関","20":"若松","21":"芦屋","22":"福岡","23":"唐津","24":"大村"},LABELS={trifecta:"3連単",trio:"3連複",exacta:"2連単",quinella:"2連複",wide:"拡連複",win:"単勝",place:"複勝"},ORDER=["trifecta","trio","exacta","quinella","wide","win","place"],COMPOSITE_TYPES=new Set(["trifecta","trio","exacta","quinella","win"]);
  const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;"),clean=v=>String(v??"").replace(/[\s　]+/g,"").trim(),yen=v=>`${Math.round(Number(v)||0).toLocaleString("ja-JP")}円`;

  function ensureSnapshotHydration(){
    if(window.MAMO_RACE_CARTE_SNAPSHOT){
      window.MAMO_RACE_CARTE_SNAPSHOT.backfill?.(100);
      return;
    }
    if(document.getElementById("mamoRaceCarteSnapshotLoader"))return;
    const s=document.createElement("script");
    s.id="mamoRaceCarteSnapshotLoader";
    s.src=`race-carte-snapshot.js?v=20260907-6`;
    s.async=false;
    s.onload=()=>{
      window.MAMO_RACE_CARTE_SNAPSHOT?.backfill?.(100);
      setTimeout(()=>window.MAMO_RACE_CARTE_SNAPSHOT?.backfill?.(100),500);
    };
    document.head.appendChild(s);
  }

  function state(){try{return JSON.parse(localStorage.getItem(KEY)||"null")||{};}catch(_){return{};}}
  function records(){const s=state(),a=Array.isArray(s.records)?s.records:Array.isArray(s.sets)?s.sets:[];return a.filter(Boolean).slice().sort((x,y)=>String(y.time||y.createdAt||y.raceDate||y.date||"").localeCompare(String(x.time||x.createdAt||x.raceDate||x.date||"")));}
  function dateOf(r){const raw=String(r?.raceDate||r?.date||r?.time||r?.createdAt||""),m=raw.match(/^(\d{4})[-\/]?(\d{2})[-\/]?(\d{2})/);if(m)return`${m[1]}-${m[2]}-${m[3]}`;try{const d=new Date(raw);if(!Number.isNaN(d.getTime()))return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);}catch(_){}return"";}
  function venueCode(r){const d=String(r?.venueCode||r?.jcd||"").replace(/\D/g,"").padStart(2,"0");if(VENUES[d])return d;const n=clean(r?.venue||r?.venueName);return Object.entries(VENUES).find(([,x])=>n.includes(clean(x))||clean(x).includes(n))?.[0]||"";}
  function raceNo(r){return Number(String(r?.raceNo??r?.race??"").replace(/R$/i,""));}
  function activeRecord(){const title=clean(document.querySelector("#mamoRaceCarteOverlay .mamo-carte-hero h2")?.textContent);return records().find(r=>{const c=venueCode(r),n=clean(r?.venue||r?.venueName||VENUES[c]||""),no=raceNo(r);return n&&no&&title.includes(n)&&title.includes(`${no}R`)})||null;}
  function combo(v,t){const a=String(v??"").match(/[1-6]/g)||[];return(t==="trio"||t==="quinella"||t==="wide")?a.map(Number).sort((x,y)=>x-y).join("-"):a.join("-");}
  function payouts(result){if(result?.payouts&&typeof result.payouts==="object")return result.payouts;return Array.isArray(result?.sanrensho)&&result.sanrensho.length?{trifecta:result.sanrensho}:{};}
  function odds(v){const n=Number(v);return Number.isFinite(n)&&n>0?(n/100).toFixed(1):"—";}
  function type(r){return String(r?.betType||r?.lines?.[0]?.betType||"");}
  function relevant(r,p){const t=type(r),ls=Array.isArray(r?.lines)&&r.lines.length?r.lines:[r],cs=ls.map(l=>combo(Array.isArray(l?.combo)?l.combo.join("-"):l?.combo,t)),rows=Array.isArray(p[t])?p[t]:[];return rows.find(x=>cs.includes(combo(x?.combination,t)))||rows[0]||null;}

  function lineOddsNumber(v){
    const m=String(v??"").trim().match(/^([0-9]+(?:\.[0-9]+)?)/),n=m?Number(m[1]):NaN;
    return Number.isFinite(n)&&n>1?n:NaN;
  }
  function compositeOdds(r){
    const ls=Array.isArray(r?.lines)?r.lines:[];
    if(!ls.length)return{status:"missing",value:null,count:0,type:""};
    const seen=new Set(),values=[];
    let sharedType="";
    for(const l of ls){
      const t=String(l?.betType||type(r)||"");
      if(!t||!COMPOSITE_TYPES.has(t))return{status:"unsupported",value:null,count:values.length,type:t};
      if(sharedType&&sharedType!==t)return{status:"mixed",value:null,count:values.length,type:""};
      sharedType=t;
      const c=combo(Array.isArray(l?.combo)?l.combo.join("-"):l?.combo,t),key=`${t}:${c}`;
      if(!c||seen.has(key))continue;
      seen.add(key);
      const n=lineOddsNumber(l?.odds);
      if(!Number.isFinite(n))return{status:"missing",value:null,count:values.length,type:sharedType};
      values.push(n);
    }
    if(!values.length)return{status:"missing",value:null,count:0,type:sharedType};
    const inverseSum=values.reduce((sum,n)=>sum+(1/n),0),value=inverseSum>0?1/inverseSum:NaN;
    return Number.isFinite(value)&&value>0?{status:"ok",value,count:values.length,type:sharedType}:{status:"missing",value:null,count:values.length,type:sharedType};
  }
  function compositeHtml(r){
    const result=compositeOdds(r);
    if(result.status==="ok")return`<div class="mamo-composite-odds-focus"><div><span>投票時合成オッズ</span><small>保存済み参考オッズ ${result.count}点から算出</small></div><strong>${result.value.toFixed(2)}倍</strong></div>`;
    const note=result.status==="unsupported"?"拡連複・複勝など同時的中し得る券種は、単純な合成オッズを表示しません。":result.status==="mixed"?"異なる券種が混在しているため、単純な合成オッズを表示しません。":"参考オッズ未保存の買い目を含むため算出できません。";
    return`<div class="mamo-composite-odds-focus unavailable"><div><span>投票時合成オッズ</span><small>${esc(note)}</small></div><strong>—</strong></div>`;
  }
  function renderComposite(r,panel){
    const grid=panel?.querySelector(".mamo-carte-grid");if(!grid)return;
    let b=panel.querySelector(".mamo-composite-odds-block");
    if(!b){b=document.createElement("div");b.className="mamo-carte-block mamo-composite-odds-block";b.innerHTML="<h3>買い目全体の効率</h3><div class=\"mamo-composite-odds-body\"></div>";grid.insertAdjacentElement("afterend",b);}
    const body=b.querySelector(".mamo-composite-odds-body");if(body)body.innerHTML=compositeHtml(r);
  }
  window.MAMO_RACE_CARTE_COMPOSITE_ODDS=Object.freeze({calculate:compositeOdds});

  function html(r,result){const p=payouts(result),rel=relevant(r,p),rows=[];for(const t of ORDER)for(const x of(Array.isArray(p[t])?p[t]:[]))rows.push(`<div class="mamo-official-payout-row"><b>${LABELS[t]}</b><span>${esc(x?.combination||"—")}</span><strong>${yen(x?.payout)}</strong><em>${odds(x?.payout)}倍</em></div>`);if(!rows.length)return'<div class="mamo-carte-note">公式払戻データはまだ確定していません。</div>';return`${rel?`<div class="mamo-official-payout-focus"><span>あなたの券種の確定払戻</span><strong>${yen(rel.payout)}</strong><b>確定オッズ相当 ${odds(rel.payout)}倍</b></div>`:""}<div class="mamo-official-payout-list">${rows.join("")}</div><small class="mamo-official-note">払戻金は100円あたり。確定オッズ相当は「払戻金 ÷ 100」で表示しています。</small>`;}
  function style(){if(document.getElementById("mamoOfficialPayoutStyle"))return;const s=document.createElement("style");s.id="mamoOfficialPayoutStyle";s.textContent=`.mamo-composite-odds-focus{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px;border-radius:10px;background:#f3f8fa}.mamo-composite-odds-focus>div{min-width:0}.mamo-composite-odds-focus span{display:block;font-size:9px;color:#607785;font-weight:1000}.mamo-composite-odds-focus small{display:block;margin-top:4px;font-size:8px;line-height:1.45;color:#7a8c95}.mamo-composite-odds-focus strong{flex:0 0 auto;font-size:20px;color:#0a3554}.mamo-composite-odds-focus.unavailable strong{color:#7a8c95}.mamo-official-payout-focus{display:grid;grid-template-columns:1fr auto;gap:4px 10px;padding:10px;margin-bottom:8px;border-radius:10px;background:#f3f8fa}.mamo-official-payout-focus span{font-size:8px;color:#6d818c;font-weight:900}.mamo-official-payout-focus strong{grid-row:1/3;grid-column:2;font-size:18px;color:#11823b}.mamo-official-payout-focus b{font-size:10px;color:#0a3554}.mamo-official-payout-row{display:grid;grid-template-columns:48px 1fr auto 44px;gap:6px;align-items:center;padding:7px 2px;border-bottom:1px solid #e5ecef;font-size:9px;color:#17394e}.mamo-official-payout-row b{color:#6d818c}.mamo-official-payout-row strong{font-size:10px}.mamo-official-payout-row em{font-style:normal;text-align:right;color:#11823b;font-weight:900}.mamo-official-note{display:block;margin-top:7px;color:#7a8c95;font-size:8px;line-height:1.5}`;document.head.appendChild(s);}
  async function fetchResult(r){const d=dateOf(r),c=venueCode(r),n=raceNo(r);if(!d||!c||!n)return null;try{const q=await fetch(`data/${d}.json?officialPayout=${Date.now()}`,{cache:"no-store"});if(!q.ok)return null;const data=await q.json(),v=(data?.venues||[]).find(x=>String(x?.code||"").padStart(2,"0")===c);return v?.races?.find(x=>Number(x?.number)===n)?.result||null}catch(_){return null}}
  async function render(){const o=document.getElementById("mamoRaceCarteOverlay"),panel=o?.querySelector('[data-carte-panel="summary"]');if(!o||o.hidden||!panel)return;const r=activeRecord();if(!r)return;renderComposite(r,panel);let b=panel.querySelector(".mamo-official-payout-block");if(!b){b=document.createElement("div");b.className="mamo-carte-block mamo-official-payout-block";b.innerHTML='<h3>公式払戻・確定オッズ</h3><div class="mamo-official-payout-body"><div class="mamo-carte-note">公式払戻を確認中…</div></div>';const composite=panel.querySelector(".mamo-composite-odds-block");if(composite)composite.insertAdjacentElement("afterend",b);else panel.querySelector(".mamo-carte-block")?.insertAdjacentElement("beforebegin",b)}const live=await fetchResult(r),fallback=r?.resultSnapshot||r?.result||null;b.querySelector(".mamo-official-payout-body").innerHTML=html(r,live||fallback);}
  function schedule(){setTimeout(render,0);setTimeout(render,180);setTimeout(render,900)}
  function boot(){style();ensureSnapshotHydration();document.addEventListener("click",e=>{if(e.target?.closest?.(".mamo-carte-btn,[data-race-carte-index]")){ensureSnapshotHydration();schedule()}},true);window.addEventListener("mamo:race-carte-snapshot",schedule);schedule();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
