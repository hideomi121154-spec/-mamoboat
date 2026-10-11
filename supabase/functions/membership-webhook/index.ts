// Supabase Edge Function: membership-webhook
// Deploy ONLY with --no-verify-jwt, and verify every webhook with STRIPE_WEBHOOK_SECRET.
// Never trust a client-supplied plan or paid flag for a subscription.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17.7.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "sk_test_missing");
const admin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  { auth: { persistSession: false } }
);
const secretsReady = () => !!Deno.env.get("STRIPE_WEBHOOK_SECRET") && !!Deno.env.get("STRIPE_SECRET_KEY");
const validPlan = (x: string | undefined) => (["bronze","silver","gold"].includes(x || "") ? x : "free");
const validUuid = (x: unknown) =>
  typeof x === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const pricePlans = () => new Map([
  [Deno.env.get("STRIPE_PRICE_BRONZE"), "bronze"],
  [Deno.env.get("STRIPE_PRICE_SILVER"), "silver"],
  [Deno.env.get("STRIPE_PRICE_GOLD"), "gold"]
].filter((entry): entry is [string,string] => !!entry[0]));

async function saveSubscription(s: Stripe.Subscription) {
  // Metadata was set by server when Checkout was created. Updated portal prices
  // are resolved from configured Stripe price IDs, not stale plan metadata.
  const userId = s.metadata.user_id;
  if (!validUuid(userId)) throw new Error("Missing verified user reference");
  const itemPrice = s.items.data[0]?.price?.id;
  const plan = pricePlans().get(itemPrice) || validPlan(s.metadata.plan);
  const customer = typeof s.customer === "string" ? s.customer : s.customer.id;
  const { error } = await admin.from("paid_memberships").upsert({
    user_id: userId, stripe_customer_id: customer, stripe_subscription_id: s.id,
    plan: s.status === "canceled" ? "free" : plan,
    status: s.status,
    current_period_end: s.current_period_end ? new Date(s.current_period_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  if (error) throw error;
}
Deno.serve(async req => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!secretsReady()) return new Response("Webhook unavailable", { status: 503 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body, signature, Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined, Stripe.createSubtleCryptoProvider()
    );
  } catch { return new Response("Invalid signature", { status: 400 }); }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await saveSubscription(subscription);
      }
    } else if ([
      "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"
    ].includes(event.type)) {
      await saveSubscription(event.data.object as Stripe.Subscription);
    } else {
      return new Response("Ignored", { status: 200 });
    }
    // Processing is idempotent through upsert on user_id; event history is audit-only.
    await admin.schema("private").from("billing_webhook_events").upsert({
      stripe_event_id: event.id, event_type: event.type, processed_at: new Date().toISOString()
    }, { onConflict: "stripe_event_id" });
    return new Response("OK", { status: 200 });
  } catch {
    // Non-2xx causes Stripe to retry. Do not reveal customer information in errors.
    return new Response("Processing failed", { status: 500 });
  }
});
