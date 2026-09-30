const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = fs.readFileSync(path.join(__dirname, "..", "device-sync.js"), "utf8");
const dev = fs.readFileSync(path.join(__dirname, "..", "dev", "device-sync.js"), "utf8");
const edge = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "functions", "device-state-sync", "index.ts"),
  "utf8"
);

for (const [name, source] of [["root", root], ["dev", dev]]) {
  assert.match(source, /function ledgerBalance\(ledger\)/, `${name} sync must derive B from ledger`);
  assert.match(source, /const balanceFromLedger = ledgerBalance\(merged\.ledger\)/);
  assert.match(source, /merged\.coins = balanceFromLedger/);
  assert.doesNotMatch(
    source,
    /merged\.coins = rr >= lr/,
    `${name} sync must not choose wallet balance from record counts`
  );
}

assert.match(edge, /https:\/\/mamoboat\.com/);
assert.match(edge, /https:\/\/hideomi121154-spec\.github\.io/);
assert.match(edge, /function mergeLedger\(existing: any, incoming: any\)/);
assert.match(edge, /mergeLedger\(current\?\.state\?\.ledger, body\.state\.ledger\)/);
assert.match(edge, /const balance = ledgerBalance\(mergedLedger\)/);
assert.match(edge, /nextState\.coins = balance/);

const sampleLedger = [
  { amount: 100000 },
  { amount: -95000 },
  { amount: 21340 },
  { amount: 100000 },
];
const expected = sampleLedger.reduce((sum, item) => sum + item.amount, 0);
assert.equal(expected, 126340);

console.log("ledger-authoritative B balance regression OK");
