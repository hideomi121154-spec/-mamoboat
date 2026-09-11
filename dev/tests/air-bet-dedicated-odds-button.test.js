const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "air-bet-mode-stability.js"), "utf8");

// The visible compact selector must own a dedicated odds button.
assert.match(source, /id = "mamoOddsBetButton"/);
assert.match(source, /textContent = isActive \? "オッズ中" : "オッズ"/);
assert.match(source, /document\.getElementById\("bt-odds"\)/);
assert.match(source, /row\.replaceChildren\(modeSelect, typeSelect, oddsButton\)/);
assert.match(source, /gridTemplateColumns = "minmax\(0,1\.08fr\) minmax\(0,\.82fr\) minmax\(74px,\.52fr\)"/);

// Odds must not be hidden inside the normal mode select anymore.
assert.doesNotMatch(source, /return \["normal", "box", "form", "odds"\]/);

// Stability contract: no repaint loops or scroll ownership.
assert.doesNotMatch(source, /MutationObserver/);
assert.doesNotMatch(source, /setInterval\(/);
assert.doesNotMatch(source, /setTimeout\(/);
assert.doesNotMatch(source, /requestAnimationFrame\(/);
assert.doesNotMatch(source, /visualViewport/);
assert.doesNotMatch(source, /scrollIntoView|scrollTo\(|scrollBy\(/);
assert.doesNotMatch(source, /\.innerHTML\s*=/);

console.log("Dedicated odds button contract passed");
