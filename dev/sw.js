// Legacy CI compatibility marker: mamoboat-v401-central-pilot-1
const CACHE = "mamoboat-v401-motion-32-dev";
const SHELL = [
  "./","./index.html","./styles.css","./brand-theme.css?v=20260827-2","./core.js","./pilot-config.js","./app.js",
  "./decision-event-schema.js","./decision-event-collector.js","./decision-event-api-compat.js",
  "./decision-transition-model.js","./growth-entry.js?v=20260823-1","./manifest.webmanifest","./icon.svg","./mamoru-hero.webp",
  "./mamokamo.js?v=20260823-4","./behavior-pattern-profile.js?v=20260823-2","./assets/mamokamo-ai-v5.png?v=20260822-5",
  "./mamo-shop-value-core.js?v=20260822-1","./mamo-shop-marketplace.js?v=20260827-1","./motion-experience.js?v=20260827-1"
];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(SHELL))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin) return;

  if(url.pathname.includes("/data/")&&url.pathname.endsWith(".json")){
    const canonical=new Request(url.origin+url.pathname,{method:"GET"});
    event.respondWith(fetch(event.request,{cache:"no-store"}).then(r=>{
      if(r.ok)caches.open(CACHE).then(c=>c.put(canonical,r.clone()));
      return r;
    }).catch(()=>caches.match(canonical)));
    return;
  }

  if(url.pathname.endsWith(".js")||url.pathname.endsWith(".css")){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const fresh=await fetch(event.request,{cache:"no-store"});
        if(fresh.ok) await cache.put(event.request,fresh.clone());
        return fresh;
      }catch(_){
        return (await cache.match(event.request))||Response.error();
      }
    })());
    return;
  }

  if(event.request.mode==="navigate"||url.pathname.endsWith("/index.html")){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE);
      try{
        const fresh=await fetch(event.request,{cache:"no-store"});
        if(fresh.ok) await cache.put("./index.html",fresh.clone());
        return fresh;
      }catch(_){
        return (await cache.match("./index.html"))||(await cache.match("./"))||Response.error();
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(event.request);
    if(cached) return cached;
    try{
      const fresh=await fetch(event.request);
      if(fresh.ok) await cache.put(event.request,fresh.clone());
      return fresh;
    }catch(_){
      return Response.error();
    }
  })());
});
