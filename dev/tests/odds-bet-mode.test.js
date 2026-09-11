const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "odds-bet-mode-v1.js"), "utf8");
const selectorSource = fs.readFileSync(path.join(root, "air-bet-mode-stability.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "odds-bet-mode.css"), "utf8");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");

const document = {
  readyState: "loading",
  addEventListener() {},
  querySelectorAll() { return []; },
};
const window = { addEventListener() {} };
const sandbox = vm.createContext({ window, document, console, AbortController, CustomEvent: class CustomEvent {} });
vm.runInContext(source, sandbox, { filename: "odds-bet-mode-v1.js" });

const testApi = sandbox.window.MAMO_ODDS_BET_MODE_TEST;
assert.ok(testApi, "odds bet test API is exported");

for (const position of [0, 1, 2]) {
  const combos = testApi.axisCombos(2, position).map((combo) => Array.from(combo));
  assert.equal(combos.length, 20, `axis position ${position + 1} has 20 trifecta combinations`);
  assert.equal(new Set(combos.map((combo) => combo.join("-"))).size, 20, "axis combinations are unique");
  for (const combo of combos) {
    assert.equal(combo[position], 2, "selected racer remains in the requested finish position");
    assert.equal(new Set(combo).size, 3, "trifecta combination never repeats a boat");
  }
}

const combined = testApi.combinedOddsFromValues(["4.0", "5.0"]);
assert.ok(Math.abs(combined - (1 / (1 / 4 + 1 / 5))) < 1e-12, "combined odds use reciprocal sum");
assert.equal(testApi.combinedOddsFromValues(["4.0", null]), null, "partial odds never produce a misleading combined price");

// Safety contract: the module is additive and must not own purchase/wallet/record state.
assert.doesNotMatch(source, /window\.placeBet\s*=/);
assert.doesNotMatch(source, /localStorage\.setItem/);
assert.doesNotMatch(source, /\bcoins\s*=/);
assert.doesNotMatch(source, /MutationObserver/);
assert.doesNotMatch(source, /setInterval\(/);
assert.doesNotMatch(source, /setTimeout\(/);
assert.doesNotMatch(source, /requestAnimationFrame\(/);
assert.doesNotMatch(source, /visualViewport/);
assert.doesNotMatch(source, /scrollIntoView|scrollTo\(|scrollBy\(/);
assert.doesNotMatch(source, /\.innerHTML\s*=/, "odds mode builds its own DOM without innerHTML repainting");
assert.match(source, /window\.setBetType\?\.\("trifecta"\)/, "odds mode reuses canonical 3連単 state");
assert.match(source, /window\.pickNormal\?\./, "odds mode hands combinations to canonical normal selection");
assert.match(source, /window\.addNormal\?\./, "odds mode hands additions to canonical draft append path");
assert.match(source, /#raceView \.mamo-racer-row/, "odds mode reads the compact roster that remains on iPhone");
assert.match(source, /#raceView \.boats \.boat/, "desktop/original roster remains a safe fallback");
assert.match(source, /艇番＋選手名で切り替え/);
assert.match(source, /合成オッズ/);

// The visible compact selector must expose the odds mode only for 3連単 and route through legacy controls.
assert.match(selectorSource, /odds:\s*"オッズ投票"/);
assert.match(selectorSource, /type === "trifecta"\) return \["normal", "box", "form", "odds"\]/);
assert.match(selectorSource, /value === "odds" \? "bt-odds" : `bt-\$\{value\}`/);
assert.match(selectorSource, /legacyButton\.click\(\)/);
assert.doesNotMatch(selectorSource, /MutationObserver/);
assert.doesNotMatch(selectorSource, /scrollIntoView|scrollTo\(|scrollBy\(/);

// Styling is isolated to the dedicated odds-mode namespace; no legacy selector is redefined.
assert.match(styles, /mamo-odds-bet-mode/);
assert.match(styles, /mamo-odds-list/);
assert.doesNotMatch(styles, /\.rank\s*\{/);
assert.doesNotMatch(styles, /\.pick\s*\{/);
assert.doesNotMatch(styles, /position:\s*fixed/);

// PWA must deliver the repaired selector + odds module and preserve prior cache markers.
assert.match(sw, /mamoboat-v504-odds-bet-mobile-selector-dev/);
assert.match(sw, /mamoboat-v503-odds-bet-mode-dev/);
assert.match(sw, /mamoboat-v502-race-carte-composite-odds-dev/);
assert.match(sw, /odds-bet-mode-v1\.js\?v=20260911-2/);
assert.match(sw, /air-bet-mode-stability\.js\?v=20260911-12/);
assert.match(sw, /odds-bet-mode\.css\?v=20260911-1/);
assert.match(sw, /url\.pathname\.endsWith\("\/odds-bet-mode-v1\.js"\)/);
assert.match(sw, /url\.pathname\.endsWith\("\/air-bet-mode-stability\.js"\)/);

console.log("Odds betting mode safety and mobile selector tests passed");
