const fs = require('fs');

const js = fs.readFileSync('mamokamo.js', 'utf8');
const cast = fs.readFileSync('cast-ui.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const refresh = fs.readFileSync('sw-refresh.js', 'utf8');
const png = fs.readFileSync('assets/mamokamo-ai-v5.png');

if (!js.includes('assets/mamokamo-ai-v5.png?v=20260822-5')) {
  throw new Error('mamokamo.js must reference the AI analyst v5 PNG asset');
}
if (!refresh.includes('mamokamo.js?v=20260823-4')) {
  throw new Error('sw-refresh.js must load the current Mamokamo script');
}
if (!cast.includes('MAMO BOAT AI分析担当') || !js.includes('MAMOKAMO / AI ANALYST')) {
  throw new Error('Mamokamo must be presented as the AI analysis specialist');
}
if (!cast.includes('card("mamokamo", "mamokamo")') || !cast.includes('data-cast-profile="${key}"')) {
  throw new Error('Mamokamo must use the shared tappable member card and profile modal');
}
if (js.includes('mamokamoProfile') || js.includes('installNewsroomMascot')) {
  throw new Error('Mamokamo must not render a separate persistent newsroom profile');
}
if (!html.includes('cast-ui.js?v=20260827-3')) {
  throw new Error('index.html must load the current shared cast UI');
}
if (!html.includes('AI分析：マモカモ')) {
  throw new Error('The newsroom must visibly name Mamokamo as its AI analyst');
}
if (![0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => png[index] === byte)) {
  throw new Error('Mamokamo asset is not a valid PNG');
}
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
const colorType = png[25];
if (width < 1000 || height < 1000 || width !== height) {
  throw new Error(`Mamokamo asset must be a high-resolution square, got ${width}x${height}`);
}
if (colorType !== 6) {
  throw new Error(`Mamokamo asset must preserve transparent RGBA, got PNG color type ${colorType}`);
}
console.log('mamokamo AI analyst asset test OK');
