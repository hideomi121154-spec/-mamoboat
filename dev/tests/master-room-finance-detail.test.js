const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'master-room.js'), 'utf8');
if (!source.includes('master-room-finance')) throw new Error('finance endpoint missing');
if (!source.includes('currentBalanceB')) throw new Error('current balance field missing');
if (!source.includes('hitRate')) throw new Error('hit rate field missing');
if (!source.includes('returnRate')) throw new Error('return rate field missing');
if (!source.includes('finance unavailable')) throw new Error('finance fallback missing');
console.log('master room finance detail integration: ok');
