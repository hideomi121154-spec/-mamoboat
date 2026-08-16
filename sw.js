// Legacy CI compatibility marker: mamoboat-v401-central-pilot-1
const CACHE = "mamoboat-v401-central-pilot-6";
const SHELL = ["./","./index.html","./styles.css","./core.js","./pilot-config.js","./app.js","./manifest.webmanifest","./icon.svg","./mamoru-hero.webp"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;const url=new URL(event.request.url);if(url.origin!==location.origin)return;if(url.pathname.includes("/data/")&&url.pathname.endsWith(".json")){const canonical=new Request(url.origin+url.pathname,{method:"GET"});event.respondWith(fetch(event.request,{cache:"no-store"}).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(canonical,r.clone()));return r}).catch(()=>caches.match(canonical)));return}event.respondWith(fetch(event.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(event.request,r.clone()));return r}).catch(()=>caches.match(event.request)))});
self.addEventListener("push",event=>{let data={};try{data=event.data?event.data.json():{}}catch(_){data={body:event.data?.text()||""}}const title=data.title||"MAMO BOAT PRESS 朝刊";const options={body:data.body||"加音 守が、昨日のあなたの勝負をまとめました。",icon:"./icon.svg",badge:"./icon.svg",tag:data.tag||"mamoboat-morning-press",renotify:false,data:{kind:"morning-press"}};event.waitUntil(self.registration.showNotification(title,options))});
self.addEventListener("notificationclick",event=>{
  if(typeof event.preventDefault==="function")event.preventDefault();
  event.notification.close();
  const target=new URL("./?open=morning&from=push",self.registration.scope).href;
  event.waitUntil((async()=>{
    // iOS Home Screen web apps are most reliable when notification clicks
    // explicitly open the destination URL instead of trying to navigate an
    // already-running WindowClient first.
    if(self.clients.openWindow){
      try{
        await self.clients.openWindow(target);
        return;
      }catch(_){}
    }
    const list=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    const client=list.find(item=>{try{return new URL(item.url).pathname.startsWith(new URL(self.registration.scope).pathname)}catch(_){return false}})||list[0];
    if(client){
      try{if("navigate" in client)await client.navigate(target)}catch(_){}
      try{await client.focus()}catch(_){}
    }
  })());
});