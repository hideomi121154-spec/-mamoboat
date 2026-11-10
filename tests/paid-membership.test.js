const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const script = fs.readFileSync("dev/paid-membership.js", "utf8");
let tracked = 0;
let fetchCalls = 0;
const sandbox = {
  window: { MAMO_BILLING_LIVE: false, MAMO_TRACK_EVENT() { tracked += 1; } },
  document: { getElementById() { return null; }, createElement() { throw new Error("DOM not needed at startup"); } },
  fetch() { fetchCalls += 1; throw new Error("No network in prelaunch"); }
};
vm.runInNewContext(script, sandbox);
assert.equal(sandbox.window.MAMO_MEMBERSHIP.isLive, false, "Billing must default to disabled");
assert.equal(sandbox.window.MAMO_MEMBERSHIP.verifiedPlan(), "free", "No paid membership without webhook");
assert.equal(sandbox.window.MAMO_MEMBERSHIP.plans.bronze.price, 390);
assert.equal(sandbox.window.MAMO_MEMBERSHIP.plans.silver.price, 690);
assert.equal(sandbox.window.MAMO_MEMBERSHIP.plans.gold.price, 1190);
assert.equal(fetchCalls, 0, "Startup must not trigger payment API");
assert.equal(tracked, 0, "Startup must not fake plan interest");
console.log("PASS paid membership prelaunch safety guards");
