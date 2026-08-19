/*
 * MAMO BOAT Decision Event Taxonomy v1
 * Stable observable event names for app, analysis, and Supabase.
 */
(() => {
  "use strict";

  const EVENTS = Object.freeze({
    AIR_BET_REVIEWED: "bet_review_opened",
    AIR_BET_PLACED: "virtual_bet_placed",
    POST_RACE_URGE_RECORDED: "post_race_urge_recorded",
    SKIP_RECORDED: "decision_skip_recorded",
    REAL_INTENT_OPENED: "decision_real_intent_opened",
    REAL_CONFIRMED: "decision_real_confirmed",
    TRANSITION_RECORDED: "decision_transition_recorded",
    DECISION_CHANGED: "decision_changed",
    INTERVENTION_SHOWN: "decision_intervention_shown",
    INTERVENTION_RESULT: "decision_intervention_result",
  });

  const SKIP_REASONS = Object.freeze([
    "confidence_low", "stake_risk", "too_many_races", "after_loss_pause",
    "mamo_prompt", "planned_skip", "other",
  ]);

  const DECISIONS = Object.freeze(["air_bet", "real_intent", "real_confirmed", "skip", "leave"]);

  const TRANSITIONS = Object.freeze([
    "AIR_ONLY", "AIR_TO_REAL", "AIR_TO_SKIP",
    "REAL_ONLY", "REAL_TO_AIR", "REAL_TO_SKIP",
    "SKIP_ONLY", "SKIP_TO_AIR", "SKIP_TO_REAL",
  ]);

  const INTERVENTION_RESULTS = Object.freeze([
    "air_bet", "skip", "real_intent", "dismissed", "unknown",
  ]);

  window.MAMO_DECISION_EVENT_SCHEMA = Object.freeze({
    version: 1,
    events: EVENTS,
    skipReasons: SKIP_REASONS,
    decisions: DECISIONS,
    transitions: TRANSITIONS,
    interventionResults: INTERVENTION_RESULTS,
  });
})();
