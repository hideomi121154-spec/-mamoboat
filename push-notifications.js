/* MAMO BOAT Morning Push v4 — GOLD-only */
(()=>{
  "use strict";
  if(window.__MAMO_PUSH_V4__) return; window.__MAMO_PUSH_V4__=true;
  const ENDPOINT="https://mihicuoijitluvrufsoj.supabase.co/rest/v1/rpc/";
  const TEST_ENDPOINT="https://mihicuoijitluvrufsoj.supabase.co/functions/v1/send-test-push";
  const KEY="sb_publishable_cexgWfIKzthZ1d6tLOH3_g_sWgcunHB";
  const PREF="mamoboat_morning_push_v1";
  const STATE_KEY="mamoboat_v40_personal";
  const DECISION_KEY="mamoboat_decision_events_v1";
  const VAPID="BD4NQXdKBIAt5FwA-6V-ufBPchoNsakFui55_LvE0n5_L5pU5L-YPSI4FXTCmCSGLoePls_KSO1jLLkOENNFSxc";
  const b64=s=>{const p="=".repeat((4-s.length%4)%4);const raw=atob((s+p).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))};
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch(_){return f}};
  function currentPlan(){const raw=read(STATE_KEY,{}).pressroom?.plan;return raw==="matsu"?"gold":raw==="take"?"silver":raw==="ume"?"bronze":raw||"free"}
  const goldEnabled=()=>currentPlan()==="gold";
  async function rpc(name,body){const r=await fetch(ENDPOINT+name,{method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});if(!r.ok)throw new Error(`通知設定の保存に失敗しました (${r.status})`);return r;}
  async function registration(){if(!('serviceWorker'in navigator))throw new Error("この端末は通知に対応していません");return navigator.serviceWorker.ready;}
  function participantId(){const id=String(read(STATE_KEY,{}).pilot?.participantId||"").trim();return /^[A-Za-z0-9_-]{3,40}$/.test(id)?id:"";}
  function jstDate(value=Date.now()){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value));}
  function shiftDay(day,delta){const [y,m,d]=day.split("-").map(Number);const x=new Date(Date.UTC(y,m-1,d+delta));return x.toISOString().slice(0,10)}
  function hasActivity(day){const s=read(STATE_KEY,{}),records=Array.isArray(s.records)?s.records:[],events=read(DECISION_KEY,[]);if(records.some(r=>r?.time&&jstDate(r.time)===day))return true;return Array.isArray(events)&&events.some(e=>e?.at&&jstDate(e.at)===day&&["race_session_start","skip_detected","real_transition","decision_action"].includes(e.name));}
  async function syncActivity(){if(!goldEnabled()||localStorage.getItem(PREF)!=="1")return;const id=participantId();if(!id)return;const today=jstDate(),yesterday=shiftDay(today,-1);for(const day of [yesterday,today]){if(hasActivity(day))await rpc("upsert_push_activity",{p_participant_id:id,p_day_jst:day,p_has_activity:true});}}
  async function saveSubscription(sub){if(!goldEnabled())throw new Error("朝刊プッシュ通知はGOLDプランの機能です");const id=participantId();if(!id)throw new Error("設定画面のテスター番号を保存してから通知をONにしてください");const j=sub.toJSON();await rpc("upsert_push_subscription",{p_endpoint:j.endpoint,p_p256dh:j.keys?.p256dh||"",p_auth:j.keys?.auth||"",p_participant_id:id,p_user_agent:navigator.userAgent,p_timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Tokyo",p_morning_enabled:true});}
  async function enable(){
    if(!goldEnabled())throw new Error("朝刊プッシュ通知はGOLDプランで利用できます");
    if(!('Notification'in window)||!('PushManager'in window))throw new Error("このブラウザではプッシュ通知を利用できません");
    if(!participantId())throw new Error("設定画面のテスター番号を保存してから通知をONにしてください");
    const perm=await Notification.requestPermission();if(perm!=="granted")throw new Error("通知が許可されませんでした");
    const reg=await registration();let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(VAPID)});
    await saveSubscription(sub);localStorage.setItem(PREF,"1");await syncActivity();return true;
  }
  async function disable(){try{const reg=await registration();const sub=await reg.pushManager.getSubscription();if(sub){await rpc("disable_push_subscription",{p_endpoint:sub.endpoint});await sub.unsubscribe()}}finally{localStorage.setItem(PREF,"0")}}
  async function sendTest(){
    if(!goldEnabled())throw new Error("テスト通知はGOLDプランで利用できます");
    if(localStorage.getItem(PREF)!=="1")throw new Error("先に朝刊通知をONにしてください");
    const reg=await registration();const sub=await reg.pushManager.getSubscription();if(!sub)throw new Error("通知登録が見つかりません。いったんOFF→ONを試してください");
    const r=await fetch(TEST_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json",apikey:KEY},body:JSON.stringify({endpoint:sub.endpoint})});
    let data={};try{data=await r.json()}catch(_){}
    if(r.status===429)throw new Error("テスト通知は1分に1回までです");
    if(!r.ok||data.ok!==true)throw new Error("テスト通知の送信に失敗しました");
    return true;
  }
  async function refreshExisting(){if(!goldEnabled()){if(localStorage.getItem(PREF)==="1"){try{await disable()}catch(_){localStorage.setItem(PREF,"0")}}return}if(localStorage.getItem(PREF)!=="1")return;try{const reg=await registration();const sub=await reg.pushManager.getSubscription();if(sub){await saveSubscription(sub);await syncActivity()}else localStorage.setItem(PREF,"0")}catch(_){}}
  function updatePanelAccess(){const p=document.getElementById("mamoPushPanel");if(!p)return;const toggle=p.querySelector("#mamoPushToggle"),test=p.querySelector("#mamoPushTest"),note=p.querySelector("#mamoPushNote");if(!toggle||!test||!note)return;const gold=goldEnabled(),on=localStorage.getItem(PREF)==="1";p.dataset.planLocked=gold?"false":"true";if(!gold){toggle.disabled=true;toggle.textContent="GOLD限定";test.disabled=true;note.textContent="朝刊のプッシュ通知はGOLDプランで利用できます。";return}toggle.disabled=false;toggle.textContent=on?"通知 ON":"通知 OFF";test.disabled=!on;note.textContent=on?"毎朝8時ごろ、朝刊がある日だけ通知します。":"タップすると端末の通知許可を確認します。";}
  function render(){const settings=document.getElementById("settings");if(!settings)return;let p=document.getElementById("mamoPushPanel");if(!p){p=document.createElement("div");p.id="mamoPushPanel";p.className="panel";p.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><small style="font-weight:900;color:#087d77">MAMO BOAT PRESS / GOLD</small><h3 style="margin:3px 0">朝刊のプッシュ通知</h3><p style="margin:0;color:#6e7b85;font-size:11px;line-height:1.55">前日の行動がある朝だけ、朝刊の到着をお知らせします。</p></div><button id="mamoPushToggle" type="button" style="min-width:82px;min-height:42px;border:1px solid #d8a12a;background:#fff;border-radius:10px;font-weight:900">通知 OFF</button></div><div style="display:grid;grid-template-columns:1fr;gap:8px;margin-top:10px"><button id="mamoPushTest" type="button" disabled style="min-height:42px;border:1px solid #0c8d86;background:#f2f2f2;color:#999;border-radius:10px;font-weight:900">テスト通知を送る</button></div><p id="mamoPushNote" style="font-size:10px;color:#6e7b85;margin:8px 0 0"></p>`;const intro=settings.querySelector(".settings-intro");(intro||settings.firstElementChild)?.insertAdjacentElement("afterend",p);const toggle=p.querySelector("#mamoPushToggle"),test=p.querySelector("#mamoPushTest"),note=p.querySelector("#mamoPushNote");toggle.onclick=async()=>{if(!goldEnabled()){updatePanelAccess();return}toggle.disabled=true;try{if(localStorage.getItem(PREF)==="1"){await disable();toggle.textContent="通知 OFF";test.disabled=true;note.textContent="朝刊通知をOFFにしました。"}else{await enable();toggle.textContent="通知 ON";test.disabled=false;note.textContent="朝刊通知をONにしました。朝刊がある日の朝8時ごろに届きます。"}}catch(e){note.textContent=e.message||"通知設定に失敗しました。"}finally{updatePanelAccess()}};test.onclick=async()=>{if(!goldEnabled()){updatePanelAccess();return}test.disabled=true;const old=test.textContent;test.textContent="送信中…";try{await sendTest();test.textContent="送信しました ✓";note.textContent="数秒以内にテスト通知が届きます。通知をタップすると朝刊を開きます。";setTimeout(()=>{test.textContent=old;updatePanelAccess()},4000)}catch(e){test.textContent=old;note.textContent=e.message||"テスト通知に失敗しました。";updatePanelAccess()}}}updatePanelAccess()}
  async function handlePlanChange(){if(!goldEnabled()&&localStorage.getItem(PREF)==="1"){try{await disable()}catch(_){localStorage.setItem(PREF,"0")}}updatePanelAccess()}
  function boot(){render();refreshExisting().finally(updatePanelAccess);setInterval(syncActivity,120000);document.addEventListener("visibilitychange",()=>{if(!document.hidden){render();syncActivity()}});document.addEventListener("click",event=>{if(!event.target?.closest?.("[data-pilot-plan], .plan-option"))return;Promise.resolve().then(handlePlanChange)},false);window.addEventListener("pageshow",()=>{render();handlePlanChange()});window.addEventListener("beforeunload",()=>{syncActivity()})}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
