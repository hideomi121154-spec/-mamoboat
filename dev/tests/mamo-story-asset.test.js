const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const devRoot = path.resolve(__dirname, "..");

test("MAMO STORY uses 16 same-origin panel images", () => {
  const source = fs.readFileSync(path.join(devRoot, "mamo-story.js"), "utf8");
  const pilotSource = fs.readFileSync(path.join(devRoot, "pilot-config.js"), "utf8");
  const refreshSource = fs.readFileSync(path.join(devRoot, "sw-refresh.js"), "utf8");

  assert.match(source, /const STORY_IMAGES=Array\.from\(\{length:16\}/);
  assert.match(source, /\.\/assets\/mamo-story\/mamo-story-/);
  assert.match(source, /class="story-panel"/);
  assert.doesNotMatch(source, /raw\.githubusercontent\.com|mamo-story-image(?:-v9)?\.txt|createObjectURL|atob\(/);
  assert.match(pilotSource, /sw-refresh\.js\?v=20260823-27/);
  assert.match(refreshSource, /mamo-story\.js\?v=20260827-2/);
  assert.match(source, /destination:\"mamo_story_completed\"/);
});

test("all 16 MAMO STORY PNG panels are valid and readable", () => {
  const panelRoot = path.join(devRoot, "assets", "mamo-story");
  const panels = fs.readdirSync(panelRoot).filter(name => /^mamo-story-\d{2}\.png$/.test(name)).sort();

  assert.equal(panels.length, 16);
  assert.deepEqual(panels, Array.from({ length: 16 }, (_, index) => `mamo-story-${String(index + 1).padStart(2, "0")}.png`));

  for (const panel of panels) {
    const image = fs.readFileSync(path.join(panelRoot, panel));
    assert.deepEqual([...image.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], `${panel} has an invalid PNG signature`);
    const width = image.readUInt32BE(16);
    const height = image.readUInt32BE(20);
    if (["mamo-story-04.png", "mamo-story-06.png", "mamo-story-07.png", "mamo-story-08.png", "mamo-story-09.png", "mamo-story-11.png", "mamo-story-15.png"].includes(panel)) {
      assert.ok(width >= 990, `${panel} width ${width} is lower than the high-resolution target`);
      assert.ok(height >= 1490, `${panel} height ${height} is lower than the high-resolution target`);
    } else {
      assert.ok(width >= 240 && width <= 275, `${panel} width ${width} is outside the expected range`);
      assert.ok(height >= 375 && height <= 398, `${panel} height ${height} is outside the expected range`);
    }
  }
});
