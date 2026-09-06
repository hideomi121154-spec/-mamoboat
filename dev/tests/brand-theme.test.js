const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const devRoot = path.resolve(__dirname, "..");
const root = path.resolve(devRoot, "..");

function read(base, file) {
  return fs.readFileSync(path.join(base, file), "utf8");
}

test("root and dev load the red white and blue brand theme", () => {
  for (const base of [root, devRoot]) {
    const html = read(base, "index.html");
    const manifest = JSON.parse(read(base, "manifest.webmanifest"));
    const theme = read(base, "brand-theme.css");

    assert.match(html, /<meta name="theme-color" content="#082b4a">/);
    assert.match(html, /<link rel="stylesheet" href="brand-theme\.css\?v=20260827-2">/);
    assert.equal(manifest.background_color, "#f7f9fc");
    assert.equal(manifest.theme_color, "#082b4a");
    assert.match(theme, /--mamo-red:\s*#dc2029/);
    assert.match(theme, /--mamo-blue:\s*#082b4a/);
    assert.match(theme, /--mamo-white:\s*#ffffff/);
    assert.match(theme, /\.bottom-nav\s*\{[^}]*background:\s*rgba\(8, 43, 74, \.99\)/s);
    assert.match(theme, /\.nav\.active\s*\{[^}]*background:\s*var\(--mamo-red\)/s);
    assert.match(theme, /html body #home \.home-masthead\s*\{[^}]*background:\s*white !important/s);
  }
});

test("MAMO BOAT wordmark has a sports face and red racing slash", () => {
  for (const base of [root, devRoot]) {
    const theme = read(base, "brand-theme.css");
    assert.match(theme, /\.masthead-brand > strong,[\s\S]*font-family:\s*Impact/);
    assert.match(theme, /\.masthead-brand > strong::after,[\s\S]*background:\s*var\(--mamo-red\)/);
    assert.match(theme, /font-style:\s*italic/);
    assert.match(theme, /text-transform:\s*uppercase/);
  }
});

test("app icons and offline shells use the same brand palette", () => {
  const cases = [
    [root, "mamoboat-v401-motion-20"],
    [devRoot, "mamoboat-v418-air-bet-live-stake-56-dev"],
  ];

  for (const [base, cache] of cases) {
    const icon = read(base, "icon.svg");
    const worker = read(base, "sw.js");
    assert.match(icon, /fill="#082b4a"/);
    assert.match(icon, /fill="#dc2029"/);
    assert.match(worker, new RegExp(cache));
    assert.match(worker, /\.\/brand-theme\.css\?v=20260827-2/);
  }
});

test("official boat and grade color selectors are not redefined by the brand layer", () => {
  for (const base of [root, devRoot]) {
    const theme = read(base, "brand-theme.css");
    assert.doesNotMatch(theme, /(?:^|[,{]\s*)\.b[1-6](?:\b|\s|[,{])/m);
    assert.doesNotMatch(theme, /(?:^|[,{]\s*)\.grade(?:\b|\s|[,{])/m);
  }
});

test("late-loaded editorial modules are remapped without extra accent colors", () => {
  for (const base of [root, devRoot]) {
    const theme = read(base, "brand-theme.css");
    assert.match(theme, /#analysisList \.mamo-behavior-card\[data-tone="purple"\][\s\S]*--accent:\s*var\(--mamo-red\) !important/);
    assert.match(theme, /\.gold-editorial-desk \.ged-ring[\s\S]*conic-gradient\(var\(--mamo-red\)/);
    assert.match(theme, /\.mmi-front[\s\S]*border-top-color:\s*var\(--mamo-red\) !important/);
    assert.match(theme, /#analysis \.cast-profile-card\.mamokamo[\s\S]*border-top-color:\s*var\(--mamo-red\) !important/);
    assert.match(theme, /\.rx-summary[\s\S]*border-top-color:\s*var\(--mamo-red\) !important/);
  }
});
