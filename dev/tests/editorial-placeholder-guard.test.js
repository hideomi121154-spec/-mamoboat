"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "editorial-placeholder-guard.js"), "utf8");

function node(dataset = {}) {
  return {
    dataset: { ...dataset },
    removed: false,
    remove() { this.removed = true; },
  };
}

const coreIntro = node({ editorialPlaceholderCore: "1" });
const corePanel = node({ editorialPlaceholderCore: "1" });
const staleDirectChild = node();
const gold = node();
const special = node();
const press = node();

const analysis = {
  dataset: { editorialPlaceholder: "1" },
  children: [coreIntro, staleDirectChild, corePanel],
};

const selectors = new Map([
  ["#goldEditorialDesk", [gold]],
  ["#mamoSpecialAnalysis", [special]],
  ["#mamoPressIntel", [press]],
]);

const document = {
  readyState: "complete",
  body: {},
  getElementById(id) {
    return id === "analysis" ? analysis : null;
  },
  querySelectorAll(selector) {
    return selectors.get(selector) || [];
  },
  addEventListener() {},
};

class MutationObserver {
  constructor(callback) { this.callback = callback; }
  observe() {}
}

const window = {
  addEventListener() {},
};

const context = {
  window,
  document,
  MutationObserver,
  Object,
  queueMicrotask(callback) { callback(); },
};

vm.runInNewContext(source, context, { filename: "editorial-placeholder-guard.js" });

assert.equal(coreIntro.removed, false, "placeholder intro must remain");
assert.equal(corePanel.removed, false, "placeholder panel must remain");
assert.equal(staleDirectChild.removed, true, "unexpected direct editorial content must be removed");
assert.equal(gold.removed, true, "legacy GOLD editorial desk must be removed");
assert.equal(special.removed, true, "legacy RECORD special analysis must be removed");
assert.equal(press.removed, true, "legacy press panel must be removed");
assert.equal(typeof window.MAMO_EDITORIAL_PLACEHOLDER_GUARD?.sanitize, "function");

console.log("editorial placeholder guard regression: OK");
