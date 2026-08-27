const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const publicMotion = fs.readFileSync(path.join(root, "motion-experience.js"), "utf8");
const devMotion = fs.readFileSync(path.join(root, "dev", "motion-experience.js"), "utf8");
const publicPilot = fs.readFileSync(path.join(root, "pilot-config.js"), "utf8");
const devPilot = fs.readFileSync(path.join(root, "dev", "pilot-config.js"), "utf8");
const publicWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const devWorker = fs.readFileSync(path.join(root, "dev", "sw.js"), "utf8");

assert.equal(publicMotion, devMotion, "public and /dev motion behavior must remain identical");
assert.match(publicMotion, /prefers-reduced-motion:reduce/);
assert.match(publicMotion, /AIR BETを確定する/);
assert.match(publicMotion, /主導権を守った/);
assert.match(publicMotion, /振り返りを記録/);
assert.match(publicMotion, /結果を反映/);
assert.match(publicMotion, /pointer-events:none/);
assert.doesNotMatch(publicMotion, /setInterval\s*\(/, "motion must not add a continuous timer");
assert.doesNotMatch(publicMotion, /(?:Audio|speechSynthesis|\.play\s*\(|\.vibrate\s*\()/, "motion must stay silent");

for (const source of [publicPilot, devPilot]) {
  assert.match(source, /motion-experience\.js\?v=20260827-1/);
}
for (const source of [publicWorker, devWorker]) {
  assert.match(source, /motion-experience\.js\?v=20260827-1/);
}

console.log("motion experience safety and distribution tests passed");
