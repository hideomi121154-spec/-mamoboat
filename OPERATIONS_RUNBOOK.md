# MAMO BOAT Operations Runbook

Updated: 2026-09-30

## Daily operation

MAMO BOAT is designed so that routine race-data updates are performed by scheduled GitHub Actions rather than manual operator entry.

The operator should monitor:
- GitHub Actions failures
- freshness of `data/today.json`
- result settlement delays
- official-source structure changes
- Supabase ingestion health
- PWA/service-worker regressions

## Incident triage order

When a race screen is incorrect:

1. confirm `data/today.json` freshness
2. confirm the relevant venue/race exists in generated JSON
3. inspect the latest synchronization workflow result
4. distinguish program-data failure from result-data failure
5. run repository regression tests
6. only then investigate client rendering

When AIR BET settlement is incorrect:

1. inspect saved AIR BET record
2. confirm race/date/venue identifiers
3. inspect confirmed result JSON
4. inspect payout status including cancellation/refund/not-established states
5. run settlement regression tests
6. verify the browser has refreshed current JSON

## Pilot analytics checks

Use administrator-only Supabase access for aggregate review. The public web client should not be granted direct table/view read access merely to simplify dashboards.

Operational checks should cover:
- participant/event volume
- ingestion failures
- duplicate-event behavior
- consent-state behavior
- retention/deletion process
- unexpected growth in payload volume

## Release checklist

Before publishing a material release:

- run JavaScript syntax checks
- run Python parser tests
- run AIR BET regression tests
- run app smoke tests
- verify one iPhone Safari flow
- verify one desktop flow
- verify a live race/result path when external access is available
- confirm service-worker cache versioning
- confirm no privileged key is present in public JavaScript
- confirm GitHub Actions can still update generated data

## Ownership transfer checklist

Before transferring the system to a new operator:

- transfer repository administration
- transfer domain registration/DNS
- transfer Supabase organization/project ownership as appropriate
- rotate privileged secrets after transfer
- re-issue push credentials when ownership changes
- verify GitHub Actions and scheduled jobs under the new owner
- verify final production URL and PWA installation
- archive a dated test report
- provide a known-issues list and open-risk list

Do not place sale price, negotiations, buyer identities, confidential credentials or private due-diligence material in this public repository.
