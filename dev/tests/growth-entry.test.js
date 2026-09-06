const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const devRoot = path.resolve(__dirname, "..");

test("X entry is isolated behind campaign parameters", () => {
  const source = fs.readFileSync(path.join(devRoot, "growth-entry.js"), "utf8");
  const html = fs.readFileSync(path.join(devRoot, "index.html"), "utf8");

  assert.match(source, /\["x", "twitter"\]\.includes\(source\)/);
  assert.match(source, /勝ち方ではなく、<br><em>勝負の選び方を。<\/em>/);
  assert.match(source, /漫画を読む（全16コマ）/);
  assert.match(source, /競艇予想サービスではありません/);
  assert.match(source, /destination/);
  assert.match(source, /mamoboat_growth_entry_dismissed_v1/);
  assert.match(source, /sessionStorage\.setItem/);
  assert.match(html, /growth-entry\.js\?v=20260830-1/);
});

test("growth funnel uses the consent-aware existing event queue", () => {
  const app = fs.readFileSync(path.join(devRoot, "app.js"), "utf8");
  const story = fs.readFileSync(path.join(devRoot, "mamo-story.js"), "utf8");

  assert.match(app, /window\.MAMO_TRACK_EVENT = trackEvent/);
  assert.match(app, /analytics_consent: S\.pilot\.consent/);
  assert.match(story, /MAMO_TRACK_EVENT/);
  assert.doesNotMatch(story, /MAMO_DECISION_EVENTS\?\.track\?\.\("mamo_story/);
});

test("returning users leave the story directly for home without reopening onboarding", () => {
  const app = fs.readFileSync(path.join(devRoot, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(devRoot, "index.html"), "utf8");
  const handler = app.match(
    /window\.openAirBetOnboarding\s*=\s*\(sourceDetail = "campaign"\) => \{([\s\S]*?)\n  \};/
  );

  assert.ok(handler, "openAirBetOnboarding must exist");
  assert.match(handler[1], /S\.accepted === true \|\| hasAcceptedOnboarding\(\)/);
  assert.match(handler[1], /\$\("onboard"\)\.classList\.remove\("show"\)/);
  assert.match(handler[1], /window\.go\("home"\);\s*return;/);
  assert.match(handler[1], /\$\("onboard"\)\.classList\.add\("show"\)/);
  assert.ok(
    handler[1].indexOf("hasAcceptedOnboarding()") < handler[1].indexOf("airBetOnboarding = true"),
    "returning-user check must run before first-voyage onboarding is opened"
  );
  assert.match(html, /app\.js\?v=20260906-4/);
});
