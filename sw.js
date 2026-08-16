// Legacy CI compatibility marker: mamoboat-v401-central-pilot-1
const CACHE = "mamoboat-v401-central-pilot-8";
const SHELL = ["./","./index.html","./styles.css","./core.js","./pilot-config.js","./app.js","./manifest.webmanifest","./icon.svg","./mamoru-hero.webp"];
const PUSH_DB="mamoboat_push_state_v1",PUSH_STORE="kv",PUSH_KEY="pending_morning";
const PUSH_CACHE="mamoboat_push_handoff_v1",PUSH_CACHE_URL="./__mamo_push_morning_pending__";
function pushDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(PUSH_DB,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(PUSH_STORE))db.createObjectStore(PUSH_STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function saveMorningOpen(){const value={at:Date.now(),source:"push"};try{const db=await pushDb();await new Promise((resolve,reject)=>{const tx=db.transaction(PUSH_STORE,"readwrite");tx.objectStore(PUSH_STORE).put(value,PUSH_KEY);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});db.close()}catch(_){}try{const cache=await caches.open(PUSH_CACHE);const url=new URL(PUSH_CACHE_URL,self.registration.scope).href;await cache.put(url,new Response(JSON.stringify(value),{headers:{"content-type":"application/json","cache-control":"no-store"}}))}catch(_){}}
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k!==PUSH_CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;const url=new URL(event.request.url);if(url.origin!==location.origin)return;if(url.pathname.endsWith("/__mamo_push_morning_pending__"))return;if(url.pathname.includes("/data/")&&url.pathname.endsWith(".json")){const canonical=new Request(url.origin+url.pathname,{method:"GET"});event.respondWith(fetch(event.request,{cache:"no-store"}).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(canonical,r.clone()));return r}).catch(()=>caches.match(canonical)));return}event.respondWith(fetch(event.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(event.request,r.clone()));return r}).catch(()=>caches.match(event.request)))});
self.addEventListener("push",event=>{let data={};try{data=event.data?event.data.json():{}}catch(_){data={body:event.data?.text()||""}}const title=data.title||"MAMO BOAT PRESS 朝刊";const options={body:data.body||"加音 守が、昨日のあなたの勝負をまとめました。",icon:"./icon.svg",badge:"./icon.svg",tag:data.tag||"mamoboat-morning-press",renotify:false,data:{kind:"morning-press"}};event.waitUntil(self.registration.showNotification(title,options))});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    await saveMorningOpen();
    const scope=self.registration.scope;
    const target=new URL("./?open=morning&from=push",scope).href;
    const list=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    const client=list.find(item=>{try{return item.url.startsWith(scope)}catch(_){return false}});
    if(client){
      try{client.postMessage({type:"MAMO_OPEN_MORNING_PRESS"})}catch(_){}
      try{if("navigate" in client)await client.navigate(target)}catch(_){}
      try{await client.focus()}catch(_){}
      return;
    }
    if(self.clients.openWindow){try{await self.clients.openWindow(target)}catch(_){try{await self.clients.openWindow(scope)}catch(__){}}}
  })());
});