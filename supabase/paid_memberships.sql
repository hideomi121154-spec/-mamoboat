-- MAMO BOAT paid membership staging schema.
-- Apply only after verifying payment provider acceptance and public-data commercial rights.
-- Entitlements come from Stripe webhook, never from localStorage / user-controlled payloads.
create table if not exists public.paid_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free' check(plan in ('free','bronze','silver','gold')),
  status text not null default 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.paid_memberships enable row level security;
revoke all on public.paid_memberships from anon, authenticated;
grant select on public.paid_memberships to authenticated;
drop policy if exists "members can view own billing status" on public.paid_memberships;
create policy "members can view own billing status" on public.paid_memberships
  for select to authenticated using (user_id = (select auth.uid()));

create schema if not exists private;
create table if not exists private.billing_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);
revoke all on schema private from public, anon, authenticated;
revoke all on private.billing_webhook_events from public, anon, authenticated;
grant usage on schema private to service_role;
grant all on private.billing_webhook_events to service_role;

comment on table public.paid_memberships is 'Server-verified Stripe subscription state. Client can read only its own row.';
