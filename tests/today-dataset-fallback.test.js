const assert = require("assert");
const fs = require("fs");
const path = require("path");

for (const relative of ["app.js", "dev/app.js"]) {
  const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
  assert.match(source, /const current = date === C\.jstDate\(\)/);
  assert.match(source, /\["data\/today\.json", \`data\/\$\{date\}\.json\`\]/);
  assert.match(source, /dataset\.date !== date/);
  assert.match(source, /日付不一致/);
  assert.match(source, /日付ファイルへフォールバック/);
}

const rootIndex = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const devIndex = fs.readFileSync(path.join(__dirname, "..", "dev", "index.html"), "utf8");
const devSw = fs.readFileSync(path.join(__dirname, "..", "dev", "sw.js"), "utf8");

assert.match(rootIndex, /app\.js\?v=20261006-1/);
assert.match(devIndex, /app\.js\?v=20261006-1/);
assert.match(devSw, /mamoboat-v546-today-dataset-fallback-dev/);
assert.match(devSw, /app\.js\?v=20261006-1/);

console.log("today dataset stale-cache fallback regression OK");
