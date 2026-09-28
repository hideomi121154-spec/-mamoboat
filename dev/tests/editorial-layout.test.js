const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const devRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(devRoot, "..");

test("legacy editorial UI is no longer exposed in the user app", () => {
  const html = fs.readFileSync(path.join(devRoot, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(devRoot, "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(devRoot, "styles.css"), "utf8");

  assert.doesNotMatch(html, /id="analysis"/);
  assert.doesNotMatch(html, /id="nav-analysis"/);
  assert.doesNotMatch(html, /MAMO編集部/);
  assert.doesNotMatch(html, /id="pressPaper"/);
  assert.doesNotMatch(html, /id="membershipPanel"/);
  assert.doesNotMatch(html, /新聞の発行設定/);
  assert.doesNotMatch(html, /mamoValueEditorialSlot/);
  assert.doesNotMatch(html, /編集部とAI分析担当/);
  assert.doesNotMatch(html, /PRESS PILOT/);

  assert.match(app, /if \(id === "analysis"\) id = "home";/);
  assert.match(app, /function renderAnalysis\(\) \{\s*if \(!\$\("analysisCards"\) \|\| !\$\("analysisList"\)\) return;/);
  assert.match(styles, /\.bottom-nav\s*\{[^}]*grid-template-columns:\s*repeat\(5,/s);
});

test("legacy editorial concepts are archived in OWNER ONLY MASTER ROOM", () => {
  const html = fs.readFileSync(path.join(repoRoot, "master-room.html"), "utf8");
  const js = fs.readFileSync(path.join(repoRoot, "master-room.js"), "utf8");

  assert.match(html, /MAMO編集部（管理用）/);
  assert.match(html, /USER HIDDEN \/ OWNER ONLY/);
  assert.match(html, /旧「編集部」はユーザーアプリから非公開に移行しました/);
  assert.match(html, /id="editorialArchive"/);
  assert.match(html, /id="editorialBehavior"/);
  assert.match(html, /id="editorialPlanArchive"/);

  assert.match(js, /function renderEditorialLab\(data\)/);
  assert.match(js, /MAMO VALUE/);
  assert.match(js, /現在の記録/);
  assert.match(js, /行動パターン/);
  assert.match(js, /あなた専用の新聞/);
  assert.match(js, /旧購読プラン/);
  assert.match(js, /編集部とAI分析担当/);
  assert.match(js, /renderEditorialLab\(data\)/);
});

test("behavior collection code can remain internal without owning a user-facing editorial screen", () => {
  const behavior = fs.readFileSync(path.join(devRoot, "behavior-pattern-profile.js"), "utf8");
  const science = fs.readFileSync(path.join(devRoot, "behavior-science.js"), "utf8");
  const html = fs.readFileSync(path.join(devRoot, "index.html"), "utf8");

  assert.match(behavior, /analysisCards/);
  assert.match(science, /analysisList/);
  assert.doesNotMatch(html, /id="analysisCards"/);
  assert.doesNotMatch(html, /id="analysisList"/);
});
