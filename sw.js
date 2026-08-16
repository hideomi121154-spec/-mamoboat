const CACHE = "mamoboat-v401-central-pilot-1";
const SHELL = ["./","./index.html","./styles.css","./core.js","./pilot-config.js","./app.js","./manifest.webmanifest","./icon.svg","./mamoru-hero.webp"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;const url=new URL(event.request.url);if(url.origin!==location.origin)return;if(url.pathname.includes("/data/")&&url.pathname.endsWith(".json")){const canonical=new Request(url.origin+url.pathname,{method:"GET"});event.respondWith(fetch(event.request,{cache:"no-store"}).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(canonical,r.clone()));return r}).catch(()=>caches.match(canonical)));return}event.respondWith(fetch(event.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(event.request,r.clone()));return r}).catch(()=>caches.match(event.request)))});
self.addEventListener("push",event=>{let data={};try{data=event.data?event.data.json():{}}catch(_){data={body:event.data?.text()||""}}const title=data.title||"MAMO BOAT PRESS 朝刊";const options={body:data.body||"加音 守が、昨日のあなたの勝負をまとめました。",icon:"./icon.svg",badge:"./icon.svg",tag:data.tag||"mamoboat-morning-press",renotify:false,data:{url:data.url||"./?open=morning"}};event.waitUntil(self.registration.showNotification(title,options))});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||"./?open=morning",self.location.origin).href;
  event.waitUntil((async()=>{
    const list=await clients.matchAll({type:"window",includeUncontrolled:true});
    if(list.length){
      const client=list[0];
      try{client.postMessage({type:"MAMO_OPEN_MORNING_PRESS",url:target})}catch(_){}
      try{if("navigate" in client)await client.navigate(target)}catch(_){}
      try{await client.focus()}catch(_){}
      return;
    }
    if(clients.openWindow)await clients.openWindow(target);
  })());
});