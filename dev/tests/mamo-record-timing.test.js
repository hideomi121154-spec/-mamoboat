const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const record = fs.readFileSync(path.join(root, "mamo-record.js"), "utf8");
const resultFirst = fs.readFileSync(path.join(root, "mamo-record-dismiss-fix.js"), "utf8");

assert.doesNotMatch(app, /この買い目への自信は？/);
assert.doesNotMatch(app, /今、現金で買いたい気持ち/);
assert.doesNotMatch(app, /取り返すため、次も買いたい気持ち/);
assert.match(app, /気持ちの採点はしません/);
assert.match(app, /observationVersion: 1/);

assert.doesNotMatch(record, /この勝負、どれくらい納得してる？/);
assert.doesNotMatch(record, /結果を見て、いちばん近い気持ちは？/);
assert.doesNotMatch(record, /data-emotion/);
assert.doesNotMatch(record, /show\(r,"pre"\)/);
assert.match(record, /captureAirBet\(r,true\)/);
assert.match(record, /showPost\(c\)/);
assert.match(record, /結果と、その次の行動/);
assert.match(record, /OFFICIAL RACE RESULT/);
assert.match(record, /確定着順/);
assert.match(record, /AIR BET RESULT/);
assert.match(record, /あなたの買い目/);
assert.match(record, /resultHtml\(r\)/);
assert.match(record, /mamo:result-observed/);
assert.match(record, /質問せずに行動を見ます/);
assert.match(record, /data-result-observed/);
assert.match(record, /result_observation_complete/);
assert.ok(record.indexOf('resultHtml(r)') < record.indexOf('質問せずに行動を見ます'));

assert.doesNotMatch(resultFirst, /s\.reflections\[id\]/);
assert.match(resultFirst, /!s\.postReflections\[id\]&&settled\(r\)/);
assert.doesNotMatch(resultFirst, /MutationObserver/);

console.log("MAMO RECORD shows the result first and starts passive behavior observation without emotion questions");
