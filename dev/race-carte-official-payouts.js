/* MAMO BOAT — Race Carte official payout bridge v1 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_CARTE_OFFICIAL_PAYOUTS_V1__) return;
  window.__MAMO_RACE_CARTE_OFFICIAL_PAYOUTS_V1__ = true;

  const KEY = "mamoboat_v40_personal";
  const VENUES = {"01":"桐生","02":"戸田","03":"江戸川","04":"平和島","05":"多摩川","06":"浜名湖","07":"蒲郡","08":"常滑","09":"津","10":"三国","11":"びわこ","12":"住之江","13":"尼崎","14":"鳴門","15":"丸亀","16":"児島","17":"宮島","18":"徳山","19":"下関","20":"若松","21":"芦屋","22":"福岡","23":"唐津","24":"大村"};
  const LABELS = {trifecta:"3連単",trio:"3連複",exacta:"2連単",quinella:"2連複",wide:"拡連複",win:"単勝",place:"複勝"};
  const ORDER = ["trifecta","trio","exacta","quinella","wide","win","place"];
  const esc = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const clean = v => String(v ?? "").replace(/[\s　]+/g, "").trim();
  const yen = v => `${Math.round(Number(v)||0).toLocaleString("ja-JP")}円`;

  function state(){try{return JSON.parse(localStorage.getItem(KEY)||"null")||{};}catch(_){return{};}}
  function records(){const s=state();const a=Array.isArray(s.records)?s.records:Array.isArray(s.sets)?s.sets:[];return a.filter(Boolean).slice().sort((x,y)=>String(y.time||y.createdAt||y.raceDate||y.date||"").localeCompare(String(x.time||x.createdAt||x.raceDate||x.date||"")));}
  function dateOf(r){const raw=String(r?.raceDate||r?.date||r?.time||r?.createdAt||"");const m=raw.match(/^(\d{4})[-\/]?(\d{2})[-\/]?(\d{2})/);if(m)return `${m[1]}-${m[2]}-${m[3]}`;try{const d=new Date(raw);if(!Number.isNaN(d.getTime()))return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);}catch(_){}return"";}
  function venueCode(r){const direct=String(r?.venueCode||r?.jcd||"").replace(/\D/g,"").padStart(2,"0");if(VENUES[direct])return direct;const name=clean(r?.venue||r?.venueName);return Object.entries(VENUES).find(([,n])=>name.includes(clean(n))||clean(n).includes(name))?.[0]||"";}
  function raceNo(r){return Number(String(r?.raceNo??r?.race??"").replace(/R$/i,""));}
  function activeRecord(){const title=clean(document.querySelector("#mamoRaceCarteOverlay .mamo-carte-hero h2")?.textContent);if(!title)return null;return records().find(r=>{const code=venueCode(r),name=clean(r?.venue||r?.venueName||VENUES[code]||"");const no=raceNo(r);return name&&no&&title.includes(name)&&title.includes(`${no}R`);})||null;}
  function normalizeCombo(value,type){const nums=String(value??"").match(/[1-6]/g)||[];if(type==="trio"||type==="quinella"||type==="wide")return nums.map(Number).sort((a,b)=>a-b).join("-");return nums.join("-");}
  function resultFromRecord(r){return r?.resultSnapshot||r?.result||null;}
  function payoutsFromResult(result){const p=result?.payouts;if(p&&typeof p==="object")return p;const tri=Array.isArray(result?.sanrensho)?result.sanrensho:[];return tri.length?{trifecta:tri}:{};}
  function finalOdds(payout){const n=Number(payout);return Number.isFinite(n)&&n>0?(n/100).toFixed(1):"—";}
  function boughtType(r){return String(r?.betType||r?.lines?.[0]?.betType||"");}
  function boughtCombos(r){const ls=Array.isArray(r?.lines)&&r.lines.length?r.lines:[r];return ls.map(l=>normalizeCombo(Array.isArray(l?.combo)?l.combo.join("-"):l?.combo,boughtType(r))).filter(Boolean);}
  function relevantPayout(r,payouts){const type=boughtType(r);const combos=boughtCombos(r);const rows=Array.isArray(payouts?.[type])?payouts[type]:[];return rows.find(x=>combos.includes(normalizeCombo(x?.combination,type)))||rows[0]||null;}

  function payoutHtml(r,result){const payouts=payoutsFromResult(result);const relevant=relevantPayout(r,payouts);const rows=[];for(const type of ORDER){for(const item of (Array.isArray(payouts[type])?payouts[type]:[])){rows.push(`<div class="mamo-official-payout-row"><b>${LABELS[type]}</b><span>${esc(item?.combination||"—")}</span><strong>${yen(item?.payout)}</strong><em>${finalOdds(item?.payout)}倍</em></div>`);}}
    const headline=relevant?`<div class="mamo-official-payout-focus"><span>あなたの券種の確定払戻</span><strong>${yen(relevant.payout)}</strong><b>確定オッズ相当 ${finalOdds(relevant.payout)}倍</b></div>`:"";
    if(!rows.length)return '<div class="mamo-carte-note">公式払戻データはまだ確定していません。</div>';
    return `${headline}<div class="mamo-official-payout-list">${rows.join("")}</div><small class="mamo-official-note">払戻金は100円あたり。確定オッズ相当は「払戻金 ÷ 100」で表示しています。</small>`;
  }

  function style(){if(document.getElementById("mamoOfficialPayoutStyle"))return;const s=document.createElement("style");s.id="mamoOfficialPayoutStyle";s.textContent=`.mamo-official-payout-focus{display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:end;padding:10px;margin-bottom:8px;border-radius:10px;background:#f3f8fa}.mamo-official-payout-focus span{font-size:8px;color:#6d818c;font-weight:900}.mamo-official-payout-focus strong{grid-row:1/3;grid-column:2;font-size:18px;color:#11823b}.mamo-official-payout-focus b{font-size:10px;color:#0a3554}.mamo-official-payout-list{display:grid}.mamo-official-payout-row{display:grid;grid-template-columns:48px 1fr auto 44px;gap:6px;align-items:center;padding:7px 2px;border-bottom:1px solid #e5ecef;font-size:9px;color:#17394e}.mamo-official-payout-row b{color:#6d818c}.mamo-official-payout-row strong{font-size:10px}.mamo-official-payout-row em{font-style:normal;text-align:right;color:#11823b;font-weight:900}.mamo-official-note{display:block;margin-top:7px;color:#7a8c95;font-size:8px;line-height:1.5}`;document.head.appendChild(s);}

  async function fetchResult(r){const date=dateOf(r),code=venueCode(r),no=raceNo(r);if(!date||!code||!no)return null;try{const res=await fetch(`data/${date}.json?officialPayout=${Date.now()}`,{cache:"no-store"});if(!res.ok)return null;const data=await res.json();const venue=(data?.venues||[]).find(v=>String(v?.code||"").padStart(2,"0")===code);return venue?.races?.find(x=>Number(x?.number)===no)?.result||null;}catch(_){return null;}}

  async function render(){const overlay=document.getElementById("mamoRaceCarteOverlay"),panel=overlay?.querySelector('[data-carte-panel="summary"]');if(!overlay||overlay.hidden||!panel)return;const r=activeRecord();if(!r)return;let block=panel.querySelector(".mamo-official-payout-block");if(!block){block=document.createElement("div");block.className="mamo-carte-block mamo-official-payout-block";block.innerHTML='<h3>公式払戻・確定オッズ</h3><div class="mamo-official-payout-body"><div class="mamo-carte-note">公式払戻を確認中…</div></div>';const finish=panel.querySelector(".mamo-carte-block");finish?.insertAdjacentElement("beforebegin",block);}const live=await fetchResult(r);const result=live||resultFromRecord(r);block.querySelector(".mamo-official-payout-body").innerHTML=payoutHtml(r,result);}

  function schedule(){setTimeout(render,0);setTimeout(render,180);}
  function boot(){style();document.addEventListener("click",e=>{if(e.target?.closest?.(".mamo-carte-btn,[data-race-carte-index]"))schedule();},true);window.addEventListener("mamo:race-carte-snapshot",schedule);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();