const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "dev", "air-outcome-experience.js"), "utf8");
const listeners = new Map();
const document = {
  readyState: "loading",
  addEventListener(type, callback) { listeners.set(type, callback); },
  getElementById() { return null; },
  querySelectorAll() { return []; },
};
const window = {
  localStorage: { getItem() { return null; } },
  addEventListener() {},
};

vm.runInNewContext(source, { window, document, console, setTimeout, clearTimeout });
const view = window.MAMO_AIR_OUTCOME_VIEW;
assert(view, "record-card rendering API should be available");

const record = {
  venue: "福岡",
  venueCode: "22",
  raceNo: 8,
  raceDate: "2026-09-07",
  time: "2026-09-07T15:23:00+09:00",
  settled: true,
  status: "miss",
  stake: 200,
  payoutC: 0,
  resultCombo: "1-2-4",
  lines: [
    { betType: "trifecta", mode: "normal", combo: [1, 2, 4], stake: 100, odds: 8.5 },
    { betType: "trio", mode: "box", combo: [1, 2, 4], stake: 100, odds: 65.5 },
  ],
  resultPayouts: [
    { betType: "win", combo: "1", payout: 120, popularity: null },
    { betType: "place", combo: "1", payout: 140, popularity: null },
    { betType: "place", combo: "2", payout: 210, popularity: null },
    { betType: "exacta", combo: "1-2", payout: 290, popularity: 1 },
    { betType: "quinella", combo: "1-2", payout: 240, popularity: 1 },
    { betType: "wide", combo: "1-2", payout: 280, popularity: 5 },
    { betType: "wide", combo: "1-4", payout: 180, popularity: 3 },
    { betType: "wide", combo: "2-4", payout: 520, popularity: 8 },
    { betType: "trifecta", combo: "1-2-4", payout: 1280, popularity: 6 },
    { betType: "trio", combo: "1-2-4", payout: 470, popularity: 2 },
  ],
};

const html = view.cardHtml(record, 0);
const detailTags = html.match(/<details\b[^>]*>/g) || [];
assert.equal(detailTags.length, 3);
detailTags.forEach((tag) => assert.doesNotMatch(tag, /\sopen(?:\s|=|>)/));
assert.match(html, /<summary><span>購入した買い目<\/span><b>2点<\/b><\/summary>/);
assert.match(html, /<summary><span>参加時参考オッズの内訳<\/span><b>2点<\/b><\/summary>/);
assert.match(html, /<summary><span>公式払戻の内訳<\/span><b>10件<\/b><\/summary>/);
assert.match(html, /8\.5〜65\.5倍/);
assert.match(html, /公式払戻（3連単）/);
assert.match(html, /1,280円/);
assert.match(html, /通常/);
assert.match(html, /BOX/);
for (const type of ["win", "place", "exacta", "quinella", "wide", "trifecta", "trio"]) {
  assert.match(html, new RegExp(`data-payout-type="${type}"`));
}
for (const label of ["単勝", "複勝", "2連単", "2連複", "拡連複", "3連単", "3連複"]) {
  assert.match(html, new RegExp(label));
}
assert.match(html, /6番人気/);
assert.doesNotMatch(html, /rx-financial-restore|class="rx-details"/);

assert.match(source, /content:"▶"/);
assert.match(source, /\[open\]>summary::before\{content:"▼"\}/);
assert.match(source, /summary::after\{content:"開く"/);
assert.match(source, /\[open\]>summary::after\{content:"閉じる"\}/);
assert.match(source, /min-height:58px/);

const pilot = fs.readFileSync(path.join(root, "dev", "pilot-config.js"), "utf8");
assert.match(pilot, /record-unified-layout-v2\.js\?v=20260908-3/);
assert.match(pilot, /record-mobile-layout-fix\.js\?v=20260908-2/);

console.log("record card UI tests passed");
