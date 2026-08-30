const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "dev", "bet-review-flow.js"), "utf8");
const app = fs.readFileSync(path.join(root, "dev", "app.js"), "utf8");
const compatibility = fs.readFileSync(path.join(root, "dev", "decision-event-api-compat.js"), "utf8");
const shop = fs.readFileSync(path.join(root, "dev", "mamo-shop.js"), "utf8");

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

// SHOP may exist, but only its own native overflow is allowed; the abandoned
// whole-app horizontal-navigation experiment must stay unloaded.
assert.match(compatibility, /mamo-shop\.js\?v=20260830-2/);
assert.match(compatibility, /mamo-shop-record-benefits\.js\?v=20260830-1/);
assert.doesNotMatch(compatibility, /bottom-nav-horizontal\.js/);
assert.match(shop, /overflow-x:auto!important/);
assert.doesNotMatch(shop, /touchstart|touchmove|preventDefault/);
assert.match(compatibility, /bet-review-flow\.js\?v=20260831-1/);

// Adding the selected draft fetches a best-effort odds update asynchronously.
// The review modal must wait for that operation so it never reads an empty cart.
assert.match(app, /return addCombos\(\[\[\.\.\.normal\]\]\)/);
assert.match(source, /window\.reviewBet = async/);
assert.match(source, /await Promise\.resolve\(addCurrentDraft\(\)\)/);
assert.match(source, /querySelector\?\.\("\.cartrow"\)/);

test("AIR BET review waits until the selected draft reaches the cart", async () => {
  let asyncObserverCallback = null;
  let addResolved = false;
  let addCalls = 0;
  let originalReviewCalls = 0;
  const cartCount = { textContent: "0点" };
  const cart = { textContent: "" };
  const reviewButton = { disabled: false, textContent: "AIR BETを確認" };
  const asyncTitle = { textContent: "確認画面から、追加・修正できます" };
  const ranks = Array.from({ length: 3 }, () => ({
    querySelector(selector) { return selector === ".pick.sel" ? {} : null; },
  }));
  const asyncBuilder = {
    querySelectorAll(selector) {
      if (selector === ".rank") return ranks;
      if (selector === "button") return [];
      return [];
    },
  };
  const asyncRaceView = {};
  const asyncDocument = {
    readyState: "complete",
    head: { appendChild() {} },
    createElement: () => ({}),
    getElementById(id) {
      if (id === "builder") return asyncBuilder;
      if (id === "raceView") return asyncRaceView;
      if (id === "cartCount") return cartCount;
      if (id === "cart") return cart;
      return null;
    },
    querySelector(selector) {
      if (selector === ".cart-title small") return asyncTitle;
      if (selector === "#modeTabs .active, .bet-tabs .active") return { textContent: "通常" };
      if (selector === 'button[onclick="reviewBet()"]') return reviewButton;
      return null;
    },
  };
  class AsyncMutationObserver {
    constructor(callback) { asyncObserverCallback = callback; }
    observe() {}
  }
  const asyncWindow = {
    reviewBet() {
      assert.equal(addResolved, true, "base review must not run before the draft is stored");
      assert.equal(cartCount.textContent, "1点");
      originalReviewCalls += 1;
    },
    addNormal() {
      addCalls += 1;
      return new Promise((resolve) => {
        setTimeout(() => {
          cartCount.textContent = "1点";
          cart.textContent = "3連単 1-2-3";
          addResolved = true;
          resolve(1);
        }, 5);
      });
    },
  };

  vm.runInNewContext(source, {
    window: asyncWindow,
    document: asyncDocument,
    MutationObserver: AsyncMutationObserver,
    setTimeout,
    console,
  });

  const reviewPromise = asyncWindow.reviewBet();
  const duplicateReviewPromise = asyncWindow.reviewBet();
  assert.equal(originalReviewCalls, 0);
  assert.equal(reviewButton.disabled, true);
  assert.equal(reviewButton.textContent, "確認中…");
  await Promise.all([reviewPromise, duplicateReviewPromise]);
  assert.equal(addCalls, 1, "rapid repeat taps must not add the same draft twice");
  assert.equal(originalReviewCalls, 1);
  assert.equal(reviewButton.disabled, false);
  assert.equal(reviewButton.textContent, "AIR BETを確認");
  assert.equal(typeof asyncObserverCallback, "function");
});

console.log("iOS race event-loop regression checks passed");
