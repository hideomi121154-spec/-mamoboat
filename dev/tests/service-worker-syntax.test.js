const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
assert.doesNotThrow(() => new vm.Script(source, { filename: "dev/sw.js" }));
assert.match(source, /air-bet-selection-fixed\.css\?v=20260928-1/);

console.log("Service worker parses and precaches the mobile picker fix: OK");
