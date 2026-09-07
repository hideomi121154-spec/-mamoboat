const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function loadClosure(relativePath, names) {
  const filename = path.join(ROOT, relativePath);
  let source = fs.readFileSync(filename, "utf8");
  const end = /\}\)\(\);\s*$/;
  assert.match(source, end, `${relativePath} must end with its IIFE`);
  source = source.replace(
    end,
    `window.__raceCarteTest = { ${names.join(", ")} };\n})();`,
  );

  const window = {
    addEventListener() {},
    dispatchEvent() {},
    scrollY: 0,
    pageYOffset: 0,
  };
  const document = {
    readyState: "loading",
    addEventListener() {},
  };
  const context = {
    window,
    document,
    localStorage: { getItem() { return null; }, setItem() {} },
    CustomEvent: class CustomEvent {},
    console,
    fetch: async () => { throw new Error("fetch is not used in this unit test"); },
    setTimeout,
    clearTimeout,
    Intl,
  };
  vm.runInNewContext(source, context, { filename });
  return window.__raceCarteTest;
}

function fukuoka2(payload) {
  const venue = payload.venues.find(item => String(item.code).padStart(2, "0") === "22");
  return venue.races.find(race => Number(race.number) === 2);
}

function visibleText(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const dated = JSON.parse(fs.readFileSync(path.join(ROOT, "data/2026-09-07.json"), "utf8"));
const today = JSON.parse(fs.readFileSync(path.join(ROOT, "data/today.json"), "utf8"));
const devDated = JSON.parse(fs.readFileSync(path.join(ROOT, "dev/data/2026-09-07.json"), "utf8"));
const devToday = JSON.parse(fs.readFileSync(path.join(ROOT, "dev/data/today.json"), "utf8"));
assert.deepEqual(today, dated);
assert.deepEqual(devDated, dated);
assert.deepEqual(devToday, dated);

const race = fukuoka2(devDated);
const snapshot = loadClosure("dev/race-carte-snapshot.js", ["racerSnapshot", "environmentSnapshot"]);
const ui = loadClosure("dev/race-carte.js", ["racersHtml", "environment"]);
const record = {
  entrySnapshot: race.entries.map(entry => snapshot.racerSnapshot(entry)),
  environmentSnapshot: snapshot.environmentSnapshot(race),
  resultOrder: [1, 2, 3],
};
const rendered = visibleText(ui.racersHtml(record));

const expected = [
  ["5289", "全国勝率 5.73", "当地勝率 5.95", "平均ST 0.16", "F/L 0/0", "モーター 34号 / 2連率 42.96%", "ボート 138号 / 2連率 42.27%", "展示 6.85"],
  ["3523", "全国勝率 4.42", "当地勝率 6.00", "平均ST 0.20", "F/L 0/0", "モーター 35号 / 2連率 26.61%", "ボート 106号 / 2連率 26.04%", "展示 6.91"],
  ["5007", "全国勝率 4.68", "当地勝率 4.00", "平均ST 0.18", "F/L 1/0", "モーター 65号 / 2連率 41.51%", "ボート 131号 / 2連率 21.05%", "展示 6.92"],
  ["4632", "全国勝率 4.84", "当地勝率 5.14", "平均ST 0.20", "F/L 0/0", "モーター 15号 / 2連率 40.48%", "ボート 124号 / 2連率 30.95%", "展示 6.95"],
  ["4114", "全国勝率 4.89", "当地勝率 6.16", "平均ST 0.19", "F/L 0/0", "モーター 37号 / 2連率 30.77%", "ボート 122号 / 2連率 30.93%", "展示 6.93"],
  ["4095", "全国勝率 7.07", "当地勝率 7.33", "平均ST 0.13", "F/L 2/0", "モーター 39号 / 2連率 40.45%", "ボート 101号 / 2連率 31.68%", "展示 6.84"],
];
for (const tokens of expected) {
  for (const token of tokens) assert.ok(rendered.includes(token), `missing UI value: ${token}`);
}
for (const label of ["全国勝率", "当地勝率", "平均ST", "モーター", "ボート", "展示"]) {
  assert.ok(!rendered.includes(`${label} —`), `${label} must not render as a placeholder`);
}
assert.deepEqual(
  JSON.parse(JSON.stringify(ui.environment(record))),
  { weather: "曇", windDirection: "南南西", windSpeed: 4, wave: 4, air: 28, water: 28 },
);

console.log("Race Carte official JSON -> snapshot -> UI data flow test passed.");
