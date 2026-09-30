const assert = require("assert");
const fs = require("fs");
const path = require("path");

for (const relative of ["device-sync.js", "dev/device-sync.js"]) {
  const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");

  assert.match(
    source,
    /function stateForSync\(state\)[\s\S]*?events:\s*\[\]/,
    `${relative} must exclude anonymous pilot events from device-sync payloads`
  );

  assert.match(
    source,
    /method === "POST" \? 20000 : 12000/,
    `${relative} must allow a longer timeout for mobile sync`
  );

  const postUsesSlimState = source.match(/request\("POST",\s*\{\s*state:\s*stateForSync\(/g) || [];
  assert.ok(
    postUsesSlimState.length >= 2,
    `${relative} must slim both direct uploads and merged sync POSTs`
  );
}

console.log("device sync payload test OK");
