const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const story = read("dev/mamo-story.js");
const refresh = read("dev/sw-refresh.js");
const app = read("dev/app.js");
const html = read("dev/index.html");
const touchRollback = read("dev/home-deadline-touch-fix.js");

// The story reader must use one fixed compositor layer. A nested fixed CTA can
// leave a stale iOS hit-test layer after its parent is removed.
assert.match(story, /#mamoStoryOverlay\{position:fixed/);
assert.match(story, /\.story-cta\{position:absolute/);
assert.doesNotMatch(story, /\.story-cta\{position:fixed/);

// Closing disables hit testing before removal and clears every legacy class.
assert.match(story, /o\.style\.pointerEvents="none"/);
assert.match(story, /document\.documentElement\.classList\.remove\("mamo-story-session"\)/);
assert.match(story, /document\.body\.classList\.remove\("mamo-story-open","mamo-story-session"\)/);
assert.match(story, /o\.replaceChildren\(\);o\.remove\(\)/);

// pageshow/BFCache recovery must not trust a legacy body class on its own.
assert.match(refresh, /overlay\?\.dataset\.mamoStoryOpen==="true"/);
assert.match(refresh, /clearStaleStoryState\(event\.persisted===true\)/);
assert.match(refresh, /overlay\.style\.pointerEvents="none"/);

// Race rendering tolerates missing venue races and incomplete entries.
assert.match(app, /const venueRaces = Array\.isArray\(venueItem\.races\)/);
assert.match(app, /const entriesList = Array\.isArray\(raceItem\.entries\)/);
assert.match(app, /番組表を取得中です。6艇の公式データが揃うまでAIR BETを停止しています。/);
assert.doesNotMatch(app, /raceItem\.entries\.map\(/);

// All three native race entry points remain wired to the base navigation.
assert.match(html, /id="nav-race"[^>]*onclick="go\('race'\)"/);
assert.match(app, /window\.openVenue = \(code\) => \{[\s\S]*?window\.go\("race"\);[\s\S]*?\n  \};/);
assert.match(app, /window\.jumpRace = \(code, number\) => \{[\s\S]*?window\.go\("race"\);[\s\S]*?\n  \};/);
assert.match(app, /item\.classList\.toggle\("active", item\.id === `nav-\$\{id\}`\)/);

// The emergency global touch/click shim stays removed.
assert.doesNotMatch(touchRollback, /addEventListener\s*\(/);
assert.doesNotMatch(touchRollback, /preventDefault\s*\(/);

console.log("iOS navigation regression checks passed");
