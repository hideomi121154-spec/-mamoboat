const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const layout = read("dev/bet-review-flow.js");
const legacyMultiAdd = read("dev/air-bet-multi-add.js");
const app = read("dev/app.js");
const styles = read("dev/styles.css");
const index = read("dev/index.html");
const compatibility = read("dev/decision-event-api-compat.js");
const growth = read("dev/growth-entry.js");
const venuePriority = read("dev/venue-live-priority.js");
const serviceWorker = read("dev/sw.js");
const shop = read("dev/mamo-shop.js");

// Presentation enhancements may react to the base renderer, but must never
// replace AIR BET actions. Repeated render events previously caused Safari
// click starvation when multiple late-loaded scripts wrapped reviewBet.
const classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
const builder = {
  children: [],
  classList,
  dataset: {},
  closest() { return { querySelector() { return null; }, insertBefore() {} }; },
  querySelector() { return null; },
};
const listeners = new Map();
const documentListeners = new Map();
const originalReviewBet = () => "canonical-review";
const document = {
  readyState: "complete",
  getElementById(id) { return id === "builder" ? builder : null; },
  querySelectorAll() { return []; },
  addEventListener(name, callback) { documentListeners.set(name, callback); },
};
const window = {
  reviewBet: originalReviewBet,
  addEventListener(name, callback) { listeners.set(name, callback); },
};

vm.runInNewContext(layout, { window, document, console });
const renderListener = listeners.get("mamo:air-bet-rendered");
assert.equal(typeof renderListener, "function");
for (let index = 0; index < 25; index += 1) renderListener();
assert.equal(window.reviewBet, originalReviewBet, "layout events must not wrap the canonical review action");
assert.equal(typeof documentListeners.get("click"), "function", "review enhancer may use delegated click handling without wrapping reviewBet");

assert.doesNotMatch(layout, /window\.reviewBet\s*=/);
assert.doesNotMatch(legacyMultiAdd, /window\.reviewBet\s*=/);
assert.doesNotMatch(legacyMultiAdd, /window\.placeBet\s*=/);
assert.match(legacyMultiAdd, /retired AIR BET compatibility shim v11/);
assert.match(legacyMultiAdd, /Object\.freeze\(\{ retired: true \}\)/);
assert.doesNotMatch(legacyMultiAdd, /addEventListener|preventDefault|stopPropagation|stopImmediatePropagation/);
for (const helper of [layout, legacyMultiAdd]) {
  assert.doesNotMatch(helper, /MutationObserver|setTimeout|setInterval|requestAnimationFrame|visualViewport|scrollIntoView|scrollTo|scrollBy/);
}
assert.match(app, /const AIR_BET_RENDERED_EVENT = "mamo:air-bet-rendered"/);
assert.match(app, /refreshBuilder\(\);\s*renderCart\(\);\s*notifyAirBetRendered\(\);/);

// Updating the selection footer must never create a growing ticket list.
const renderCartBody = app.match(/function renderCart\(\) \{([\s\S]*?)\n  \}\n\n  window\.MAMO_AIR_BET_DRAFT/)?.[1] || "";
assert(renderCartBody, "renderCart implementation must be extractable");
assert.doesNotMatch(renderCartBody, /innerHTML/);
assert.match(renderCartBody, /syncTrayUI\(\)/);
assert.doesNotMatch(renderCartBody, /createElement|insertBefore|append|replaceChildren/);
const refreshBuilderBody = app.match(/function refreshBuilder\(\) \{([\s\S]*?)\n  \}\n\n  function normalizeStake/)?.[1] || "";
assert(refreshBuilderBody);
// Run the actual post-add reset and picker painter together. Previously the
// state cleared but .sel/.dim remained, so the compatibility helper toggled
// an already-cleared boat back on.
const resetBody = app.match(/function resetSelections\(\) \{([\s\S]*?)\n  \}/)[1];
const postAddReset = app.match(/if \(result.added.length && selectionRevision === requestSelectionRevision\) \{[\s\S]*?\n      \}/)[0];
for (const kind of ["normal", "box", "form"]) {
  const nodes = new Map();
  for (let rank = 0; rank < 3; rank++) {
    for (let boat = 1; boat <= 6; boat++) {
      for (const id of [`n-${rank}-${boat}`, `f-${rank}-${boat}`, `b-${boat}`]) {
        const classes = new Set();
        nodes.set(id, { classList: { toggle(k, on) { on ? classes.add(k) : classes.delete(k); } }, classes });
      }
    }
  }
  const context = {
    normal: [1, 2, 3],
    box: new Set([1, 2, 3]),
    form: [new Set([1]), new Set([2]), new Set([3])],
    betType: "trifecta",
    selectionRevision: 7,
    requestSelectionRevision: 7,
    result: { added: [{}] },
    $: (id) => nodes.get(id) || null,
    C: { BET_TYPES: { trifecta: { picks: 3 } } },
    syncAddButton() {},
    syncTrayUI() {},
    syncSelectionReferenceOdds() {},
  };
  vm.runInNewContext(`function resetSelections(){${resetBody}} function refreshBuilder(){${refreshBuilderBody}} ${postAddReset}`, context);
  assert.deepEqual(Array.from(context.normal), [null, null, null]);
  assert.equal(context.box.size, 0);
  assert(context.form.every((items) => items.size === 0));
}

// Race rendering may use innerHTML only at the canonical render boundary.
const renderRaceBody = app.match(/function renderRace\(\) \{([\s\S]*?)\n  \}\n\n  function renderCart/)?.[1] || "";
assert(renderRaceBody, "renderRace implementation must be extractable");
assert.equal((renderRaceBody.match(/innerHTML\s*=/g) || []).length, 1);
assert.match(renderRaceBody, /notifyAirBetRendered\(\)/);

// iOS stability: no helper may establish a timer-driven or viewport-driven
// redraw loop for the race screen.
for (const helper of [layout, legacyMultiAdd, compatibility, growth, venuePriority]) {
  assert.doesNotMatch(helper, /visualViewport|requestAnimationFrame|MutationObserver/);
}
assert.doesNotMatch(layout, /setInterval|setTimeout/);

// PWA navigation must remain network-first; stale cached HTML previously kept
// broken event handlers alive after a deploy.
assert.match(serviceWorker, /event\.request\.mode===\"navigate\"/);
assert.match(serviceWorker, /fetch\(event\.request,\{cache:\"no-store\"\}\)/);
assert.match(serviceWorker, /caches\.match\(\"\.\/index\.html\"\)/);

// Shop must remain an ordinary screen in the shared navigation architecture.
assert.match(index, /id="shop" class="screen"/);
assert.match(index, /data-go="shop"/);
assert.match(shop, /window\.MAMO_SHOP/);

// Selection-stage state changes must not scroll the page or race shell.
const selectionHelpers = [
  app.match(/window\.setMode = \(next\) => \{([\s\S]*?)\n  \};/)?.[1] || "",
  app.match(/window\.pickNormal = \(rank, boat\) => \{([\s\S]*?)\n  \};/)?.[1] || "",
  app.match(/window\.toggleBox = \(boat\) => \{([\s\S]*?)\n  \};/)?.[1] || "",
  app.match(/window\.toggleForm = \(rank, boat\) => \{([\s\S]*?)\n  \};/)?.[1] || "",
];
for (const helper of selectionHelpers) {
  assert(helper, "selection handler must be extractable");
  assert.doesNotMatch(helper, /scrollTo|scrollBy|scrollIntoView|requestAnimationFrame|setTimeout/);
}

// The fixed selection layout must not create horizontal page drift.
assert.match(styles, /\.air-bet-selection-footer/);
assert.doesNotMatch(styles, /#raceView\s*\{[^}]*overflow-x:\s*visible/);

console.log("iOS race event loop regression checks passed");
