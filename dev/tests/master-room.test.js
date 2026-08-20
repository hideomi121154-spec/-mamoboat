const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "master-room.html"), "utf8");
const js = fs.readFileSync(path.join(root, "master-room.js"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert.match(html, /MAMO BOAT MASTER ROOM/);
assert.match(html, /noindex,nofollow,noarchive/);
assert.match(html, /OWNER ONLY/);
assert.match(js, /master-room-stats/);
assert.match(js, /sessionStorage\.setItem\(KEY_SESSION/);
assert.match(js, /x-master-key/);
assert.doesNotMatch(js, /localStorage\.setItem/);
assert.doesNotMatch(js, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
assert.doesNotMatch(js, /07c8f3dd09608b0a60750bd8cbaaf9dafcf056000dad9faf905cd981c78dde50/);
assert.doesNotMatch(index, /master-room\.html/);

console.log("MASTER ROOM security smoke test OK");
