const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const compact = fs.readFileSync(path.join(root, "race-airbet-compact.js"), "utf8");
const css = fs.readFileSync(path.join(root, "air-bet-selection-fixed.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

// The racer roster must stay presentation-only. The AIR BET selection engine
// remains app.js-owned so pick IDs, handlers and state are not replaced.
assert.match(compact, /function syncRacerRoster\(/);
assert.match(compact, /mamo-racer-roster/);
assert.match(compact, /key !== cachedRosterKey/);
assert.match(compact, /rosterNode\.replaceChildren\(head, rows\)/);
assert.doesNotMatch(compact, /builder\.innerHTML\s*=/);
assert.doesNotMatch(compact, /builder\.replaceChildren\s*\(/);
assert.doesNotMatch(compact, /cloneNode\s*\(/);
assert.doesNotMatch(compact, /\bouterHTML\b/);

// Class and official links are read from the already-rendered official racer
// data. The existing official DOM is not moved or cloned into the picker.
assert.match(compact, /boat\.dataset\.racerClass/);
assert.match(compact, /boat\.getAttribute\("href"\)/);
assert.match(compact, /function safeOfficialUrl\(/);
assert.match(compact, /https:\\\/\\\/www\\\.boatrace\\\.jp/);
assert.match(compact, /mamo-racer-class/);
assert.match(compact, /mamo-racer-official/);
assert.match(compact, /official\.target = "_blank"/);
assert.match(compact, /official\.rel = "noopener noreferrer"/);
assert.match(compact, /event\.stopPropagation\(\)/);

// This enhancement must not add another iPhone timing/scroll controller.
assert.doesNotMatch(compact, /setInterval\s*\(/);
assert.doesNotMatch(compact, /setTimeout\s*\(/);
assert.doesNotMatch(compact, /requestAnimationFrame\s*\(/);
assert.doesNotMatch(compact, /scrollTo\s*\(/);
assert.doesNotMatch(compact, /scrollBy\s*\(/);
assert.doesNotMatch(compact, /visualViewport/);

// Desktop keeps the existing builder. The roster is enabled only inside the
// mobile layout and long names are clipped instead of changing row height.
assert.match(css, /#raceView \.mamo-racer-roster \{ display: none; \}/);
assert.match(css, /#builder\.mamo-selection-matrix/);
assert.match(css, /#builder > \.mamo-racer-roster[\s\S]*display: flex/);
assert.match(css, /\.mamo-racer-name[\s\S]*text-overflow: ellipsis/);
assert.match(css, /\.mamo-racer-class/);
assert.match(css, /\.mamo-racer-official/);
assert.match(css, /grid-template-columns: minmax\(124px, 1\.45fr\) repeat\(3, minmax\(0, 1fr\)\)/);

// Existing selection hooks are still present in app.js for normal/BOX/form.
assert.match(app, /pickNormal\(/);
assert.match(app, /pickBox\(/);
assert.match(app, /pickForm\(/);
assert.match(app, /addNormal\(/);
assert.match(app, /addBox\(/);
assert.match(app, /addForm\(/);
assert.match(app, /function racerUrl\(/);

// PWA shell keeps the racer-official assets while advancing the cache release.
assert.match(sw, /mamoboat-v494-airbet-allocation-dev/);
assert.match(sw, /air-bet-selection-fixed\.css\?v=20260910-4/);
assert.match(sw, /race-airbet-compact\.js\?v=20260910-6/);

console.log("AIR BET racer roster regression contract: OK");
