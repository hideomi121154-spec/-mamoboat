const fs = require('fs');

const js = fs.readFileSync('mamokamo.js', 'utf8');
const svg = fs.readFileSync('assets/mamokamo-card-v4.svg', 'utf8');

if (!js.includes('assets/mamokamo-card-v4.svg?v=20260818-4')) {
  throw new Error('mamokamo.js must reference the compact v4 SVG asset');
}
if (!svg.startsWith('<svg') && !svg.startsWith('<?xml')) {
  throw new Error('Mamokamo asset is not valid SVG text');
}
if (!svg.includes('マモカモ')) {
  throw new Error('Mamokamo SVG title marker missing');
}
if (!svg.includes('viewBox="0 0 290 230"')) {
  throw new Error('Mamokamo compact card aspect ratio changed unexpectedly');
}
console.log('mamokamo compact asset test OK');
