import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  "https://mamoboat.com",
  "https://www.mamoboat.com",
  "https://hideomi121154-spec.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const CATEGORY_KEYWORDS: Record<string, string> = {
  all: "日用品 食品 飲料 家電 美容 趣味",
  food: "食品 飲料 ビール お茶 炭酸水 おつまみ",
  daily: "ティッシュ トイレットペーパー 洗剤 日用品 生活用品",
  beauty: "美容 健康 コスメ ケア用品",
  discover: "家電 美容 アウトドア 趣味",
};

// The home feed remains broad. These searches only seed the ranking with
// products that are likely to feel useful to MAMO BOAT users.
const RECOMMENDATION_QUERIES = [
  {
    segment: "other",
    query: "ビール 飲料 日用品 食品",
    hits: 24,
    quota: 10,
  },
  {
    segment: "discover",
    query: "家電 美容 趣味 スポーツ",
    hits: 24,
    quota: 10,
  },
];

const RESPONSE_CACHE = new Map<string, { expiresAt: number; payload: Record<string, unknown> }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cors(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://mamoboat.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=120, s-maxage=300",
  };
}

function postageFlag(value: unknown): 0 | 1 | null {
  if (value === 0 || value === "0") return 0;
  if (value === 1 || value === "1") return 1;
  return null;
}

function inferSegment(item: any, fallback = "other") {
  const text = `${item?.itemName || item?.name || ""} ${item?.catchcopy || ""}`;
  if (/ビール|発泡酒|チューハイ|ハイボール|ワイン|焼酎|日本酒/.test(text)) return "alcohol";
  if (/炭酸水|緑茶|お茶|コーヒー|飲料|ドリンク|ミネラルウォーター|ペットボトル/.test(text)) return "drinks";
  if (/ティッシュ|トイレットペーパー|洗剤|タオル|日用品|消耗品/.test(text)) return "daily";
  if (/おつまみ|ナッツ|珍味|せんべい|スナック|チョコ/.test(text)) return "snacks";
  if (/食品|グルメ|レトルト|米|麺|肉|魚|スイーツ/.test(text)) return "food";
  if (/美容|コスメ|化粧|シャンプー|ケア/.test(text)) return "beauty";
  if (/家電|キッチン|家具|生活用品/.test(text)) return "home";
  if (/アウトドア|スポーツ|趣味|ゲーム|ゴルフ/.test(text)) return "hobby";
  return fallback;
}

function recommendationScore(item: any) {
  const text = `${item.name || ""} ${item.catchcopy || ""}`;
  const baseBySegment: Record<string, number> = {
    alcohol: 28,
    drinks: 28,
    daily: 27,
    snacks: 23,
    food: 17,
    home: 12,
    beauty: 10,
    hobby: 10,
    discover: 8,
    other: 5,
  };
  const limitedSale = Boolean(item.startTime || item.endTime);
  const couponMention = /クーポン|coupon/i.test(text);
  const discountMention = /半額|特価|値下げ|セール|sale|\d{1,3}[％%]\s*off|\d+円\s*off|訳あり/i.test(text);
  const freeShipping = item.postageFlag === 0;
  const pointRate = Math.max(1, Number(item.pointRate) || 1);
  const rating = Number(item.reviewAverage) || 0;
  const reviewCount = Number(item.reviewCount) || 0;
  return (baseBySegment[item.segment] || baseBySegment.other)
    + (limitedSale ? 18 : 0)
    + (couponMention ? 15 : 0)
    + (discountMention ? 12 : 0)
    + (freeShipping ? 12 : 0)
    + Math.min(32, (pointRate - 1) * 4)
    + (rating >= 4.5 ? 10 : rating >= 4.2 ? 6 : 0)
    + Math.min(12, Math.log10(reviewCount + 1) * 3);
}

function mapItem(item: any, fallbackSegment: string) {
  const mapped: any = {
    id: item.itemCode || item.itemUrl,
    name: item.itemName || "商品",
    catchcopy: item.catchcopy || "",
    price: Number(item.itemPrice || 0),
    url: item.affiliateUrl || item.itemUrl || "",
    image: Array.isArray(item.mediumImageUrls) ? (item.mediumImageUrls[0]?.imageUrl || item.mediumImageUrls[0] || "") : "",
    images: Array.isArray(item.mediumImageUrls) ? item.mediumImageUrls.map((image: any) => image?.imageUrl || image).filter(Boolean) : [],
    reviewCount: Number(item.reviewCount || 0),
    reviewAverage: Number(item.reviewAverage || 0),
    shopName: item.shopName || "楽天市場",
    postageFlag: postageFlag(item.postageFlag),
    pointRate: Math.max(1, Number(item.pointRate) || 1),
    pointRateStartTime: item.pointRateStartTime || "",
    pointRateEndTime: item.pointRateEndTime || "",
    startTime: item.startTime || "",
    endTime: item.endTime || "",
    affiliateRate: Number(item.affiliateRate || 0),
  };
  mapped.segment = inferSegment(item, fallbackSegment);
  const text = `${mapped.name} ${mapped.catchcopy}`;
  mapped.dealSignals = {
    limitedSale: Boolean(mapped.startTime || mapped.endTime),
    couponMention: /クーポン|coupon/i.test(text),
    discountMention: /半額|特価|値下げ|セール|sale|\d{1,3}[％%]\s*off|\d+円\s*off|訳あり/i.test(text),
    freeShipping: mapped.postageFlag === 0,
    highPoint: mapped.pointRate > 1,
  };
  mapped.recommendationScore = recommendationScore(mapped);
  return mapped;
}

function selectDiverse(items: any[], hits: number) {
  const unique = [...new Map(items.filter((item) => item.url && item.price > 0).map((item) => [item.id || item.url, item])).values()];
  unique.sort((a: any, b: any) => b.recommendationScore - a.recommendationScore || b.reviewCount - a.reviewCount);
  const selected: any[] = [];
  const deferred: any[] = [];
  const perSegment = new Map<string, number>();
  const segmentLimit = Math.max(3, Math.ceil(hits * 0.35));
  for (const item of unique) {
    const count = perSegment.get(item.segment) || 0;
    if (count >= segmentLimit) deferred.push(item);
    else {
      selected.push(item);
      perSegment.set(item.segment, count + 1);
    }
    if (selected.length >= hits) break;
  }
  for (const item of deferred) {
    if (selected.length >= hits) break;
    selected.push(item);
  }
  return selected.slice(0, hits);
}

function selectMixedResults(results: any[], hits: number) {
  const selected: any[] = [];
  const seen = new Set<string>();
  const fallbackQuota = Math.max(2, Math.floor(hits / Math.max(1, results.length)));
  const add = (item: any) => {
    const id = String(item.id || item.url || "");
    if (!id || seen.has(id) || !item.url || item.price <= 0) return false;
    seen.add(id);
    selected.push(item);
    return true;
  };

  for (const result of results) {
    const ranked = [...result.items].sort((a, b) => b.recommendationScore - a.recommendationScore || b.reviewCount - a.reviewCount);
    const quota = Math.max(1, Math.min(hits, Number(result.quota) || fallbackQuota));
    let accepted = 0;
    for (const item of ranked) {
      if (add(item)) accepted += 1;
      if (accepted >= quota || selected.length >= hits) break;
    }
  }

  const remainder = results.flatMap((result) => result.items)
    .sort((a, b) => b.recommendationScore - a.recommendationScore || b.reviewCount - a.reviewCount);
  for (const item of remainder) {
    if (selected.length >= hits) break;
    add(item);
  }
  return selected.slice(0, hits);
}

async function searchRakuten(options: {
  appId: string;
  accessKey: string;
  affiliateId: string;
  query: string;
  segment: string;
  hits: number;
  page: number;
  orSearch?: boolean;
}) {
  const params = new URLSearchParams({
    applicationId: options.appId,
    accessKey: options.accessKey,
    keyword: options.query.slice(0, 96),
    hits: String(Math.min(30, Math.max(1, options.hits))),
    page: String(options.page),
    format: "json",
    formatVersion: "2",
    sort: "-reviewCount",
    imageFlag: "1",
    hasReviewFlag: "1",
    elements: [
      "itemName", "catchcopy", "itemCode", "itemPrice", "itemUrl", "affiliateUrl",
      "mediumImageUrls", "smallImageUrls", "reviewCount", "reviewAverage", "shopName",
      "postageFlag", "pointRate", "pointRateStartTime", "pointRateEndTime", "affiliateRate",
      "startTime", "endTime",
    ].join(","),
  });
  if (options.orSearch) params.set("orFlag", "1");
  if (options.affiliateId) params.set("affiliateId", options.affiliateId);

  const endpoint = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?${params.toString()}`;
  const response = await fetch(endpoint, {
    headers: {
      "User-Agent": "MAMO-BOAT/1.0",
      "Referer": "https://mamoboat.com/",
      "Origin": "https://mamoboat.com",
    },
  });
  const data = await response.json();
  if (!response.ok) throw { rakutenStatus: response.status, payload: data };
  const rawItems = Array.isArray(data.Items) ? data.Items : Array.isArray(data.items) ? data.items : [];
  return {
    source: options.segment,
    count: Number(data.count || rawItems.length),
    page: Number(data.page || options.page),
    items: rawItems.map((entry: any) => mapItem(entry.Item || entry, options.segment)),
  };
}

Deno.serve(async (req) => {
  const headers = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }

  const appId = Deno.env.get("RAKUTEN_APPLICATION_ID") || "";
  const accessKey = Deno.env.get("RAKUTEN_ACCESS_KEY") || "";
  const affiliateId = Deno.env.get("RAKUTEN_AFFILIATE_ID") || "";
  if (!appId || !accessKey) {
    return new Response(JSON.stringify({
      ok: false,
      setup_required: true,
      provider: "rakuten",
      message: "RAKUTEN_APPLICATION_ID and RAKUTEN_ACCESS_KEY are not configured",
    }), { status: 503, headers });
  }

  const requestUrl = new URL(req.url);
  const category = requestUrl.searchParams.get("cat") || "all";
  const explicitQuery = (requestUrl.searchParams.get("q") || "").trim().slice(0, 96);
  const mixVersion = (requestUrl.searchParams.get("mix") || "").trim().slice(0, 32);
  const page = Math.min(5, Math.max(1, Number(requestUrl.searchParams.get("page") || 1)));
  const hits = Math.min(24, Math.max(4, Number(requestUrl.searchParams.get("hits") || 20)));
  const cacheKey = `${mixVersion}|${category}|${explicitQuery}|${page}|${hits}`;
  const cached = RESPONSE_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return new Response(JSON.stringify({ ...cached.payload, cached: true }), { headers });
  }

  try {
    let query = explicitQuery || CATEGORY_KEYWORDS[category] || CATEGORY_KEYWORDS.all;
    let items: any[] = [];
    let count = 0;
    let mixed = false;

    if (!explicitQuery && category === "all") {
      mixed = true;
      query = "MAMO BOAT recommendations";
      // Rakuten accepts a limited request rate. Space the broad searches out
      // and retry once so one half of the catalogue does not disappear.
      const results: any[] = [];
      const sourceErrors: string[] = [];
      for (const [index, entry] of RECOMMENDATION_QUERIES.entries()) {
        if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1200));
        let result: any = null;
        try {
          result = await searchRakuten({
            appId,
            accessKey,
            affiliateId,
            query: entry.query,
            segment: entry.segment,
            hits: entry.hits,
            page,
            orSearch: true,
          });
        } catch (firstError: any) {
          await new Promise((resolve) => setTimeout(resolve, 1400));
          try {
            result = await searchRakuten({
              appId,
              accessKey,
              affiliateId,
              query: entry.query,
              segment: entry.segment,
              hits: entry.hits,
              page,
              orSearch: true,
            });
          } catch (retryError: any) {
            sourceErrors.push(`${entry.segment}:${retryError?.rakutenStatus || firstError?.rakutenStatus || "failed"}`);
          }
        }
        if (result) {
          result.quota = entry.quota;
          results.push(result);
        }
      }
      if (!results.length) throw new Error(`recommendation_search_failed:${sourceErrors.join(",")}`);
      count = results.reduce((sum, result) => sum + result.count, 0);
      items = selectMixedResults(results, hits);
    } else {
      const result = await searchRakuten({
        appId,
        accessKey,
        affiliateId,
        query,
        segment: inferSegment({ itemName: query }, category === "all" ? "other" : category),
        hits,
        page,
        orSearch: !explicitQuery,
      });
      count = result.count;
      items = selectDiverse(result.items, hits);
    }

    const payload = {
      ok: true,
      provider: "rakuten",
      query,
      page,
      count,
      items,
      mixed,
      ranking: "relevance_sale_points_shipping_reviews",
      discountRateAvailable: false,
      affiliate: Boolean(affiliateId),
      fetchedAt: new Date().toISOString(),
    };
    RESPONSE_CACHE.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return new Response(JSON.stringify(payload), { headers });
  } catch (error: any) {
    const status = Number(error?.rakutenStatus || 0);
    if (status) {
      return new Response(JSON.stringify({ ok: false, provider: "rakuten", status, error: error.payload }), { status: 502, headers });
    }
    return new Response(JSON.stringify({ ok: false, provider: "rakuten", error: String(error) }), { status: 500, headers });
  }
});
