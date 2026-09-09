const assert = require("node:assert/strict");
const path = require("node:path");

const Draft = require(path.join(__dirname, "..", "dev", "air-bet-draft-core.js"));

const line = (mode, combination, extra = {}) => ({
  betType: "trifecta",
  mode,
  combination,
  amount: null,
  referenceOdds: null,
  oddsFetchedAt: null,
  ...extra,
});

let draft = [];
let result = Draft.appendUnique(draft, [line("normal", "1-2-3", {
  referenceOdds: 8.8,
  oddsFetchedAt: "2026-09-08T09:27:00.000Z",
})]);
assert.equal(result.added.length, 1);
assert.equal(result.duplicates.length, 0);
draft = result.lines;

const formation = Draft.expandFormation([new Set([1]), new Set([5]), new Set([2, 3])]);
assert.deepEqual(formation, [[1, 5, 2], [1, 5, 3]]);
assert.deepEqual(Draft.expandFormation([new Set([1]), new Set([1]), new Set([1])]), []);
result = Draft.appendUnique(draft, formation.map((combination) => line("form", combination, {
  referenceOdds: combination[2] === 2 ? 14.1 : 18.6,
  oddsFetchedAt: "2026-09-08T09:28:00.000Z",
})));
draft = result.lines;
assert.equal(draft.length, 3, "normal + formation must coexist in one tray");
assert.deepEqual(draft.map((item) => item.combination), ["1-2-3", "1-5-2", "1-5-3"]);

const box = Draft.expandBox([1, 2, 3], 3, true);
assert.equal(box.length, 6);
result = Draft.appendUnique(draft, box.map((combination) => line("box", combination)));
draft = result.lines;
assert.equal(result.duplicates.length, 1, "BOX 1-2-3 must match the existing normal ticket");
assert.equal(result.duplicates[0].combination, "1-2-3");
assert.equal(draft.length, 8, "five new BOX permutations must mix with existing lines");

result = Draft.appendUnique(draft, [line("form", "1-2-3")]);
assert.equal(result.added.length, 0);
assert.equal(result.duplicates.length, 1, "mode differences must not duplicate the final ticket");
assert.equal(result.lines.length, 8);

const beforeRemove = draft;
draft = Draft.removeAt(draft, 1);
assert.equal(beforeRemove.length, 8, "immutable remove must preserve the prior state");
assert.equal(draft.length, 7);
assert(!draft.some((item) => item.combination === "1-5-2"));

const beforeAmount = draft;
draft = Draft.setAmount(draft, 0, 550);
assert.equal(beforeAmount[0].amount, null, "per-line amount updates must be immutable");
assert.equal(draft[0].amount, 500);
assert.equal(Draft.incompleteCount(draft), 6);
draft = Draft.setAllAmounts(draft, "1,000");
assert.equal(Draft.total(draft), 7000);
assert.equal(Draft.incompleteCount(draft), 0);
assert(draft.every((item) => item.amount === 1000));

const beforeIncrement = draft;
draft = Draft.addAllAmounts(draft, 100);
assert.equal(beforeIncrement[0].amount, 1000, "bulk increment must preserve the prior state");
assert(draft.every((item) => item.amount === 1100));
draft = Draft.addAllAmounts(draft, "1,000");
assert(draft.every((item) => item.amount === 2100));
assert.equal(Draft.addAllAmounts([line("normal", "2-3-4")], 100)[0].amount, 100,
  "bulk increment must start an empty amount at zero");

const stored = Draft.snapshot(draft);
assert.deepEqual(Object.keys(stored[0]), [
  "betType",
  "mode",
  "combination",
  "amount",
  "referenceOdds",
  "oddsFetchedAt",
  "oddsSource",
  "oddsTimeSource",
]);
assert.equal(stored[0].referenceOdds, 8.8);
assert.equal(stored[0].oddsFetchedAt, "2026-09-08T09:27:00.000Z");

// Repeat the add/remove interaction more than the requested twenty times.
// No timers, DOM rewrites, wallet state, or external state are involved.
let repeated = [];
for (let index = 0; index < 25; index += 1) {
  const boat = (index % 6) + 1;
  repeated = Draft.appendUnique(repeated, [{
    betType: "win",
    mode: index % 2 ? "box" : "normal",
    combination: String(boat),
  }]).lines;
  assert.equal(repeated.length, 1);
  repeated = Draft.removeAt(repeated, 0);
  assert.equal(repeated.length, 0);
}

assert.deepEqual(Draft.snapshot([]), []);
assert.equal(Draft.normalizeAmount(""), null, "new lines must not receive a default 100B");
assert.equal(Draft.normalizeAmount(99), null);
assert.equal(Draft.normalizeAmount(350), 300);

console.log("AIR BET draft tray flow checks passed");
