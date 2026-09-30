const assert = require("assert");
const fs = require("fs");
const path = require("path");

for (const relative of ["device-sync.js", "dev/device-sync.js"]) {
  const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
  assert.match(source, /function syncWalletDom\(state\)/);
  assert.match(source, /homeCoins:\s*\`\$\{formatted\}B\`/);
  assert.match(source, /topCoins:\s*\`\$\{formatted\} B\`/);
  assert.match(source, /const syncedBalance = syncWalletDom\(merged\)/);
  assert.match(source, /detail:\s*\{\s*changed,\s*coins:\s*syncedBalance\s*\}/);
}

const sw = fs.readFileSync(path.join(__dirname, "..", "dev", "sw.js"), "utf8");
assert.match(sw, /mamoboat-v543-wallet-sync-refresh-dev/);
assert.match(sw, /app\.js\?v=20260930-3/);
assert.match(sw, /pilot-config\.js\?v=20260930-2/);
assert.match(sw, /url\.pathname\.endsWith\("\/device-sync\.js"\)/);
assert.match(sw, /url\.pathname\.endsWith\("\/app\.js"\)/);

console.log("home wallet sync refresh regression OK");
