const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const devRoot = path.resolve(__dirname, "..");

test("MAMO STORY uses one same-origin JPEG image", () => {
  const source = fs.readFileSync(path.join(devRoot, "mamo-story.js"), "utf8");
  const pilotSource = fs.readFileSync(path.join(devRoot, "pilot-config.js"), "utf8");
  const refreshSource = fs.readFileSync(path.join(devRoot, "sw-refresh.js"), "utf8");

  assert.match(source, /const STORY_IMAGE="\.\/assets\/mamo-story\.jpg\?v=20260822-10"/);
  assert.doesNotMatch(source, /raw\.githubusercontent\.com|mamo-story-image(?:-v9)?\.txt|createObjectURL|atob\(/);
  assert.match(pilotSource, /sw-refresh\.js\?v=20260822-18/);
  assert.match(refreshSource, /mamo-story\.js\?v=20260822-10/);
});

test("MAMO STORY JPEG contains a valid frame header", () => {
  const image = fs.readFileSync(path.join(devRoot, "assets", "mamo-story.jpg"));

  assert.deepEqual([...image.subarray(0, 2)], [0xff, 0xd8]);
  assert.deepEqual([...image.subarray(-2)], [0xff, 0xd9]);

  let offset = 2;
  let dimensions = null;
  while (offset + 3 < image.length) {
    assert.equal(image[offset], 0xff, `invalid JPEG marker at byte ${offset}`);
    const marker = image[offset + 1];
    if (marker === 0xda) break;
    const length = image.readUInt16BE(offset + 2);
    assert.ok(length >= 2 && offset + 2 + length <= image.length, `invalid JPEG segment at byte ${offset}`);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      dimensions = {
        height: image.readUInt16BE(offset + 5),
        width: image.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }

  assert.deepEqual(dimensions, { width: 520, height: 780 });
});
