/* MAMO BOAT Compound Pattern Realtime v1
 * Replays only previously observed compound patterns at the moment they recur.
 * Uses factual personal history; never predicts race outcomes or diagnoses risk.
 */
(() => {
  "use strict";
  if (window.__MAMO_COMPOUND_PATTERN_REALTIME_V1__) return;
  window.__MAMO_COMPOUND_PATTERN_REALTIME_V1__ = true;

  const STATE_KEY = "mamoboat_v40_personal";
  const DECISION_KEY = "mamoboat_decision_events_v1";
  const SHOWN_KEY = "mamoboat_compound_realtime_shown_v1";
  const MIN_SUPPORT = 3;
  const MIN_LIFT = 1.5;
  const MIN_SCORE = 55;
  const RESULT_WINDOW_MS = 30 * 60 * 1000;
  const SCAN_MS = 1200;
  const JST = 9 * 60 * 60 * 1000;

  let knownRecordIds = new Set();
  let active = null;

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  };
  const state = () => read(STATE_KEY, {}) || {};
  const events = () => {
    const value = read(DECISION_KEY, []);
    return Array.isArray(value) ? value : [];
  };
  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

  const LABELS = {
    night: "夜間",
    small_entry: "100B入口",
    after_miss: "不的中後",
    rapid: "10分以内",
    high_urge: "衝動7以上",
    low_confidence: "納得度4以下",
    live_before: "LIVE後",
  };

  function hourOf(value) {
    const ms = new Date(value || 0).getTime();
    if (!Number.isFinite(ms)) return null;
    return new Date(ms + JST).getUTCHours();
  }

  function sameRace(a, b) {
    return String(a?.venueCode || "") === String(b?.venueCode || "")
      && Number(a?.raceNo) === Number(b?.raceNo)
      && (!a?.raceDate || !b?.raceDate || String(a.raceDate) === String(b.raceDate));
  }

  function currentRace() {
    const s = state();
    if (!document.getElementById("race")?.classList.contains("active")) return null;
    const venueCode = String(s.venue || "");
    const raceNo = Number(s.raceNo) || null;
    if (!venueCode || !raceNo) return null;
    return {
      screen: "race",
      raceDate: window.MamoCore?.jstDate?.() || null,
      venueCode,
      raceNo,
    };
  }

  function latestFlags(record, records, decisionEvents) {
    const index = records.findIndex((item) => item?.id === record?.id);
    const previous = index > 0 ? records[index - 1] : null;
    const flags = [];
    const t = new Date(record.time || 0).getTime();
    if ((hourOf(record.time) ?? -1) >= 18) flags.push("night");
    if (Number(record.stake) === 100) flags.push("small_entry");
    if (previous?.status === "miss") flags.push("after_miss");
    if (previous) {
      const gap = (t - new Date(previous.time || 0).getTime()) / 60000;
      if (Number.isFinite(gap) && gap >= 0 && gap <= 10) flags.push("rapid");
    }
    if (Number(record.urge) >= 7) flags.push("high_urge");
    if (Number(record.conf) <= 4) flags.push("low_confidence");
    const live = decisionEvents.some((event) => {
      if (event.name !== "decision_action" || event.payload?.kind !== "live") return false;
      const et = new Date(event.at || 0).getTime();
      return et <= t && t - et <= RESULT_WINDOW_MS && sameRace(record, event);
    });
    if (live) flags.push("live_before");
    return flags;
  }

  function qualifiedPatterns() {
    const patterns = Array.isArray(window.MAMO_COMPOUND_PATTERN?.patterns)
      ? window.MAMO_COMPOUND_PATTERN.patterns
      : [];
    return patterns.filter((item) =>
      Array.isArray(item.flags)
      && item.flags.length >= 2
      && item.flags.length <= 3
      && Number(item.support) >= MIN_SUPPORT
      && Number(item.lift) >= MIN_LIFT
      && Number(item.score) >= MIN_SCORE
    );
  }

  function matchedPattern(flags) {
    return qualifiedPatterns()
      .filter((item) => item.flags.every((flag) => flags.includes(flag)))
      .sort((a, b) => Number(b.score) - Number(a.score) || Number(b.support) - Number(a.support))[0] || null;
  }

  function racePatternKey(race, pattern) {
    return `${race?.raceDate || "today"}:${race?.venueCode || ""}:${race?.raceNo || ""}:${pattern.flags.join("+")}`;
  }

  function mayShow(race, pattern) {
    const map = read(SHOWN_KEY, {});
    return !map[racePatternKey(race, pattern)];
  }

  function markShown(race, pattern) {
    const map = read(SHOWN_KEY, {});
    map[racePatternKey(race, pattern)] = Date.now();
    const trimmed = Object.entries(map).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 300);
    write(SHOWN_KEY, Object.fromEntries(trimmed));
  }

  function resolve(result, details = {}) {
    if (!active) return;
    if (window.MAMO_DECISION_EVENTS?.interventionResult) {
      window.MAMO_DECISION_EVENTS.interventionResult(active.id, result, {
        trigger_key: `compound:${active.pattern.flags.join("+")}`,
        pattern_flags: active.pattern.flags,
        historical_support: active.pattern.support,
        historical_lift: active.pattern.lift,
        historical_real_rate: active.pattern.realRate,
        ...details,
      });
    }
    active = null;
    document.getElementById("mamoCompoundRealtime")?.remove();
  }

  function show(record, pattern, flags) {
    const race = {
      screen: "race",
      raceDate: record.raceDate || window.MamoCore?.jstDate?.() || null,
      venueCode: record.venueCode || state().venue || null,
      raceNo: record.raceNo || state().raceNo || null,
    };
    if (!race.venueCode || !race.raceNo || !mayShow(race, pattern)) return;
    if (document.getElementById("mamoBaselineIntervention") || document.getElementById("mamoCompoundRealtime")) return;
    if (!window.MAMO_DECISION_EVENTS?.interventionShown) return;

    const raceView = document.getElementById("raceView");
    if (!raceView || !currentRace() || !sameRace(race, currentRace())) return;
    const anchor = raceView.querySelector(".mamo-decision-skip")
      || raceView.querySelector(".mamo-official-link-row")
      || raceView.querySelector(".officialmenu")
      || raceView.querySelector(".mamo-ai-actions")
      || raceView.firstElementChild;
    if (!anchor) return;

    const id = window.MAMO_DECISION_EVENTS.interventionShown({
      kind: "compound_pattern_realtime",
      messageKey: `compound:${pattern.flags.join("+")}`,
      triggerKey: pattern.flags.join("+"),
      context: race,
    });
    active = { id, race, pattern, shownAt: Date.now(), recordId: record.id };
    markShown(race, pattern);

    const title = pattern.flags.map((flag) => LABELS[flag] || flag).join(" × ");
    const historicalRate = Math.round(Number(pattern.realRate || 0) * 100);
    const overallRate = window.MAMO_COMPOUND_PATTERN?.overallRealRate != null
      ? Math.round(Number(window.MAMO_COMPOUND_PATTERN.overallRealRate) * 100)
      : null;

    const panel = document.createElement("section");
    panel.id = "mamoCompoundRealtime";
    panel.className = "mamo-compound-realtime";
    panel.innerHTML = `
      <span>いま重なっている行動条件</span>
      <h3>${esc(title)}</h3>
      <p>過去30日では、この組み合わせが${Number(pattern.support)}場面あり、その後30分以内のREAL移行は${historicalRate}%でした${overallRate == null ? "" : `（全体 ${overallRate}%）`}。</p>
      <small>結果を予測する表示ではありません。今の判断材料として、あなた自身の過去に同じ条件が重なった時の事実だけを返しています。</small>
      <div class="mcr-actions"><button type="button" data-mcr-continue>このまま判断する</button><button type="button" data-mcr-dismiss>閉じる</button></div>`;
    anchor.insertAdjacentElement("afterend", panel);
  }

  function scanRecords() {
    const s = state();
    const records = Array.isArray(s.records) ? s.records.slice().sort((a,b)=>new Date(a.time||0)-new Date(b.time||0)) : [];
    const decisionEvents = events();
    for (const record of records) {
      if (!record?.id || knownRecordIds.has(record.id)) continue;
      knownRecordIds.add(record.id);
      if (active) continue;
      const flags = latestFlags(record, records, decisionEvents);
      const pattern = matchedPattern(flags);
      if (pattern) show(record, pattern, flags);
    }
  }

  function handleClick(event) {
    if (event.target.closest?.("[data-mcr-dismiss]")) {
      resolve("dismissed", { reason: "user_closed" });
      return;
    }
    if (event.target.closest?.("[data-mcr-continue]")) {
      const button = event.target.closest("[data-mcr-continue]");
      if (button) { button.disabled = true; button.textContent = "判断を続けています"; }
      return;
    }
    if (!active) return;
    const skip = event.target.closest?.("[data-decision-skip-reason]");
    if (skip) {
      resolve("skip", { reason: skip.dataset.decisionSkipReason || "other" });
      return;
    }
    const link = event.target.closest?.("a[href]");
    if (!link) return;
    const href = String(link.href || "");
    const text = String(link.textContent || "").replace(/\s+/g, " ").trim();
    const realLike = /spweb\.brtb\.jp|ib\.mbrace\.or\.jp/i.test(href)
      || (/boatrace\.jp/i.test(href) && /(投票|舟券|購入)/.test(text));
    if (realLike) resolve("real_intent", { destination: href.slice(0, 180) });
  }

  function injectStyles() {
    if (document.getElementById("mamoCompoundRealtimeStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoCompoundRealtimeStyle";
    style.textContent = `
      .mamo-compound-realtime{margin:10px 0 12px;padding:12px;border:1px solid rgba(7,27,43,.14);border-left:5px solid var(--gold,#ffc83d);background:#fffdf7;box-shadow:0 2px 8px rgba(7,27,43,.05)}
      .mamo-compound-realtime>span{display:block;font-size:9px;font-weight:1000;letter-spacing:.1em;color:var(--teal-dark,#007c78)}
      .mamo-compound-realtime h3{margin:4px 0 6px;font-size:16px;line-height:1.35;color:var(--navy,#071b2b)}
      .mamo-compound-realtime p{margin:0;font-size:12px;line-height:1.65;color:#334b54}.mamo-compound-realtime small{display:block;margin-top:7px;font-size:10px;line-height:1.55;color:#667b82}
      .mcr-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.mcr-actions button{min-height:38px;border-radius:8px;font-size:11px;font-weight:800}.mcr-actions button:first-child{border:1px solid rgba(7,27,43,.18);background:#fff;color:#17333d}.mcr-actions button:last-child{border:0;background:transparent;color:#62767d;text-decoration:underline}
    `;
    document.head.appendChild(style);
  }

  function boot() {
    injectStyles();
    const records = Array.isArray(state().records) ? state().records : [];
    knownRecordIds = new Set(records.map((record) => record?.id).filter(Boolean));
    document.addEventListener("click", handleClick, true);
    setInterval(() => {
      if (active && Date.now() - active.shownAt > RESULT_WINDOW_MS) resolve("unknown", { reason: "result_window_expired" });
      scanRecords();
    }, SCAN_MS);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
