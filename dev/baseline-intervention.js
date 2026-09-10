/* MAMO BOAT Baseline Intervention — retired from race UI.
 * Compatibility stub only: no timers, listeners, baseline calculation, or DOM insertion.
 * If an older page already rendered the retired card, remove that card and its style.
 */
(() => {
  "use strict";
  document.getElementById("mamoBaselineIntervention")?.remove();
  document.getElementById("mamoBaselineInterventionStyle")?.remove();
})();
