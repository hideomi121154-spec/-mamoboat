-- MAMO BOAT AIR/REAL transition events
alter table public.pilot_events drop constraint if exists pilot_events_name_allowlist_check;
alter table public.pilot_events add constraint pilot_events_name_allowlist_check check (event_name = any (array[
'app_opened','onboarding_completed','screen_view','venue_opened','race_opened','bet_review_opened','virtual_bet_placed','result_settled','post_race_urge_recorded','wallet_ledger_posted','press_feedback_recorded','pilot_plan_selected','deep_interview_theme_selected','press_preferences_saved','pilot_settings_saved','pilot_csv_exported','official_data_refresh','partner_reward_issued','double_win_earned','defense_stamp_earned','reward_not_eligible','decision_skip_recorded','decision_real_intent_opened','decision_changed','decision_intervention_shown','decision_intervention_result','decision_real_confirmed','decision_transition_recorded'
]::text[]));
