-- MAMO BOAT AIR / REAL decision transition model v1
-- Keeps central event allowlist and latest transition views in source control.

alter table public.pilot_events drop constraint if exists pilot_events_name_allowlist_check;

alter table public.pilot_events
  add constraint pilot_events_name_allowlist_check
  check (event_name = any (array[
    'app_opened'::text,'onboarding_completed'::text,'screen_view'::text,'venue_opened'::text,'race_opened'::text,
    'bet_review_opened'::text,'virtual_bet_placed'::text,'result_settled'::text,'post_race_urge_recorded'::text,
    'wallet_ledger_posted'::text,'press_feedback_recorded'::text,'pilot_plan_selected'::text,
    'deep_interview_theme_selected'::text,'press_preferences_saved'::text,'pilot_settings_saved'::text,
    'pilot_csv_exported'::text,'official_data_refresh'::text,'partner_reward_issued'::text,
    'double_win_earned'::text,'defense_stamp_earned'::text,'reward_not_eligible'::text,
    'decision_skip_recorded'::text,'decision_real_intent_opened'::text,'decision_real_confirmed'::text,
    'decision_transition_recorded'::text,'decision_changed'::text,'decision_intervention_shown'::text,
    'decision_intervention_result'::text
  ]));

create or replace view private.decision_transition_latest as
with ranked as (
  select participant_id,race_date,venue_code,race_no,occurred_at,
    payload->>'journey_id' as journey_id,
    payload->>'transition' as transition,
    nullif(payload->>'air_stake_b','')::numeric as air_stake_b,
    nullif(payload->>'real_stake_yen','')::numeric as real_stake_yen,
    case when payload ? 'same_ticket' then (payload->>'same_ticket')::boolean else null end as same_ticket,
    row_number() over (
      partition by participant_id,payload->>'journey_id'
      order by occurred_at desc
    ) as rn
  from public.pilot_events
  where event_name='decision_transition_recorded' and payload ? 'journey_id'
)
select participant_id,journey_id,race_date,venue_code,race_no,occurred_at,
       transition,air_stake_b,real_stake_yen,same_ticket
from ranked where rn=1;

create or replace view private.decision_transition_daily as
select participant_id,race_date,transition,count(*) as journeys,
  sum(coalesce(air_stake_b,0)) as air_stake_b,
  sum(coalesce(real_stake_yen,0)) as real_stake_yen,
  count(*) filter (where same_ticket is true) as same_ticket_count
from private.decision_transition_latest
group by participant_id,race_date,transition;
