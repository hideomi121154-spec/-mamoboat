/* MAMO BOAT AI Phase 1 — behavior logging and REAL/LIVE decision analysis */
(() => {
  "use strict";

  const EVENT_KEY = "mamoboat_ai_phase1_events";
  const STATE_KEY = "mamoboat_v40_personal";
  const MAX_EVENTS = 10000;
  const SESSION_ID = (window.crypto?.randomUUID?.() || `s-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const TELEBOAT_PC = "https://ib.mbrace.or.jp/";
  const TELEBOAT_SP = "https://spweb.brtb.jp/";
  let activeStartedAt = document.hidden ? null : Date.now();
  let lastContextKey = "";

  function safeJson(value, fallback) {
    try { return JSON.parse(value); } catch (_) { return fallback; }
  }

  function appState() {
    return safeJson(localStorage.getItem(STATE_KEY), {}) || {};
  }

  function events() {
    const list = safeJson(localStorage.getItem(EVENT_KEY), []);
    return Array.isArray(list) ? list : [];
  }

  function saveEvents(list) {
    localStorage.setItem(EVENT_KEY, JSON.stringify(list.slice(-MAX_EVENTS)));
  }

  function jstDate(value = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(value instanceof Date ? value : new Date(value));
    const p = Object.fromEntries(parts.map((item) => [item.type, item.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }

  function context() {
    const s = appState();
    const activeScreen = document.querySelector(".screen.active")?.id || document.body.dataset.screen || "unknown";
    return {
      screen: activeScreen,
      raceDate: jstDate(),
      venueCode: s.venue || null,
      raceNo: Number(s.raceNo) || null,
    };
  }

  function log(name, payload = {}) {
    const ctx = context();
    const list = events();
    list.push({
      id: window.crypto?.randomUUID?.() || `e-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sessionId: SESSION_ID,
      at: new Date().toISOString(),
      name,
      screen: ctx.screen,
      raceDate: ctx.raceDate,
      venueCode: ctx.venueCode,
      raceNo: ctx.raceNo,
      payload,
    });
    saveEvents(list);
    if (ctx.screen === "analysis") window.setTimeout(renderInsightPanel, 0);
  }

  function recordActiveTime(reason) {
    if (!activeStartedAt) return;
    const seconds = Math.max(0, Math.round((Date.now() - activeStartedAt) / 1000));
    if (seconds >= 2) log("app_active_time", { seconds, reason });
    activeStartedAt = null;
  }

  function fmt(value, digits = 0) {
    const n = Number(value) || 0;
    return n.toLocaleString("ja-JP", { maximumFractionDigits: digits, minimumFractionDigits: digits });
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }

  function mean(values) {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  function stddev(values) {
    if (values.length < 2) return 0;
    const m = mean(values);
    return Math.sqrt(values.reduce((sum, x) => sum + ((x - m) ** 2), 0) / values.length);
  }

  function hourJst(iso) {
    return Number(new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo", hour: "2-digit", hour12: false,
    }).format(new Date(iso)));
  }

  function timeBand(hour) {
    if (hour < 11) return "朝";
    if (hour < 15) return "昼";
    if (hour < 18) return "夕方";
    return "夜";
  }

  function sameRace(a, b) {
    return a && b
      && String(a.raceDate || "") === String(b.raceDate || "")
      && String(a.venueCode || "") === String(b.venueCode || "")
      && Number(a.raceNo) === Number(b.raceNo);
  }

  function latestAirBefore(realEvent, records) {
    const t = new Date(realEvent.at).getTime();
    return records
      .filter((r) => sameRace(realEvent, {
        raceDate: r.raceDate || jstDate(r.time), venueCode: r.venueCode, raceNo: r.raceNo,
      }) && new Date(r.time || 0).getTime() <= t)
      .sort((a, b) => new Date(b.time) - new Date(a.time))[0] || null;
  }

  function recentSequence(realEvent, list) {
    const t = new Date(realEvent.at).getTime();
    const allowed = new Set([
      "race_view", "odds_open", "racer_profile_open", "result_open", "live_open",
      "air_review", "air_bet_detected", "real_bet_open",
    ]);
    return list
      .filter((e) => allowed.has(e.name) && new Date(e.at).getTime() <= t && t - new Date(e.at).getTime() <= 30 * 60 * 1000)
      .slice(-6)
      .map((e) => ({
        raceDate: e.raceDate, venueCode: e.venueCode, raceNo: e.raceNo, name: e.name,
      }))
      .filter((e) => sameRace(e, realEvent))
      .map((e) => ({
        race_view: "レース閲覧", odds_open: "オッズ", racer_profile_open: "選手情報",
        result_open: "結果", live_open: "LIVE", air_review: "AIR確認",
        air_bet_detected: "AIR BET", real_bet_open: "REAL導線",
      }[e.name] || e.name));
  }

  function stats() {
    const s = appState();
    const records = Array.isArray(s.records) ? s.records : [];
    const list = events();
    const stakes = records.map((r) => Number(r.stake) || 0).filter((n) => n > 0);
    const minStake = stakes.length ? Math.min(...stakes) : 0;
    const fixedMin = minStake ? stakes.filter((n) => n === minStake).length : 0;
    const hundred = stakes.filter((n) => n === 100).length;
    const lineCounts = records.map((r) => Array.isArray(r.lines) ? r.lines.length : 0);
    const modes = {};
    const types = {};
    const bands = {};
    records.forEach((r) => {
      modes[r.betMode || "不明"] = (modes[r.betMode || "不明"] || 0) + 1;
      (r.lines || []).forEach((line) => {
        const type = line.betType || "不明";
        types[type] = (types[type] || 0) + 1;
      });
      const band = timeBand(hourJst(r.time || new Date()));
      bands[band] = (bands[band] || 0) + 1;
    });

    const real = list.filter((e) => e.name === "real_bet_open");
    const live = list.filter((e) => e.name === "live_open");
    const airToReal = real.filter((e) => latestAirBefore(e, records)).length;
    const realWithoutAir = real.length - airToReal;
    const liveToReal = real.filter((r) => live.some((l) => sameRace(l, r)
      && new Date(l.at) <= new Date(r.at)
      && new Date(r.at) - new Date(l.at) <= 30 * 60 * 1000)).length;
    const activeSeconds = list.filter((e) => e.name === "app_active_time")
      .reduce((sum, e) => sum + (Number(e.payload?.seconds) || 0), 0)
      + (activeStartedAt ? Math.max(0, Math.round((Date.now() - activeStartedAt) / 1000)) : 0);

    const realSequences = real.slice(-5).map((e) => recentSequence(e, list));
    const commonPreReal = {};
    realSequences.flat().forEach((label) => {
      if (label === "REAL導線") return;
      commonPreReal[label] = (commonPreReal[label] || 0) + 1;
    });
    const topPreReal = Object.entries(commonPreReal).sort((a, b) => b[1] - a[1])[0] || null;

    const settled = records.filter((r) => r.settled);
    let afterMissUp = 0;
    let afterHitUp = 0;
    const ordered = records.slice().filter((r) => r.time).sort((a, b) => new Date(a.time) - new Date(b.time));
    for (let i = 1; i < ordered.length; i += 1) {
      const prev = ordered[i - 1];
      const cur = ordered[i];
      if ((Number(cur.stake) || 0) > (Number(prev.stake) || 0)) {
        if (prev.status === "miss") afterMissUp += 1;
        if (prev.status === "hit") afterHitUp += 1;
      }
    }

    return {
      records, list, stakes, settled,
      average: mean(stakes), min: minStake, max: stakes.length ? Math.max(...stakes) : 0,
      deviation: stddev(stakes), fixedMinRate: stakes.length ? fixedMin / stakes.length : 0,
      hundredRate: stakes.length ? hundred / stakes.length : 0,
      averageLines: mean(lineCounts), modes, types, bands,
      realCount: real.length, liveCount: live.length, airToReal, realWithoutAir, liveToReal,
      activeSeconds, topPreReal, realSequences, afterMissUp, afterHitUp,
    };
  }

  function topEntry(map, labels = {}) {
    const item = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
    return item ? `${labels[item[0]] || item[0]} ${item[1]}回` : "まだデータなし";
  }

  function renderInsightPanel() {
    const analysisList = document.getElementById("analysisList");
    if (!analysisList) return;
    let panel = document.getElementById("aiPhase1Panel");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "aiPhase1Panel";
      panel.className = "ai-phase1-panel";
      analysisList.insertAdjacentElement("afterend", panel);
    }
    const x = stats();
    const enough = x.records.length >= 5;
    const modeLabels = { normal: "通常", box: "BOX", form: "フォーメーション" };
    const typeLabels = {
      trifecta: "3連単", trio: "3連複", exacta: "2連単", quinella: "2連複",
      wide: "拡連複", win: "単勝", place: "複勝",
    };
    const minutes = Math.round(x.activeSeconds / 60);
    const preRealText = x.topPreReal
      ? `REAL導線の前では「${x.topPreReal[0]}」の操作が直近サンプルで最も多く記録されています。`
      : "REAL導線前の操作パターンは、これから記録します。";
    const stakeText = !x.records.length
      ? "AIR BETの記録が増えると、通常額・ばらつき・最低額固定率を比較します。"
      : x.deviation < Math.max(100, x.average * 0.25)
        ? "現在はBET額の差が比較的小さめです。用途は断定せず、今後の変化を追います。"
        : "レースごとのBET額に強弱が出ています。どんな場面で大きくなるかを継続比較します。";

    panel.innerHTML = `
      <div class="ai-phase1-head"><div><span>AI BEHAVIOR LAB / PHASE 1</span><h3>勝負の選び方を、行動から読む</h3></div><small>${enough ? "個人傾向を比較中" : "データ蓄積中"}</small></div>
      <div class="ai-phase1-grid">
        <div><span>1R平均AIR BET</span><b>${x.records.length ? `${fmt(x.average)}B` : "—"}</b></div>
        <div><span>最高 / 最低</span><b>${x.records.length ? `${fmt(x.max)} / ${fmt(x.min)}B` : "—"}</b></div>
        <div><span>BET額のばらつき</span><b>${x.records.length ? `σ ${fmt(x.deviation)}` : "—"}</b></div>
        <div><span>最低額固定率</span><b>${x.records.length ? `${fmt(x.fixedMinRate * 100, 1)}%` : "—"}</b></div>
        <div><span>100B固定率</span><b>${x.records.length ? `${fmt(x.hundredRate * 100, 1)}%` : "—"}</b></div>
        <div><span>平均買い目数</span><b>${x.records.length ? `${fmt(x.averageLines, 1)}点` : "—"}</b></div>
        <div><span>LIVEを開いた</span><b>${fmt(x.liveCount)}回</b></div>
        <div><span>REAL投票導線</span><b>${fmt(x.realCount)}回</b></div>
        <div><span>AIR → REAL</span><b>${fmt(x.airToReal)}回</b></div>
        <div><span>AIRなし → REAL</span><b>${fmt(x.realWithoutAir)}回</b></div>
        <div><span>LIVE → REAL（30分内）</span><b>${fmt(x.liveToReal)}回</b></div>
        <div><span>アプリ鑑賞時間</span><b>${minutes < 60 ? `${minutes}分` : `${Math.floor(minutes / 60)}時間${minutes % 60}分`}</b></div>
      </div>
      <div class="ai-phase1-notes">
        <p><b>BET額：</b>${esc(stakeText)}</p>
        <p><b>REAL移行：</b>${esc(preRealText)}</p>
        <p><b>よく使う買い方：</b>${esc(topEntry(x.modes, modeLabels))} / ${esc(topEntry(x.types, typeLabels))}</p>
        <p><b>利用時間帯：</b>${esc(topEntry(x.bands))}</p>
        <p><b>増額の直前：</b>不的中後 ${x.afterMissUp}回 / B的中後 ${x.afterHitUp}回</p>
      </div>
      <div class="ai-phase1-seq">
        <span>直近のREAL移行までの操作</span>
        ${x.realSequences.length
          ? x.realSequences.reverse().map((seq) => `<p>${seq.length ? seq.map(esc).join(" → ") : "直前操作データなし"}</p>`).join("")
          : "<p>REAL投票導線を開くと、直前30分の操作順をここに残します。</p>"}
      </div>
      <small class="ai-phase1-caution">REAL投票ボタンは「公式投票サイトを開いた」事実だけを記録します。実際の舟券購入は確認・断定しません。</small>`;
  }

  function injectStyles() {
    if (document.getElementById("mamoAiPhase1Style")) return;
    const style = document.createElement("style");
    style.id = "mamoAiPhase1Style";
    style.textContent = `
      .mamo-decision-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;padding:10px;background:#f4f8f8;border:1px solid var(--soft-line,#dbe4e5)}
      .mamo-decision-actions a{min-height:48px;display:flex;align-items:center;justify-content:center;text-decoration:none;font-weight:1000;border-radius:4px}
      .mamo-live-btn{background:#fff;color:var(--navy,#071b2b);border:2px solid var(--teal,#00a8a0)}
      .mamo-real-btn{background:var(--navy,#071b2b);color:#fff;border:2px solid var(--navy,#071b2b)}
      .mamo-decision-actions small{grid-column:1/-1;color:var(--muted,#697a80);font-size:9px;line-height:1.5}
      .ai-phase1-panel{margin:12px 0 20px;padding:14px;background:#fff;border-top:5px solid var(--teal,#00a8a0);box-shadow:3px 4px 0 rgba(7,27,43,.07)}
      .ai-phase1-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px}.ai-phase1-head span{font-size:9px;font-weight:1000;letter-spacing:.1em;color:var(--teal-dark,#007c78)}.ai-phase1-head h3{margin:3px 0;font-size:19px}.ai-phase1-head small{font-weight:900;color:var(--muted,#697a80)}
      .ai-phase1-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.ai-phase1-grid div{padding:9px;background:#f4f8f8;border:1px solid var(--soft-line,#dbe4e5)}.ai-phase1-grid span{display:block;font-size:9px;color:var(--muted,#697a80);font-weight:900}.ai-phase1-grid b{display:block;margin-top:3px;font-size:16px}
      .ai-phase1-notes{margin-top:10px;padding:10px;border-left:4px solid var(--gold,#ffc83d);background:#fffaf0}.ai-phase1-notes p{margin:5px 0;font-size:11px;line-height:1.6}.ai-phase1-seq{margin-top:10px}.ai-phase1-seq>span{font-size:9px;font-weight:1000;color:var(--teal-dark,#007c78)}.ai-phase1-seq p{margin:5px 0;padding:7px 9px;background:#f4f8f8;font-size:10px;line-height:1.5}.ai-phase1-caution{display:block;margin-top:10px;color:var(--muted,#697a80);line-height:1.5}
      @media(max-width:620px){.ai-phase1-grid{grid-template-columns:repeat(2,1fr)}.mamo-decision-actions{grid-template-columns:1fr 1fr}.ai-phase1-grid b{font-size:15px}}
    `;
    document.head.appendChild(style);
  }

  function ensureDecisionButtons() {
    const raceView = document.getElementById("raceView");
    if (!raceView) return;
    const menu = raceView.querySelector(".officialmenu");
    if (!menu || raceView.querySelector(".mamo-decision-actions")) return;
    const liveLink = [...menu.querySelectorAll("a")].find((a) => /映像|LIVE/.test(a.textContent || ""));
    const liveUrl = liveLink?.href || "https://race.boatcast.jp/";
    const realUrl = matchMedia("(max-width:744px)").matches ? TELEBOAT_SP : TELEBOAT_PC;
    const holder = document.createElement("div");
    holder.className = "mamo-decision-actions";
    holder.innerHTML = `
      <a class="mamo-live-btn" data-ai-action="live" href="${esc(liveUrl)}" target="_blank" rel="noopener noreferrer">▶ ライブ映像</a>
      <a class="mamo-real-btn" data-ai-action="real" href="${esc(realUrl)}" target="_blank" rel="noopener noreferrer">REAL投票 ↗</a>
      <small>LIVEとREALを別々に記録します。REALは公式投票サイトへの移動を記録するだけで、購入完了とは扱いません。</small>`;
    menu.insertAdjacentElement("afterend", holder);
  }

  function classifyAnchor(anchor) {
    const text = (anchor.textContent || "").trim();
    const href = anchor.href || "";
    if (anchor.matches("[data-ai-action='live']")) return "live_open";
    if (anchor.matches("[data-ai-action='real']")) return "real_bet_open";
    if (/race\.boatcast\.jp/.test(href) || /LIVE|映像/.test(text)) return "live_open";
    if (/odds/.test(href) || /オッズ/.test(text)) return "odds_open";
    if (/racer/.test(href) || anchor.classList.contains("boat")) return "racer_profile_open";
    if (/raceresult|resultlist/.test(href) || /結果/.test(text)) return "result_open";
    if (/racelist/.test(href) || /出走表/.test(text)) return "racelist_open";
    return null;
  }

  function detectNewAirBet() {
    const s = appState();
    const records = Array.isArray(s.records) ? s.records : [];
    const latest = records[records.length - 1];
    if (!latest?.id) return;
    const marker = `air:${latest.id}`;
    const list = events();
    if (list.some((e) => e.payload?.marker === marker)) return;
    log("air_bet_detected", {
      marker, recordId: latest.id, stakeB: Number(latest.stake) || 0,
      lineCount: Array.isArray(latest.lines) ? latest.lines.length : 0,
      betMode: latest.betMode || null,
    });
  }

  function detectRaceView() {
    const ctx = context();
    if (ctx.screen !== "race" || !ctx.venueCode || !ctx.raceNo) return;
    const key = `${ctx.raceDate}:${ctx.venueCode}:${ctx.raceNo}`;
    if (key === lastContextKey) return;
    lastContextKey = key;
    log("race_view", {});
  }

  document.addEventListener("click", (event) => {
    const anchor = event.target.closest?.("a");
    if (anchor) {
      const kind = classifyAnchor(anchor);
      if (kind) log(kind, { hrefHost: (() => { try { return new URL(anchor.href).host; } catch (_) { return ""; } })() });
    }
    const button = event.target.closest?.("button");
    if (button && /AIR BETを確認/.test(button.textContent || "")) log("air_review", {});
    if (button?.matches?.(".racechip") || button?.hasAttribute?.("data-race-chip")) {
      window.setTimeout(detectRaceView, 0);
    }
    window.setTimeout(() => {
      detectNewAirBet();
      ensureDecisionButtons();
      renderInsightPanel();
    }, 80);
  }, true);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      recordActiveTime("hidden");
    } else {
      activeStartedAt = Date.now();
      log("app_return", {});
      ensureDecisionButtons();
      detectRaceView();
      renderInsightPanel();
    }
  });

  window.addEventListener("pagehide", () => recordActiveTime("pagehide"));

  function boot() {
    injectStyles();
    log("ai_phase1_loaded", { version: 1 });
    ensureDecisionButtons();
    detectRaceView();
    detectNewAirBet();
    renderInsightPanel();

    const observer = new MutationObserver(() => {
      ensureDecisionButtons();
      detectRaceView();
      detectNewAirBet();
      if (document.querySelector("#analysis.screen.active")) renderInsightPanel();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.setInterval(() => {
      ensureDecisionButtons();
      detectRaceView();
      detectNewAirBet();
      if (document.querySelector("#analysis.screen.active")) renderInsightPanel();
    }, 5000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
