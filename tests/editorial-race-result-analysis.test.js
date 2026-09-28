"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "..");
const devRoot = path.join(root, "dev");

const dom = new JSDOM(
  '<!doctype html><html><body><section id="analysis" data-editorial-placeholder="1"><div id="editorialRaceResultAnalysis" data-editorial-placeholder-core="1"></div></section></body></html>',
  { url: "https://mamoboat.test/dev/", runScripts: "outside-only", pretendToBeVisual: true }
);
const { window } = dom;
window.scrollTo = () => {};
window.go = () => {};

const entries = [
  { boatNumber:1, racerNumber:"4331",name:"山田 太郎",motor2Rate:58.2,exhibitionTime:6.76,averageStart:0.13,nationalWinRate:7.12 },
  { boatNumber:2, racerNumber:"4002",name:"中村 健",motor2Rate:46.1,exhibitionTime:6.82,averageStart:0.15,nationalWinRate:6.38 },
  { boatNumber:3, racerNumber:"4012",name:"田中 翔",motor2Rate:52.4,exhibitionTime:6.70,averageStart:0.16,nationalWinRate:6.02 },
  { boatNumber:4, racerNumber:"4104",name:"鈴木 一郎",motor2Rate:38.6,exhibitionTime:6.88,averageStart:0.17,nationalWinRate:5.91 },
  { boatNumber:5, racerNumber:"3874",name:"佐藤 健一",motor2Rate:49.3,exhibitionTime:6.74,averageStart:0.12,nationalWinRate:6.45 },
  { boatNumber:6, racerNumber:"4206",name:"高橋 亮",motor2Rate:41.0,exhibitionTime:6.90,averageStart:0.18,nationalWinRate:5.72 },
];

const record = {
  id:"race-review-1",
  raceDate:"2026-09-28",
  time:"2026-09-28T05:00:00.000Z",
  venueCode:"12",
  venue:"住之江",
  raceNo:12,
  settled:true,
  status:"hit",
  stake:400,
  payoutC:5620,
  resultCombo:"1-5-3",
  selfConfidence:4,
  selfBasis:"motor",
  selfFocusBoat:1,
  entrySnapshot:entries,
  lines:[
    {betType:"trifecta",combo:[1,3,5],stake:100},
    {betType:"trifecta",combo:[1,5,3],stake:100},
    {betType:"trifecta",combo:[1,3,2],stake:100},
    {betType:"trifecta",combo:[1,5,2],stake:100},
  ],
};
window.localStorage.setItem("mamoboat_v40_personal", JSON.stringify({ records:[record] }));

window.eval(fs.readFileSync(path.join(devRoot, "core.js"), "utf8"));
window.eval(fs.readFileSync(path.join(devRoot, "editorial-race-result-analysis.js"), "utf8"));
window.MAMO_EDITORIAL_RACE_ANALYSIS.render();

const text = window.document.getElementById("editorialRaceResultAnalysis").textContent.replace(/\s+/g, " ");
assert.match(text, /レース結果分析/);
assert.match(text, /住之江 12R/);
assert.match(text, /4点/);
assert.match(text, /5,620B/);
assert.match(text, /\+5,220B/);
assert.match(text, /1着軸・候補/);
assert.match(text, /2着候補/);
assert.match(text, /3着候補/);
assert.match(text, /完全一致/);
assert.match(text, /1-5-3/);
assert.match(text, /各艇のデータ比較/);
assert.match(text, /58\.2%/);
assert.match(text, /モーター/);
assert.match(text, /注目した1号艇は、モーター2連率が6艇中1位/);
assert.match(text, /因果関係は判定していません/);

const exactRows = window.document.querySelectorAll(".era-lines tbody tr.exact");
assert.equal(exactRows.length, 1);
assert.match(exactRows[0].textContent, /1-5-3/);

const factRows = window.document.querySelectorAll(".era-facts tbody tr");
assert.equal(factRows.length, 6);

console.log("user editorial race result analysis regression: OK");
window.close();
