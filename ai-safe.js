/* MAMO BOAT AI SAFE v2 — passive logging + daily/weekly/monthly behavior summaries */
(() => {
  "use strict";

  const STATE_KEY = "mamoboat_v40_personal";
  const EVENT_KEY = "mamoboat_ai_safe_events";
  const SESSION = window.crypto?.randomUUID?.() || `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const MAX_EVENTS = 5000;
  const PC_REAL = "https://ib.mbrace.or.jp/";
  const SP_REAL = "https://spweb.brtb.jp/";
  let visibleFrom = document.hidden ? null : Date.now();

  const readJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
  };
  const state = () => readJson(STATE_KEY, {});
  const allEvents = () => {
    const v = readJson(EVENT_KEY, []);
    return Array.isArray(v) ? v : [];
  };
  const saveEvents = (list) => {
    try { localStorage.setItem(EVENT_KEY, JSON.stringify(list.slice(-MAX_EVENTS))); } catch (_) {}
  };
  const esc = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const fmt = (v, d=0) => Number(v || 0).toLocaleString("ja-JP", { maximumFractionDigits:d, minimumFractionDigits:d });
  const mean = (a) => a.length ? a.reduce((s,v)=>s+v,0)/a.length : 0;
  const sd = (a) => {
    if (a.length < 2) return 0;
    const m = mean(a);
    return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/a.length);
  };
  const dateKey = (value = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit" }).formatToParts(new Date(value));
    const p = Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  };
  const context = () => {
    const s = state();
    return {
      screen: document.querySelector(".screen.active")?.id || "unknown",
      venueCode: s.venue || null,
      raceNo: Number(s.raceNo) || null,
      raceDate: dateKey(),
    };
  };
  const log = (name, payload={}) => {
    const c = context();
    const list = allEvents();
    list.push({ id: window.crypto?.randomUUID?.() || `e-${Date.now()}-${Math.random()}`, session:SESSION, at:new Date().toISOString(), name, ...c, payload });
    saveEvents(list);
  };
  const sameRace = (a,b) => a && b && String(a.raceDate||"")===String(b.raceDate||"") && String(a.venueCode||"")===String(b.venueCode||"") && Number(a.raceNo)===Number(b.raceNo);
  const labelEvent = (name) => ({ race_view:"レース閲覧", odds_open:"オッズ", racer_open:"選手情報", live_open:"LIVE", air_detected:"AIR BET", real_open:"REAL導線", result_open:"結果" }[name] || name);

  function recordVisible(reason) {
    if (!visibleFrom) return;
    const seconds = Math.round((Date.now()-visibleFrom)/1000);
    if (seconds >= 2) log("active_seconds", { seconds, reason });
    visibleFrom = null;
  }

  function detectLatestAir() {
    const records = Array.isArray(state().records) ? state().records : [];
    const r = records[records.length-1];
    if (!r?.id) return;
    const marker = `air:${r.id}`;
    if (allEvents().some(e=>e.payload?.marker===marker)) return;
    log("air_detected", { marker, recordId:r.id, stake:Number(r.stake)||0, lineCount:Array.isArray(r.lines)?r.lines.length:0, mode:r.betMode||null });
  }

  function classifyLink(a) {
    const text = (a.textContent||"").trim();
    const href = a.href || "";
    if (a.dataset.mamoAction === "live") return "live_open";
    if (a.dataset.mamoAction === "real") return "real_open";
    if (/race\.boatcast\.jp/.test(href) || /LIVE|映像/.test(text)) return "live_open";
    if (/オッズ/.test(text)) return "odds_open";
    if (/結果/.test(text)) return "result_open";
    if (/選手|レーサー/.test(text)) return "racer_open";
    return null;
  }

  function ensureDecisionButtons() {
    const raceView = document.getElementById("raceView");
    if (!raceView || !document.getElementById("race")?.classList.contains("active")) return;
    if (raceView.querySelector(".mamo-ai-actions")) return;
    const anchorPoint = raceView.querySelector(".officialmenu") || raceView.firstElementChild;
    if (!anchorPoint) return;
    const liveExisting = [...raceView.querySelectorAll("a")].find(a=>/race\.boatcast\.jp/.test(a.href||"") || /映像|LIVE/.test(a.textContent||""));
    const liveUrl = liveExisting?.href || "https://race.boatcast.jp/";
    const realUrl = matchMedia("(max-width:744px)").matches ? SP_REAL : PC_REAL;
    const box = document.createElement("div");
    box.className = "mamo-ai-actions";
    box.innerHTML = `<a data-mamo-action="live" href="${esc(liveUrl)}" target="_blank" rel="noopener noreferrer">▶ LIVE</a><a class="real" data-mamo-action="real" href="${esc(realUrl)}" target="_blank" rel="noopener noreferrer">REAL投票 ↗</a><small>LIVEとREALは別々に記録。REALは公式投票サイトを開いた事実のみで、購入完了とは扱いません。</small>`;
    anchorPoint.insertAdjacentElement("afterend", box);
  }

  function daysAgoCutoff(days) {
    return Date.now() - days*24*60*60*1000;
  }

  function rangeStats(days) {
    const cutoff = daysAgoCutoff(days);
    const s = state();
    const records = (Array.isArray(s.records)?s.records:[]).filter(r=>new Date(r.time||0).getTime()>=cutoff);
    const events = allEvents().filter(e=>new Date(e.at||0).getTime()>=cutoff);
    const stakes = records.map(r=>Number(r.stake)||0).filter(v=>v>0);
    const totalStake = stakes.reduce((sum,v)=>sum+v,0);
    const real = events.filter(e=>e.name==="real_open");
    const live = events.filter(e=>e.name==="live_open");
    const airRace = (r,e) => sameRace({ raceDate:r.raceDate||dateKey(r.time), venueCode:r.venueCode, raceNo:r.raceNo }, e);
    const airToReal = real.filter(e=>records.some(r=>airRace(r,e) && new Date(r.time)<=new Date(e.at))).length;
    const liveToReal = real.filter(e=>live.some(l=>sameRace(l,e) && new Date(l.at)<=new Date(e.at) && new Date(e.at)-new Date(l.at)<=30*60*1000)).length;
    const activeSeconds = events.filter(e=>e.name==="active_seconds").reduce((sum,e)=>sum+(Number(e.payload?.seconds)||0),0);
    const bands = { 朝:0, 昼:0, 夕方:0, 夜:0 };
    records.forEach(r=>{
      const h = Number(new Intl.DateTimeFormat("en-US", { timeZone:"Asia/Tokyo", hour:"2-digit", hour12:false }).format(new Date(r.time||Date.now())));
      const b = h<11?"朝":h<15?"昼":h<18?"夕方":"夜";
      bands[b] += 1;
    });
    const topBand = Object.entries(bands).sort((a,b)=>b[1]-a[1])[0];
    const seqCounts = {};
    real.forEach(re=>{
      const t = new Date(re.at).getTime();
      events.filter(e=>sameRace(e,re) && e.name!=="real_open" && new Date(e.at).getTime()<=t && t-new Date(e.at).getTime()<=30*60*1000).slice(-5).forEach(e=>{ seqCounts[labelEvent(e.name)] = (seqCounts[labelEvent(e.name)]||0)+1; });
    });
    const topBeforeReal = Object.entries(seqCounts).sort((a,b)=>b[1]-a[1])[0] || null;
    return {
      days, records, events, stakes, totalStake,
      average:mean(stakes), max:stakes.length?Math.max(...stakes):0, min:stakes.length?Math.min(...stakes):0, deviation:sd(stakes),
      hundredRate:stakes.length?stakes.filter(v=>v===100).length/stakes.length:0,
      real:real.length, live:live.length, airToReal, liveToReal, activeSeconds,
      topBand: topBand?.[1] ? topBand : null, topBeforeReal,
    };
  }

  function narrative(x) {
    if (!x.records.length && !x.real && !x.live) return "まだ判断できる行動データがありません。使うほど、あなた自身の比較材料が増えます。";
    const lines = [];
    if (x.stakes.length) lines.push(`AIR BET総額は${fmt(x.totalStake)}B、${x.records.length}回、1回平均${fmt(x.average)}Bです。`);
    if (x.stakes.length >= 3) {
      if (x.deviation <= Math.max(100, x.average*0.25)) lines.push(`現時点ではBET額の金額差は小さめです。`);
      else lines.push(`${fmt(x.min)}〜${fmt(x.max)}Bとレースごとに強弱が出ています。`);
      if (x.hundredRate >= .5) lines.push(`100B参加が${fmt(x.hundredRate*100,0)}%を占めています。暇つぶしかどうかは断定せず、今後REAL移行との関係を比較します。`);
    }
    if (x.real) lines.push(`REAL投票導線は${x.real}回。そのうちAIR後が${x.airToReal}回、LIVE後30分以内が${x.liveToReal}回です。`);
    if (x.topBeforeReal) lines.push(`REAL移行前では「${x.topBeforeReal[0]}」が最も多く記録されています。`);
    if (x.topBand) lines.push(`AIR BETが最も多い時間帯は${x.topBand[0]}です。`);
    return lines.join(" ") || "データは記録中です。もう少し利用すると比較できる項目が増えます。";
  }

  function renderReport() {
    const analysis = document.getElementById("analysis");
    if (!analysis) return;
    let panel = document.getElementById("mamoAiSafeReport");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "mamoAiSafeReport";
      panel.className = "mamo-ai-report";
      const list = document.getElementById("analysisList");
      if (!list) return;
      list.insertAdjacentElement("afterend", panel);
    }
    const today = rangeStats(1), week = rangeStats(7), month = rangeStats(30);
    const card = (label,x) => `<article>
      <header><span>${label}</span><b>${x.records.length} AIR / ${x.real} REAL導線</b></header>
      <div class="metrics primary">
        <i><small>AIR BET総額</small><strong>${x.stakes.length?fmt(x.totalStake)+"B":"—"}</strong></i>
        <i><small>AIR BET回数</small><strong>${x.records.length}回</strong></i>
        <i><small>平均AIR</small><strong>${x.stakes.length?fmt(x.average)+"B":"—"}</strong></i>
        <i><small>最大AIR</small><strong>${x.stakes.length?fmt(x.max)+"B":"—"}</strong></i>
      </div>
      <div class="metrics secondary">
        <i><small>100B率</small><strong>${x.stakes.length?fmt(x.hundredRate*100,0)+"%":"—"}</strong></i>
        <i><small>LIVE</small><strong>${x.live}回</strong></i>
        <i><small>鑑賞</small><strong>${Math.round(x.activeSeconds/60)}分</strong></i>
        <i><small>REAL導線</small><strong>${x.real}回</strong></i>
      </div>
      <p>${esc(narrative(x))}</p>
    </article>`;
    panel.innerHTML = `<div class="title"><div><span>MAMO AI / PHASE 2</span><h3>行動レポート</h3></div><small>事実 → 比較 → 傾向</small></div>${card("今日",today)}${card("7日",week)}${card("30日",month)}<footer>艇の勝敗予想ではなく、MAMO BOAT内で確認できた操作とAIR BET記録だけを分析しています。</footer>`;
  }

  function styles() {
    if (document.getElementById("mamoAiSafeStyle")) return;
    const st = document.createElement("style");
    st.id = "mamoAiSafeStyle";
    st.textContent = `.mamo-ai-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0;padding:10px;background:#f4f8f8;border:1px solid #dce6e6}.mamo-ai-actions a{display:flex;min-height:46px;align-items:center;justify-content:center;text-decoration:none;font-weight:1000;border:2px solid var(--teal);color:var(--navy);background:#fff}.mamo-ai-actions a.real{background:var(--navy);color:#fff;border-color:var(--navy)}.mamo-ai-actions small{grid-column:1/-1;color:var(--muted);font-size:9px;line-height:1.5}.mamo-ai-report{margin:14px 0 22px;padding:14px;background:#fff;border-top:5px solid var(--teal);box-shadow:3px 4px 0 rgba(7,27,43,.07)}.mamo-ai-report .title{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}.mamo-ai-report .title span{font-size:9px;font-weight:1000;color:var(--teal-dark);letter-spacing:.12em}.mamo-ai-report .title h3{margin:3px 0;font-size:20px}.mamo-ai-report .title small{color:var(--muted);font-weight:900}.mamo-ai-report article{padding:11px 0;border-top:1px solid var(--soft-line)}.mamo-ai-report article header{display:flex;justify-content:space-between;gap:8px}.mamo-ai-report article header span{font-weight:1000}.mamo-ai-report article header b{font-size:11px;color:var(--teal-dark)}.mamo-ai-report .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0}.mamo-ai-report .metrics i{font-style:normal;background:#f4f8f8;padding:7px}.mamo-ai-report .metrics.primary i:first-child{background:#eef8f6;border-left:4px solid var(--teal)}.mamo-ai-report .metrics small{display:block;font-size:8px;color:var(--muted);font-weight:900}.mamo-ai-report .metrics strong{display:block;margin-top:2px;font-size:14px}.mamo-ai-report .metrics.primary strong{font-size:16px}.mamo-ai-report .metrics.secondary{margin-top:6px}.mamo-ai-report .metrics.secondary i{background:#fafbfb}.mamo-ai-report article p{margin:8px 0 0;font-size:11px;line-height:1.7}.mamo-ai-report footer{margin-top:8px;color:var(--muted);font-size:9px;line-height:1.5}@media(max-width:500px){.mamo-ai-report .metrics{grid-template-columns:repeat(2,1fr)}}`;
    document.head.appendChild(st);
  }

  document.addEventListener("click", (ev) => {
    const a = ev.target.closest?.("a");
    if (a) {
      const kind = classifyLink(a);
      if (kind) log(kind, { host:(()=>{try{return new URL(a.href).host}catch(_){return""}})() });
    }
    setTimeout(() => {
      detectLatestAir();
      ensureDecisionButtons();
      if (document.getElementById("analysis")?.classList.contains("active")) renderReport();
    }, 60);
  }, false);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) recordVisible("hidden");
    else { visibleFrom=Date.now(); log("return",{}); setTimeout(()=>{ensureDecisionButtons();renderReport();},60); }
  });
  window.addEventListener("pagehide", ()=>recordVisible("pagehide"));

  function boot() {
    styles();
    log("ai_safe_loaded", { version:2 });
    detectLatestAir();
    ensureDecisionButtons();
    renderReport();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true }); else boot();
})();