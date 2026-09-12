const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const helper = read("dev/odds-reference-odds-sync.js");
const sw = read("dev/sw.js");

assert.match(helper, /data-odds-add/);
assert.match(helper, /mamo-odds-value/);
assert.match(helper, /requestMatches\(input, init, expected\)/);
assert.match(helper, /String\(body\?\.betType \|\| ""\) === "trifecta"/);
assert.match(helper, /\[combination\]: odds/);
assert.match(helper, /queueMicrotask\(restore\)/);
assert.doesNotMatch(helper, /setTimeout\(/);
assert.doesNotMatch(helper, /innerHTML/);
assert.doesNotMatch(helper, /scrollTo|scrollBy|requestAnimationFrame|visualViewport/);

assert.match(sw, /mamoboat-v511-odds-reference-sync-dev/);
assert.match(sw, /odds-reference-odds-sync\.js\?v=20260912-1/);
assert.match(sw, /url\.pathname\.endsWith\("\/odds-reference-odds-sync\.js"\)/);

console.log("odds reference odds sync regression checks passed");
