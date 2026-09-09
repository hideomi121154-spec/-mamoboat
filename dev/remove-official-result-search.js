/* Remove legacy official-result archive search from the Record screen.
 * The personal AIR BET archive/search remains the record-history entry point.
 */
(() => {
  "use strict";
  if (window.__MAMO_REMOVE_OFFICIAL_RESULT_SEARCH_V1__) return;
  window.__MAMO_REMOVE_OFFICIAL_RESULT_SEARCH_V1__ = true;

  function removeLegacyOfficialSearch(){
    const screen = document.getElementById("records");
    if (!screen) return;
    screen.querySelector(".result-search-heading")?.remove();
    screen.querySelector(".result-search-panel")?.remove();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", removeLegacyOfficialSearch, { once:true });
  } else {
    removeLegacyOfficialSearch();
  }

  document.addEventListener("click", event => {
    if (event.target?.closest?.("#nav-records")) queueMicrotask(removeLegacyOfficialSearch);
  }, { passive:true });
})();
