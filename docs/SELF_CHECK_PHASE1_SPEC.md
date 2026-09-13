# MAMO BOAT SELF CHECK Phase 1

## Purpose
Before AIR BET is finalized, the user records four pieces of self-awareness data. This feature is descriptive only and must not predict or recommend race outcomes.

## Questions
1. Confidence: 1 to 5
2. Main basis: racer / motor / exhibition / odds / start / intuition / other
3. Stake feeling: very_low / low / appropriate / high / very_high
4. Would use the same amount in REAL: yes / no

## Safety / ownership rules
- `dev/bet-review-flow.js` remains the single review-flow presentation owner.
- Do not wrap or replace `placeBet()`.
- Do not modify wallet, settlement, official result, or AIR BET draft ownership.
- Bind SELF CHECK to the created AIR BET by the authoritative `recordId` written to the wallet ledger after `placeBet()` succeeds.
- Keep SELF CHECK data in a dedicated local store keyed by `recordId`.
- If anonymous analytics consent is ON, send a separate `pre_bet_self_check_recorded` event keyed by the same `record_id`.
- If AIR BET fails or is cancelled, do not persist SELF CHECK as a completed record.

## Phase 1 acceptance criteria
- Four answers are required before the final AIR BET button is enabled.
- Existing AIR BET, wallet, settlement, official result, and navigation behavior remain unchanged.
- SELF CHECK can be joined to the AIR BET exactly by `record_id`.
- No prediction, bet recommendation, or confidence-based encouragement is shown.
