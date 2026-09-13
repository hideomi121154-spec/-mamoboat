"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const app = fs.readFileSync(path.join(root, "dev/app.js"), "utf8");
const review = fs.readFileSync(path.join(root, "dev/bet-review-flow.js"), "utf8");
const css = fs.readFileSync(path.join(root, "dev/air-bet-review-compact.css"), "utf8");
const html = fs.readFileSync(path.join(root, "dev/index.html"), "utf8");

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

assert.match(app, /SELF CHECKの4項目を選んでください。/, "placeBet must defensively validate SELF CHECK");
assert.match(review, /data-mamo-self-check/, "review owner must render SELF CHECK");
assert.match(review, /このレースへの自信は？/, "confidence prompt must be present");
assert.match(review, /今回の主な根拠は？/, "basis prompt must be present");
assert.match(review, /このBET額をどう感じますか？/, "stake-feeling prompt must be present");
assert.match(review, /REALでも同じ金額を賭けますか？/, "REAL comparison prompt must be present");
assert.doesNotMatch(review, /window\.placeBet\s*=/, "review presentation must not replace placeBet");
assert.doesNotMatch(review, /SELF_CHECK_STORE_KEY|pre_bet_self_check_recorded|finalizeSelfCheck/, "parallel SELF CHECK persistence must not exist");
assert.match(css, /\.mamo-self-check/, "canonical review stylesheet must own SELF CHECK styling");
assert.match(html, /app\.js\?v=20260914-1/, "app cache key must be bumped");
assert.match(html, /bet-review-flow\.js\?v=20260914-1/, "review cache key must be bumped");
assert.match(html, /air-bet-review-compact\.css\?v=20260914-1/, "review CSS cache key must be bumped");

console.log("SELF CHECK Phase 1 ownership contract: OK");
