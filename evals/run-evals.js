"use strict";

const fs = require("fs");
const path = require("path");
const { evaluateOutput } = require("./evaluator");

const ROOT = path.join(__dirname, "..");
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, "cases.json"), "utf8"));
const contracts = JSON.parse(fs.readFileSync(path.join(__dirname, "source-contracts.json"), "utf8"));

const forbiddenSourceLiterals = [
  "絶対当たる",
  "絶対勝てる",
  "必勝できます",
  "買うべきです",
  "賭けるべきです",
  "取り返せます",
  "確実に儲かる",
];

let failed = 0;
const rows = [];

for (const testCase of cases) {
  const result = evaluateOutput(testCase);
  const matched = result.pass === testCase.expectedPass;
  if (!matched) failed += 1;
  rows.push({
    id: testCase.id,
    expected: testCase.expectedPass ? "PASS" : "REJECT",
    actual: result.pass ? "PASS" : "REJECT",
    score: result.score,
    ok: matched ? "✓" : "✗",
    reasons: result.violations.map((v) => v.id).join(", ") || "-",
  });
}

for (const contract of contracts) {
  const filePath = path.join(ROOT, contract.file);
  const source = fs.readFileSync(filePath, "utf8");
  const missing = (contract.required || []).filter((phrase) => !source.includes(phrase));
  const forbidden = forbiddenSourceLiterals.filter((phrase) => source.includes(phrase));
  const ok = missing.length === 0 && forbidden.length === 0;
  if (!ok) failed += 1;
  rows.push({
    id: `source:${contract.file}`,
    expected: "PASS",
    actual: ok ? "PASS" : "REJECT",
    score: ok ? 100 : 0,
    ok: ok ? "✓" : "✗",
    reasons: [
      ...missing.map((v) => `missing:${v}`),
      ...forbidden.map((v) => `forbidden:${v}`),
    ].join(", ") || "-",
  });
}

console.table(rows);

const total = rows.length;
const passed = total - failed;
console.log(`MAMO EVALS: ${passed}/${total} checks passed`);

if (failed) {
  console.error(`MAMO EVALS FAILED: ${failed} check(s) did not meet the contract`);
  process.exit(1);
}

console.log("MAMO EVALS PASSED");
