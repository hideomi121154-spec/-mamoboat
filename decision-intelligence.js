/* MAMO BOAT Decision Intelligence v1
 * Adds two passive signals without touching AIR BET logic:
 * 1) automatic "skip" detection when a viewed race is left without AIR or REAL
 * 2) the 30-minute action sequence immediately before REAL navigation
 */
(() => {
  "use strict";

  const STATE_KEY = "mamoboat_v40_personal";
  const EVENT_KEY = "mamoboat_decision_events_v1";
  const MAX_EVENTS = 5000;
  const MIN_SKIP_VIEW_MS = 10000;
  const PRE_REAL_WINDOW_MS = 30 * 60 * 1000;
  let raceSession = null;
  let lastRecordId = null;

  const readJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
  };
  const state = () => readJson(STATE_KEY, {});
  const events = () => {
    const value = readJson(EVENT_KEY, []);
    return Array.isArray(value) ? value : [];
  };
  const saveEvents = (list) => {
    try { localStorage.setItem(EVENT_KEY, JSON.stringify(list.slice(-MAX_EVENTS))); } catch (_) {}
  };
  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const dateKey = (value = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date(value));
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  };

  function currentRace() {
    const s = state();
    const screen = document.querySelector(".screen.active")?.id || "unknown";
    if (screen !== "race") return null;
    const venueCode = s.venue || null;
    const raceNo = Number(s.raceNo) || null;
    if (!venueCode || !raceNo) return null;
    return { raceDate: dateKey(), venueCode: String(venueCode), raceNo };
  }

  const raceKey = (r) => r ? `${r.raceDate}:${r.venueCode}:${r.raceNo}` : "";
  const sameRace = (a, b) => !!a && !!b
    && String(a.raceDate) === String(b.raceDate)
    && String(a.venueCode) === String(b.venueCode)
    && Number(a.raceNo) === Number(b.raceNo);

  function pushEvent(name, race, payload = {}) {
    const list = events();
    list.push({
      id: window.crypto?.randomUUID?.() || `d-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      at: new Date().toISOString(),
      name,
      raceDate: race?.raceDate || dateKey(),
      venueCode: race?.venueCode || null,
      raceNo: race?.raceNo || null,
      payload,
    });
    saveEvents(list);
  }

  function addAction(kind, label, extra = {}) {
    if (!raceSession) return;
    const action = { at: new Date().toISOString(), kind, label, ...extra };
    raceSession.actions.push(action);
    if (raceSession.actions.length > 80) raceSession.actions.shift();
    pushEvent("decision_action", raceSession.race, action);
  }

  function startRaceSession(race) {
    raceSession = {
      race,
      key: raceKey(race),
      startedAt: Date.now(),
      hadAir: false,
      hadReal: false,
      actions: [],
    };
    addAction("race_view", "レース閲覧");
    pushEvent("race_session_start", race, {});
  }

  function finalizeRaceSession(reason) {
    if (!raceSession) return;
    const durationMs = Math.max(0, Date.now() - raceSession.startedAt);
    const payload = {
      reason,
      viewedSeconds: Math.round(durationMs / 1000),
      hadAir: raceSession.hadAir,
      hadReal: raceSession.hadReal,
      actionCount: raceSession.actions.length,
    };
    pushEvent("race_session_end", raceSession.race, payload);
    if (durationMs >= MIN_SKIP_VIEW_MS && !raceSession.hadAir && !raceSession.hadReal) {
      pushEvent("skip_detected", raceSession.race, {
        viewedSeconds: payload.viewedSeconds,
        reason,
        actions: raceSession.actions.slice(-12),
      });
    }
    raceSession = null;
  }

  function syncRaceSession() {
    const nowRace = currentRace();
    const nowKey = raceKey(nowRace);
    if (!raceSession && nowRace) {
      startRaceSession(nowRace);
      return;
    }
    if (raceSession && nowKey !== raceSession.key) {
      finalizeRaceSession(nowRace ? "race_changed" : "left_race_screen");
      if (nowRace) startRaceSession(nowRace);
    }
  }

  function recordNewAirBet() {
    const records = Array.isArray(state().records) ? state().records : [];
    const latest = records[records.length - 1];
    if (!latest?.id || latest.id === lastRecordId) return;
    lastRecordId = latest.id;
    if (!raceSession) return;
    const recordRace = {
      raceDate: latest.raceDate || dateKey(latest.time || Date.now()),
      venueCode: String(latest.venueCode || ""),
      raceNo: Number(latest.raceNo) || null,
    };
    if (!sameRace(recordRace, raceSession.race)) return;
    const recordTime = new Date(latest.time || Date.now()).getTime();
    if (recordTime < raceSession.startedAt - 2000) return;
    raceSession.hadAir = true;
    addAction("air", "AIR BET", {
      stakeB: Number(latest.stake) || 0,
      lineCount: Array.isArray(latest.lines) ? latest.lines.length : 0,
      mode: latest.betMode || null,
    });
    pushEvent("air_in_session", raceSession.race, {
      recordId: latest.id,
      stakeB: Number(latest.stake) || 0,
    });
  }

  function classifyElement(target) {
    const anchor = target.closest?.("a");
    const button = target.closest?.("button");
    const el = anchor || button;
    if (!el) return null;
    const text = (el.textContent || "").replace(/\s+/g, " ").trim();
    const href = anchor?.href || "";
    const action = anchor?.dataset?.mamoAction || "";

    if (action === "real" || /REAL投票/.test(text) || /spweb\.brtb\.jp|ib\.mbrace\.or\.jp/.test(href)) return { kind:"real", label:"REAL投票" };
    if (action === "live" || /LIVE|ライブ|レース映像/.test(text) || /race\.boatcast\.jp/.test(href)) return { kind:"live", label:"LIVE" };
    if (/BOAT RACE公式|公式サイト/.test(text) || /boatrace\.jp/.test(href)) return { kind:"official", label:"BOAT RACE公式" };
    if (/オッズ/.test(text)) return { kind:"odds", label:"オッズ" };
    if (/出走表/.test(text)) return { kind:"entries", label:"出走表" };
    if (/選手|レーサー/.test(text)) return { kind:"racer", label:"選手情報" };
    if (/直前/.test(text)) return { kind:"before", label:"直前情報" };
    if (/結果/.test(text)) return { kind:"result", label:"結果" };
    return null;
  }

  function saveRealSequence() {
    if (!raceSession) return;
    raceSession.hadReal = true;
    addAction("real", "REAL投票");
    const now = Date.now();
    const sequence = raceSession.actions
      .filter((a) => now - new Date(a.at).getTime() <= PRE_REAL_WINDOW_MS)
      .slice(-15);
    pushEvent("real_transition", raceSession.race, {
      windowMinutes: 30,
      viewedSecondsBeforeReal: Math.round((Date.now() - raceSession.startedAt) / 1000),
      sequence,
      compact: sequence.map((a) => a.label).join(" → "),
    });
  }

  function rangeStats(days) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const list = events().filter((e) => new Date(e.at).getTime() >= cutoff);
    const starts = list.filter((e) => e.name === "race_session_start");
    const skips = list.filter((e) => e.name === "skip_detected");
    const transitions = list.filter((e) => e.name === "real_transition");
    return {
      starts: starts.length,
      skips: skips.length,
      skipRate: starts.length ? skips.length / starts.length : 0,
      transitions,
    };
  }

  function renderDecisionPanel() {
    const analysis = document.getElementById("analysis");
    if (!analysis) return;
    const host = document.getElementById("mamoAiSafeReport") || document.getElementById("analysisList");
    if (!host) return;
    let panel = document.getElementById("mamoDecisionPanel");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "mamoDecisionPanel";
      panel.className = "mamo-decision-panel";
      host.insertAdjacentElement("afterend", panel);
    }
    const day = rangeStats(1);
    const week = rangeStats(7);
    const latest = week.transitions.slice(-3).reverse();
    panel.innerHTML = `
      <div class="mamo-decision-head"><div><span>DECISION INTELLIGENCE</span><h3>見送りとREAL移行</h3></div><small>自動記録</small></div>
      <div class="mamo-decision-metrics">
        <div><small>今日の閲覧レース</small><b>${day.starts}</b></div>
        <div><small>今日の見送り</small><b>${day.skips}</b></div>
        <div><small>7日見送り率</small><b>${week.starts ? Math.round(week.skipRate * 100) + "%" : "—"}</b></div>
        <div><small>7日REAL移行</small><b>${week.transitions.length}</b></div>
      </div>
      <div class="mamo-decision-sequences"><strong>直近のREAL移行前30分</strong>
        ${latest.length ? latest.map((e) => `<p><span>${esc(e.raceNo)}R</span>${esc(e.payload?.compact || "記録なし")}</p>`).join("") : "<p>REAL投票導線を開くと、直前の操作順がここに残ります。</p>"}
      </div>
      <p class="mamo-decision-note">見送り＝レース画面を10秒以上見たあと、そのレースでAIR BETもREAL投票導線も使わず別画面・別レースへ移った場合。短い誤タップは除外します。</p>`;
  }

  function injectStyles() {
    if (document.getElementById("mamoDecisionStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoDecisionStyle";
    style.textContent = `
      .mamo-decision-panel{margin:14px 0 22px;padding:14px;background:#fff;border-top:5px solid var(--gold,#ffc83d);box-shadow:3px 4px 0 rgba(7,27,43,.07)}
      .mamo-decision-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}.mamo-decision-head span{font-size:9px;font-weight:1000;color:var(--teal-dark,#007c78);letter-spacing:.12em}.mamo-decision-head h3{margin:3px 0 10px;font-size:20px}.mamo-decision-head small{color:var(--muted,#697a80);font-weight:900}
      .mamo-decision-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.mamo-decision-metrics div{padding:8px;background:#f4f8f8}.mamo-decision-metrics small{display:block;font-size:8px;color:var(--muted,#697a80);font-weight:900}.mamo-decision-metrics b{display:block;margin-top:3px;font-size:17px}
      .mamo-decision-sequences{margin-top:11px}.mamo-decision-sequences>strong{font-size:10px;color:var(--teal-dark,#007c78)}.mamo-decision-sequences p{margin:6px 0;padding:8px;background:#f8faf9;font-size:10px;line-height:1.6}.mamo-decision-sequences p span{display:inline-block;min-width:30px;margin-right:6px;font-weight:1000;color:var(--navy,#071b2b)}
      .mamo-decision-note{margin:10px 0 0;color:var(--muted,#697a80);font-size:9px;line-height:1.6}
      @media(max-width:520px){.mamo-decision-metrics{grid-template-columns:repeat(2,1fr)}}`;
    document.head.appendChild(style);
  }

  document.addEventListener("click", (event) => {
    const classified = classifyElement(event.target);
    if (!classified || !raceSession) return;
    if (classified.kind === "real") saveRealSequence();
    else addAction(classified.kind, classified.label);
  }, false);

  window.addEventListener("pagehide", () => {
    if (raceSession) finalizeRaceSession("pagehide");
  });

  function boot() {
    injectStyles();
    const records = Array.isArray(state().records) ? state().records : [];
    lastRecordId = records[records.length - 1]?.id || null;
    syncRaceSession();
    renderDecisionPanel();
    window.setInterval(() => {
      syncRaceSession();
      recordNewAirBet();
    }, 900);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
