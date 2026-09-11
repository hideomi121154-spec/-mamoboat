const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const bridge = fs.readFileSync(path.join(root, "race-carte-official-payouts.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

// Load only the pure calculator API. Keeping readyState at "loading" prevents
// the browser boot/render path from running in this unit-test sandbox.
const sandbox = {
  window: { addEventListener() {} },
  document: { readyState: "loading", addEventListener() {} },
  localStorage: { getItem() { return null; } },
  console,
};
vm.createContext(sandbox);
vm.runInContext(bridge, sandbox);

const calculate = sandbox.window.MAMO_RACE_CARTE_COMPOSITE_ODDS?.calculate;
assert.equal(typeof calculate, "function");

const standard = calculate({
  lines: [
    { betType: "trifecta", combo: [1, 2, 3], odds: "4.0" },
    { betType: "trifecta", combo: [1, 3, 2], odds: "5.0" },
  ],
});
assert.equal(standard.status, "ok");
assert.equal(standard.count, 2);
assert.ok(Math.abs(standard.value - (1 / (1 / 4 + 1 / 5))) < 1e-12);

// A duplicate stored line must not artificially lower the combined price.
const deduped = calculate({
  lines: [
    { betType: "exacta", combo: [1, 2], odds: "6.0" },
    { betType: "exacta", combo: [1, 2], odds: "6.0" },
    { betType: "exacta", combo: [1, 3], odds: "12.0" },
  ],
});
assert.equal(deduped.status, "ok");
assert.equal(deduped.count, 2);
assert.ok(Math.abs(deduped.value - 4) < 1e-12);

// Never calculate from a partial snapshot. Missing odds must stay unavailable.
const missing = calculate({
  lines: [
    { betType: "trifecta", combo: [1, 2, 3], odds: "10.5" },
    { betType: "trifecta", combo: [1, 3, 2], odds: "" },
  ],
});
assert.equal(missing.status, "missing");
assert.equal(missing.value, null);

// Wide/place selections can overlap in one race, so reciprocal-sum dutching
// would be mathematically misleading. Mixed ticket types are also rejected.
assert.equal(calculate({ lines: [{ betType: "wide", combo: [1, 2], odds: "3.0" }] }).status, "unsupported");
assert.equal(calculate({ lines: [
  { betType: "trifecta", combo: [1, 2, 3], odds: "8.0" },
  { betType: "exacta", combo: [1, 2], odds: "4.0" },
] }).status, "mixed");

// The bridge is intentionally read-only: no record/wallet mutation is allowed.
assert.doesNotMatch(bridge, /localStorage\.setItem/);
assert.doesNotMatch(bridge, /S\.records\.push/);
assert.doesNotMatch(bridge, /\bcoins\s*=/);
assert.match(bridge, /投票時合成オッズ/);
assert.match(bridge, /COMPOSITE_TYPES=new Set\(\["trifecta","trio","exacta","quinella","win"\]\)/);

// PWA clients must receive the updated bridge instead of a stale cached copy.
assert.match(sw, /mamoboat-v502-race-carte-composite-odds-dev/);
assert.match(sw, /race-carte-official-payouts\.js\?v=20260911-1/);
assert.match(sw, /url\.pathname\.endsWith\("\/race-carte-official-payouts\.js"\)/);

console.log("Race carte composite odds regression contract: OK");
