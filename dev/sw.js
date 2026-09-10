// Legacy CI compatibility marker: mamoboat-v401-central-pilot-1
const CACHE = "mamoboat-v478-official-first-dev";
const SHELL = [
  "./","./index.html","./styles.css?v=20260910-2","./air-bet-review-compact.css?v=20260910-9","./brand-theme.css?v=20260827-2","./core.js?v=20260908-1","./air-bet-draft-core.js?v=20260909-2","./pilot-config.js?v=20260909-4","./app.js?v=20260910-2",
  "./decision-event-schema.js","./decision-conflict-core.js","./decision-conflict-guard.js?v=20260906-2","./decision-event-collector.js?v=20260910-2","./decision-event-api-compat.js?v=20260908-2","./bet-review-flow.js?v=20260908-2",
  "./decision-transition-model.js","./growth-entry.js?v=20260908-2","./venue-live-priority.js?v=20260909-1","./air-bet-mode-stability.js?v=20260910-10","./race-layout-refresh.js?v=20260910-1","./race-airbet-compact.js?v=20260910-4","./race-airbet-first.js?v=20260910-2","./general-grade-theme.js?v=20260908-1","./air-outcome-experience.js?v=20260909-5","./record-unified-layout-v2.js?v=20260909-5","./record-mobile-layout-fix.js?v=20260908-2","./race-carte-live-state-fix.js?v=20260908-3","./race-carte-manual-refresh.js?v=20260909-3","./manifest.webmanifest","./icon.svg","./mamoru-hero.webp",
  "./mamokamo.js?v=20260823-4","./behavior-pattern-profile.js?v=20260828-3","./behavior-science.js?v=20260829-2","./assets/mamokamo-ai-v5.png?v=20260822-5",
  "./mamo-shop.js?v=20260830-2","./mamo-shop-value-core.js?v=20260822-1","./mamo-shop-marketplace.js?v=20260828-8","./mamo-shop-record-benefits.js?v=20260830-1","./motion-experience.js?v=20260827-1"
];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE && /^mamoboat-.*-dev$/.test(k)).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))
});
function withLiveVenueLoader(response){
  if(!response || !response.ok) return response;
  const type=response.headers.get("content-type")||"";
  if(!type.includes("text/html")) return response;
  return response.text().then(html=>{
    html=html.replace(/race-airbet-compact\.js\?v=[^"']+/g,"race-airbet-compact.js?v=20260910-4");
    html=html.replace(/race-airbet-first\.js\?v=[^"']+/g,"race-airbet-first.js?v=20260910-2");
    html=html.replace(/air-bet-mode-stability\.js\?v=[^"']+/g,"air-bet-mode-stability.js?v=20260910-10");
    html=html.replace(/decision-event-collector\.js(?:\?v=[^"']+)?/g,"decision-event-collector.js?v=20260910-2");
    if(html.includes("air-bet-review-compact.css")) {
      html=html.replace(/air-bet-review-compact\.css\?v=[^"']+/g,"air-bet-review-compact.css?v=20260910-9");
    } else {
      html=html.replace("</head>",'<link rel="stylesheet" href="air-bet-review-compact.css?v=20260910-9"></head>');
    }
    if(!html.includes("venue-live-priority.js")) html=html.replace("</body>",'<script src="venue-live-priority.js?v=20260909-1"></script></body>');
    if(!html.includes("general-grade-theme.js")) html=html.replace("</body>",'<script src="general-grade-theme.js?v=20260908-1"></script></body>');
    if(!html.includes("record-unified-layout-v2.js")) html=html.replace("</body>",'<script src="record-unified-layout-v2.js?v=20260909-5"></script></body>');
    if(!html.includes("record-mobile-layout-fix.js")) html=html.replace("</body>",'<script src="record-mobile-layout-fix.js?v=20260908-2"></script></body>');
    if(!html.includes("race-carte-live-state-fix.js")) html=html.replace("</body>",'<script src="race-carte-live-state-fix.js?v=20260908-3"></script></body>');
    if(!html.includes("race-carte-manual-refresh.js")) html=html.replace("</body>",'<script src="race-carte-manual-refresh.js?v=20260909-3"></script></body>');
    if(!html.includes("air-bet-mode-stability.js")) html=html.replace("</body>",'<script src="air-bet-mode-stability.js?v=20260910-10"></script></body>');
    if(!html.includes("decision-event-collector.js")) html=html.replace("</body>",'<script src="decision-event-collector.js?v=20260910-2"></script></body>');
    if(!html.includes("race-layout-refresh.js")) html=html.replace("</body>",'<script src="race-layout-refresh.js?v=20260910-1"></script></body>');
    if(!html.includes("race-airbet-compact.js")) html=html.replace("</body>",'<script src="race-airbet-compact.js?v=20260910-4"></script></body>');
    if(!html.includes("race-airbet-first.js")) html=html.replace("</body>",'<script src="race-airbet-first.js?v=20260910-2"></script></body>');
    const headers=new Headers(response.headers);headers.delete("content-length");
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  });
}
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin) return;
  if(url.pathname.includes("/data/")&&url.pathname.endsWith(".json")){
    const canonical=new Request(url.origin+url.pathname,{method:"GET"});
    event.respondWith(fetch(event.request,{cache:"no-store"}).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(canonical,r.clone()));return r;}).catch(()=>caches.match(canonical)));
    return;
  }
  if(event.request.mode==="navigate"){
    event.respondWith(fetch(event.request,{cache:"no-store"}).then(r=>withLiveVenueLoader(r)).catch(()=>caches.match("./index.html").then(r=>withLiveVenueLoader(r))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(r=>{if(r&&r.ok)caches.open(CACHE).then(c=>c.put(event.request,r.clone()));return r;})));
});
