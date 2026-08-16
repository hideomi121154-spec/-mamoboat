/* MAMO BOAT Morning Push v2 */
(()=>{
  "use strict";
  if(window.__MAMO_PUSH_V2__) return; window.__MAMO_PUSH_V2__=true;
  const ENDPOINT="https://mihicuoijitluvrufsoj.supabase.co/rest/v1/rpc/";
  const KEY="sb_publishable_cexgWfIKzthZ1d6tLOH3_g_sWgcunHB";
  const PREF="mamoboat_morning_push_v1";
  const STATE_KEY="mamoboat_v40_personal";
  const DECISION_KEY="mamoboat_decision_events_v1";
  const VAPID="BD4NQXdKBIAt5FwA-6V-ufBPchoNsakFui55_LvE0n5_L5pU5L-YPSI4FXTCmCSGLoePls_KSO1jLLkOENNFSxc";
  const b64=s=>{const p="=".repeat((4-s.length%4)%4);const raw=atob((s+p).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))};
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch(_){return f}};
  async function rpc(name,body){const r=await fetch(ENDPOINT+name,{method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});if(!r.ok)throw new Error(`通知設定の保存に失敗しました (${r.status})`);return r;}
  async function registration(){if(!('serviceWorker'in navigator))throw new Error("この端末は通知に対応していません");return navigator.serviceWorker.ready;}
  function participantId(){const id=String(read(STATE_KEY,{}).pilot?.participantId||"").trim();return /^[A-Za-z0-9_-]{3,40}$/.test(id)?id:"";}
  function jstDate(value=Date.now()){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value));}
  function shiftDay(day,delta){const [y,m,d]=day.split("-").map(Number);const x=new Date(Date.UTC(y,m-1,d+delta));return x.toISOString().slice(0,10)}
  function hasActivity(day){const s=read(STATE_KEY,{}),records=Array.isArray(s.records)?s.records:[],events=read(DECISION_KEY,[]);if(records.some(r=>r?.time&&jstDate(r.time)===day))return true;return Array.isArray(events)&&events.some(e=>e?.at&&jstDate(e.at)===day&&["race_session_start","skip_detected","real_transition","decision_action"].includes(e.name));}
  async function syncActivity(){if(localStorage.getItem(PREF)!=="1")return;const id=participantId();if(!id)return;const today=jstDate(),yesterday=shiftDay(today,-1);for(const day of [yesterday,today]){if(hasActivity(day))await rpc("upsert_push_activity",{p_participant_id:id,p_day_jst:day,p_has_activity:true});}}
  async function saveSubscription(sub){const id=participantId();if(!id)throw new Error("設定画面のテスター番号を保存してから通知をONにしてください");const j=sub.toJSON();await rpc("upsert_push_subscription",{p_endpoint:j.endpoint,p_p256dh:j.keys?.p256dh||"",p_auth:j.keys?.auth||"",p_participant_id:id,p_user_agent:navigator.userAgent,p_timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Tokyo",p_morning_enabled:true});}
  async function enable(){
    if(!('Notification'in window)||!('PushManager'in window))throw new Error("このブラウザではプッシュ通知を利用できません");
    if(!participantId())throw new Error("設定画面のテスター番号を保存してから通知をONにしてください");
    const perm=await Notification.requestPermission();if(perm!=="granted")throw new Error("通知が許可されませんでした");
    const reg=await registration();let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(VAPID)});
    await saveSubscription(sub);localStorage.setItem(PREF,"1");await syncActivity();return true;
  }
  async function disable(){const reg=await registration();const sub=await reg.pushManager.getSubscription();if(sub){await rpc("disable_push_subscription",{p_endpoint:sub.endpoint});await sub.unsubscribe()}localStorage.setItem(PREF,"0");}
  async function refreshExisting(){if(localStorage.getItem(PREF)!=="1")return;try{const reg=await registration();const sub=await reg.pushManager.getSubscription();if(sub){await saveSubscription(sub);await syncActivity()}else localStorage.setItem(PREF,"0")}catch(_){}}
  function render(){const settings=document.getElementById("settings");if(!settings||document.getElementById("mamoPushPanel"))return;const on=localStorage.getItem(PREF)==="1";const p=document.createElement("div");p.id="mamoPushPanel";p.className="panel";p.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><small style="font-weight:900;color:#087d77">MAMO BOAT PRESS</small><h3 style="margin:3px 0">朝刊のプッシュ通知</h3><p style="margin:0;color:#6e7b85;font-size:11px;line-height:1.55">前日の行動がある朝だけ、朝刊の到着をお知らせします。</p></div><button id="mamoPushToggle" type="button" style="min-width:82px;min-height:42px;border:1px solid #d8a12a;background:#fff;border-radius:10px;font-weight:900">${on?"通知 ON":"通知 OFF"}</button></div><p id="mamoPushNote" style="font-size:10px;color:#6e7b85;margin:8px 0 0">${on?"毎朝8時ごろ、朝刊がある日だけ通知します。":"タップすると端末の通知許可を確認します。"}</p>`;
    const intro=settings.querySelector(".settings-intro");(intro||settings.firstElementChild)?.insertAdjacentElement("afterend",p);
    p.querySelector("#mamoPushToggle").onclick=async()=>{const b=p.querySelector("#mamoPushToggle"),n=p.querySelector("#mamoPushNote");b.disabled=true;try{if(localStorage.getItem(PREF)==="1"){await disable();b.textContent="通知 OFF";n.textContent="朝刊通知をOFFにしました。"}else{await enable();b.textContent="通知 ON";n.textContent="朝刊通知をONにしました。朝刊がある日の朝8時ごろに届きます。"}}catch(e){n.textContent=e.message||"通知設定に失敗しました。"}finally{b.disabled=false}};
  }
  function boot(){render();refreshExisting();new MutationObserver(render).observe(document.body,{childList:true,subtree:true});setInterval(syncActivity,120000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)syncActivity()});window.addEventListener("beforeunload",()=>{syncActivity()})}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();