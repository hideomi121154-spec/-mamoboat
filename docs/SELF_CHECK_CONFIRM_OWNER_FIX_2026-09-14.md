# SELF CHECK confirmation owner fix — 2026-09-14

## Symptom
On iPhone Safari/PWA, the normal BET review screen exposed the final `AIR BETを確定する` button before the canonical SELF CHECK final step. Tapping it caused `placeBet()` to reject with `SELF CHECKの4項目を選んでください。` even though the four SELF CHECK controls were not visible.

## Root cause
`dev/air-bet-review-delete-controls.js` is an auxiliary presentation helper, but v3 also selected `.air-bet-confirm-button` and forced `display: block !important` in normal mode. That overrode the visibility owned by `dev/bet-review-flow.js`, which is the canonical controller for the allocation/list -> SELF CHECK -> final confirmation sequence.

## Fix
- Remove `.air-bet-confirm-button` from the auxiliary helper's owned nodes.
- Remove the helper's forced display mutation for the final confirmation button.
- Keep SELF CHECK creation, final-step transition, and final-button enable/disable state solely in `bet-review-flow.js`.
- Add a regression test that fails if the auxiliary helper starts selecting or mutating the final confirmation button again.

## Deliberately not changed
- `placeBet()`
- wallet/record persistence
- navigation
- allocation math
- Service Worker routing/caching strategy
- SELF CHECK data schema

The existing Service Worker already treats `air-bet-review-delete-controls.js` as network-first with `cache: "no-store"`, so this source fix does not require another cache-policy overlay.
