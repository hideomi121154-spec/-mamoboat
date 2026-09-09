/* MAMO BOAT — retired AIR BET compatibility shim v11.
 *
 * Multi-add, reference odds, review increments and review deletion are now
 * owned by app.js. Keep the historical guards so an old loader cannot attach
 * a second capture-phase click handler after the canonical implementation.
 */
(() => {
  "use strict";
  window.__MAMO_AIR_BET_MULTI_ADD_V8__ = true;
  window.__MAMO_AIR_BET_MULTI_ADD_V9__ = true;
  window.__MAMO_AIR_BET_MULTI_ADD_V10__ = true;
  window.__MAMO_AIR_BET_MULTI_ADD_V11__ = true;
  window.MAMO_AIR_BET_MULTI_ADD = Object.freeze({ retired: true });
})();
