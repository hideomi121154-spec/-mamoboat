const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "dev", "bet-review-flow.js"), "utf8");
const app = fs.readFileSync(path.join(root, "dev", "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "dev", "styles.css"), "utf8");
const compatibility = fs.readFileSync(path.join(root, "dev", "decision-event-api-compat.js"), "utf8");
const shop = fs.readFileSync(path.join(root, "dev", "mamo-shop.js"), "utf8");

let titleWrites = 0;
const title = {
  value: "購入内容を確認",
  get textContent() { return this.value; },
  set textContent(value) { titleWrites += 1; this.value = value; },
};
// AIR BET enhancements must run only after the base renderer announces a new
// builder. Watching the subtree while writing into it starved Safari's clicks.
const classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
const betdesk = {
  querySelector(selector) {
    if (selector === ".cart-title small") return title;
    return null;
  },
  insertBefore() {},
};
const builder = {
  children: [],
  classList,
  dataset: {},
  closest() { return betdesk; },
  querySelector() { return null; },
  querySelectorAll: () => [],
};
const listeners = new Map();
const document = {
  readyState: "complete",
  head: { appendChild() {} },
  createElement: () => ({}),
  getElementById(id) {
    if (id === "builder") return builder;
    return null;
  },
  querySelector() { return null; },
};
const window = {
  reviewBet() {},
  addEventListener(name, callback) { listeners.set(name, callback); },
};

vm.runInNewContext(source, {
  window,
  document,
  setTimeout,
  console,
});

const renderListener = listeners.get("mamo:air-bet-rendered");
assert.equal(typeof renderListener, "function");
assert.equal(titleWrites, 1, "initial enhancement may update the copy once");
for (let index = 0; index < 25; index += 1) renderListener();
assert.equal(titleWrites, 1, "repeated render notifications must not rewrite identical text");
assert.doesNotMatch(source, /MutationObserver/);
assert.doesNotMatch(source, /queueMicrotask\(enhanceBuilder\)/);
assert.match(app, /const AIR_BET_RENDERED_EVENT = "mamo:air-bet-rendered"/);
assert.match(app, /refreshBuilder\(\);\s*notifyAirBetRendered\(\);/);
assert.match(app, /<details class="race-racer-details">/);
assert.doesNotMatch(app, /<details class="race-racer-details"\s+open/);
assert.match(app, /data-racer-class=/);
assert.match(app, /data-motor-number=/);
assert.match(app, /data-boat-part=/);
assert.match(source, /class="mamo-racer-meta"/);
assert.match(source, /item\.racerClass/);
assert.match(source, /item\.motorNumber/);
assert.match(source, /item\.boatPart/);
assert.match(app, /<div class="officialmenu"[\s\S]*?\$\{entries\}[\s\S]*?<div class="source-note">/);

// SHOP may exist, but only its own native overflow is allowed; the abandoned
// whole-app horizontal-navigation experiment must stay unloaded.
assert.match(compatibility, /mamo-shop\.js\?v=20260830-2/);
assert.match(compatibility, /mamo-shop-record-benefits\.js\?v=20260830-1/);
assert.doesNotMatch(compatibility, /bottom-nav-horizontal\.js/);
assert.match(shop, /overflow-x:auto!important/);
assert.doesNotMatch(shop, /touchstart|touchmove|preventDefault/);
assert.match(compatibility, /bet-review-flow\.js\?v=20260906-4/);

// The compact AIR BET layout must keep the actual cart editable. Previously
// #cart was hidden while a later stylesheet accidentally re-exposed only the
// preset buttons, so stake changes had no visible result and per-line delete
// was impossible.
assert.doesNotMatch(source, /\.betdesk \.cart-title,\.betdesk #cart,\.betdesk #cartTools/);
assert.match(source, /#raceView \.betdesk #cart\{display:grid!important/);
assert.match(app, /id="allStakeInput"[^>]*step="100"/);
assert.match(app, /class="cart-stake-input"[^>]*step="100"/);
assert.match(app, /id="reviewAllStakeInput"[^>]*step="100"/);
assert.match(app, /data-stake="100" aria-pressed="false"/);
assert.match(app, /window\.applyCustomStake = \(\) =>/);
assert.match(app, /window\.applyReviewAllStake = \(\) =>/);
assert.match(app, /window\.updateReviewLineStake = \(index, value\) =>/);
assert.match(app, /window\.removeReviewLine = \(index\) =>/);
assert.match(app, /この買い目を削除/);
assert.match(app, /stake: null/);
assert.match(app, /ベット数を入力してください/);
assert.match(source, /mamoBetReviewFlowStyleV6/);

const setAllStakesBody = app.match(/window\.setAllStakes = \(amount\) => \{([\s\S]*?)\n  \};/)?.[1] || "";
assert.match(setAllStakesBody, /syncCartStakeUI\(\)/);
assert.doesNotMatch(setAllStakesBody, /renderCart\(\)/, "stake taps must not destroy their own controls");

const normalizeStakeSource = app.match(/function normalizeStake\(value\) \{[\s\S]*?\n  \}/)?.[0];
assert(normalizeStakeSource, "stake normalization must remain a standalone testable rule");
const stakeSandbox = {};
vm.runInNewContext(`${normalizeStakeSource}; this.values = [normalizeStake(""), normalizeStake(null), normalizeStake(50), normalizeStake(350), normalizeStake("1,200"), normalizeStake(1750)];`, stakeSandbox);
assert.equal(JSON.stringify(stakeSandbox.values), JSON.stringify([0, 0, 0, 300, 1200, 1700]));
assert.match(app, /if \(cartIncompleteCount\(\)\) return alert\("全ての買い目にベット数を入力してください。"\)/);
assert.match(app, /confirm\.disabled = incomplete > 0 \|\| overBalance \|\| !cart\.length/);

// Lock the document scroller while the fixed modal is open. The modal remains
// the only vertical scroll container, without touch preventDefault/scrollTo.
assert.match(app, /document\.documentElement\?\.classList\?\.toggle\("modal-open", true\)/);
assert.match(app, /document\.documentElement\?\.classList\?\.toggle\("modal-open", false\)/);
assert.match(styles, /html\.modal-open, body\.modal-open \{ overflow: hidden !important; overscroll-behavior: none; \}/);
assert.doesNotMatch(setAllStakesBody, /requestAnimationFrame|setTimeout|scrollTo|visualViewport/);

// Adding the selected draft fetches a best-effort odds update asynchronously.
// The review modal must wait for that operation so it never reads an empty cart.
assert.match(app, /return addCombos\(\[\[\.\.\.normal\]\]\)/);
assert.match(source, /window\.reviewBet = async/);
assert.match(source, /await Promise\.resolve\(addCurrentDraft\(\)\)/);
assert.match(source, /querySelector\?\.\("\.cartrow"\)/);

// A fresh selection is a replacement. Only the explicit add-more action may
// preserve the previous cart. This prevents stale formation rows such as 3-x-x
// from surviving after the user changes the first-place candidate to 1.
assert.match(source, /function clearCommittedCartForReplacement\(\)/);
assert.match(source, /if \(!appendRequested\) clearCommittedCartForReplacement\(\)/);
assert.match(source, /addMore\.textContent = "買い目を追加"/);
assert.match(source, /appendRequested = true/);
assert.doesNotMatch(source, /買い目を追加・修正/);

test("AIR BET review waits until the selected draft reaches the cart", async () => {
  let addResolved = false;
  let addCalls = 0;
  let originalReviewCalls = 0;
  const cartCount = { textContent: "0点" };
  const cart = { textContent: "", querySelector() { return null; }, querySelectorAll() { return []; } };
  const reviewButton = { disabled: false, textContent: "AIR BETを確認" };
  const ranks = Array.from({ length: 3 }, () => ({
    querySelector(selector) { return selector === ".pick.sel" ? {} : null; },
  }));
  const asyncBuilder = {
    children: [],
    classList,
    dataset: {},
    closest() { return { querySelector() { return null; }, insertBefore() {} }; },
    querySelector() { return null; },
    querySelectorAll(selector) {
      if (selector === ".rank") return ranks;
      if (selector === "button") return [];
      return [];
    },
  };
  const asyncDocument = {
    readyState: "complete",
    head: { appendChild() {} },
    createElement: () => ({}),
    getElementById(id) {
      if (id === "builder") return asyncBuilder;
      if (id === "cartCount") return cartCount;
      if (id === "cart") return cart;
      return null;
    },
    querySelector(selector) {
      if (selector === "#modeTabs .active, .bet-tabs .active") return { textContent: "通常" };
      if (selector === 'button[onclick="reviewBet()"]') return reviewButton;
      return null;
    },
  };
  const asyncWindow = {
    addEventListener() {},
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
});

test("a new formation selection replaces stale purchase rows", async () => {
  let staleRows = [{}, {}, {}];
  const removed = [];
  let addCalls = 0;
  let originalReviewCalls = 0;
  const cartCount = { textContent: "3点" };
  const cart = {
    querySelector(selector) {
      return selector === ".cartrow" ? staleRows[0] || null : null;
    },
    querySelectorAll(selector) {
      return selector === ".cartrow" ? staleRows : [];
    },
  };
  const reviewButton = { disabled: false, textContent: "AIR BETを確認" };
  const ranks = Array.from({ length: 3 }, () => ({
    querySelector(selector) { return selector === ".pick.sel" ? {} : null; },
  }));
  const formationBuilder = {
    children: [],
    classList,
    dataset: {},
    closest() { return { querySelector() { return null; }, insertBefore() {} }; },
    querySelector() { return null; },
    querySelectorAll(selector) {
      if (selector === ".rank") return ranks;
      if (selector === "button") return [];
      return [];
    },
  };
  const formationDocument = {
    readyState: "complete",
    head: { appendChild() {} },
    createElement: () => ({}),
    getElementById(id) {
      if (id === "builder") return formationBuilder;
      if (id === "cartCount") return cartCount;
      if (id === "cart") return cart;
      return null;
    },
    querySelector(selector) {
      if (selector === "#modeTabs .active, .bet-tabs .active") return { textContent: "フォーメーション" };
      if (selector === 'button[onclick="reviewBet()"]') return reviewButton;
      return null;
    },
  };
  const formationWindow = {
    addEventListener() {},
    reviewBet() {
      assert.equal(staleRows.length, 0, "stale cart rows must be gone before review opens");
      assert.equal(cartCount.textContent, "2点");
      originalReviewCalls += 1;
    },
    removeLine(index) {
      removed.push(index);
      staleRows.splice(index, 1);
      cartCount.textContent = `${staleRows.length}点`;
    },
    addForm() {
      addCalls += 1;
      assert.equal(staleRows.length, 0, "old formation must be removed before new formation is added");
      cartCount.textContent = "2点";
      return Promise.resolve(2);
    },
  };

  vm.runInNewContext(source, {
    window: formationWindow,
    document: formationDocument,
    setTimeout,
    console,
  });

  await formationWindow.reviewBet();
  assert.deepEqual(removed, [2, 1, 0], "cart rows must be removed from the end to keep indexes stable");
  assert.equal(addCalls, 1);
  assert.equal(originalReviewCalls, 1);
});

console.log("iOS race event-loop regression checks passed");
