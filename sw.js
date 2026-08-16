// Legacy CI compatibility marker: mamoboat-v401-central-pilot-1
const CACHE = "mamoboat-v401-central-pilot-11";
const SHELL = ["./","./index.html","./styles.css","./core.js","./pilot-config.js","./app.js","./manifest.webmanifest","./icon.svg","./mamoru-hero.webp"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin) return;

  // Official race data must stay fresh. Network first, cache fallback.
  if(url.pathname.includes("/data/")&&url.pathname.endsWith(".json")){
    const canonical=new Request(url.origin+url.pathname,{method:"GET"});
    event.respondWith(fetch(event.request,{cache:"no-store"}).then(r=>{
      if(r.ok)caches.open(CACHE).then(c=>c.put(canonical,r.clone()));
      return r;
    }).catch(()=>caches.match(canonical)));
    return;
  }

  // Critical runtime loaders must not be trapped behind an old iOS PWA cache.
  if(url.pathname.endsWith("/pilot-config.js")||url.pathname.endsWith("/device-sync.js")){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const fresh=await fetch(event.request,{cache:"no-store"});
        if(fresh.ok) await cache.put(event.request,fresh.clone());
        return fresh;
      }catch(_){
        return (await cache.match(event.request,{ignoreSearch:true}))||Response.error();
      }
    })());
    return;
  }

  // App shell/navigation: render cached content immediately, refresh in background.
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(event.request,{ignoreSearch:true});
    if(cached){
      event.waitUntil(fetch(event.request).then(r=>{
        if(r.ok)return cache.put(event.request,r.clone());
      }).catch(()=>{}));
      return cached;
    }
    try{
      const fresh=await fetch(event.request);
      if(fresh.ok)cache.put(event.request,fresh.clone());
      return fresh;
    }catch(_){
      if(event.request.mode==="navigate") return (await cache.match("./index.html"))||(await cache.match("./"));
      throw _;
    }
  })());
});
self.addEventListener("push",event=>{let data={};try{data=event.data?event.data.json():{}}catch(_){data={body:event.data?.text()||""}}const title=data.title||"MAMO BOAT PRESS 朝刊";const options={body:data.body||"加音 守が、昨日のあなたの勝負をまとめました。",icon:"./icon.svg",badge:"./icon.svg",tag:data.tag||"mamoboat-morning-press",renotify:false,data:{kind:"morning-press"}};event.waitUntil(self.registration.showNotification(title,options))});
self.addEventListener("notificationclick",event=>{event.notification.close();const target=new URL("./?open=morning&from=push",self.registration.scope).href;event.waitUntil((async()=>{const list=await self.clients.matchAll({type:"window",includeUncontrolled:true});const client=list.find(item=>{try{return item.url.startsWith(self.registration.scope)}catch(_){return false}});if(client){try{client.postMessage({type:"MAMO_OPEN_MORNING_PRESS"})}catch(_){}try{await client.focus()}catch(_){}return}if(self.clients.openWindow){try{await self.clients.openWindow(target)}catch(_){}}})())});