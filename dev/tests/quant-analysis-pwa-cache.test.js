const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'mamo-quant-analysis-shell.js'), 'utf8');

test('quantitative analysis modules are network-first in the service worker', () => {
  assert.match(sw, /mamoboat-v516-quant-analysis-pwa-refresh-dev/);
  assert.match(sw, /\/mamo-quant-analysis-\[\^\/\]\+\\\.js\$\/\.test\(url\.pathname\)/);
  assert.match(sw, /fetch\(event\.request,\{cache:"no-store"\}\)/);
});

test('integrated analysis uses a new cache-busting version', () => {
  assert.match(shell, /mamo-quant-analysis-integrated\.js\?v=20260913-2/);
  assert.doesNotMatch(shell, /mamo-quant-analysis-integrated\.js\?v=20260913-1/);
});
