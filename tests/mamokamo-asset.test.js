const fs = require('fs');

const js = fs.readFileSync('mamokamo.js', 'utf8');
const svg = fs.readFileSync('assets/mamokamo-v3.svg', 'utf8');

if (!js.includes('assets/mamokamo-v3.svg?v=20260818-3')) {
  throw new Error('mamokamo.js must reference the cache-safe SVG asset');
}
if (!svg.startsWith('<svg') && !svg.startsWith('<?xml')) {
  throw new Error('Mamokamo asset is not valid SVG text');
}
if (!svg.includes('MAMOKAMO')) {
  throw new Error('Mamokamo SVG branding marker missing');
}
console.log('mamokamo asset test OK');
