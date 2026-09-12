// Legacy CI compatibility marker: mamoboat-v401-central-pilot-1
// Previous AIR BET cache compatibility marker: mamoboat-v494-airbet-allocation-dev
// Previous AIR BET normal layout cache: mamoboat-v496-airbet-normal-layout-dev
// Previous AIR BET loader cache: mamoboat-v497-airbet-loader-refresh-dev
// Previous racer-name visibility cache: mamoboat-v498-racer-name-visibility-dev
// Previous AIR BET review helper: air-bet-review-delete-controls.js?v=20260911-2
// Legacy racer roster CSS marker: air-bet-selection-fixed.css?v=20260910-4
// Previous racer roster CSS: air-bet-selection-fixed.css?v=20260911-5
// Racer roster single-owner release: CSS owns mamo-racer-* geometry; race layout refresh no longer restyles it.
// Previous racer roster delivery: air-bet-selection-fixed.css?v=20260911-6
// Previous racer heading delivery: air-bet-selection-fixed.css?v=20260911-7
// Previous racer heading cache: mamoboat-v501-racer-heading-nudge-dev
// Race carte composite odds delivery: race-carte-official-payouts.js?v=20260911-1
// Previous AIR BET review flow: bet-review-flow.js?v=20260911-3
// Previous compact review CSS: air-bet-review-compact.css?v=20260911-13
// Previous race carte cache: mamoboat-v502-race-carte-composite-odds-dev
// Previous odds bet cache: mamoboat-v503-odds-bet-mode-dev
// Previous odds selector cache: mamoboat-v504-odds-bet-mobile-selector-dev
// Previous odds layout cache: mamoboat-v505-odds-layout-snapshot-dev
// Previous odds fill-height cache: mamoboat-v506-odds-fill-height-dev
// Previous odds all-visible cache: mamoboat-v507-odds-all-visible-dev
// Previous review ticket scroll cache: mamoboat-v508-review-ticket-scroll-dev
// Previous allocation scroll cache: mamoboat-v509-allocation-results-scroll-dev
// Previous odds UI CSS: odds-bet-mode.css?v=20260912-2
// Previous odds UI script: odds-bet-mode-v1.js?v=20260911-3
// Previous odds compact controls cache: mamoboat-v510-odds-compact-controls-dev
const CACHE = "mamoboat-v511-odds-reference-sync-dev";
const SHELL = [
  "./","./index.html","./air-bet-selection-fixed.css?v=20260911-9","./odds-bet-mode.css?v=20260912-3","./styles.css?v=20260910-3","./air-bet-review-compact.css?v=20260912-2","./brand-theme.css?v=20260827-2","./core.js?v=20260908-1","./air-bet-draft-core.js?v=20260909-2","./pilot-config.js?v=20260910-6","./app.js?v=20260910-4",
  "./decision-event-schema.js","./decision-conflict-core.js","./decision-conflict-guard.js?v=20260906-2","./decision-event-collector.js?v=20260910-2","./decision-event-api-compat.js?v=20260912-1","./bet-review-flow.js?v=20260911-4","./air-bet-review-delete-controls.js?v=20260912-1","./odds-bet-mode-v1.js?v=20260912-1","./odds-reference-odds-sync.js?v=20260912-1",
  "./decision-transition-model.js","./growth-entry.js?v=20260908-2","./venue-live-priority.js?v=20260909-1","./air-bet-mode-stability.js?v=20260911-13","./race-layout-refresh.js?v=20260911-7","./race-airbet-compact.js?v=20260910-6","./race-airbet-first.js?v=20260910-8","./race-carte-official-payouts.js?v=20260911-1","./ai-safe.js?v=20260910-5","./general-grade-theme.js?v=20260908-1","./air-outcome-experience.js?v=20260909-5","./record-unified-layout-v2.js?v=20260909-5","./record-mobile-layout-fix.js?v=20260908-2","./race-carte-live-state-fix.js?v=20260908-3","./race-carte-manual-refresh.js?v=20260909-3","./manifest.webmanifest","./icon.svg","./mamoru-hero.webp",
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
    html=html.replace(/\s*<script[^>]+src=["'][^"']*ai-safe\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,"");
    html=html.replace(/\s*<script[^>]+src=["'][^"']*official-link\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,"");
    html=html.replace(/pilot-config\.js\?v=[^"']+/g,"pilot-config.js?v=20260910-6");
    html=html.replace(/race-airbet-compact\.js\?v=[^"']+/g,"race-airbet-compact.js?v=20260910-6");
    html=html.replace(/race-airbet-first\.js\?v=[^"']+/g,"race-airbet-first.js?v=20260910-8");
    html=html.replace(/air-bet-mode-stability\.js\?v=[^"']+/g,"air-bet-mode-stability.js?v=20260911-13");
    html=html.replace(/race-layout-refresh\.js\?v=[^"']+/g,"race-layout-refresh.js?v=20260911-7");
    html=html.replace(/race-carte-official-payouts\.js(?:\?v=[^"']+)?/g,"race-carte-official-payouts.js?v=20260911-1");
    html=html.replace(/decision-event-collector\.js(?:\?v=[^"']+)?/g,"decision-event-collector.js?v=20260910-2");
    html=html.replace(/decision-event-api-compat\.js(?:\?v=[^"']+)?/g,"decision-event-api-compat.js?v=20260912-1");
    html=html.replace(/bet-review-flow\.js(?:\?v=[^"']+)?/g,"bet-review-flow.js?v=20260911-4");
    html=html.replace(/air-bet-review-delete-controls\.js(?:\?v=[^"']+)?/g,"air-bet-review-delete-controls.js?v=20260912-1");
    html=html.replace(/odds-bet-mode-v1\.js(?:\?v=[^"']+)?/g,"odds-bet-mode-v1.js?v=20260912-1");
    html=html.replace(/odds-reference-odds-sync\.js(?:\?v=[^"']+)?/g,"odds-reference-odds-sync.js?v=20260912-1");
    if(html.includes("air-bet-selection-fixed.css")) {
      html=html.replace(/air-bet-selection-fixed\.css\?v=[^"']+/g,"air-bet-selection-fixed.css?v=20260911-9");
    } else {
      html=html.replace("</head>",'<link rel="stylesheet" href="air-bet-selection-fixed.css?v=20260911-9"></head>');
    }
    if(html.includes("odds-bet-mode.css")) {
      html=html.replace(/odds-bet-mode\.css\?v=[^"']+/g,"odds-bet-mode.css?v=20260912-3");
    } else {
      html=html.replace("</head>",'<link rel="stylesheet" href="odds-bet-mode.css?v=20260912-3"></head>');
    }
    if(html.includes("air-bet-review-compact.css")) {
      html=html.replace(/air-bet-review-compact\.css\?v=[^"']+/g,"air-bet-review-compact.css?v=20260912-2");
    } else {
      html=html.replace("</head>",'<link rel="stylesheet" href="air-bet-review-compact.css?v=20260912-2"></head>');
    }
    if(!html.includes("venue-live-priority.js")) html=html.replace("</body>",'<script src="venue-live-priority.js?v=20260909-1"></script></body>');
    if(!html.includes("general-grade-theme.js")) html=html.replace("</body>",'<script src="general-grade-theme.js?v=20260908-1"></script></body>');
    if(!html.includes("record-unified-layout-v2.js")) html=html.replace("</body>",'<script src="record-unified-layout-v2.js?v=20260909-5"></script></body>');
    if(!html.includes("record-mobile-layout-fix.js")) html=html.replace("</body>",'<script src="record-mobile-layout-fix.js?v=20260908-2"></script></body>');
    if(!html.includes("race-carte-live-state-fix.js")) html=html.replace("</body>",'<script src="race-carte-live-state-fix.js?v=20260908-3"></script></body>');
    if(!html.includes("race-carte-manual-refresh.js")) html=html.replace("</body>",'<script src="race-carte-manual-refresh.js?v=20260909-3"></script></body>');
    if(!html.includes("air-bet-mode-stability.js")) html=html.replace("</body>",'<script src="air-bet-mode-stability.js?v=20260911-13"></script></body>');
    if(!html.includes("decision-event-collector.js")) html=html.replace("</body>",'<script src="decision-event-collector.js?v=20260910-2"></script></body>');
    if(!html.includes("race-layout-refresh.js")) html=html.replace("</body>",'<script src="race-layout-refresh.js?v=20260911-7"></script></body>');
    if(!html.includes("race-airbet-compact.js")) html=html.replace("</body>",'<script src="race-airbet-compact.js?v=20260910-6"></script></body>');
    if(!html.includes("race-airbet-first.js")) html=html.replace("</body>",'<script src="race-airbet-first.js?v=20260910-8"></script></body>');
    if(!html.includes("race-carte-official-payouts.js")) html=html.replace("</body>",'<script src="race-carte-official-payouts.js?v=20260911-1"></script></body>');
    if(!html.includes("odds-bet-mode-v1.js")) html=html.replace("</body>",'<script src="odds-bet-mode-v1.js?v=20260912-1"></script></body>');
    if(!html.includes("odds-reference-odds-sync.js")) html=html.replace("</body>",'<script src="odds-reference-odds-sync.js?v=20260912-1"></script></body>');
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
  if(
    url.pathname.endsWith("/pilot-config.js")
    || url.pathname.endsWith("/ai-safe.js")
    || url.pathname.endsWith("/baseline-intervention.js")
    || url.pathname.endsWith("/decision-event-api-compat.js")
    || url.pathname.endsWith("/air-bet-review-delete-controls.js")
    || url.pathname.endsWith("/race-carte-official-payouts.js")
    || url.pathname.endsWith("/odds-bet-mode-v1.js")
    || url.pathname.endsWith("/odds-reference-odds-sync.js")
    || url.pathname.endsWith("/air-bet-mode-stability.js")
  ){
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
  if(event.request.mode==="navigate"){
    event.respondWith(fetch(event.request,{cache:"no-store"}).then(r=>withLiveVenueLoader(r)).catch(()=>caches.match("./index.html").then(r=>withLiveVenueLoader(r))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(r=>{if(r&&r.ok)caches.open(CACHE).then(c=>c.put(event.request,r.clone()));return r;})));
});