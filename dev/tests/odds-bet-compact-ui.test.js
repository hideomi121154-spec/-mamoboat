const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("dev/odds-bet-mode-v1.js");
const css = read("dev/odds-bet-mode.css");
const sw = read("dev/sw.js");

assert.match(script, /back\.dataset\.oddsBack\s*=\s*"1"/);
assert.match(script, /select\.dataset\.oddsAxisSelect\s*=\s*"1"/);
assert.match(script, /window\.setMode\("normal"\)/);
assert.match(script, /document\.addEventListener\("change", onChange, false\)/);
assert.doesNotMatch(script, /className\s*=\s*"mamo-odds-selected"/);
assert.doesNotMatch(script, /function axisButton\(/);

assert.match(css, /\.mamo-odds-toolbar/);
assert.match(css, /\.mamo-odds-back/);
assert.match(css, /\.mamo-odds-axis-select/);
assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\) 40px 49px/);
assert.match(css, /\.mamo-odds-row > button[\s\S]*?width:\s*100%/);
assert.doesNotMatch(css, /\.mamo-odds-selected/);
assert.doesNotMatch(css, /\.mamo-odds-axis\s/);

assert.match(sw, /mamoboat-v510-odds-compact-controls-dev/);
assert.match(sw, /odds-bet-mode\.css\?v=20260912-3/);
assert.match(sw, /odds-bet-mode-v1\.js\?v=20260912-1/);

console.log("compact odds UI regression checks passed");