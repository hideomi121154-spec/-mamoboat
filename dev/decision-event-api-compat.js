/* MAMO BOAT Decision Event API compatibility shim */
(() => {
  "use strict";
  const api = window.MAMO_DECISION_EVENTS;
  if (!api || api.send || !api.track) return;
  window.MAMO_DECISION_EVENTS = Object.freeze({ ...api, send: api.track });
})();
