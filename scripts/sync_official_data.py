#!/usr/bin/env python3
from __future__ import annotations
import argparse, json
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from boatrace_lzh import LzhDownloader, ScheduleParser, PerformanceParser

JST=timezone(timedelta(hours=9))
VENUES=[("01","桐生"),("02","戸田"),("03","江戸川"),("04","平和島"),("05","多摩川"),("06","浜名湖"),("07","蒲郡"),("08","常滑"),("09","津"),("10","三国"),("11","びわこ"),("12","住之江"),("13","尼崎"),("14","鳴門"),("15","丸亀"),("16","児島"),("17","宮島"),("18","徳山"),("19","下関"),("20","若松"),("21","芦屋"),("22","福岡"),("23","唐津"),("24","大村")]

def iso(v):
    if not v: return None
    if getattr(v,'tzinfo',None) is None: v=v.replace(tzinfo=JST)
    return v.isoformat()

def build(target:date, cache:Path):
    # One daily schedule archive + one daily performance archive. No per-race HTML crawling.
    dl=LzhDownloader(cache_dir=cache,max_workers=1,request_delay=0.5)
    sf=dl.download(target,"schedule")
    if not sf: raise RuntimeError(f"番組表取得失敗: {target}")
    sp=ScheduleParser(); sched=sp.parse(sf); close_rows=sp.parse_schedule_with_close_times(sf,target)
    racers={r.racer_number:r for r in sched.racers}
    races={(r.venue_code,r.race_number):r for r in sched.races}
    entries=defaultdict(list)
    for e in sched.entries: entries[(e.venue_code,e.race_number)].append(e)
    closes={(r.venue_code,r.race_number):r.close_time for r in close_rows}

    perf_entries=defaultdict(list); payouts=defaultdict(list); perf_ok=False
    try:
        pf=dl.download(target,"performance")
        if pf:
            pp=PerformanceParser(); perf=pp.parse(pf); perf_ok=True
            for e in perf.entries: perf_entries[(e.venue_code,e.race_number)].append(e)
            for p in perf.payouts: payouts[(p.venue_code,p.race_number)].append(p)
    except Exception as ex:
        print(f"performance pending: {ex}")

    active={c for c,_ in races.keys()}
    payload={"schemaVersion":3,"date":target.isoformat(),"generatedAt":datetime.now(JST).isoformat(),"source":{"type":"official-lzh","schedule":"BOAT RACE 番組表ダウンロード","performance":"BOAT RACE 競走成績ダウンロード","performanceLoaded":perf_ok},"venues":[],"quality":{"warnings":[]}}
    for code,name in VENUES:
        vr=[]
        for n in range(1,13):
            k=(code,n)
            if k not in races: continue
            rr=races[k]
            es=[]
            for e in sorted(entries[k],key=lambda x:x.boat_number):
                r=racers.get(e.racer_number)
                es.append({"boatNumber":e.boat_number,"racerNumber":e.racer_number,"name":getattr(r,"name","") if r else "","class":getattr(r,"racer_class",None) if r else None,"branch":getattr(r,"branch",None) if r else None,"age":getattr(r,"age",None) if r else None,"weight":getattr(r,"weight",None) if r else None,"motorNumber":e.motor_number,"boatPart":e.boat_part})
            if len(es)!=6:
                payload["quality"]["warnings"].append(f"{code}-{n}R entries={len(es)}")
            result=None
            fin=[e for e in perf_entries[k] if e.result_position]
            fin.sort(key=lambda x:(x.result_position,x.boat_number))
            sans=[p for p in payouts[k] if p.ticket_type=="sanrensho"]
            if fin or sans:
                result={"finish":[{"position":e.result_position,"boatNumber":e.boat_number} for e in fin],"sanrensho":[{"combination":p.winning_combination,"payout":p.payout,"popularity":p.popularity} for p in sans]}
            vr.append({"number":n,"name":rr.race_name or "","closeTime":iso(closes.get(k)),"entries":es,"result":result})
        if code in active and len(vr)!=12:
            payload["quality"]["warnings"].append(f"{code} race_count={len(vr)}")
        payload["venues"].append({"code":code,"name":name,"active":code in active,"races":vr,"boatcast":f"https://race.boatcast.jp/?jo={code}"})
    return payload

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--date');ap.add_argument('--output',default='data/today.json');ap.add_argument('--cache-dir',default='.cache/boatrace_lzh');args=ap.parse_args()
    target=date.fromisoformat(args.date) if args.date else datetime.now(JST).date()
    payload=build(target,Path(args.cache_dir));out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True)
    text=json.dumps(payload,ensure_ascii=False,indent=2)
    # Always preserve a date-addressable archive so pending bets can settle after midnight.
    (out.parent/f"{target.isoformat()}.json").write_text(text,encoding='utf-8')
    # Only the current JST date becomes today.json; historical manual runs do not rewind the app.
    if target==datetime.now(JST).date() or out.name!='today.json': out.write_text(text,encoding='utf-8')
    active=sum(v['active'] for v in payload['venues']); races=sum(len(v['races']) for v in payload['venues']); entrants=sum(len(r['entries']) for v in payload['venues'] for r in v['races'])
    print(f"{target}: {active} venues / {races} races / {entrants} entries / warnings={len(payload['quality']['warnings'])}")
if __name__=='__main__': main()
