# MAMO BOAT subscription rollout (draft; no public billing)

## Included in this branch
- Existing FREE / BRONZE / SILVER / GOLD plan list: 0 / 390 / 690 / 1190 JPY monthly (staging prices, subject to owner approval).
- In-app prelaunch membership dialog; interest tracking uses existing pilot_plan_selected event with billing_started=false.
- Future email OTP login via Supabase, authenticated Stripe Checkout and Billing Portal endpoint.
- Stripe-signature-verified webhook and member subscription state stored in Supabase.
- Row-level security: user may read their own membership state but cannot change paid status.
- LIVE billing is explicitly DISABLED on the website, and server-side BILLING_ENABLED must also be true.

## Required approvals before taking money
1. Verify BOAT RACE official-data commercial licensing and availability; downloaded data are not proof of a commercial license.
2. Obtain an explicit payment-processor answer for this precise product: simulated boat betting using non-cash and non-redeemable B credits, with a paid *self-reflection and behavior analysis* subscription; no money/prizes/betting tips.
3. Add Japanese commercial disclosures (特定商取引法に基づく表記), terms of use, privacy policy, cancellation/refund terms, support contacts, and tax treatment.
4. Obtain an explicit merchant account connection and production API credentials; do not put secrets in GitHub Pages.
5. Exercise test-mode checkout, email login, entitlement verification, cancellation, expiry, duplicate webhook, failed payment, upgrades and downgrades, mobile Safari.
6. Obtain owner approval before any production enablement.

## After approval
- Use the merchant's approved Stripe account; create three JPY monthly recurring prices.
- Create Supabase secrets STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_BRONZE, STRIPE_PRICE_SILVER, STRIPE_PRICE_GOLD, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and set BILLING_ENABLED=true.
- Review then apply supabase/paid_memberships.sql.
- Deploy membership-api with normal JWT verification and membership-webhook with --no-verify-jwt (must verify Stripe signature itself).
- In Stripe, register the exact webhook URL for checkout.session.completed and customer.subscription.created / updated / deleted.
- Configure Supabase email OTP + SMTP and allowed redirect URL https://mamoboat.com/dev/.
- Test payments in Stripe test mode first.
- Only after all gates, change window.MAMO_BILLING_LIVE to true in dev/index.html and redeploy after review.

## Risk limitations
- Existing client-side report calculations are not strongly protected by a server paywall. Local JS cannot be assumed uncopyable. A strong paid entitlement requires moving valuable premium generation/processing behind authenticated Edge Functions.
- Only the signed webhook can activate the true subscription. A Checkout success URL or localStorage plan is NEVER proof of payment.
- User data such as email, payment details, and secrets must not go into client analytics.
- Prelaunch interest is not a contract and no money is collected.

## X launch (organic, not paid ads)
- X paid promotion of gambling-related software can require prior approval. Do not buy ads until X confirms category eligibility.
- Use demonstrations of personal decisions and self-monitoring; do NOT promote betting outcomes, winning strategies, prizes, or official BOAT RACE affiliation.
- Test UTM URL https://mamoboat.com/dev/?from=x&utm_source=x&utm_medium=organic&utm_campaign=prelaunch1
- Publish at most 3 original introduction posts over 7 days; track visits, AIR BET start, return usage, and plan-interest events.
- Do not infer distinct paying customers from event count or pilot IDs.
