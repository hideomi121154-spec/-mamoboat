import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = new Set([
  "https://mamoboat.com",
  "https://www.mamoboat.com",
  "https://hideomi121154-spec.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const CATEGORY_KEYWORDS: Record<string, string> = {
  all: "日用品",
  food: "食品 飲料",
  daily: "日用品 生活用品",
  beauty: "美容 日用品",
};

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
  const rawQuery = (requestUrl.searchParams.get("q") || CATEGORY_KEYWORDS[category] || CATEGORY_KEYWORDS.all).trim();
  const query = rawQuery.slice(0, 64) || CATEGORY_KEYWORDS.all;
  const page = Math.min(5, Math.max(1, Number(requestUrl.searchParams.get("page") || 1)));
  const hits = Math.min(24, Math.max(4, Number(requestUrl.searchParams.get("hits") || 20)));

  const params = new URLSearchParams({
    applicationId: appId,
    accessKey,
    keyword: query,
    hits: String(hits),
    page: String(page),
    format: "json",
    formatVersion: "2",
    sort: "-reviewCount",
    elements: [
      "itemName", "catchcopy", "itemCode", "itemPrice", "itemUrl", "affiliateUrl",
      "mediumImageUrls", "smallImageUrls", "reviewCount", "reviewAverage", "shopName",
      "postageFlag", "pointRate", "pointRateStartTime", "pointRateEndTime", "affiliateRate",
    ].join(","),
  });
  if (affiliateId) params.set("affiliateId", affiliateId);

  const endpoint = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?${params.toString()}`;
  try {
    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": "MAMO-BOAT/1.0",
        "Referer": "https://mamoboat.com/",
        "Origin": "https://mamoboat.com",
      },
    });
    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ ok: false, provider: "rakuten", status: response.status, error: data }), { status: 502, headers });
    }

    const rawItems = Array.isArray(data.Items) ? data.Items : Array.isArray(data.items) ? data.items : [];
    const items = rawItems
      .map((entry: any) => entry.Item || entry)
      .map((item: any) => ({
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
        affiliateRate: Number(item.affiliateRate || 0),
      }))
      .filter((item: any) => item.url && item.price > 0);

    return new Response(JSON.stringify({
      ok: true,
      provider: "rakuten",
      query,
      page: Number(data.page || page),
      count: Number(data.count || items.length),
      items,
      affiliate: Boolean(affiliateId),
      fetchedAt: new Date().toISOString(),
    }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, provider: "rakuten", error: String(error) }), { status: 500, headers });
  }
});
