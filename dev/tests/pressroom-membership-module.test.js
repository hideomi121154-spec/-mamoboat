const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const devRoot = path.resolve(__dirname, "..");
const moduleSource = fs.readFileSync(path.join(devRoot, "pressroom-membership.js"), "utf8");
const appSource = fs.readFileSync(path.join(devRoot, "app.js"), "utf8");
const indexSource = fs.readFileSync(path.join(devRoot, "index.html"), "utf8");

function element() {
  const classes = new Set();
  return {
    dataset: {},
    classList: {
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
    setAttribute(name, value) { this[name] = value; },
    textContent: "",
    innerHTML: "",
    checked: false,
    disabled: false,
  };
}

test("membership UI is owned by the extracted module", () => {
  assert.doesNotMatch(appSource, /function renderMembershipPanel\(/);
  assert.doesNotMatch(appSource, /window\.openMembershipPlans = \(\) =>/);
  assert.match(appSource, /MAMO_PRESSROOM_MEMBERSHIP\?\.create/);
  assert.match(moduleSource, /function renderMembershipPanel\(/);
  assert.match(moduleSource, /function updatePlanUI\(/);
  assert.doesNotMatch(moduleSource, /scrollTo|scrollBy|visualViewport|requestAnimationFrame|MutationObserver/);

  const membershipIndex = indexSource.indexOf("pressroom-membership.js?v=20260830-1");
  const appIndex = indexSource.indexOf("app.js?v=20260830-2");
  assert.ok(membershipIndex >= 0 && appIndex > membershipIndex, "membership module must load before app.js");
});

test("plan selection mutates only pressroom state and uses lightweight UI updates", () => {
  const ids = new Map([
    ["membershipPanel", element()],
    ["pressPlanBadge", element()],
    ["membershipCurrentTitle", element()],
    ["membershipCurrentPrice", element()],
    ["membershipDeepInterview", element()],
    ["morningToggle", element()],
    ["weeklyToggle", element()],
    ["monthlyToggle", element()],
  ]);
  const buttons = ["free", "bronze", "silver", "gold"].map((key) => {
    const button = element();
    button.dataset.pilotPlan = key;
    return button;
  });
  const document = {
    getElementById(id) { return ids.get(id) || null; },
    querySelectorAll(selector) { return selector === "[data-pilot-plan]" ? buttons : []; },
  };
  const window = {};
  vm.runInNewContext(moduleSource, { window, document, Object, String, TypeError });

  const state = {
    plan: "free",
    morningEnabled: false,
    weeklyEnabled: false,
    monthlyEnabled: false,
  };
  const plans = {
    free: { label: "FREE", name: "基本機能", rank: 0, price: "0円" },
    bronze: { label: "BRONZE", name: "MAMO RECORD", rank: 1, price: "390円/月" },
    silver: { label: "SILVER", name: "MAMO INSIGHT", rank: 2, price: "690円/月" },
    gold: { label: "GOLD", name: "MAMO PRESS", rank: 3, price: "1,190円/月" },
  };
  let saveCount = 0;
  const events = [];
  let tabUpdates = 0;
  let modalHtml = "";
  const controller = window.MAMO_PRESSROOM_MEMBERSHIP.create({
    getPressroom: () => state,
    plans,
    save: () => { saveCount += 1; },
    trackEvent: (name, payload) => events.push([name, payload]),
    openModal: (html) => { modalHtml = html; },
    updateReportTabsUI: () => { tabUpdates += 1; },
  });

  controller.renderMembershipPanel();
  const initialMarkup = ids.get("membershipPanel").innerHTML;
  controller.renderMembershipPanel();
  assert.equal(ids.get("membershipPanel").innerHTML, initialMarkup, "membership DOM is generated once");

  controller.selectPilotPlan("gold");
  assert.equal(state.plan, "gold");
  assert.equal(state.morningEnabled, true);
  assert.equal(state.weeklyEnabled, true);
  assert.equal(state.monthlyEnabled, true);
  assert.equal(saveCount, 1);
  assert.equal(events[0][0], "pilot_plan_selected");
  assert.equal(events[0][1].plan, "gold");
  assert.equal(events[0][1].billing_started, false);
  assert.equal(buttons[3].classList.contains("selected"), true);
  assert.equal(ids.get("membershipDeepInterview").disabled, false);
  assert.equal(ids.get("morningToggle").disabled, false);

  controller.selectPilotPlan("bronze");
  assert.equal(state.plan, "bronze");
  assert.equal(state.morningEnabled, false);
  assert.equal(state.weeklyEnabled, false);
  assert.equal(state.monthlyEnabled, false);
  assert.equal(buttons[1].classList.contains("selected"), true);
  assert.equal(ids.get("membershipDeepInterview").disabled, true);
  assert.equal(ids.get("morningToggle").disabled, true);
  assert.ok(tabUpdates >= 2);

  controller.openMembershipPlans();
  assert.match(modalHtml, /FREE \/ BRONZE \/ SILVER \/ GOLD/);
});
