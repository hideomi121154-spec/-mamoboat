# MAMO BOAT SELF CHECK Phase 1

## Purpose
Before AIR BET is finalized, the user records four pieces of self-awareness data. This feature is descriptive only and must not predict or recommend race outcomes.

## Questions
1. Confidence: 1 to 5
2. Main basis: racer / motor / exhibition / odds / start / intuition / other
3. Stake feeling: very_low / low / appropriate / high / very_high
4. Would use the same amount in REAL: yes / no

## Safety / ownership rules
- `dev/bet-review-flow.js` is the single review-flow presentation owner.
- `dev/app.js` remains the authoritative AIR BET state, record, wallet, and event owner.
- Do not wrap or replace `placeBet()`.
- Do not create a parallel SELF CHECK local store or a second event pipeline.
- Persist SELF CHECK directly on the AIR BET record created by `placeBet()` under the same authoritative `recordId`.
- Include the SELF CHECK values in the existing `virtual_bet_placed` payload so central analytics uses the same `record_id`.
- Existing JSON export/reset semantics automatically cover SELF CHECK because it lives inside the canonical app state record.
- Do not modify settlement, official-result processing, B-medal accounting, or AIR BET draft ownership.
- If AIR BET fails or is cancelled, no completed AIR BET record exists and no SELF CHECK is persisted.

## Canonical record fields
- `selfCheckVersion: 1`
- `selfConfidence`
- `selfBasis`
- `selfStakeFeeling`
- `selfRealSameAmount`

## Existing event payload additions
- `self_check_version`
- `self_confidence`
- `self_basis`
- `self_stake_feeling`
- `self_real_same_amount`

## Phase 1 acceptance criteria
- Four answers are required before the final AIR BET button is enabled.
- `placeBet()` defensively validates all four answers again before writing the record.
- Existing AIR BET, wallet, settlement, official result, and navigation behavior remain unchanged.
- SELF CHECK is joined to AIR BET exactly by the same `record_id` without a parallel store.
- No prediction, bet recommendation, or confidence-based encouragement is shown.
