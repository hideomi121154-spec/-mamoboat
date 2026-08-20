-- MAMO BOAT PRESS PILOT central event collection
-- Public clients can call one validated, idempotent ingestion function only.
-- Raw rows and aggregate views remain admin/service-role only.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists public.pilot_events (
  event_id uuid primary key,
  study_id text not null,
  participant_id text not null,
  session_id text not null,
  occurred_at timestamptz not null,
  event_name text not null,
  app_version text not null,
  screen text not null,
  race_date date,
  venue_code text,
  race_no smallint,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  constraint pilot_events_study_check
    check (study_id = 'mamoboat-pilot-v1'),
  constraint pilot_events_participant_check
    check (participant_id ~ '^[A-Za-z0-9_-]{3,40}$'),
  constraint pilot_events_session_check
    check (char_length(session_id) between 8 and 100),
  constraint pilot_events_name_check
    check (char_length(event_name) between 1 and 80),
  constraint pilot_events_name_allowlist_check
    check (event_name in (
      'app_opened',
      'onboarding_completed',
      'screen_view',
      'venue_opened',
      'race_opened',
      'bet_review_opened',
      'virtual_bet_placed',
      'result_settled',
      'post_race_urge_recorded',
      'wallet_ledger_posted',
      'press_feedback_recorded',
      'pilot_plan_selected',
      'deep_interview_theme_selected',
      'press_preferences_saved',
      'pilot_settings_saved',
      'pilot_csv_exported',
      'official_data_refresh',
      'partner_reward_issued',
      'double_win_earned',
      'defense_stamp_earned',
      'reward_not_eligible'
    )),
  constraint pilot_events_version_check
    check (char_length(app_version) between 1 and 30),
  constraint pilot_events_screen_check
    check (char_length(screen) between 1 and 60),
  constraint pilot_events_venue_check
    check (venue_code is null or venue_code ~ '^(0[1-9]|1[0-9]|2[0-4])$'),
  constraint pilot_events_race_check
    check (race_no is null or race_no between 1 and 12),
  constraint pilot_events_payload_object_check
    check (jsonb_typeof(payload) = 'object'),
  constraint pilot_events_payload_size_check
    check (octet_length(payload::text) <= 8192),
  constraint pilot_events_time_check
    check (occurred_at <= now() + interval '1 day')
);

create index if not exists pilot_events_participant_time_idx
  on public.pilot_events (study_id, participant_id, occurred_at desc);

create index if not exists pilot_events_name_time_idx
  on public.pilot_events (study_id, event_name, occurred_at desc);

alter table public.pilot_events enable row level security;

revoke all on table public.pilot_events from public, anon, authenticated;
grant insert (
  event_id,
  study_id,
  participant_id,
  session_id,
  occurred_at,
  event_name,
  app_version,
  screen,
  race_date,
  venue_code,
  race_no,
  payload
) on table public.pilot_events to anon;
grant select, insert, update, delete on table public.pilot_events to service_role;

drop policy if exists pilot_events_anon_insert_only on public.pilot_events;
drop policy if exists pilot_events_client_deny_all on public.pilot_events;
create policy pilot_events_anon_insert_only
  on public.pilot_events
  for insert
  to anon
  with check (
    study_id = 'mamoboat-pilot-v1'
    and participant_id ~ '^[A-Za-z0-9_-]{3,40}$'
    and jsonb_typeof(payload) = 'object'
    and octet_length(payload::text) <= 8192
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.pilot_events'::regclass
      and conname = 'pilot_events_name_allowlist_check'
  ) then
    alter table public.pilot_events
      add constraint pilot_events_name_allowlist_check
      check (event_name in (
        'app_opened',
        'onboarding_completed',
        'screen_view',
        'venue_opened',
        'race_opened',
        'bet_review_opened',
        'virtual_bet_placed',
        'result_settled',
        'post_race_urge_recorded',
        'wallet_ledger_posted',
        'press_feedback_recorded',
        'pilot_plan_selected',
        'deep_interview_theme_selected',
        'press_preferences_saved',
        'pilot_settings_saved',
        'pilot_csv_exported',
        'official_data_refresh',
        'partner_reward_issued',
        'double_win_earned',
        'defense_stamp_earned',
        'reward_not_eligible'
      ));
  end if;
end
$$;

create or replace function public.ingest_pilot_events(p_events jsonb)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  inserted_count integer := 0;
  current_event record;
begin
  if p_events is null
    or jsonb_typeof(p_events) <> 'array'
    or jsonb_array_length(p_events) < 1
    or jsonb_array_length(p_events) > 100
    or octet_length(p_events::text) > 1048576
  then
    raise exception using
      errcode = '22023',
      message = 'p_events must be an array containing 1 to 100 bounded events';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_events) as event_row (
      event_id uuid,
      study_id text,
      participant_id text,
      session_id text,
      occurred_at timestamptz,
      event_name text,
      app_version text,
      screen text,
      race_date date,
      venue_code text,
      race_no smallint,
      payload jsonb
    )
    where event_row.event_id is null
      or event_row.study_id <> 'mamoboat-pilot-v1'
      or event_row.participant_id !~ '^[A-Za-z0-9_-]{3,40}$'
      or char_length(event_row.session_id) not between 8 and 100
      or event_row.occurred_at is null
      or event_row.occurred_at > now() + interval '1 day'
      or event_row.event_name not in (
        'app_opened',
        'onboarding_completed',
        'screen_view',
        'venue_opened',
        'race_opened',
        'bet_review_opened',
        'virtual_bet_placed',
        'result_settled',
        'post_race_urge_recorded',
        'wallet_ledger_posted',
        'press_feedback_recorded',
        'pilot_plan_selected',
        'deep_interview_theme_selected',
        'press_preferences_saved',
        'pilot_settings_saved',
        'pilot_csv_exported',
        'official_data_refresh',
        'partner_reward_issued',
        'double_win_earned',
        'defense_stamp_earned',
        'reward_not_eligible'
      )
      or char_length(event_row.app_version) not between 1 and 30
      or char_length(event_row.screen) not between 1 and 60
      or (event_row.venue_code is not null and event_row.venue_code !~ '^(0[1-9]|1[0-9]|2[0-4])$')
      or (event_row.race_no is not null and event_row.race_no not between 1 and 12)
      or event_row.payload is null
      or jsonb_typeof(event_row.payload) <> 'object'
      or octet_length(event_row.payload::text) > 8192
  ) then
    raise exception using
      errcode = '22023',
      message = 'one or more pilot events failed validation';
  end if;

  for current_event in
    select *
    from jsonb_to_recordset(p_events) as parsed_event (
      event_id uuid,
      study_id text,
      participant_id text,
      session_id text,
      occurred_at timestamptz,
      event_name text,
      app_version text,
      screen text,
      race_date date,
      venue_code text,
      race_no smallint,
      payload jsonb
    )
  loop
    begin
      insert into public.pilot_events (
        event_id,
        study_id,
        participant_id,
        session_id,
        occurred_at,
        event_name,
        app_version,
        screen,
        race_date,
        venue_code,
        race_no,
        payload
      ) values (
        current_event.event_id,
        current_event.study_id,
        current_event.participant_id,
        current_event.session_id,
        current_event.occurred_at,
        current_event.event_name,
        current_event.app_version,
        current_event.screen,
        current_event.race_date,
        current_event.venue_code,
        current_event.race_no,
        current_event.payload
      );
      inserted_count := inserted_count + 1;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  return inserted_count;
end;
$$;

revoke all on function public.ingest_pilot_events(jsonb) from public, anon, authenticated;
grant execute on function public.ingest_pilot_events(jsonb) to anon;
grant execute on function public.ingest_pilot_events(jsonb) to service_role;

comment on table public.pilot_events is
  'Consent-based, pseudonymous MAMO BOAT pilot events. Client table access is denied.';
comment on function public.ingest_pilot_events(jsonb) is
  'Validates and inserts up to 100 pilot events; duplicate event IDs are ignored.';
comment on column public.pilot_events.participant_id is
  'Tester code only. Do not store a name, email address, phone number, or advertising ID.';
comment on column public.pilot_events.payload is
  'Bounded structured metrics. Do not store free text or payment information.';

create or replace view private.pilot_participant_daily
with (security_invoker = true)
as
select
  study_id,
  participant_id,
  (occurred_at at time zone 'Asia/Tokyo')::date as day_jst,
  count(*) as event_count,
  count(distinct session_id) as session_count,
  count(*) filter (where event_name = 'app_opened') as app_open_count,
  count(*) filter (where event_name = 'virtual_bet_placed') as virtual_bet_count,
  coalesce(sum(
    case
      when event_name = 'virtual_bet_placed'
        and coalesce(payload->>'intended_yen', '') ~ '^[0-9]+([.][0-9]+)?$'
      then (payload->>'intended_yen')::numeric
      else 0
    end
  ), 0) as intended_yen_total,
  count(*) filter (
    where event_name = 'virtual_bet_placed'
      and coalesce(payload->>'confidence', '') ~ '^[0-9]+([.][0-9]+)?$'
      and coalesce(payload->>'urge_before', '') ~ '^[0-9]+([.][0-9]+)?$'
      and (payload->>'confidence')::numeric <= 4
      and (payload->>'urge_before')::numeric >= 7
  ) as low_agreement_high_urge_count,
  count(*) filter (
    where event_name = 'virtual_bet_placed'
      and payload->>'reason' = 'まあ100円だけ'
  ) as casual_100_count,
  count(*) filter (
    where event_name = 'virtual_bet_placed'
      and payload->>'reason' = '取り返したい'
  ) as declared_chase_count,
  count(*) filter (
    where event_name = 'post_race_urge_recorded'
  ) as after_review_count,
  count(*) filter (
    where event_name = 'post_race_urge_recorded'
      and coalesce(payload->>'cash_would_have_won_urge', '') ~ '^[0-9]+([.][0-9]+)?$'
      and (payload->>'cash_would_have_won_urge')::numeric >= 7
  ) as cash_fomo_high_count,
  count(*) filter (
    where event_name = 'press_feedback_recorded'
  ) as press_feedback_count,
  count(*) filter (
    where event_name = 'press_feedback_recorded'
      and payload->>'response' = 'fit'
  ) as press_fit_count,
  min(received_at) as first_received_at,
  max(received_at) as last_received_at
from public.pilot_events
group by study_id, participant_id, (occurred_at at time zone 'Asia/Tokyo')::date;

create or replace view private.pilot_overview
with (security_invoker = true)
as
select
  study_id,
  count(distinct participant_id) as participant_count,
  count(*) as event_count,
  count(distinct session_id) as session_count,
  min(occurred_at) as first_event_at,
  max(occurred_at) as last_event_at,
  count(*) filter (where event_name = 'virtual_bet_placed') as virtual_bet_count,
  count(*) filter (where event_name = 'press_feedback_recorded') as press_feedback_count
from public.pilot_events
group by study_id;

revoke all on private.pilot_participant_daily from public, anon, authenticated;
revoke all on private.pilot_overview from public, anon, authenticated;
grant select on private.pilot_participant_daily to service_role;
grant select on private.pilot_overview to service_role;
