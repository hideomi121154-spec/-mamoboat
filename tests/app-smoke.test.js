const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const C = require(path.join(__dirname, "..", "core.js"));
const dataset = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "data", "today.json"),
  "utf8"
));

class ClassList {
  constructor() { this.values = new Set(); }
  add(...items) { items.forEach((item) => this.values.add(item)); }
  remove(...items) { items.forEach((item) => this.values.delete(item)); }
  toggle(item, force) {
    const on = force == null ? !this.values.has(item) : !!force;
    if (on) this.values.add(item);
    else this.values.delete(item);
    return on;
  }
  contains(item) { return this.values.has(item); }
}

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this._innerHTML = "";
    this.innerHTMLWriteCount = 0;
    this.textContent = "";
    this.className = "";
    this.classList = new ClassList();
    this.dataset = {};
    this.style = {};
    this.attributes = new Map();
    this.value = "";
    this.checked = false;
    this.disabled = false;
    this.options = [];
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(value) {
    this._innerHTML = String(value);
    this.innerHTMLWriteCount += 1;
  }
  addEventListener() {}
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  insertAdjacentHTML() {}
  contains() { return true; }
  click() {}
  querySelector() { return new FakeElement(); }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { left: 0, right: 390, top: 0, bottom: 844 }; }
}

const elements = new Map();
const element = (id) => {
  if (!elements.has(id)) elements.set(id, new FakeElement(id));
  return elements.get(id);
};
const body = element("body");
body.dataset.screen = "home";
const reportButtons = ["morning", "weekly", "monthly"].map((type) => {
  const button = new FakeElement(`report-${type}`);
  button.dataset.reportType = type;
  return button;
});
const planButtons = ["free", "bronze", "silver", "gold"].map((plan) => {
  const button = new FakeElement(`plan-${plan}`);
  button.dataset.pilotPlan = plan;
  return button;
});
const storage = new Map();
const yesterday = C.jstDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
storage.set("mamoboat_v40_personal", JSON.stringify({
  accepted: true,
  coins: 99400,
  records: [
    {
      id: "smoke-1",
      raceDate: yesterday,
      time: `${yesterday}T10:00:00+09:00`,
      venueCode: "12",
      venue: "住之江",
      raceNo: 1,
      stake: 100,
      intendedYen: 100,
      saved: 100,
      conf: 5,
      urge: 7,
      reason: "まあ100円だけ",
      status: "miss",
      settled: true,
      lines: [{ betType: "trifecta", combo: [1, 2, 3], stake: 100 }],
    },
    {
      id: "smoke-2",
      raceDate: yesterday,
      time: `${yesterday}T10:12:00+09:00`,
      venueCode: "12",
      venue: "住之江",
      raceNo: 2,
      stake: 500,
      intendedYen: 500,
      saved: 500,
      conf: 4,
      urge: 8,
      afterUrge: 6,
      cashWouldHaveWonUrge: 8,
      reason: "なんとなく",
      status: "hit",
      settled: true,
      payoutC: 1200,
      lines: [{ betType: "trifecta", combo: [1, 3, 2], stake: 500 }],
    },
  ],
  pressroom: {
    plan: "take",
    reportType: "morning",
    morningEnabled: true,
    weeklyEnabled: true,
    monthlyEnabled: true,
    displayMode: "editorial",
    feedback: [],
    deepTheme: "",
  },
  pilot: {
    participantId: "P-SMOKE",
    consent: true,
    events: [{
      event_id: "40100000-0000-4000-8000-000000000010",
      study_id: "mamoboat-pilot-v1",
      participant_id: "P-SMOKE",
      session_id: "session-smoke-existing",
      occurred_at: new Date().toISOString(),
      event_name: "app_opened",
      app_version: "4.0.1",
      screen: "home",
      race_date: null,
      venue_code: null,
      race_no: null,
      payload: { collector_configured: true },
      sent_at: null,
    }],
    sentCount: 0,
    lastSyncAt: null,
    lastError: "",
  },
}));

const collectorRequests = [];
const scrollCalls = [];

const document = {
  body,
  hidden: false,
  getElementById: element,
  querySelector(selector) {
    if (selector === ".app-shell" || selector === ".bottom-nav") return new FakeElement();
    return new FakeElement();
  },
  querySelectorAll(selector) {
    if (selector === "[data-report-type]") return reportButtons;
    if (selector === "[data-pilot-plan]") return planButtons;
    return [];
  },
  createElement: () => new FakeElement(),
  addEventListener() {},
};

const context = {
  console,
  document,
  navigator: {},
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
  },
  MamoCore: C,
  MAMOBOAT_PILOT: {
    studyId: "mamoboat-pilot-v1",
    collector: {
      enabled: true,
      transport: "rpc",
      endpoint: "https://example.supabase.co/rest/v1/rpc/ingest_pilot_events",
      publishableKey: "sb_publishable_smoke_test",
    },
  },
  crypto: webcrypto,
  fetch: async (url, options = {}) => {
    if (String(url).includes("ingest_pilot_events")) {
      collectorRequests.push({ url: String(url), options });
      return { ok: true, json: async () => 2 };
    }
    return { ok: true, json: async () => structuredClone(dataset) };
  },
  alert() {},
  confirm: () => true,
  prompt() {},
  scrollTo(...args) { scrollCalls.push(args); },
  addEventListener() {},
  setInterval: () => 0,
  clearInterval() {},
  setTimeout: () => 0,
  clearTimeout,
  URL,
  Blob,
  AbortController,
  structuredClone,
};
context.window = context;
context.self = context;
context.globalThis = context;

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8"),
  context,
  { filename: "app.js" }
);

assert.match(elements.get("pressPlanBadge").textContent, /SILVER/);
assert.match(elements.get("pressPaper").innerHTML, /MAMO朝刊/);
assert.match(elements.get("pressPaper").innerHTML, /B的中後の「現金なら」/);
assert.doesNotMatch(elements.get("pressPaper").innerHTML, /勝率|おすすめ艇|公式投票/);
assert.match(elements.get("membershipPanel").innerHTML, /PILOT版では決済されません/);
assert.match(elements.get("homePressTeaser").innerHTML, /最新号を読む/);

const stableTargets = ["pressPaper", "analysisCards", "analysisList", "membershipPanel"];
const writesBeforePlanChanges = Object.fromEntries(
  stableTargets.map((id) => [id, elements.get(id).innerHTMLWriteCount])
);
const expectedPlanState = {
  free: [false, false, false],
  bronze: [true, false, false],
  silver: [true, true, true],
  gold: [true, true, true],
};

for (const key of ["bronze", "silver", "gold", "free", "bronze"]) {
  context.selectPilotPlan(key);
  const saved = JSON.parse(storage.get("mamoboat_v40_personal"));
  assert.equal(saved.pressroom.plan, key);
  assert.deepEqual(
    [saved.pressroom.morningEnabled, saved.pressroom.weeklyEnabled, saved.pressroom.monthlyEnabled],
    expectedPlanState[key]
  );
  assert.match(elements.get("pressPlanBadge").textContent, new RegExp(key.toUpperCase()));
  planButtons.forEach((button) => {
    const selected = button.dataset.pilotPlan === key;
    assert.equal(button.classList.contains("selected"), selected);
    assert.equal(button.getAttribute("aria-pressed"), selected ? "true" : "false");
  });
  assert.equal(elements.get("membershipDeepInterview").disabled, key !== "gold");
  reportButtons.forEach((button) => {
    const unlocked = button.dataset.reportType === "morning"
      ? key !== "free"
      : ["silver", "gold"].includes(key);
    assert.equal(button.classList.contains("locked"), !unlocked);
  });
  stableTargets.forEach((id) => {
    assert.equal(elements.get(id).innerHTMLWriteCount, writesBeforePlanChanges[id]);
  });
}
assert.equal(scrollCalls.length, 0);

const pilotConfigSource = fs.readFileSync(
  path.join(__dirname, "..", "pilot-config.js"),
  "utf8"
);
assert.match(pilotConfigSource, /MAMO_PLAN_STATE_KEY/);
assert.match(pilotConfigSource, /data-mamo-plan|dataset\.mamoPlan/);
assert.match(pilotConfigSource, /BRONZEで開放 \/ 前の自分との比較/);
assert.match(pilotConfigSource, /SILVERで開放 \/ 勝負トリガー・個人ベースライン・週間分析/);
assert.match(pilotConfigSource, /GOLDで開放 \/ MAMO朝刊・週間・月刊・深掘り・長期分析/);
assert.match(pilotConfigSource, /#mamoAiSafeReport/);
assert.match(pilotConfigSource, /#mamoBaselinePanel/);
assert.match(pilotConfigSource, /#mamoTriggerPanel/);
assert.match(pilotConfigSource, /#pressPaper/);
const tierUiSource = pilotConfigSource.slice(
  pilotConfigSource.indexOf("const MAMO_PLAN_STATE_KEY"),
  pilotConfigSource.indexOf("function loadMamoModule")
);
assert.doesNotMatch(tierUiSource, /scrollTo|scrollBy|visualViewport|MutationObserver/);
assert.doesNotMatch(tierUiSource, /selectPilotPlan\s*=/);
assert.doesNotMatch(tierUiSource, /localStorage\.setItem/);

console.log("app smoke, stable plan UI, and plan tier presentation tests OK");

(async () => {
  await context.sendPilotDataNow();
  assert.equal(collectorRequests.length, 1);
  const request = collectorRequests[0];
  assert.equal(request.url, "https://example.supabase.co/rest/v1/rpc/ingest_pilot_events");
  assert.equal(request.options.headers.apikey, "sb_publishable_smoke_test");
  assert.equal("Authorization" in request.options.headers, false);
  const body = JSON.parse(request.options.body);
  assert(Array.isArray(body.p_events));
  assert(body.p_events.length >= 2);
  assert(body.p_events.every((event) => !("sent_at" in event)));
  console.log("collector smoke test OK");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
