const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const compact = fs.readFileSync(path.join(root, "race-airbet-compact.js"), "utf8");
const css = fs.readFileSync(path.join(root, "air-bet-selection-fixed.css"), "utf8");
const layoutRefresh = fs.readFileSync(path.join(root, "race-layout-refresh.js"), "utf8");
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

// Racer geometry has exactly one owner. race-layout-refresh.js may style the
// surrounding picker/rank controls, but must not restyle mamo-racer-* nodes.
assert.doesNotMatch(layoutRefresh, /\.mamo-racer-head/);
assert.doesNotMatch(layoutRefresh, /\.mamo-racer-rows/);
assert.doesNotMatch(layoutRefresh, /\.mamo-racer-row/);
assert.doesNotMatch(layoutRefresh, /\.mamo-racer-name/);
assert.doesNotMatch(layoutRefresh, /\.mamo-racer-class/);
assert.doesNotMatch(layoutRefresh, /\.mamo-racer-official/);

// Desktop keeps the existing builder. Mobile gives names real width instead
// of shrinking them to 7px, while still avoiding intentional ellipsis.
assert.match(css, /#raceView \.mamo-racer-roster \{ display: none; \}/);
assert.match(css, /#builder\.mamo-selection-matrix/);
assert.match(css, /#builder > \.mamo-racer-roster[\s\S]*display: flex/);
assert.match(css, /\.mamo-racer-head[\s\S]{0,300}padding: 3px 4px 3px 10px/);
assert.match(css, /\.mamo-racer-head[\s\S]{0,300}text-align: left/);
assert.doesNotMatch(css, /\.mamo-racer-head[\s\S]{0,300}text-align: center/);
assert.match(css, /\.mamo-racer-name[\s\S]*text-overflow: clip/);
assert.doesNotMatch(css, /\.mamo-racer-name[\s\S]{0,180}text-overflow: ellipsis/);
assert.match(css, /\.mamo-racer-class/);
assert.match(css, /\.mamo-racer-official/);
assert.match(css, /grid-template-columns: minmax\(164px, 1\.75fr\) repeat\(3, minmax\(52px, \.72fr\)\)/);
assert.match(css, /grid-template-columns: 18px 24px minmax\(52px, 1fr\) 24px/);
assert.match(css, /font-size: clamp\(9\.5px, 2\.6vw, 10\.5px\)/);
assert.doesNotMatch(css, /font-size: clamp\(7px, 2\.25vw, 9px\)/);

// Existing selection hooks are still present in app.js for normal/BOX/form.
assert.match(app, /pickNormal\(/);
assert.match(app, /pickBox\(/);
assert.match(app, /pickForm\(/);
assert.match(app, /addNormal\(/);
assert.match(app, /addBox\(/);
assert.match(app, /addForm\(/);
assert.match(app, /function racerUrl\(/);

// PWA shell must advance the stylesheet/cache release so iPhone PWA clients
// receive the heading nudge instead of keeping the previous centered CSS.
assert.match(sw, /mamoboat-v494-airbet-allocation-dev/);
assert.match(sw, /air-bet-selection-fixed\.css\?v=20260911-8/);
assert.match(sw, /mamoboat-v501-racer-heading-nudge-dev/);
assert.match(sw, /race-airbet-compact\.js\?v=20260910-6/);
assert.match(sw, /race-layout-refresh\.js\?v=20260911-7/);

console.log("AIR BET racer roster regression contract: OK");
