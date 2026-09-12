/* MAMO BOAT — preserve the odds already shown in Odds Bet mode when a line is added.
 * Scope: only the next matching trifecta odds request for the same race and combination.
 * It never changes normal/BOX/formation logic, cart rules, wallet, or purchase flow.
 */
(() => {
  "use strict";
  if (window.__MAMO_ODDS_REFERENCE_ODDS_SYNC__) return;
  window.__MAMO_ODDS_REFERENCE_ODDS_SYNC__ = true;

  const ENDPOINT = "https://mihicuoijitluvrufsoj.supabase.co/functions/v1/boatrace-odds";

  function currentContext() {
    try {
      const status = window.MAMO_AIR_BET_DRAFT?.status?.() || {};
      const raceDate = String(status.raceDate || "");
      const venueCode = String(status.venueCode || "").replace(/\D/g, "").padStart(2, "0");
      const raceNo = Number(status.raceNo);
      if (!raceDate || !venueCode || !raceNo) return null;
      return { raceDate, venueCode, raceNo };
    } catch (_) {
      return null;
    }
  }

  function visibleOdds(button) {
    const row = button?.closest?.(".mamo-odds-row");
    const text = String(row?.querySelector?.(".mamo-odds-value")?.textContent || "").trim();
    const match = text.match(/^([0-9]+(?:\.[0-9]+)?)倍$/);
    const value = match ? Number(match[1]) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function requestMatches(input, init, expected) {
    const url = typeof input === "string" ? input : String(input?.url || "");
    if (url !== ENDPOINT) return false;
    let body = null;
    try { body = JSON.parse(String(init?.body || "{}")); } catch (_) { return false; }
    return String(body?.date || "") === expected.raceDate
      && String(body?.venueCode || "").replace(/\D/g, "").padStart(2, "0") === expected.venueCode
      && Number(body?.raceNo) === expected.raceNo
      && String(body?.betType || "") === "trifecta";
  }

  function installOneShotFetchPatch(expected, combination, odds) {
    if (typeof window.fetch !== "function") return;
    const originalFetch = window.fetch;
    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      if (window.fetch === patchedFetch) window.fetch = originalFetch;
    };

    async function patchedFetch(input, init) {
      if (!requestMatches(input, init, expected)) return originalFetch.call(window, input, init);
      restore();
      try {
        const response = await originalFetch.call(window, input, init);
        if (!response?.ok) return response;
        const payload = await response.clone().json();
        if (!payload?.ok || payload?.status !== "available") return response;
        const values = { ...(payload?.odds?.values || {}), [combination]: odds };
        const patched = { ...payload, odds: { ...(payload.odds || {}), values } };
        const headers = new Headers(response.headers);
        headers.delete("content-length");
        return new Response(JSON.stringify(patched), {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      } catch (_) {
        return originalFetch.call(window, input, init);
      }
    }

    window.fetch = patchedFetch;
    // addNormal() starts its odds request synchronously from the same click task.
    // If no matching request starts (duplicate/busy/etc.), never leave fetch wrapped.
    queueMicrotask(restore);
  }

  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-odds-add]");
    if (!button) return;
    const combination = String(button.dataset.oddsAdd || "").trim();
    if (!/^([1-6])-([1-6])-([1-6])$/.test(combination)) return;
    const boats = combination.split("-");
    if (new Set(boats).size !== 3) return;
    const odds = visibleOdds(button);
    const expected = currentContext();
    if (!odds || !expected) return;
    installOneShotFetchPatch(expected, combination, odds);
  }, true);
})();
