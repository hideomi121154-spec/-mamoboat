"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "editorial-nav-bridge.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

function classList(initial = []) {
  const set = new Set(initial);
  return {
    toggle(name, force) {
      if (force === true) set.add(name);
      else if (force === false) set.delete(name);
      else if (set.has(name)) set.delete(name);
      else set.add(name);
    },
    contains(name) { return set.has(name); },
  };
}

const home = { id: "home", classList: classList(["screen", "active"]) };
const analysis = { id: "analysis", classList: classList(["screen"]) };
const navHome = { id: "nav-home", classList: classList(["nav", "active"]), dataset: {} };
const navAnalysis = { id: "nav-analysis", classList: classList(["nav"]), dataset: {}, onclick: null };
const bottomNav = {};

let legacyCalls = [];
let scrollCalls = 0;
let dispatched = [];

const document = {
  readyState: "complete",
  body: { dataset: { screen: "home" } },
  getElementById(id) {
    return ({ home, analysis, "nav-home": navHome, "nav-analysis": navAnalysis })[id] || null;
  },
  querySelector(selector) {
    if (selector === ".bottom-nav") return bottomNav;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === ".screen") return [home, analysis];
    if (selector === ".bottom-nav .nav, .bottom-nav .nav-item") return [navHome, navAnalysis];
    return [];
  },
  addEventListener() {},
};

class MutationObserver {
  constructor(callback) { this.callback = callback; }
  observe() {}
}

class CustomEvent {
  constructor(type) { this.type = type; }
}

const window = {
  go(id) {
    legacyCalls.push(id);
    if (id === "analysis") document.body.dataset.screen = "home";
  },
  scrollTo() { scrollCalls += 1; },
  dispatchEvent(event) { dispatched.push(event.type); },
  addEventListener() {},
};

const context = {
  window,
  document,
  MutationObserver,
  CustomEvent,
  requestAnimationFrame(callback) { callback(); },
};
vm.runInNewContext(source, context, { filename: "editorial-nav-bridge.js" });

assert.equal(typeof window.go, "function");
window.go("analysis");
assert.deepEqual(legacyCalls, [], "stale app go('analysis') must be bypassed");
assert.equal(document.body.dataset.screen, "analysis");
assert.equal(home.classList.contains("active"), false);
assert.equal(analysis.classList.contains("active"), true);
assert.equal(navHome.classList.contains("active"), false);
assert.equal(navAnalysis.classList.contains("active"), true);
assert.equal(navAnalysis.dataset.mamoEditorialNavOwner, "bridge");
assert(scrollCalls > 0);
assert(dispatched.includes("mamo:editorial-placeholder-opened"));

window.go("home");
assert.deepEqual(legacyCalls, ["home"], "non-editorial navigation must delegate to app.js");

assert.match(html, /editorial-nav-bridge\.js\?v=20260928-1/);
assert.match(sw, /mamoboat-v542-race-fact-summary-compact-dev/);
assert.match(sw, /editorial-nav-bridge\.js\?v=20260928-1/);

console.log("editorial navigation bridge regression: OK");
