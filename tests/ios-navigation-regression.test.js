const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const index = read("dev/index.html");
const app = read("dev/app.js");
const sw = read("dev/sw.js");
const compatibility = read("dev/decision-event-api-compat.js");
const shop = read("dev/mamo-shop.js");
const touchRollback = read("dev/ios-touch-action-rollback.js");
const legacyHorizontalNav = read("dev/bottom-nav-horizontal.js");

const classList = {
  add() {},
  remove() {},
  toggle() {},
  contains() { return false; },
};
const listeners = new Map();
const elements = new Map();
const document = {
  readyState: "complete",
  body: { classList, dataset: {} },
  addEventListener(type, handler) { listeners.set(type, handler); },
  getElementById(id) { return elements.get(id) || null; },
  querySelectorAll() { return []; },
};
const window = {
  document,
  addEventListener() {},
  removeEventListener() {},
  scrollTo() {},
  location: { href: "https://mamoboat.com/dev/", pathname: "/dev/" },
  history: { replaceState() {} },
};
vm.runInNewContext(compatibility, { window, document, console, setTimeout, clearTimeout });

// App navigation must remain screen-id based; the compatibility layer may add
// secondary destinations but must not replace the canonical go() function.
assert.match(app, /window\.go = \(id\) => \{/);
assert.match(app, /document\.body\.dataset\.screen = id/);
assert.match(app, /item\.classList\.toggle\("active", item\.id === `nav-\$\{id\}`\)/);

// The emergency global touch/click shim stays removed.
assert.doesNotMatch(touchRollback, /addEventListener\s*\(/);
assert.doesNotMatch(touchRollback, /preventDefault\s*\(/);

// Mobile primary navigation is fixed to the native six-slot grid again.
// SHOP and Settings are secondary destinations and must not force horizontal
// scrolling or revive the abandoned bottom-nav experiment.
assert.doesNotMatch(compatibility, /bottom-nav-horizontal\.js/);
assert.match(compatibility, /mamo-shop\.js\?v=20260913-1/);
assert.doesNotMatch(shop, /\.bottom-nav\s*\{[\s\S]*?overflow-x:auto!important/);
assert.doesNotMatch(shop, /touch-action:pan-x/);
assert.match(shop, /document\.getElementById\("nav-settings"\)\?\.remove\(\)/);
assert.match(shop, /analysis\.className = "nav"/);
assert.match(shop, /window\.go\?\.\("shop"\)/);
assert.match(shop, /window\.go\?\.\("settings"\)/);
assert.doesNotMatch(legacyHorizontalNav, /overflow-x\s*:\s*auto/i);
assert.doesNotMatch(legacyHorizontalNav, /scrollIntoView/);
assert.match(sw, /mamoboat-v518-self-check-phase1-dev/);
assert.match(sw, /url\.pathname\.endsWith\("\/mamo-shop\.js"\)/);

console.log("iOS navigation regression checks passed");