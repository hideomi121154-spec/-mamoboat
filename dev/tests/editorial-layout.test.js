const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const devRoot = path.resolve(__dirname, "..");

test("editorial starts with MAMO VALUE and ends with the member guide", () => {
  const html = fs.readFileSync(path.join(devRoot, "index.html"), "utf8");
  const pilot = fs.readFileSync(path.join(devRoot, "pilot-config.js"), "utf8");

  const valueHead = html.indexOf('id="mamoValueSectionHead"');
  const valueSlot = html.indexOf('id="mamoValueEditorialSlot"');
  const currentRecords = html.indexOf('id="analysisCards"');
  const membership = html.indexOf('id="membershipPanel"');
  const memberGuide = html.indexOf('class="newsroom-cast"');

  assert.ok(valueHead >= 0 && valueHead < valueSlot);
  assert.ok(valueSlot < currentRecords, "MAMO VALUE must precede the record analysis");
  assert.ok(membership < memberGuide, "member guide must be the final editorial section");
  assert.match(html, /section-number">01<\/span><h2>仮想置換額<\/h2>/);
  assert.match(html, /section-number">06<\/span><h2>編集部とAI分析担当<\/h2>/);
  assert.match(pilot, /#analysis\.active > #mamoValueSectionHead \{ order: 10; \}/);
  assert.match(pilot, /#analysis\.active > #mamoValueEditorialSlot \{ order: 11; \}/);
  assert.match(pilot, /#analysis\.active > \.newsroom-cast \{ order: 91; \}/);
});

test("MAMO VALUE has one stable owner in the editorial screen", () => {
  const marketplace = fs.readFileSync(path.join(devRoot, "mamo-shop-marketplace.js"), "utf8");
  const compatibility = fs.readFileSync(path.join(devRoot, "decision-event-api-compat.js"), "utf8");
  const cast = fs.readFileSync(path.join(devRoot, "cast-ui.js"), "utf8");
  const serviceWorker = fs.readFileSync(path.join(devRoot, "sw.js"), "utf8");

  assert.match(marketplace, /getElementById\("mamoValueEditorialSlot"\)/);
  assert.match(marketplace, /panel\.parentElement !== host/);
  assert.match(marketplace, /panel\.dataset\.renderKey === renderKey/);
  assert.match(marketplace, /現金を使わなかった選択を、最初に見る。/);
  assert.doesNotMatch(marketplace, /hero\.insertAdjacentElement\("afterend", panel\)/);
  assert.doesNotMatch(compatibility, /data-mamo-value-panel/);
  assert.match(compatibility, /mamo-shop-marketplace\.js\?v=20260828-3/);
  assert.match(cast, /cast\.previousElementSibling\?\.querySelector\("h2"\)/);
  assert.match(serviceWorker, /mamo-shop-marketplace\.js\?v=20260828-3/);
  assert.match(serviceWorker, /mamoboat-v402-shop-recommendations-35-dev/);
});
