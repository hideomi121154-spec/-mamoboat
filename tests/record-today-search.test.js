// npm install --prefix /tmp/mamo-record-dom-tests --no-save jsdom@26.1.0
// NODE_PATH=/tmp/mamo-record-dom-tests/node_modules node tests/record-today-search.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, 'dev', name), 'utf8');
const dom = new JSDOM(source('index.html'), {url:'https://mamoboat.com/dev/', runScripts:'outside-only'});
const w = dom.window, d = w.document;
w.Date.now = () => Date.parse('2026-09-09T10:57:00+09:00');
const record = (id, time, venue, extra={}) => ({id, time, venue, raceNo:1, stake:100, status:'pending', lines:[{betType:'trifecta', mode:'normal', combo:[1,2,3], stake:100}], ...extra});
const rows = [
  record('today1','2026-09-09T03:37:00+09:00','芦屋'),
  record('today2','2026-09-09T03:07:00+09:00','芦屋', {raceDate:'2026-09-08'}),
  record('past1','2026-09-08T12:10:00+09:00','津', {settled:true,status:'miss',raceNo:4}),
  record('past2','2026-09-07T16:55:00+09:00','福岡'),
  record('future','2026-09-10T03:00:00+09:00','津'),
];
w.localStorage.setItem('mamoboat_v40_personal', JSON.stringify({records:rows,balance:75920}));
let opened;
w.MAMO_RACE_CARTE = {open(index){opened=index;}};
w.eval(source('air-outcome-experience.js'));
d.dispatchEvent(new w.Event('DOMContentLoaded'));
const view = w.MAMO_AIR_OUTCOME_VIEW;
assert.equal(d.querySelectorAll('.rx-latest .rx-card').length,2);
assert.match(d.querySelector('.rx-today-summary').textContent,/本日 2件/);
assert.doesNotMatch(d.querySelector('.rx-latest').textContent,/津|福岡/);
assert.equal(d.querySelector('.result-search-panel'), null, 'official search removed in HTML, not by late fix');
assert.equal(view.recordDate({placedAt:'2026-09-08T15:00:00Z',createdAt:'2026-09-07'}),'2026-09-09');
assert.equal(view.recordDate({placedAt:'2026-09-08T14:59:59Z',time:'2026-09-09'}),'2026-09-08');
assert.equal(view.recordDate({placedAt:'bad',createdAt:'2026/09/09 03:07',time:'2026-09-08'}),'2026-09-09');
assert.equal(view.recordDate({betAt:'2026-09-09',submittedAt:'2026-09-08',raceDate:'2026-09-07'}),'2026-09-09');
assert.equal(view.recordDate({submittedAt:'2026-09-09',raceDate:'2026-09-07'}),'2026-09-09');
assert.equal(view.recordDate({raceDate:'2026-09-07'}),'2026-09-07');
const card=d.querySelector('.rx-latest .rx-card');
for(let i=0;i<20;i++){
  d.getElementById('records').classList.toggle('active');
  view.refresh();
  w.dispatchEvent(new w.PageTransitionEvent('pageshow'));
  assert.equal(d.querySelector('.rx-latest .rx-card'),card,'unchanged navigation must preserve DOM');
}
function search(date,venue){
  d.getElementById('rxPastDate').value=date;
  d.getElementById('rxPastVenue').value=venue;
  d.getElementById('rxPastForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  return d.querySelectorAll('.rx-past-row');
}
assert.equal(search('2026-09-08','').length,1);
assert.equal(search('','津').length,1,'future records excluded');
assert.equal(search('2026-09-07','津').length,0);
assert.equal(search('2026-09-07','福岡').length,1);
const past=d.querySelector('.rx-past-row');
assert.equal(past.querySelector('.rx-card'),null,'compact until expanded');
past.open=true;
past.dispatchEvent(new w.Event('toggle'));
assert.match(past.querySelector('.rx-card').textContent,/福岡/);
past.querySelector('[data-rx-carte]').click();
assert.equal(rows.slice().sort((a,b)=>b.time.localeCompare(a.time))[opened].id,'past2');
d.querySelector('[data-rx-past-clear]').click();
assert.equal(d.querySelectorAll('.rx-past-row').length,0);
// Old cached loader remains harmless, even when it arrives after the owner.
w.eval(source('record-today-search.js'));
w.eval(source('remove-official-result-search.js'));
assert.equal(d.querySelector('.rx-latest .rx-card'),card);
assert.ok(d.getElementById('rxPastRecordSearch'));
assert.equal(JSON.parse(w.localStorage.getItem('mamoboat_v40_personal')).records.length,rows.length);
assert.doesNotMatch(source('record-today-search.js'),/setTimeout|addEventListener|innerHTML/);
assert.doesNotMatch(source('air-outcome-experience.js'),/MutationObserver|setInterval|setTimeout|scrollTo|scrollBy|visualViewport|requestAnimationFrame/);
const appBody=source('app.js').split('  function renderRecords() {')[1].split('\n  function ')[0];
assert.match(appBody,/MAMO_AIR_OUTCOME_VIEW/);
assert.doesNotMatch(appBody,/innerHTML|recordCard/);
setTimeout(()=>{
  view.refresh();
  assert.equal(d.querySelector('.rx-latest .rx-card'),card,'no return to all records after 5 seconds');
  dom.window.close();
  console.log('today/past record DOM integration tests passed (20 cycles, 5 seconds)');
},5100);
