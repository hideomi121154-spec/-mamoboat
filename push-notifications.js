/* MAMO BOAT Push Foundation v1 */
(()=>{
  "use strict";
  if(window.__MAMO_PUSH_V1__) return; window.__MAMO_PUSH_V1__=true;
  const ENDPOINT="https://mihicuoijitluvrufsoj.supabase.co/rest/v1/rpc/";
  const KEY="sb_publishable_cexgWfIKzthZ1d6tLOH3_g_sWgcunHB";
  const PREF="mamoboat_morning_push_v1";
  const VAPID=window.MAMOBOAT_PUSH_VAPID_PUBLIC_KEY||"";
  const b64=s=>{const p="=".repeat((4-s.length%4)%4);const raw=atob((s+p).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))};
  async function rpc(name,body){return fetch(ENDPOINT+name,{method:"POST",headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json"},body:JSON.stringify(body)});}
  async function registration(){if(!('serviceWorker'in navigator))throw new Error("この端末は通知に対応していません");return navigator.serviceWorker.ready;}
  async function enable(){
    if(!('Notification'in window)||!('PushManager'in window))throw new Error("このブラウザではプッシュ通知を利用できません");
    if(!VAPID)throw new Error("通知配信キーの設定待ちです");
    const perm=await Notification.requestPermission();if(perm!=="granted")throw new Error("通知が許可されませんでした");
    const reg=await registration();let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(VAPID)});
    const j=sub.toJSON();await rpc("upsert_push_subscription",{p_endpoint:j.endpoint,p_p256dh:j.keys?.p256dh||"",p_auth:j.keys?.auth||"",p_user_agent:navigator.userAgent,p_timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Tokyo",p_morning_enabled:true});
    localStorage.setItem(PREF,"1");return true;
  }
  async function disable(){const reg=await registration();const sub=await reg.pushManager.getSubscription();if(sub){await rpc("disable_push_subscription",{p_endpoint:sub.endpoint});await sub.unsubscribe()}localStorage.setItem(PREF,"0");}
  function render(){const settings=document.getElementById("settings");if(!settings||document.getElementById("mamoPushPanel"))return;const p=document.createElement("div");p.id="mamoPushPanel";p.className="panel";p.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><small style="font-weight:900;color:#087d77">MAMO BOAT PRESS</small><h3 style="margin:3px 0">朝刊のプッシュ通知</h3><p style="margin:0;color:#6e7b85;font-size:11px;line-height:1.55">前日の行動がある朝だけ、朝刊の到着をお知らせします。</p></div><button id="mamoPushToggle" type="button" style="min-width:82px;min-height:42px;border:1px solid #d8a12a;background:#fff;border-radius:10px;font-weight:900">${localStorage.getItem(PREF)==="1"?"通知 ON":"通知 OFF"}</button></div><p id="mamoPushNote" style="font-size:10px;color:#6e7b85;margin:8px 0 0">${VAPID?"タップして通知を設定できます。":"配信サーバーの最終設定後にONにできます。"}</p>`;
    const intro=settings.querySelector(".settings-intro");(intro||settings.firstElementChild)?.insertAdjacentElement("afterend",p);
    p.querySelector("#mamoPushToggle").onclick=async()=>{const b=p.querySelector("#mamoPushToggle"),n=p.querySelector("#mamoPushNote");b.disabled=true;try{if(localStorage.getItem(PREF)==="1"){await disable();b.textContent="通知 OFF";n.textContent="朝刊通知をOFFにしました。"}else{await enable();b.textContent="通知 ON";n.textContent="朝刊通知をONにしました。"}}catch(e){n.textContent=e.message||"通知設定に失敗しました。"}finally{b.disabled=false}};
  }
  function boot(){render();new MutationObserver(render).observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();