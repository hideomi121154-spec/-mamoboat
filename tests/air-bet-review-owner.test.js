const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const controls = fs.readFileSync(path.join(root, "dev/air-bet-review-delete-controls.js"), "utf8");
const flow = fs.readFileSync(path.join(root, "dev/bet-review-flow.js"), "utf8");

// The auxiliary review-controls module may rearrange allocation/list UI only.
// It must never force the final AIR BET button visible; otherwise iPhone/PWA
// can bypass the canonical SELF CHECK step and placeBet() only sees a missing
// SELF CHECK payload after the user taps the prematurely exposed button.
assert.equal(
  controls.includes('.air-bet-confirm-button'),
  false,
  "auxiliary review controls must not select or own the final AIR BET confirmation button"
);
assert.equal(
  controls.includes("confirmButton"),
  false,
  "auxiliary review controls must not mutate final-confirmation display state"
);

// The canonical flow must remain the owner of SELF CHECK and final confirmation.
assert(flow.includes("createSelfCheckPanel"), "canonical review flow must create SELF CHECK");
assert(flow.includes('reviewStep = "final"'), "canonical review flow must own transition to final step");
assert(flow.includes('button[onclick="placeBet()"]'), "canonical review flow must own final button state");

console.log("AIR BET review ownership regression checks passed");
