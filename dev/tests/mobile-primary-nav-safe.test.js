const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const shop = fs.readFileSync(path.join(root, 'mamo-shop.js'), 'utf8');
const legacyNav = fs.readFileSync(path.join(root, 'bottom-nav-horizontal.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

test('SHOP no longer owns bottom-nav geometry or adds a primary SHOP tab', () => {
  assert.doesNotMatch(shop, /\.bottom-nav\s*\{[\s\S]*?display:flex!important/);
  assert.doesNotMatch(shop, /id\s*=\s*["']nav-shop["']/);
  assert.doesNotMatch(shop, /insertBefore\(btn,\s*settingsNav\)/);
});

test('SHOP and settings remain reachable through the secondary menu', () => {
  assert.match(shop, /mamoMoreNav/);
  assert.match(shop, /window\.go\?\.\("shop"\)/);
  assert.match(shop, /window\.go\?\.\("settings"\)/);
  assert.match(shop, /document\.getElementById\("nav-settings"\)\?\.remove\(\)/);
});

test('quant analysis tab is normalized to the existing nav contract', () => {
  assert.match(shop, /document\.getElementById\("nav-quantAnalysis"\)/);
  assert.match(shop, /analysis\.className = "nav"/);
  assert.match(shop, /analysis\.replaceChildren\(icon, label\)/);
});

test('legacy horizontal navigation shim cannot re-enable horizontal scrolling', () => {
  assert.doesNotMatch(legacyNav, /overflow-x\s*:\s*auto/i);
  assert.doesNotMatch(legacyNav, /scrollIntoView/);
  assert.doesNotMatch(legacyNav, /setTimeout/);
});

test('PWA rotates cache and delivers the safe SHOP controller network-first', () => {
  assert.match(sw, /mamoboat-v517-primary-nav-safe-dev/);
  assert.match(sw, /mamo-shop\.js\?v=20260913-1/);
  assert.match(sw, /url\.pathname\.endsWith\("\/mamo-shop\.js"\)/);
  assert.match(sw, /fetch\(event\.request,\{cache:"no-store"\}\)/);
});
