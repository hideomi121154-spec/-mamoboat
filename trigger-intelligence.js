/* MAMO BOAT Trigger Intelligence v1
 * Detects personal behavior triggers from local AIR/decision logs.
 * This does NOT predict race outcomes or recommend wagers.
 */
(() => {
  "use strict";

  const STATE_KEY = "mamoboat_v40_personal";
  const DECISION_KEY = "mamoboat_decision_events_v1";
  const MIN_RECORDS = 5;
  const WINDOW_DAYS = 30;

  const readJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
  };
  const state = () => readJson(STATE_KEY, {});
  const decisionEvents = () => {
    const v = readJson(DECISION_KEY, []);
    return Array.isArray(v) ? v : [];
  };
  const esc = (v) => String(v ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const fmt = (n, d = 0) => Number(n || 0).toLocaleString("ja-JP", { maximumFractionDigits:d, minimumFractionDigits:d });
  const mean = (a) => a.length ? a.reduce((s,v)=>s+v,0)/a.length : 0;
  const cutoff = () => Date.now() - WINDOW_DAYS * 86400000;

  function records30() {
    const records = Array.isArray(state().records) ? state().records : [];
    return records
      .filter((r) => new Date(r.time || 0).getTime() >= cutoff())
      .slice()
      .sort((a,b) => new Date(a.time || 0) - new Date(b.time || 0));
  }

  function events30() {
    return decisionEvents().filter((e) => new Date(e.at || 0).getTime() >= cutoff());
  }

  function level(sample, effect) {
    if (sample < 3) return { label:"蓄積中", rank:0 };
    if (sample < 5) return { label:"参考", rank:1 };
    if (sample < 10 || effect < 1.25) return { label:"仮説", rank:2 };
    return { label:"傾向", rank:3 };
  }

  function pushTrigger(out, { id, title, description, sample = 0, effect = 1, metric = "", positive = false }) {
    const l = level(sample, effect);
    out.push({ id, title, description, sample, effect, metric, positive, level:l.label, rank:l.rank });
  }

  function detectAfterResult(records, out) {
    const missNext = [], hitNext = [], allNext = [];
    for (let i = 1; i < records.length; i += 1) {
      const prev = records[i-1], cur = records[i];
      const stake = Number(cur.stake) || 0;
      const prevStake = Number(prev.stake) || 0;
      if (!stake || !prevStake) continue;
      allNext.push(stake / prevStake);
      if (prev.status === "miss") missNext.push(stake / prevStake);
      if (prev.status === "hit") hitNext.push(stake / prevStake);
    }
    const base = mean(allNext) || 1;
    if (missNext.length) {
      const ratio = mean(missNext);
      pushTrigger(out, {
        id:"after_miss_raise", title:"不的中後の増額",
        description: ratio > base * 1.15
          ? `不的中の次のAIR BETは、通常の次レース変化より大きくなる動きがあります。`
          : `不的中後のAIR BET額は、現時点では通常時と大きな差がありません。`,
        sample:missNext.length, effect:base ? ratio/base : 1,
        metric:`平均 ${fmt((ratio-1)*100,0)}%変化`, positive:false,
      });
    }
    if (hitNext.length) {
      const ratio = mean(hitNext);
      pushTrigger(out, {
        id:"after_hit_raise", title:"B的中後の増額",
        description: ratio > base * 1.15
          ? `B的中の次のAIR BETで、通常より金額が上がりやすい動きがあります。`
          : `B的中後のAIR BET額は、現時点では通常時と大きな差がありません。`,
        sample:hitNext.length, effect:base ? ratio/base : 1,
        metric:`平均 ${fmt((ratio-1)*100,0)}%変化`, positive:false,
      });
    }
  }

  function detectLiveToReal(events, out) {
    const transitions = events.filter((e) => e.name === "real_transition");
    if (!transitions.length) return;
    let withLive = 0;
    transitions.forEach((e) => {
      const seq = Array.isArray(e.payload?.sequence) ? e.payload.sequence : [];
      if (seq.some((a) => a.kind === "live" || /LIVE/.test(a.label || ""))) withLive += 1;
    });
    const rate = withLive / transitions.length;
    pushTrigger(out, {
      id:"live_to_real", title:"LIVE後のREAL移行",
      description: rate >= .5
        ? `REAL投票導線を開いた場面の半数以上で、直前30分にLIVE視聴が入っています。`
        : `REAL移行前にLIVEを見るケースは、現時点では限定的です。`,
      sample:transitions.length, effect:1 + rate,
      metric:`${fmt(rate*100,0)}%がLIVE経由`, positive:false,
    });
  }

  function detectNightReal(events, out) {
    const transitions = events.filter((e) => e.name === "real_transition");
    if (!transitions.length) return;
    const night = transitions.filter((e) => {
      const h = Number(new Intl.DateTimeFormat("en-US", { timeZone:"Asia/Tokyo", hour:"2-digit", hour12:false }).format(new Date(e.at)));
      return h >= 18;
    }).length;
    const rate = night / transitions.length;
    pushTrigger(out, {
      id:"night_real", title:"夜のREAL移行",
      description: rate >= .6
        ? `REAL投票導線を開く行動が18時以降に集中しています。`
        : `REAL移行は特定の時間帯だけに強く偏ってはいません。`,
      sample:transitions.length, effect:1 + rate,
      metric:`18時以降 ${fmt(rate*100,0)}%`, positive:false,
    });
  }

  function detectHundredRun(records, out) {
    let longest = 0, run = 0, total100 = 0;
    records.forEach((r) => {
      if (Number(r.stake) === 100) { run += 1; total100 += 1; longest = Math.max(longest, run); }
      else run = 0;
    });
    if (!records.length) return;
    const rate = total100 / records.length;
    pushTrigger(out, {
      id:"hundred_run", title:"100B連続参加",
      description: longest >= 3
        ? `100Bでの参加が${longest}レース連続した区間があります。用途は断定せず、REAL移行や見送りとの関係を追います。`
        : `100B参加の長い連続は、現時点では確認されていません。`,
      sample:records.length, effect:1 + Math.min(1, longest/5),
      metric:`最長 ${longest}連続 / 全体${fmt(rate*100,0)}%`, positive:false,
    });
  }

  function detectRapidParticipation(records, out) {
    const gaps = [];
    for (let i=1;i<records.length;i+=1) {
      const gap = (new Date(records[i].time||0)-new Date(records[i-1].time||0))/60000;
      if (Number.isFinite(gap) && gap >= 0 && gap <= 180) gaps.push(gap);
    }
    if (!gaps.length) return;
    const fast = gaps.filter((g) => g <= 10).length;
    const rate = fast / gaps.length;
    pushTrigger(out, {
      id:"rapid_participation", title:"短時間の連続参加",
      description: rate >= .5
        ? `AIR BETの間隔が10分以内になる場面が多く、連続参加しやすい時間帯がありそうです。`
        : `AIR BET間隔は、現時点では短時間に強く集中していません。`,
      sample:gaps.length, effect:1 + rate,
      metric:`10分以内 ${fmt(rate*100,0)}%`, positive:false,
    });
  }

  function detectSkipDrop(events, out) {
    const starts = events.filter((e)=>e.name==="race_session_start");
    const skips = events.filter((e)=>e.name==="skip_detected");
    if (starts.length < 3) return;
    const dayKey = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date(iso));
    const today = dayKey(new Date());
    const todayStarts = starts.filter((e)=>dayKey(e.at)===today).length;
    const todaySkips = skips.filter((e)=>dayKey(e.at)===today).length;
    const pastStarts = starts.filter((e)=>dayKey(e.at)!==today).length;
    const pastSkips = skips.filter((e)=>dayKey(e.at)!==today).length;
    if (!todayStarts || !pastStarts) return;
    const todayRate = todaySkips/todayStarts;
    const pastRate = pastSkips/pastStarts;
    const effect = pastRate > 0 ? pastRate/Math.max(todayRate,.01) : 1;
    pushTrigger(out, {
      id:"skip_drop", title:"見送り率の低下",
      description: todayRate + .15 < pastRate
        ? `今日は普段より見送りが少なく、参加側へ寄っています。`
        : `今日の見送り率は、普段から大きく外れていません。`,
      sample:todayStarts, effect,
      metric:`今日 ${fmt(todayRate*100,0)}% / 過去 ${fmt(pastRate*100,0)}%`, positive:false,
    });
  }

  function detect() {
    const records = records30();
    const events = events30();
    const out = [];
    if (records.length >= MIN_RECORDS) {
      detectAfterResult(records, out);
      detectHundredRun(records, out);
      detectRapidParticipation(records, out);
    }
    detectLiveToReal(events, out);
    detectNightReal(events, out);
    detectSkipDrop(events, out);
    return { records, events, triggers:out.sort((a,b)=>b.rank-a.rank || b.effect-a.effect) };
  }

  function render() {
    const host = document.getElementById("mamoBaselinePanel") || document.getElementById("mamoDecisionPanel") || document.getElementById("mamoAiSafeReport") || document.getElementById("analysisList");
    if (!host) return;
    let panel = document.getElementById("mamoTriggerPanel");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "mamoTriggerPanel";
      panel.className = "mamo-trigger-panel";
      host.insertAdjacentElement("afterend", panel);
    }
    const { records, triggers } = detect();
    const strong = triggers.filter((t)=>t.rank>=2 && t.effect>=1.15).slice(0,4);
    const visible = (strong.length ? strong : triggers.slice(0,4));
    const status = records.length < 5 ? "蓄積中" : records.length < 20 ? "仮説形成中" : "個人傾向を比較中";
    panel.innerHTML = `
      <div class="mamo-trigger-head"><div><span>PERSONAL TRIGGER MAP</span><h3>あなたの勝負トリガー</h3></div><small>${esc(status)}</small></div>
      ${visible.length ? `<div class="mamo-trigger-list">${visible.map((t)=>`
        <article data-rank="${t.rank}">
          <div><b>${esc(t.title)}</b><span>${esc(t.level)}</span></div>
          <p>${esc(t.description)}</p>
          <small>${esc(t.metric)} ・ サンプル${t.sample}</small>
        </article>`).join("")}</div>` : `<div class="mamo-trigger-empty">まだトリガーを比較できるデータがありません。AIR BET・見送り・LIVE・REAL移行の記録が増えると自動で候補が出ます。</div>`}
      <div class="mamo-trigger-editorial"><b>加音 守 / NOTE</b><p>${visible.length ? `今は「${esc(visible[0].title)}」を最優先で追っています。これは勝敗予想ではなく、あなた自身の行動条件の比較です。` : `まだ断定しない。まずは、どんな場面で勝負を選ぶかを記録していく。`}</p></div>
      <footer>表示は本人の過去30日データだけを使用します。艇・買い目・賭け金を推奨する機能ではありません。</footer>`;
  }

  function styles() {
    if (document.getElementById("mamoTriggerStyle")) return;
    const s = document.createElement("style");
    s.id = "mamoTriggerStyle";
    s.textContent = `
      .mamo-trigger-panel{margin:14px 0 22px;padding:14px;background:#fff;border-top:5px solid #071b2b;box-shadow:3px 4px 0 rgba(7,27,43,.07)}
      .mamo-trigger-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.mamo-trigger-head span{font-size:9px;font-weight:1000;letter-spacing:.12em;color:var(--teal-dark,#007c78)}.mamo-trigger-head h3{margin:3px 0 10px;font-size:20px}.mamo-trigger-head small{font-weight:900;color:var(--muted,#697a80)}
      .mamo-trigger-list{display:grid;gap:7px}.mamo-trigger-list article{padding:10px;border:1px solid var(--soft-line,#dce6e6);background:#f8faf9}.mamo-trigger-list article[data-rank="3"]{border-left:5px solid var(--teal,#00a8a0)}.mamo-trigger-list article[data-rank="2"]{border-left:5px solid var(--gold,#ffc83d)}.mamo-trigger-list article>div{display:flex;justify-content:space-between;gap:8px}.mamo-trigger-list article b{font-size:12px}.mamo-trigger-list article span{font-size:9px;font-weight:1000;color:var(--teal-dark,#007c78)}.mamo-trigger-list article p{margin:5px 0;font-size:10px;line-height:1.65}.mamo-trigger-list article small{color:var(--muted,#697a80);font-size:9px}.mamo-trigger-empty{padding:12px;background:#f4f8f8;font-size:10px;line-height:1.65}
      .mamo-trigger-editorial{margin-top:10px;padding:10px;background:#fffaf0;border-left:4px solid var(--gold,#ffc83d)}.mamo-trigger-editorial b{font-size:9px}.mamo-trigger-editorial p{margin:4px 0 0;font-size:11px;line-height:1.65}.mamo-trigger-panel footer{margin-top:9px;color:var(--muted,#697a80);font-size:9px;line-height:1.5}`;
    document.head.appendChild(s);
  }

  function boot() {
    styles();
    render();
    // Reading stability: render once at boot; no click/timer repaint.
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
