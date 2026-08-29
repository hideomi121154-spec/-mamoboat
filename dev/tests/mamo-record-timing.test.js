const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const record = fs.readFileSync(path.join(root, "mamo-record.js"), "utf8");
const resultFirst = fs.readFileSync(path.join(root, "mamo-record-dismiss-fix.js"), "utf8");

assert.match(app, /この買い目への自信は？/);
assert.equal((app.match(/今、現金で買いたい気持ち/g) || []).length, 1);

assert.doesNotMatch(record, /この勝負、どれくらい納得してる？/);
assert.doesNotMatch(record, /show\(r,"pre"\)/);
assert.match(record, /captureAirBet\(r,true\)/);
assert.match(record, /showPost\(c\)/);
assert.match(record, /結果を見て、今は？/);

assert.doesNotMatch(resultFirst, /s\.reflections\[id\]/);
assert.match(resultFirst, /!s\.postReflections\[id\]&&settled\(r\)/);

console.log("MAMO RECORD asks only after the race result and reuses pre-bet inputs");
