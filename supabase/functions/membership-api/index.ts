// Supabase Edge Function: membership-api (server-only Stripe Checkout / Portal)
// Requires BILLING_ENABLED=true after BOAT RACE commercial-rights review and payment-provider approval.
// Set secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_BRONZE, STRIPE_PRICE_SILVER,
// STRIPE_PRICE_GOLD, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.7.0";

const base = "https://mamoboat.com";
const allowedOrigins = new Set([base, "https://www.mamoboat.com"]);
const prices: Record<string,string | undefined> = {
  bronze: Deno.env.get("STRIPE_PRICE_BRONZE"),
  silver: Deno.env.get("STRIPE_PRICE_SILVER"),
  gold: Deno.env.get("STRIPE_PRICE_GOLD")
};
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "sk_test_missing");
const admin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  { auth: { persistSession: false } }
);
const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : base,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, apikey, Content-Type",
  "Vary": "Origin"
});
const respond = (obj: unknown, code: number, origin: string | null) =>
  new Response(JSON.stringify(obj), { status: code, headers: { ...cors(origin), "Content-Type": "application/json", "Cache-Control": "no-store" } });

Deno.serve(async req => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405, origin);
  if (!origin || !allowedOrigins.has(origin)) return respond({ error: "Origin not allowed" }, 403, origin);
  const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return respond({ error: "Login required" }, 401, origin);
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return respond({ error: "Invalid session" }, 401, origin);

  let input: Record<string,unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 2048) throw new Error();
    input = JSON.parse(raw);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error();
  } catch { return respond({ error: "Bad request" }, 400, origin); }
  const action = input.action;
  const { data: record, error: dbError } = await admin
    .from("paid_memberships").select("plan,status,current_period_end,stripe_customer_id,stripe_subscription_id")
    .eq("user_id", user.id).maybeSingle();
  if (dbError) return respond({ error: "Membership storage unavailable" }, 503, origin);
  const valid = ["active","trialing"].includes(record?.status || "") &&
    (!record?.current_period_end || new Date(record.current_period_end).getTime() > Date.now());
  if (action === "status") return respond({
    plan: valid ? record?.plan : "free",
    status: record?.status || "inactive",
    period_end: record?.current_period_end || null
  }, 200, origin);

  if (Deno.env.get("BILLING_ENABLED") !== "true") return respond({ error: "課金開始前です。" }, 503, origin);
  if (!Deno.env.get("STRIPE_SECRET_KEY")) return respond({ error: "Payment provider unavailable" }, 503, origin);
  try {
    if (action === "checkout") {
      const plan = String(input.plan || "");
      if (!Object.hasOwn(prices, plan) || !prices[plan]) return respond({ error: "Invalid plan" }, 400, origin);
      if (record?.stripe_subscription_id && ["active","trialing","past_due"].includes(record.status))
        return respond({ error: "現在の契約は管理画面から変更してください。" }, 409, origin);
      const session = await stripe.checkout.sessions.create({
        mode: "subscription", line_items: [{ price: prices[plan]!, quantity: 1 }],
        ...(record?.stripe_customer_id ? { customer: record.stripe_customer_id } : { customer_email: user.email }),
        client_reference_id: user.id,
        metadata: { user_id: user.id, plan },
        subscription_data: { metadata: { user_id: user.id, plan } },
        success_url: base + "/dev/?billing=success&session_id={CHECKOUT_SESSION_ID}",
        cancel_url: base + "/dev/?billing=cancel"
      });
      return respond({ url: session.url }, 200, origin);
    }
    if (action === "portal") {
      if (!record?.stripe_customer_id) return respond({ error: "契約がありません。" }, 404, origin);
      const portal = await stripe.billingPortal.sessions.create({
        customer: record.stripe_customer_id, return_url: base + "/dev/"
      });
      return respond({ url: portal.url }, 200, origin);
    }
    return respond({ error: "Unknown action" }, 400, origin);
  } catch {
    return respond({ error: "決済サービスを利用できません。しばらくしてからお試しください。" }, 502, origin);
  }
});
