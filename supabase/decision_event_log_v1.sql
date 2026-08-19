-- MAMO BOAT Decision Event Log v1
-- Applied to project mihicuoijitluvrufsoj on 2026-08-19.
-- Keeps the central pilot event allowlist aligned with the frontend taxonomy.

alter table public.pilot_events
  drop constraint if exists pilot_events_name_allowlist_check;

alter table public.pilot_events
  add constraint pilot_events_name_allowlist_check
  check (event_name = any (array[
    'app_opened'::text,
    'onboarding_completed'::text,
    'screen_view'::text,
    'venue_opened'::text,
    'race_opened'::text,
    'bet_review_opened'::text,
    'virtual_bet_placed'::text,
    'result_settled'::text,
    'post_race_urge_recorded'::text,
    'wallet_ledger_posted'::text,
    'press_feedback_recorded'::text,
    'pilot_plan_selected'::text,
    'deep_interview_theme_selected'::text,
    'press_preferences_saved'::text,
    'pilot_settings_saved'::text,
    'pilot_csv_exported'::text,
    'official_data_refresh'::text,
    'partner_reward_issued'::text,
    'double_win_earned'::text,
    'defense_stamp_earned'::text,
    'reward_not_eligible'::text,
    'decision_skip_recorded'::text,
    'decision_real_intent_opened'::text,
    'decision_changed'::text,
    'decision_intervention_shown'::text,
    'decision_intervention_result'::text
  ]));

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
        'reward_not_eligible',
        'decision_skip_recorded',
        'decision_real_intent_opened',
        'decision_changed',
        'decision_intervention_shown',
        'decision_intervention_result'
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
        event_id, study_id, participant_id, session_id, occurred_at,
        event_name, app_version, screen, race_date, venue_code, race_no, payload
      ) values (
        current_event.event_id, current_event.study_id, current_event.participant_id,
        current_event.session_id, current_event.occurred_at, current_event.event_name,
        current_event.app_version, current_event.screen, current_event.race_date,
        current_event.venue_code, current_event.race_no, current_event.payload
      );
      inserted_count := inserted_count + 1;
    exception
      when unique_violation then null;
    end;
  end loop;

  return inserted_count;
end;
$$;

revoke all on function public.ingest_pilot_events(jsonb) from public, anon, authenticated;
grant execute on function public.ingest_pilot_events(jsonb) to anon;
grant execute on function public.ingest_pilot_events(jsonb) to service_role;
