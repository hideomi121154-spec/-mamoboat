const assert = require("assert");
const fs = require("fs");
const path = require("path");

for (const relative of ["app.js", "dev/app.js"]) {
  const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
  assert.match(
    source,
    /addEventListener\(["']mamo:state-synced["'][\s\S]*?S\s*=\s*load\(\)[\s\S]*?renderAll\(\)/,
    `${relative} must reload in-memory state after device sync before re-rendering`
  );
}

console.log("device sync state refresh test OK");
