const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "behavior-pattern-profile.js"), "utf8");
const visualRefresh = fs.readFileSync(path.join(__dirname, "..", "visual-refresh.js"), "utf8");
const context = {
  console,
  localStorage: { getItem: () => null, setItem() {} },
  document: { readyState: "loading", addEventListener() {} },
  addEventListener() {},
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: "behavior-pattern-profile.js" });

const api = context.MAMO_BEHAVIOR_INSIGHTS_V2;
assert.equal(api.version, 2);

const now = new Date("2026-08-23T12:00:00+09:00").getTime();
const line = (count) => Array.from({ length: count }, (_, index) => ({ combo: [1, 2, index + 3], stake: 100 }));
const records = [
  ["r1", "2026-08-20T10:00:00+09:00", 100, "自分なりの根拠がある", "miss", 8, 3, 1],
  ["r2", "2026-08-20T10:10:00+09:00", 600, "なんとなく", "hit", 3, 9, 3],
  ["r3", "2026-08-20T10:20:00+09:00", 100, "なんとなく", "miss", 3, 9, 3],
  ["r4", "2026-08-20T10:28:00+09:00", 800, "自分なりの根拠がある", "hit", 8, 3, 1],
  ["r5", "2026-08-21T11:00:00+09:00", 100, "自分なりの根拠がある", "miss", 8, 3, 1],
  ["r6", "2026-08-21T11:12:00+09:00", 500, "なんとなく", "hit", 3, 9, 3],
  ["r7", "2026-08-21T12:20:00+09:00", 100, "自分なりの根拠がある", "miss", 8, 3, 1],
  ["r8", "2026-08-21T12:28:00+09:00", 700, "自分なりの根拠がある", "hit", 8, 3, 1],
].map(([id, time, stake, reason, status, conf, urge, points], index) => ({
  id,
  time,
  raceDate: time.slice(0, 10),
  venueCode: "12",
  raceNo: index + 1,
  stake,
  reason,
  status,
  conf,
  urge,
  lines: line(points),
}));

const model = api.build({
  now,
  plan: "free",
  records,
  realBetExits: [{ at: "2026-08-21T12:35:00+09:00" }],
  reflections: {},
  postReflections: {},
  skipReflections: {},
  journeys: [],
});

assert.equal(model.currentRecords, 8);
assert.equal(model.metrics.activeDays, 2);
assert.equal(model.metrics.dailyAverage, 4);
assert.equal(model.metrics.casualCount, 3);
assert.equal(model.metrics.officialExits, 1);
assert(model.candidates.some((item) => item.id === "after_miss_change" && item.safety));
assert(model.candidates.some((item) => item.id === "small_entry_follow"));
assert(model.candidates.every((item) => !("score" in item)));
assert(model.candidates.every((item) => item.visual && item.visual.type), "each insight has a presentation visual");

const freeVisible = api.visible(model);
assert(freeVisible.some((item) => item.id === "after_miss_change"), "safety insight must be visible on FREE");
assert(freeVisible.filter((item) => !item.safety).length <= 1, "FREE exposes one standard small insight");

const silver = api.build({
  now,
  plan: "silver",
  records,
  realBetExits: [],
  reflections: {},
  postReflections: {},
  skipReflections: {},
  journeys: [],
});
assert(api.visible(silver).some((item) => item.requiredRank === 2 || item.safety));

const storage = new Map([
  ["mamoboat_v40_personal", JSON.stringify({
    records,
    realBetExits: [{ at: "2026-08-21T12:35:00+09:00" }],
    pressroom: { plan: "free" },
  })],
  ["mamoboat_record_v1", JSON.stringify({ reflections: {}, postReflections: {}, skipReflections: {} })],
  ["mamoboat_decision_journeys_v1", "[]"],
]);
const elements = new Map([
  ["analysisCards", { dataset: {}, classList: { add() {} }, innerHTML: "" }],
  ["analysisList", { dataset: {}, className: "", innerHTML: "" }],
]);
context.localStorage.getItem = (key) => storage.get(key) ?? null;
context.document.documentElement = { classList: { add() {} } };
context.document.getElementById = (id) => elements.get(id) || null;
api.render();
assert.match(elements.get("analysisCards").innerHTML, /参加日あたり/);
assert.match(elements.get("analysisCards").innerHTML, /1レース平均買い目数/);
assert.match(elements.get("analysisList").innerHTML, /マモカモの小さな気づき/);
assert.match(elements.get("analysisList").innerHTML, /全プラン共通 \/ SAFETY/);
assert.match(elements.get("analysisList").innerHTML, /behavior-visual behavior-visual-compare/);
assert.match(elements.get("analysisList").innerHTML, /data-behavior-detail/);
assert.match(elements.get("analysisList").innerHTML, /詳細を見る/);
assert.match(elements.get("analysisList").innerHTML, /class="behavior-detail"[^>]*hidden/);
assert.match(elements.get("analysisList").innerHTML, /この時は、どちらの気持ちが強かったですか/);
assert.match(elements.get("analysisList").innerHTML, /今すぐ賭けたい気持ち/);
assert.match(elements.get("analysisList").innerHTML, /このレースで勝負したい根拠/);
assert.equal(elements.get("analysisList").dataset.insightVersion, "2");
assert.match(visualRefresh, /list\.dataset\.insightVersion === "2"/);
assert.match(visualRefresh, /list\.classList\.contains\("behavior-insights-v2"\)/);

assert.doesNotMatch(source, /置換額が多い場|多い参加理由|順位もスコア|mbp-bar/);
assert.match(source, /100Bで参加した.*30分以内に次のレースへ進んだのは/);
assert.match(source, /100Bを選んだときの気持ちは、どれに近いですか/);
assert.match(source, /この1レースで終えるつもりだった/);
assert.match(source, /様子を見て続けるつもりだった/);
assert.match(source, /特に決めていなかった/);
assert.match(source, /マモカモと振り返り/);
assert.doesNotMatch(source, /たまたまだと思う/);
assert.equal((source.match(/\bvisual:\s*\{/g) || []).length, 10, "ten visual templates cover the eleven insight IDs, including both result variants");
assert.match(source, /function visualMarkup\(item\)/);
assert.match(source, /aria-expanded="false"/);
assert.match(source, /details\.hidden = expanded/);
assert.match(source, /behavior-chart-bars/);
assert.match(source, /behavior-donut/);
assert.match(source, /安全に関わる気づき・上限機能・データ削除は無料/);

console.log("behavior insights v2 personal-comparison and free-safety tests OK");
