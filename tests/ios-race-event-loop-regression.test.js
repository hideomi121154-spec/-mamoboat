const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "dev", "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "dev", "styles.css"), "utf8");
const layout = fs.readFileSync(path.join(root, "dev", "bet-review-flow.js"), "utf8");
const index = fs.readFileSync(path.join(root, "dev", "index.html"), "utf8");
const compatibility = fs.readFileSync(path.join(root, "dev", "decision-event-api-compat.js"), "utf8");
const growth = fs.readFileSync(path.join(root, "dev", "growth-entry.js"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "dev", "sw.js"), "utf8");
const shop = fs.readFileSync(path.join(root, "dev", "mamo-shop.css"), "utf8");

function eventTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    removeEventListener(type, handler) {
      const values = listeners.get(type) || [];
      listeners.set(type, values.filter((value) => value !== handler));
    },
    dispatchEvent(event) {
      (listeners.get(event.type) || []).slice().forEach((handler) => handler.call(this, event));
      return true;
    },
  };
}

function classList(initial = []) {
  const values = new Set(initial);
  return {
    add(...names) { names.forEach((name) => values.add(name)); },
    remove(...names) { names.forEach((name) => values.delete(name)); },
    toggle(name, force) {
      if (force === true) { values.add(name); return true; }
      if (force === false) { values.delete(name); return false; }
      if (values.has(name)) { values.delete(name); return false; }
      values.add(name); return true;
    },
    contains(name) { return values.has(name); },
    toString() { return [...values].join(" "); },
  };
}

function node(id, classes = []) {
  const base = eventTarget();
  return Object.assign(base, {
    id,
    classList: classList(classes),
    style: {},
    dataset: {},
    hidden: false,
    disabled: false,
    textContent: "",
    innerHTML: "",
    parentElement: null,
    children: [],
    value: "",
    checked: false,
    setAttribute(name, value) { this[name] = String(value); },
    getAttribute(name) { return this[name] ?? null; },
    append(...items) { this.children.push(...items); items.forEach((item) => { if (item) item.parentElement = this; }); },
    appendChild(item) { this.append(item); return item; },
    prepend(...items) { this.children.unshift(...items); items.forEach((item) => { if (item) item.parentElement = this; }); },
    remove() {},
    closest(selector) {
      if (selector === ".screen" && this.classList.contains("screen")) return this;
      if (selector.startsWith("#") && selector.slice(1) === this.id) return this;
      return null;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  });
}

const elements = new Map();
for (const id of ["home", "venues", "race", "records", "analysis", "settings", "shop", "raceView", "builder", "modeTabs", "reviewBetButton", "bottomNav"]) {
  elements.set(id, node(id, ["screen"]));
}
elements.get("home").classList.add("active");

const documentTarget = eventTarget();
const document = Object.assign(documentTarget, {
  readyState: "complete",
  body: node("body"),
  documentElement: node("html"),
  head: node("head"),
  getElementById(id) { return elements.get(id) || null; },
  querySelector(selector) {
    if (selector === ".screen.active") return [...elements.values()].find((item) => item.classList.contains("active")) || null;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === ".screen") return [...elements.values()].filter((item) => item.classList.contains("screen"));
    return [];
  },
  createElement(tag) { return node(tag); },
});

document.body.classList = classList();
document.documentElement.classList = classList();

const windowTarget = eventTarget();
const windowObject = Object.assign(windowTarget, {
  document,
  location: { href: "https://mamoboat.com/dev/", pathname: "/dev/", search: "", hash: "" },
  history: { pushState() {}, replaceState() {} },
  scrollTo() {},
  scrollBy() {},
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  navigator: { userAgent: "iPhone", maxTouchPoints: 5 },
  matchMedia() { return { matches: false, addEventListener() {}, removeEventListener() {} }; },
});

const context = vm.createContext({
  window: windowObject,
  document,
  navigator: windowObject.navigator,
  location: windowObject.location,
  history: windowObject.history,
  localStorage: windowObject.localStorage,
  sessionStorage: windowObject.sessionStorage,
  console,
  CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
  Event: class Event { constructor(type) { this.type = type; } },
  URL,
  URLSearchParams,
  setTimeout() { return 1; },
  clearTimeout() {},
  setInterval() { return 1; },
  clearInterval() {},
  requestAnimationFrame(handler) { if (typeof handler === "function") handler(); return 1; },
  cancelAnimationFrame() {},
});
context.globalThis = context;

// Stable navigation contract: navigation itself must not depend on viewport observers/timers.
assert.doesNotMatch(app, /visualViewport\.addEventListener\([^\n]*go\(/);
assert.doesNotMatch(app, /MutationObserver[\s\S]{0,300}go\(/);
assert.doesNotMatch(app, /setInterval\([^\n]*go\(/);
assert.doesNotMatch(app, /setTimeout\([^\n]*go\(/);
assert.doesNotMatch(app, /requestAnimationFrame\([^\n]*go\(/);

// Purchase review stays one vertical scroll owner and preserves large touch targets.
assert.match(styles, /\.modal\.air-bet-review-modal \{[\s\S]*?overflow: hidden;/);
assert.match(styles, /\.air-bet-review-shell > \.air-bet-review-tickets \{[\s\S]*?overflow-y: auto;[\s\S]*?touch-action: pan-y;/);
assert.match(styles, /\.air-bet-review-tickets \.betlines \{[\s\S]*?max-height: none;[\s\S]*?overflow: visible;/);
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
assert.match(index, /styles\.css\?v=20260910-3/);
assert.match(index, /air-bet-draft-core\.js\?v=20260909-2[\s\S]*pilot-config\.js\?v=20260909-4[\s\S]*app\.js\?v=20260910-4/);
assert.match(compatibility, /bet-review-flow\.js\?v=20260908-2/);
assert.match(growth, /venue-live-priority\.js\?v=20260909-1/);
assert.match(serviceWorker, /mamoboat-v494-airbet-allocation-dev/);
assert.match(serviceWorker, /bet-review-flow\.js\?v=20260911-2/);
assert.match(serviceWorker, /styles\.css\?v=20260910-3/);
assert.match(serviceWorker, /app\.js\?v=20260910-4/);
assert.match(serviceWorker, /venue-live-priority\.js\?v=20260909-1/);
assert.match(serviceWorker, /air-bet-draft-core\.js\?v=20260909-2/);
assert.match(serviceWorker, /air-bet-selection-fixed\.css\?v=20260910-4/);
assert.match(serviceWorker, /race-airbet-compact\.js\?v=20260910-6/);
assert.doesNotMatch(serviceWorker, /air-bet-multi-add|air-bet-selection-reset|mamo-air-bet-review-cleanup/);

// SHOP remains native-only; the abandoned horizontal-navigation layer stays out.
assert.match(compatibility, /mamo-shop\.js\?v=20260830-2/);
assert.match(compatibility, /mamo-shop-record-benefits\.js\?v=20260830-1/);
assert.doesNotMatch(compatibility, /bottom-nav-horizontal\.js/);
assert.match(shop, /overflow-x:auto!important/);
assert.doesNotMatch(shop, /touchstart|touchmove|preventDefault/);

console.log("iOS AIR BET event-loop regression checks passed");
