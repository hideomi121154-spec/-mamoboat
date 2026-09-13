/* MAMO BOAT — legacy compatibility shim.
 *
 * Bottom navigation is owned by the base .bottom-nav/.nav styles again.
 * This file intentionally does not inject layout CSS, scroll the nav, or attach
 * timers/listeners. Keeping the shim avoids 404s for older cached documents that
 * still reference bottom-nav-horizontal.js while preventing the old horizontal
 * overflow behavior from returning on iPhone/PWA.
 */
(() => {
  "use strict";
  window.__MAMO_HORIZONTAL_BOTTOM_NAV__ = true;
})();
