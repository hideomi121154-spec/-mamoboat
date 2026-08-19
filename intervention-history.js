/* MAMO BOAT Intervention History v1
 * Local, bounded history for user-facing feedback such as the next morning press.
 * Central telemetry remains owned by decision-event-collector.js.
 */
(() => {
  "use strict";

  const KEY = "mamoboat_intervention_history_v1";
  const MAX = 1200;
  const original = window.MAMO_DECISION_EVENTS;
  if (!original || window.__MAMO_INTERVENTION_HISTORY_V1__) return;
  window.__MAMO_INTERVENTION_HISTORY_V1__ = true;

  const active = new Map();

  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX))); } catch (_) {}
  }

  function append(entry) {
    const list = read();
    list.push(entry);
    write(list);
    window.dispatchEvent(new CustomEvent("mamo:intervention-history-updated", { detail: entry }));
  }

  function cleanContext(context = {}) {
    return {
      raceDate: context.raceDate || null,
      venueCode: context.venueCode || null,
      raceNo: context.raceNo == null ? null : Number(context.raceNo),
    };
  }

  function interventionShown(input = {}) {
    const id = original.interventionShown(input);
    if (!id) return id;
    const shownAt = new Date().toISOString();
    const context = cleanContext(input.context || {});
    active.set(id, { shownAt, context, kind: input.kind || "reflection", triggerKey: input.triggerKey || null });
    append({
      type: "shown",
      interventionId: id,
      at: shownAt,
      kind: input.kind || "reflection",
      triggerKey: input.triggerKey || null,
      messageKey: input.messageKey || null,
      ...context,
    });
    return id;
  }

  function interventionResult(id, result, details = {}) {
    const item = active.get(id) || null;
    const at = new Date().toISOString();
    const seconds = item
      ? Math.max(0, Math.round((Date.now() - new Date(item.shownAt).getTime()) / 1000))
      : null;
    const returned = original.interventionResult(id, result, details);
    append({
      type: "result",
      interventionId: id,
      at,
      kind: item?.kind || details.kind || "reflection",
      triggerKey: item?.triggerKey || details.trigger_key || null,
      result: result || "unknown",
      secondsAfter: seconds,
      ...cleanContext(item?.context || details.context || {}),
    });
    active.delete(id);
    return returned;
  }

  window.MAMO_DECISION_EVENTS = Object.freeze({
    ...original,
    interventionShown,
    interventionResult,
  });

  window.MAMO_INTERVENTION_HISTORY = Object.freeze({
    version: 1,
    read,
  });
})();
