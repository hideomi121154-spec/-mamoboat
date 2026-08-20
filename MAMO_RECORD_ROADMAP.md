# MAMO RECORD Roadmap

## Core principle
MAMO RECORD exists to reduce the friction of recording decision context. It must never reward stake size, wins, losses, or repeated betting. The reward is for completing a reflection record.

## Phase 1 — Minimal record loop
Goal: After a new AIR BET, collect two one-tap answers and award RECORD for completing the record.

- Trigger: new AIR BET record detected
- Question 1: How convinced were you by this bet? (1–5)
- Question 2: How strong was the urge to buy with cash? (1–5)
- Completion reward: +10 RECORD
- Daily cap: 50 RECORD
- No reward for stake amount, odds, hit/miss, or number of bets
- Save psychology as a sidecar keyed to the AIR BET record ID
- Send a telemetry event only when pilot consent is active
- Keep the questionnaire dismissible; no blocking of race use

Success metrics:
- prompt display rate
- completion rate
- median completion time
- percentage of completed records with both answers
- next-day retention, observed only as a product metric (not used to incentivize betting)

## Phase 2 — Post-result reflection
Goal: connect pre/post decision state.

- One-tap result feeling: convinced / frustrated / want to recover / neutral
- Link to the same AIR BET record ID
- No extra reward based on hit/miss
- Optional small completion reward only if it does not create repeated-bet incentives

## Phase 3 — Skip parity
Goal: ensure RECORD is not structurally tied to betting.

- Completing an explicit skip reason earns the same class of RECORD reward
- Daily cap remains global across AIR BET and skip reflections
- Track AIR-only, AIR→REAL, REAL-only, REAL→AIR patterns independently from rewards

## Phase 4 — Automatic analysis
Goal: users should not have to analyze their own logs.

- Feed RECORD psychology into morning / weekly / monthly reports
- Show changes, patterns, and contradictions between self-report and observed behavior
- Keep FREE useful; paid plans primarily increase automation, history depth, and synthesis quality

## Phase 5 — SHOP utility
Goal: create a reason for RECORD to feel useful without immediately giving it cash value.

- Start with non-cash utility: member-only selections, access, badges, limited content, curated offers
- Affiliate purchases remain external
- Do not promise RECORD for affiliate purchase unless the affiliate program explicitly permits incentives

## Phase 6 — Paid plan around ¥1,000/month
Goal: convert part of the money users would otherwise spend on betting into a recurring service fee.

- FREE: AIR BET, basic records, RECORD earning, basic summaries, SHOP access
- Paid: automatic synthesis, long-term comparisons, morning/weekly/monthly reports, higher-value personalization, member SHOP benefits
- The paid value proposition is convenience: MAMO BOAT organizes and interprets the data for the user

## Product language
Preferred user-facing framing:
- “現金を使わずに済んだ額”
- “AIR BETへ置き換えた額”
- “守った現金”

Avoid claiming that avoided spend is guaranteed profit or investment return.
