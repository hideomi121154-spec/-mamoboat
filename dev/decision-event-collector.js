/*
 * MAMO BOAT Decision Event Collector v2
 *
 * Decision telemetry only. The standalone race-screen "今回は見送る" control
 * was retired from the live race UI; no visual controls or styles are injected.
 */
(() => {
  "use strict";
  if (window.__MAMO_DECISION_EVENT_COLLECTOR_V2__) return;
  window.__MAMO_DECISION_EVENT_COLLECTOR_V2__ = true;

  const STORAGE_KEY = "mamoboat_v40_personal";
  const CONFIG = window.MAMOBOAT_PILOT || {};
  const COLLECTOR = CONFIG.collector || {};
  const SCHEMA = window.MAMO_DECISION_EVENT_SCHEMA || {};
  const EVENTS = SCHEMA.events || {};
  const SESSION_ID = window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `decision-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const seenRecordIds = new Set();
  const lastDecisionByRace = new Map();
  const interventions = new Map();
  let scanStarted = false;

  function uid() {
    return window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `event-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {}; }
    catch (_) { return {}; }
  }

  function participantId(state = loadState()) {
    return String(state?.pilot?.participantId || "").slice(0, 40);
  }

  function consented(state = loadState()) {
    return state?.pilot?.consent === true;
  }

  function clientKey() {
    return String(COLLECTOR.publishableKey || COLLECTOR.anonKey || "").trim();
  }

  function ready() {
    const key = clientKey();
    return COLLECTOR.enabled === true
      && /^https:\/\//.test(String(COLLECTOR.endpoint || ""))
      && (/^sb_publishable_/.test(key) || /^eyJ/.test(key));
  }

  function safe(value, depth = 0) {
    if (value == null) return null;
    if (depth > 4) return String(value).slice(0, 160);
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") return value.slice(0, 300);
    if (Array.isArray(value)) return value.slice(0, 30).map((item) => safe(item, depth + 1));
    if (typeof value === "object") {
      return Object.fromEntries(Object.entries(value).slice(0, 40).map(
        ([key, item]) => [String(key).slice(0, 60), safe(item, depth + 1)]
      ));
    }
    return String(value).slice(0, 160);
  }

  function currentRace(state = loadState()) {
    return {
      screen: document.body?.dataset?.screen || "home",
      venueCode: String(state?.venue || "") || null,
      raceNo: Number(state?.raceNo) || null,
      raceDate: window.MamoCore?.jstDate?.() || null,
    };
  }

  function raceKey(context) {
    if (!context?.venueCode || !context?.raceNo) return null;
    return `${context.raceDate || "today"}:${context.venueCode}:${context.raceNo}`;
  }

  async function send(eventName, payload = {}, context = {}) {
    const state = loadState();
    if (!eventName || !consented(state) || !ready() || !participantId(state)) {
      return { ok: false, reason: "disabled" };
    }
    const row = {
      event_id: uid(),
      study_id: String(CONFIG.studyId || "mamoboat-pilot-v1").slice(0, 80),
      participant_id: participantId(state),
      session_id: SESSION_ID,
      occurred_at: new Date().toISOString(),
      event_name: String(eventName).slice(0, 80),
      app_version: "4.0.1",
      screen: context.screen || document.body?.dataset?.screen || "home",
      race_date: context.raceDate || null,
      venue_code: context.venueCode || null,
      race_no: context.raceNo == null ? null : Number(context.raceNo),
      payload: safe({ decision_schema_version: 1, ...payload }),
    };
    try {
      const headers = { "Content-Type": "application/json", Prefer: "return=minimal" };
      const key = clientKey();
      headers.apikey = key;
      if (/^eyJ/.test(key)) headers.Authorization = `Bearer ${key}`;
      const body = COLLECTOR.transport === "rpc" ? { p_events: [row] } : [row];
      const response = await fetch(String(COLLECTOR.endpoint), {
        method: "POST", headers, body: JSON.stringify(body), keepalive: true,
      });
      return { ok: response.ok, status: response.status };
    } catch (error) {
      return { ok: false, reason: "network", error: String(error?.message || error) };
    }
  }

  function recordDecision(next, details = {}, context = currentRace()) {
    const key = raceKey(context);
    const previous = key ? lastDecisionByRace.get(key) || null : null;
    if (key) lastDecisionByRace.set(key, next);
    if (previous && previous !== next) {
      send(EVENTS.DECISION_CHANGED || "decision_changed", { from: previous, to: next, ...details }, context);
    }
  }

  function handleClick(event) {
    const link = event.target.closest?.("a[href]");
    if (!link) return;
    const href = String(link.href || "");
    const text = String(link.textContent || "").replace(/\s+/g, " ").trim();
    if (!/boatrace\.jp/i.test(href) || !/(投票|舟券|購入)/.test(text)) return;
    const context = currentRace();
    send(EVENTS.REAL_INTENT_OPENED || "decision_real_intent_opened", {
      source: "official-link",
      link_text: text.slice(0, 80),
      destination_host: "www.boatrace.jp",
    }, context);
    recordDecision("real_intent", { source: "official-link" }, context);
  }

  function scanForNewAirBets() {
    const state = loadState();
    const records = Array.isArray(state?.records) ? state.records : [];
    if (!scanStarted) {
      records.forEach((record) => record?.id && seenRecordIds.add(record.id));
      scanStarted = true;
      return;
    }
    for (const record of records) {
      if (!record?.id || seenRecordIds.has(record.id)) continue;
      seenRecordIds.add(record.id);
      const context = {
        screen: document.body?.dataset?.screen || "race",
        raceDate: record.raceDate || null,
        venueCode: record.venueCode || null,
        raceNo: record.raceNo || null,
      };
      recordDecision("air_bet", {
        record_id: record.id,
        stake_b: Number(record.stake) || 0,
        urge_before: Number(record.urge) || 0,
        confidence: Number(record.conf) || 0,
        source: "existing-record",
      }, context);
    }
  }

  function interventionShown(input = {}) {
    const context = input.context || currentRace();
    const interventionId = String(input.id || uid()).slice(0, 80);
    interventions.set(interventionId, {
      shownAt: Date.now(), context, kind: String(input.kind || "reflection").slice(0, 80),
    });
    send(EVENTS.INTERVENTION_SHOWN || "decision_intervention_shown", {
      intervention_id: interventionId,
      kind: input.kind || "reflection",
      message_key: input.messageKey || null,
      trigger_key: input.triggerKey || null,
      details: input.details || null,
    }, context);
    return interventionId;
  }

  function interventionResult(interventionId, result, details = {}) {
    const item = interventions.get(interventionId);
    const context = item?.context || currentRace();
    send(EVENTS.INTERVENTION_RESULT || "decision_intervention_result", {
      intervention_id: interventionId,
      kind: item?.kind || details.kind || "reflection",
      result: result || "unknown",
      seconds_after_intervention: item
        ? Math.max(0, Math.round((Date.now() - item.shownAt) / 1000))
        : null,
      ...details,
    }, context);
    if (["air_bet", "real_intent", "skip"].includes(result)) {
      recordDecision(result, { intervention_id: interventionId }, context);
    }
    interventions.delete(interventionId);
  }

  function trackRealIntent(details = {}) {
    const context = details.context || currentRace();
    send(EVENTS.REAL_INTENT_OPENED || "decision_real_intent_opened", {
      source: details.source || "app", ...details, context: undefined,
    }, context);
    recordDecision("real_intent", { source: details.source || "app" }, context);
  }

  window.MAMO_DECISION_EVENTS = Object.freeze({
    version: 2,
    track: send,
    trackRealIntent,
    interventionShown,
    interventionResult,
    recordDecision,
  });

  function boot() {
    scanForNewAirBets();
    document.addEventListener("click", handleClick, true);
    setInterval(scanForNewAirBets, 1200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
