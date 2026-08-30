const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "dev", "bet-review-flow.js"), "utf8");
const compatibility = fs.readFileSync(path.join(root, "dev", "decision-event-api-compat.js"), "utf8");

let observerCallback = null;
let titleWrites = 0;
const title = {
  value: "購入内容を確認",
  get textContent() { return this.value; },
  set textContent(value) { titleWrites += 1; this.value = value; },
};
const builder = { querySelectorAll: () => [] };
const raceView = {};
const document = {
  readyState: "complete",
  head: { appendChild() {} },
  createElement: () => ({}),
  getElementById(id) {
    if (id === "builder") return builder;
    if (id === "raceView") return raceView;
    return null;
  },
  querySelector(selector) {
    if (selector === ".cart-title small") return title;
    return null;
  },
};
class MutationObserver {
  constructor(callback) { observerCallback = callback; }
  observe() {}
}
const window = { reviewBet() {} };

vm.runInNewContext(source, {
  window,
  document,
  MutationObserver,
  setTimeout,
  console,
});

assert.equal(typeof observerCallback, "function");
assert.equal(titleWrites, 1, "initial enhancement may update the copy once");
for (let index = 0; index < 25; index += 1) observerCallback();
assert.equal(titleWrites, 1, "observer callbacks must not observe their own text write forever");
assert.doesNotMatch(source, /queueMicrotask\(enhanceBuilder\)/);

// SHOP may exist, but the abandoned horizontal-navigation experiment must stay unloaded.
assert.match(compatibility, /mamo-shop\.js\?v=20260830-1/);
assert.match(compatibility, /mamo-shop-record-benefits\.js\?v=20260830-1/);
assert.doesNotMatch(compatibility, /bottom-nav-horizontal\.js/);
assert.match(compatibility, /bet-review-flow\.js\?v=20260830-2/);

console.log("iOS race event-loop regression checks passed");
