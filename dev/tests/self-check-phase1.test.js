"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const app = fs.readFileSync(path.join(root, "dev/app.js"), "utf8");
const review = fs.readFileSync(path.join(root, "dev/bet-review-flow.js"), "utf8");
const css = fs.readFileSync(path.join(root, "dev/air-bet-review-compact.css"), "utf8");
const html = fs.readFileSync(path.join(root, "dev/index.html"), "utf8");
const sw = fs.readFileSync(path.join(root, "dev/sw.js"), "utf8");

for (const field of [
  "selfCheckVersion",
  "selfConfidence",
  "selfBasis",
  "selfStakeFeeling",
  "selfRealSameAmount",
]) {
  assert.match(app, new RegExp(`\\b${field}\\b`), `canonical AIR BET record must contain ${field}`);
}

for (const key of [
  "self_check_version",
  "self_confidence",
  "self_basis",
  "self_stake_feeling",
  "self_real_same_amount",
]) {
  assert.match(app, new RegExp(`\\b${key}\\b`), `virtual_bet_placed payload must contain ${key}`);
}

assert.doesNotMatch(app, /SELF CHECKの4項目を選んでください。/, "SELF CHECK must not gate BET creation");
assert.match(app, /window\.completeAirBetSelfCheck/, "app owns answer-only persistence");
assert.match(review, /showPostBetSelfCheck/, "UI exposes the direct post-bet API");
assert.match(review, /data-mamo-self-check/, "review owner must render SELF CHECK");
assert.match(review, /このレースへの自信は？/, "confidence prompt must be present");
assert.match(review, /今回の主な根拠は？/, "basis prompt must be present");
assert.match(review, /このBET額をどう感じますか？/, "stake-feeling prompt must be present");
assert.match(review, /REALでも同じ金額を賭けますか？/, "REAL comparison prompt must be present");
assert.doesNotMatch(review, /window\.placeBet\s*=/, "review presentation must not replace placeBet");
assert.doesNotMatch(review, /SELF_CHECK_STORE_KEY|pre_bet_self_check_recorded|finalizeSelfCheck/, "parallel SELF CHECK persistence must not exist");
assert.match(css, /\.mamo-self-check/, "canonical review stylesheet must own SELF CHECK styling");

for (const asset of [
  "app.js?v=20260914-2",
  "bet-review-flow.js?v=20260914-2",
  "air-bet-review-compact.css?v=20260914-2",
]) {
  assert.ok(html.includes(asset), `index must load ${asset}`);
  assert.ok(sw.includes(asset), `service worker must deliver ${asset}`);
}
assert.match(sw, /mamoboat-v520-post-bet-self-check-dev/, "PWA cache namespace must be bumped");

console.log("SELF CHECK Phase 1 ownership and PWA delivery contract: OK");

