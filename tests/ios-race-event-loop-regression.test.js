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
const originalReviewBet = () => "canonical-review";
const document = {
  readyState: "complete",
  getElementById(id) { return id === "builder" ? builder : null; },
  querySelectorAll() { return []; },
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

assert.doesNotMatch(layout, /window\.reviewBet\s*=/);
assert.doesNotMatch(legacyMultiAdd, /window\.reviewBet\s*=/);
assert.doesNotMatch(legacyMultiAdd, /window\.placeBet\s*=/);
assert.match(legacyMultiAdd, /dataset\.mamoBackVenues = "1"/);
for (const helper of [layout, legacyMultiAdd]) {
  assert.doesNotMatch(helper, /MutationObserver|setTimeout|setInterval|requestAnimationFrame|visualViewport|scrollIntoView|scrollTo|scrollBy/);
}
assert.match(app, /const AIR_BET_RENDERED_EVENT = "mamo:air-bet-rendered"/);
assert.match(app, /refreshBuilder\(\);\s*renderCart\(\);\s*notifyAirBetRendered\(\);/);

// The tray is persistent within a race and only its keyed rows are changed.
const renderCartBody = app.match(/function renderCart\(\) \{([\s\S]*?)\n  \}\n\n  window\.MAMO_AIR_BET_DRAFT/)?.[1] || "";
assert(renderCartBody, "renderCart implementation must be extractable");
assert.doesNotMatch(renderCartBody, /innerHTML/);
assert.match(renderCartBody, /existing = new Map/);
assert.match(renderCartBody, /if \(currentAtIndex !== row\) container\.insertBefore\(row, currentAtIndex \|\| null\)/);
assert.match(renderCartBody, /row\.remove\(\)/);
const refreshBuilderBody = app.match(/function refreshBuilder\(\) \{([\s\S]*?)\n  \}\n\n  function normalizeStake/)?.[1] || "";
assert(refreshBuilderBody);
assert.doesNotMatch(refreshBuilderBody, /renderCart\(\)/, "selection taps must not touch existing tray rows");
assert.match(app, /id="airBetTray"/);
assert.match(app, />買い目トレイ</);
assert.match(app, />買い目を追加してください</);
assert.match(app, /data-add-current="normal"[\s\S]*?＋ 買い目に追加/);
assert.match(app, /data-add-current="box"[\s\S]*?＋ 買い目に追加/);
assert.match(app, /data-add-current="form"[\s\S]*?＋ 買い目に追加/);
assert.match(app, />買い目・金額を確認する</);
assert.match(app, /\$\{added\.length\}点追加しました。続けて別の買い目を選べます。/);
assert.match(app, /はすでに追加されています。/);
const setBetTypeBody = app.match(/window\.setBetType = \(nextType\) => \{([\s\S]*?)\n  \};/)?.[1] || "";
const setModeBody = app.match(/window\.setMode = \(nextMode\) => \{([\s\S]*?)\n  \};/)?.[1] || "";
assert(setBetTypeBody && setModeBody);
assert.doesNotMatch(setBetTypeBody, /cart\s*=/);
assert.doesNotMatch(setModeBody, /cart\s*=/);

// Selection/add/review are drafts only. Wallet debit, history write and save
// remain exclusively in the final confirmation action.
const addCombosBody = app.match(/async function addCombos\(combos\) \{([\s\S]*?)\n  \}\n\n  window\.addNormal/)?.[1] || "";
const reviewBetBody = app.match(/window\.reviewBet = \(\) => \{([\s\S]*?)\n  \};\n\n  window\.placeBet/)?.[1] || "";
const placeBetBody = app.match(/window\.placeBet = \(\) => \{([\s\S]*?)\n  \};\n\n  function findDatasetRace/)?.[1] || "";
assert(addCombosBody && reviewBetBody && placeBetBody);
for (const draftBody of [addCombosBody, reviewBetBody]) {
  assert.doesNotMatch(draftBody, /postLedger|S\.records\.push|save\(\)/);
  assert.doesNotMatch(draftBody, /scrollIntoView|scrollTo|scrollBy|visualViewport|requestAnimationFrame/);
}
assert.doesNotMatch(addCombosBody, /openModal|reviewBet\(/);
assert.match(reviewBetBody, /openModal\(/);
assert.doesNotMatch(reviewBetBody, /resetBuilder|cart\s*=\s*\[\]/, "closing review must retain the draft tray");
assert.match(placeBetBody, /postLedger\("virtual_bet"/);
assert.match(placeBetBody, /S\.records\.push\(record\)/);
assert.match(placeBetBody, /save\(\)/);
assert.match(placeBetBody, /betModes: recordedModes/);
assert.match(placeBetBody, /mode: line\.mode \|\| mode/);
assert.match(app, /class="mamo-bet-modal-back"[^>]*onclick="closeModal\(\)"/);
assert.match(app, /class="btn teal full air-bet-confirm-button"[^>]*onclick="placeBet\(\)"/);
assert.match(app, /if \(cartIncompleteCount\(\)\) return alert\("全ての買い目にベット数を入力してください。"\)/);
assert.match(app, /confirm\.disabled = incomplete > 0 \|\| overBalance \|\| !cart\.length/);

// Amounts begin empty and remain editable per-line or in bulk only on review.
assert.match(app, /amount: null/);
assert.match(app, /ベット数を入力してください/);
assert.match(app, /id="reviewAllStakeInput"[^>]*step="100"/);
assert.match(app, /class="betline-stake-input"[^>]*step="100"/);
assert.match(app, /window\.updateReviewLineStake = \(index, value\) =>/);
assert.match(app, /window\.applyReviewAllStake = \(\) =>/);
assert.match(app, /window\.removeReviewLine = \(index\) =>/);
const setAllStakesBody = app.match(/window\.setAllStakes = \(amount\) => \{([\s\S]*?)\n  \};/)?.[1] || "";
assert.match(setAllStakesBody, /syncCartStakeUI\(\)/);
assert.doesNotMatch(setAllStakesBody, /renderCart\(\)/, "quick amounts must not rebuild tray controls");

// Modal/body scrolling and bottom navigation keep the existing iOS safeguards.
assert.match(app, /document\.documentElement\?\.classList\?\.toggle\("modal-open", true\)/);
assert.match(app, /document\.documentElement\?\.classList\?\.toggle\("modal-open", false\)/);
assert.match(styles, /html\.modal-open, body\.modal-open \{ overflow: hidden !important; overscroll-behavior: none; \}/);
assert.match(styles, /\.bottom-nav \{ position: fixed;/);
assert.match(styles, /\.air-bet-tray-row \.xbtn \{ min-height: 44px;/);
assert.match(styles, /\.air-bet-review-button \{ min-height: 56px;/);
assert.match(styles, /\.mamo-bet-modal-back \{ width: 100%; min-height: 46px;/);

// Racer table and official links stay available after removing action wrappers.
assert.match(app, /<details class="race-racer-details">/);
assert.doesNotMatch(app, /<details class="race-racer-details"\s+open/);
assert.match(app, /data-racer-class=/);
assert.match(app, /data-motor-number=/);
assert.match(app, /data-boat-part=/);
assert.match(layout, /class="mamo-racer-meta"/);
assert.match(styles, /#builder\.mamo-selection-matrix/);

// Every cache-busted path must point at the same release, including PWA shell.
assert.match(index, /styles\.css\?v=20260908-2/);
assert.match(index, /air-bet-draft-core\.js\?v=20260908-2[\s\S]*pilot-config\.js\?v=20260908-2[\s\S]*app\.js\?v=20260908-2/);
assert.match(compatibility, /bet-review-flow\.js\?v=20260908-2/);
assert.match(growth, /venue-live-priority\.js\?v=20260908-2/);
assert.match(serviceWorker, /mamoboat-v429-air-bet-draft-tray-67-dev/);
assert.match(serviceWorker, /air-bet-draft-core\.js\?v=20260908-2/);
assert.match(serviceWorker, /air-bet-multi-add\.js\?v=20260908-2/);

// SHOP remains native-only; the abandoned horizontal-navigation layer stays out.
assert.match(compatibility, /mamo-shop\.js\?v=20260830-2/);
assert.match(compatibility, /mamo-shop-record-benefits\.js\?v=20260830-1/);
assert.doesNotMatch(compatibility, /bottom-nav-horizontal\.js/);
assert.match(shop, /overflow-x:auto!important/);
assert.doesNotMatch(shop, /touchstart|touchmove|preventDefault/);

console.log("iOS AIR BET event-loop regression checks passed");
