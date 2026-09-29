# MAMO BOAT Technical Handover

Updated: 2026-09-30

This document is a transfer-oriented overview of the current MAMO BOAT implementation. It is intentionally limited to technical and operational facts that can be verified from the repository.

## 1. Product boundary

MAMO BOAT is a PWA that uses non-cash, non-transferable B medals for AIR BET participation against real BOAT RACE events. It records user decisions and behavior, settles virtual outcomes from official result data, and produces rule-based behavioral summaries.

The application does not execute real-money wagering or deposits/withdrawals.

## 2. Runtime architecture

### Client
- Static HTML / CSS / JavaScript
- GitHub Pages hosting
- PWA via service worker and manifest
- Primary user state stored in browser localStorage
- Optional anonymous pilot-event upload to Supabase after user consent

### Data ingestion
- Python synchronization scripts
- GitHub Actions scheduled jobs
- Official program/result data is transformed into repository JSON
- The app reads generated JSON from GitHub Pages
- Result settlement uses confirmed result/payout data rather than reference odds

### Central pilot analytics
- Supabase project used for opt-in anonymous event collection
- Public client contains only the publishable key
- Service-role/secret keys are not embedded in the browser
- Client cannot directly read the private aggregation views described in CENTRAL_AGGREGATION.md

## 3. Main repository areas

- `index.html`: application shell
- `app.js`: primary UI/application orchestration
- `core.js`: shared application logic
- `pilot-config.js`: pilot collection and plan bootstrap
- `push-notifications.js`: optional morning push client integration
- `scripts/`: official-data synchronization
- `.github/workflows/`: synchronization, repair and automated test workflows
- `data/`: generated race and result JSON archives
- `supabase/`: database definitions used by pilot analytics
- `tests/`: JavaScript/Python regression tests
- `CENTRAL_AGGREGATION.md`: central analytics operating guide
- `DEPLOY.md`: GitHub Pages deployment notes
- `TEST_REPORT.md`: historical verification notes

## 4. Core data flow

1. GitHub Actions runs synchronization jobs.
2. Official public program/result sources are downloaded and parsed.
3. Validation checks venue/race/boat structure before replacing generated JSON.
4. Generated data is committed to `data/`.
5. GitHub Pages serves application code and JSON.
6. User completes AIR BET locally with B medals.
7. The application later matches confirmed results and payout information.
8. Behavioral events remain local by default.
9. If the tester explicitly opts in, structured anonymous events are sent to Supabase.

## 5. User-data boundary

Central pilot collection is designed around tester IDs rather than names.

The repository documentation states that central events exclude:
- names
- email addresses
- free-form notes
- payment information
- advertising IDs

Before any commercial launch or transfer, the buyer should independently review privacy terms, retention rules, deletion procedures and production consent text.

## 6. Operational tests

Repository-documented local checks include:

```bash
python -m py_compile scripts/sync_official_data.py
python tests/test_sync_transform.py
node --check core.js
node --check app.js
node tests/logic.test.js
node tests/app-smoke.test.js
```

Additional regression tests exist under `tests/`, including AIR BET review/draft behavior and iOS navigation/event-loop regressions.

## 7. Deployment handover

Current deployment is GitHub Pages from the repository. A new operator should verify:

1. repository administration rights
2. GitHub Pages domain configuration
3. GitHub Actions workflow permissions
4. scheduled synchronization jobs
5. Supabase ownership and billing
6. publishable client configuration
7. any private server/Edge Function secrets
8. domain registrar ownership for mamoboat.com
9. PWA behavior on iOS Safari
10. data synchronization after a real completed race day

## 8. External dependency review

Before commercial use, verify:
- BOAT RACE official data/site terms applicable to the intended commercial use
- frequency and method of automated retrieval
- current website structure relied upon by live-result/odds parsing
- trademark/branding boundaries
- privacy and user-consent requirements
- any paid-plan claims or behavioral-effect claims

This is an operational checklist, not legal advice.

## 9. Transfer package checklist

A complete ownership transfer should include:
- GitHub repository
- mamoboat.com domain
- Supabase project
- relevant GitHub Actions settings/secrets
- any Edge Function secrets or push credentials
- PWA assets and original brand artwork
- analytics definitions
- current test report
- deployment/runbook
- known-issues register
- external-service account inventory

## 10. Current transfer-readiness strengths

- working PWA rather than a static mock
- automated official-data synchronization
- historical generated data
- automated regression tests
- consent-based central pilot telemetry
- separate public-client and privileged-data boundaries
- custom domain and original product identity

The remaining transfer work should focus on current KPI evidence, security review, commercial-data rights confirmation, and minimizing operator-specific knowledge.
