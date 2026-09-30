# MAMO BOAT AUTO EVALS

Updated: 2026-09-30

## Purpose

MAMO BOAT uses two quality gates before changes are accepted:

1. **Automated tests** — does the software still work?
2. **Automated evals** — is the analysis/editorial output still appropriate and grounded?

A change should not reach `main` if either gate fails.

## Current eval contract

The eval runner checks that MAMO BOAT does not:

- promise wins, hits, profit, or guaranteed outcomes
- pressure a user to bet, buy, or recover losses
- treat opening the REAL/official link as proof that a ticket was purchased
- state a win/loss cause from correlation alone
- make strong personality/tendency claims from too little data

It also checks that important product guardrails remain present in the analysis/editorial source files.

## Grounding

Eval cases can provide `requiredFacts`. Those facts must appear in the output. This is a simple deterministic grounding check and does not call an external AI model.

## Low-data rule

For fewer than 3 observations, assertive tendency language requires uncertainty wording such as:

- まだ判断できません
- 現時点
- データ不足
- 1件だけ
- 断定できません

## Running locally

```bash
node evals/run-evals.js
```

A successful run exits with code 0. Any contract violation exits with code 1, which blocks CI.

## Adding a new bug or bad-output example

Whenever a user-visible analysis mistake is found:

1. add the bad example to `evals/cases.json`
2. set `expectedPass` to `false`
3. run the evals and confirm the evaluator rejects it
4. fix the product behavior
5. run all automated tests and evals again

This turns production mistakes into permanent regression checks.

## Future extension

If MAMO BOAT later calls an LLM in production, the same case set can be used as a model eval set:

**input facts → model output → deterministic checks → optional model-judge → release gate**

The deterministic checks should remain even if a model-judge is added.
