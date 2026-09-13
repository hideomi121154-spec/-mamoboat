from pathlib import Path

sw = Path('dev/sw.js')
text = sw.read_text(encoding='utf-8')
replacements = {
    'const CACHE = "mamoboat-v517-primary-nav-safe-dev";': 'const CACHE = "mamoboat-v518-self-check-phase1-dev";',
    './air-bet-review-compact.css?v=20260912-2': './air-bet-review-compact.css?v=20260914-1',
    './app.js?v=20260910-4': './app.js?v=20260914-1',
    './bet-review-flow.js?v=20260911-4': './bet-review-flow.js?v=20260914-1',
    '"bet-review-flow.js?v=20260911-4"': '"bet-review-flow.js?v=20260914-1"',
    '"air-bet-review-compact.css?v=20260912-2"': '"air-bet-review-compact.css?v=20260914-1"',
    "'<link rel=\"stylesheet\" href=\"air-bet-review-compact.css?v=20260912-2\"></head>'": "'<link rel=\"stylesheet\" href=\"air-bet-review-compact.css?v=20260914-1\"></head>'",
}
for old, new in replacements.items():
    assert old in text, f'missing SW marker: {old}'
    text = text.replace(old, new)

pilot_line = '    html=html.replace(/pilot-config\\.js\\?v=[^\"\']+/g,"pilot-config.js?v=20260910-6");\n'
assert pilot_line in text, 'pilot-config rewrite marker missing'
text = text.replace(
    pilot_line,
    pilot_line + '    html=html.replace(/app\\.js\\?v=[^\"\']+/g,"app.js?v=20260914-1");\n',
    1,
)
sw.write_text(text, encoding='utf-8')

# Keep the existing iOS/PWA regression test aligned with the release asset keys.
test = Path('tests/ios-race-event-loop-regression.test.js')
t = test.read_text(encoding='utf-8')
t = t.replace(
    r'/air-bet-draft-core\.js\?v=20260909-2[\s\S]*pilot-config\.js\?v=20260909-4[\s\S]*app\.js\?v=20260910-4/',
    r'/air-bet-draft-core\.js\?v=20260909-2[\s\S]*pilot-config\.js\?v=20260909-4[\s\S]*app\.js\?v=20260914-1/',
    1,
)
t = t.replace(r'/bet-review-flow\.js\?v=20260911-3/', r'/bet-review-flow\.js\?v=20260914-1/', 1)
t = t.replace(r'/air-bet-review-compact\.css\?v=20260911-13/', r'/air-bet-review-compact\.css\?v=20260914-1/', 1)
t = t.replace(r'/app\.js\?v=20260910-4/', r'/app\.js\?v=20260914-1/', 1)
assert 'app\\.js\\?v=20260914-1' in t
assert 'bet-review-flow\\.js\\?v=20260914-1' in t
assert 'air-bet-review-compact\\.css\\?v=20260914-1' in t
test.write_text(t, encoding='utf-8')
