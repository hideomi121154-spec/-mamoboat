(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.MamoCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  "use strict";
  function normalizeCombo(s){
    const m=String(s||"").match(/([1-6])\D*([1-6])\D*([1-6])/);
    return m?`${m[1]}-${m[2]}-${m[3]}`:"";
  }
  function payoutList(result){
    const s=result&&result.sanrensho;
    if(!s)return [];
    return Array.isArray(s)?s:[s];
  }
  function findRace(dataset,venueCode,raceNo){
    const v=dataset&&dataset.venues&&dataset.venues.find(x=>x.code===venueCode);
    return v&&v.races&&v.races.find(r=>Number(r.number)===Number(raceNo));
  }
  function settleRecord(rec,dataset){
    if(!rec||rec.settled||!dataset||rec.raceDate!==dataset.date)return {changed:false,payoutAdded:0};
    const rr=findRace(dataset,rec.venueCode,rec.raceNo);
    const pays=payoutList(rr&&rr.result);
    if(!rr||!rr.result||!pays.length)return {changed:false,payoutAdded:0};
    const wins=pays.map(p=>({combo:normalizeCombo(p.combination),payout:Number(p.payout)||0,popularity:p.popularity??null})).filter(x=>x.combo&&x.payout>0);
    if(!wins.length)return {changed:false,payoutAdded:0};
    let payoutC=0, hit=false;
    for(const line of (rec.lines||[])){
      const mine=(line.combo||[]).join('-');
      for(const w of wins){
        if(mine===w.combo){hit=true;payoutC+=(Number(line.stake)||0)/100*w.payout;}
      }
    }
    rec.resultPayouts=wins;
    rec.resultCombo=wins.map(x=>x.combo).join(' / ');
    rec.resultPayout=wins.length===1?wins[0].payout:null;
    rec.status=hit?'hit':'miss';
    rec.payoutC=payoutC;
    rec.settled=true;
    rec.settledAt=new Date().toISOString();
    return {changed:true,payoutAdded:payoutC,hit};
  }
  function jstDate(now=new Date()){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    const g=t=>parts.find(p=>p.type===t).value;
    return `${g('year')}-${g('month')}-${g('day')}`;
  }
  return {normalizeCombo,payoutList,findRace,settleRecord,jstDate};
});
