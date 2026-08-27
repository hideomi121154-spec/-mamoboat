const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const publicHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const latestHtml = fs.readFileSync(path.join(root, "dev", "index.html"), "utf8");

assert.match(publicHtml, /const latest = new URL\("dev\/", current\)/);
assert.match(publicHtml, /latest\.search = current\.search/);
assert.match(publicHtml, /latest\.hash = current\.hash/);
assert.match(publicHtml, /window\.location\.replace\(latest\.href\)/);
assert.match(latestHtml, /growth-entry\.js\?v=20260827-5/);
assert.ok(fs.existsSync(path.join(root, "dev", "mamo-story.js")));

const redirectScript = publicHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(redirectScript, "public entry redirect script must exist");

for (const [source, expected] of [
  [
    "https://mamoboat.com/?mamo_entry=x&v=20260827-14#story",
    "https://mamoboat.com/dev/?mamo_entry=x&v=20260827-14#story",
  ],
  [
    "https://hideomi121154-spec.github.io/-mamoboat/?mamo_entry=x",
    "https://hideomi121154-spec.github.io/-mamoboat/dev/?mamo_entry=x",
  ],
]) {
  let redirectedTo = "";
  vm.runInNewContext(redirectScript, {
    URL,
    window: {
      location: {
        href: source,
        replace(value) {
          redirectedTo = value;
        },
      },
    },
  });
  assert.equal(redirectedTo, expected);
}

for (let panel = 1; panel <= 16; panel += 1) {
  const number = String(panel).padStart(2, "0");
  assert.ok(
    fs.existsSync(path.join(root, "dev", "assets", "mamo-story", `mamo-story-${number}.png`)),
    `MAMO STORY panel ${number} must exist`
  );
}

console.log("public entry redirects to the complete /dev experience");
