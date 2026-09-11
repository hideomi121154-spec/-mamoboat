const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

// The canonical HTML must load the odds-bet UI directly. Do not rely on
// Service Worker HTML rewriting as the primary delivery path.
assert.match(html, /odds-bet-mode\.css\?v=20260911-1/);
assert.match(html, /air-bet-mode-stability\.js\?v=20260911-12/);
assert.match(html, /odds-bet-mode-v1\.js\?v=20260911-2/);
assert.doesNotMatch(html, /air-bet-mode-stability\.js\?v=20260910-11/);

console.log("Canonical odds-bet delivery test passed");
