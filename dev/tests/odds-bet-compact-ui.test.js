const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("dev/odds-bet-mode-v1.js");
const css = read("dev/odds-bet-mode.css");
const html = read("dev/index.html");
const sw = read("dev/sw.js");

assert.match(script, /back\.dataset\.oddsBack\s*=\s*"1"/);
assert.match(script, /select\.dataset\.oddsAxisSelect\s*=\s*"1"/);
assert.match(script, /window\.setMode\("normal"\)/);
assert.match(script, /document\.addEventListener\("change", onChange, false\)/);
assert.match(script, /const card = element\([\s\S]{0,160}"button"[\s\S]{0,160}mamo-odds-row mamo-odds-card/);
assert.match(script, /card\.dataset\.oddsAdd\s*=\s*key/);
assert.match(script, /card\.dataset\.oddsRemove\s*=\s*key/);
assert.match(script, /card\.setAttribute\("aria-pressed", String\(isAdded\)\)/);
assert.match(script, /mamo-odds-card-state/);
assert.doesNotMatch(script, /const action = element\("button", isAdded/);
assert.doesNotMatch(script, /className\s*=\s*"mamo-odds-selected"/);
assert.doesNotMatch(script, /function axisButton\(/);

assert.match(css, /\.mamo-odds-list\s*\{[\s\S]{0,260}grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
assert.match(css, /\.mamo-odds-list\s*\{[\s\S]{0,320}grid-template-rows:\s*repeat\(5, minmax\(54px, 1fr\)\)/);
assert.match(css, /@media \(max-width: 430px\)[\s\S]*?\.mamo-odds-list\s*\{[\s\S]{0,220}grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
assert.match(css, /@media \(max-width: 430px\)[\s\S]*?\.mamo-odds-list\s*\{[\s\S]{0,260}grid-template-rows:\s*repeat\(5, minmax\(52px, 1fr\)\)/);
assert.match(css, /\.mamo-odds-row\.mamo-odds-card\.is-added/);
assert.match(css, /#builder\.mamo-odds-bet-mode[\s\S]{0,160}#raceView \.race-racer-details,[\s\S]{0,180}#raceView \.source-note[\s\S]{0,100}display:\s*none !important/);
assert.match(css, /#builder\.mamo-odds-bet-mode[\s\S]{0,180}#raceView > \.raceboard[\s\S]{0,160}min-height:\s*0 !important/);
assert.match(css, /#builder\.mamo-odds-bet-mode[\s\S]{0,120}#raceView \.air-bet-feedback\s*\{[\s\S]{0,120}display:\s*none !important/);
assert.doesNotMatch(css, /\.mamo-odds-row > button/);
assert.doesNotMatch(css, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
assert.doesNotMatch(css, /\.mamo-odds-selected/);
assert.doesNotMatch(css, /\.mamo-odds-axis\s/);

assert.match(html, /odds-bet-mode\.css\?v=20260929-2/);
assert.match(html, /odds-bet-mode-v1\.js\?v=20260929-1/);
assert.match(sw, /mamoboat-v536-odds-expanded-grid-dev/);
assert.match(sw, /odds-bet-mode\.css\?v=20260929-2/);
assert.match(sw, /odds-bet-mode-v1\.js\?v=20260929-1/);

console.log("four-column no-scroll odds UI regression checks passed");
