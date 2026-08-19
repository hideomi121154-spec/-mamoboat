-- MAMO BOAT decision intervention effectiveness aggregate
-- Applied to Supabase as migration: add_decision_intervention_daily_view

create or replace view private.decision_intervention_daily
with (security_invoker = true)
as
select
  study_id,
  participant_id,
  (occurred_at at time zone 'Asia/Tokyo')::date as day_jst,
  count(*) filter (where event_name = 'decision_intervention_shown') as intervention_shown_count,
  count(*) filter (where event_name = 'decision_intervention_result') as intervention_result_count,
  count(*) filter (
    where event_name = 'decision_intervention_result'
      and payload->>'result' = 'air_bet'
  ) as result_air_bet_count,
  count(*) filter (
    where event_name = 'decision_intervention_result'
      and payload->>'result' = 'skip'
  ) as result_skip_count,
  count(*) filter (
    where event_name = 'decision_intervention_result'
      and payload->>'result' = 'real_intent'
  ) as result_real_intent_count,
  count(*) filter (
    where event_name = 'decision_intervention_result'
      and payload->>'result' = 'dismissed'
  ) as result_dismissed_count,
  count(*) filter (
    where event_name = 'decision_intervention_result'
      and payload->>'result' = 'unknown'
  ) as result_unknown_count,
  avg(
    case
      when event_name = 'decision_intervention_result'
        and coalesce(payload->>'seconds_after_intervention','') ~ '^[0-9]+([.][0-9]+)?$'
      then (payload->>'seconds_after_intervention')::numeric
      else null
    end
  ) as avg_seconds_to_result
from public.pilot_events
where event_name in ('decision_intervention_shown','decision_intervention_result')
group by study_id, participant_id, (occurred_at at time zone 'Asia/Tokyo')::date;

revoke all on private.decision_intervention_daily from public, anon, authenticated;
grant select on private.decision_intervention_daily to service_role;
