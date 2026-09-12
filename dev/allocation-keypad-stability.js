/* MAMO BOAT — allocation keypad + missing-odds recovery stability.
 * Keeps one visible interaction owner inside the fixed iPhone review modal and
 * recovers missing reference odds only for the current review context.
 * No cart/wallet/purchase/navigation logic is replaced.
 */
(() => {
  "use strict";
  if (window.__MAMO_ALLOCATION_KEYPAD_STABILITY__) return;
  window.__MAMO_ALLOCATION_KEYPAD_STABILITY__ = true;

  const ODDS_ENDPOINT = "https://mihicuoijitluvrufsoj.supabase.co/functions/v1/boatrace-odds";
  const recoveredOdds = new Map();
  let originalDraftApi = null;
  let adaptedDraftApi = null;
  let activeContextKey = "";
  let recoveryPromise = null;
  let recoveryRequestKey = "";

  function oddsNumber(value) {
    const match = String(value ?? "").trim().match(/^([0-9]+(?:\.[0-9]+)?)/);
    const odds = match ? Number(match[1]) : 0;
    return Number.isFinite(odds) && odds > 0 ? odds : 0;
  }

  function normalizeCombination(value) {
    return String(value ?? "")
      .split(/[^0-9]+/)
      .filter(Boolean)
      .map(Number)
      .filter((boat) => Number.isInteger(boat) && boat >= 1 && boat <= 6)
      .join("-");
  }

  function rawDraftApi() {
    const current = window.MAMO_AIR_BET_DRAFT;
    if (!current) return null;
    if (current === adaptedDraftApi) return originalDraftApi;
    originalDraftApi = current;
    adaptedDraftApi = null;
    return originalDraftApi;
  }

  function context() {
    const api = rawDraftApi();
    const status = api?.status?.() || {};
    const raceDate = String(status.raceDate || "").trim();
    const venueCode = String(status.venueCode || "").replace(/\D/g, "").padStart(2, "0");
    const raceNo = Number(status.raceNo);
    if (!raceDate || !venueCode || !Number.isInteger(raceNo) || raceNo < 1) return null;
    return { raceDate, venueCode, raceNo };
  }

  function contextKey(ctx) {
    return ctx ? `${ctx.raceDate}:${ctx.venueCode}:${ctx.raceNo}` : "";
  }

  function cacheKey(ctx, line) {
    const type = String(line?.betType || "").trim();
    const combo = normalizeCombination(line?.combination ?? line?.combo);
    return ctx && type && combo ? `${contextKey(ctx)}:${type}:${combo}` : "";
  }

  function resetForContext(ctx) {
    const next = contextKey(ctx);
    if (next === activeContextKey) return;
    activeContextKey = next;
    recoveredOdds.clear();
    recoveryPromise = null;
    recoveryRequestKey = "";
  }

  function enrichLines(lines, ctx) {
    resetForContext(ctx);
    return (Array.isArray(lines) ? lines : []).map((line) => {
      if (oddsNumber(line?.referenceOdds ?? line?.odds)) return { ...line };
      const key = cacheKey(ctx, line);
      const recovered = key ? recoveredOdds.get(key) : null;
      if (!recovered?.value) return { ...line };
      return {
        ...line,
        referenceOdds: recovered.value,
        oddsFetchedAt: recovered.fetchedAt,
        oddsSource: "review-live-recovery",
        oddsTimeSource: "fetched",
      };
    });
  }

  function ensureDraftAdapter() {
    const api = rawDraftApi();
    if (!api || typeof api.snapshot !== "function") return null;
    if (adaptedDraftApi && window.MAMO_AIR_BET_DRAFT === adaptedDraftApi) return api;
    adaptedDraftApi = Object.freeze({
      ...api,
      snapshot: () => enrichLines(api.snapshot(), context()),
    });
    window.MAMO_AIR_BET_DRAFT = adaptedDraftApi;
    return api;
  }

  function rawLines() {
    const api = ensureDraftAdapter();
    try {
      const lines = api?.snapshot?.();
      return Array.isArray(lines) ? lines : [];
    } catch (_) {
      return [];
    }
  }

  function sync(shell) {
    if (!shell) return;
    const keypad = shell.querySelector('[data-mamo-allocation-keypad="1"]');
    const results = shell.querySelector('.mamo-allocation-results');
    if (!keypad || !results) return;
    results.hidden = !keypad.hidden;
  }

  function reviewShellFrom(target) {
    return target?.closest?.('.air-bet-review-shell[data-air-bet-review="1"]') || null;
  }

  function panelNote(shell, text) {
    const note = shell?.querySelector?.('[data-mamo-allocation-note="1"]');
    if (note && text) note.textContent = text;
  }

  function missingLines(lines) {
    return (Array.isArray(lines) ? lines : []).filter((line) => !oddsNumber(line?.referenceOdds ?? line?.odds));
  }

  async function fetchTypeOdds(ctx, betType) {
    const response = await fetch(ODDS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: ctx.raceDate,
        venueCode: ctx.venueCode,
        raceNo: ctx.raceNo,
        betType,
      }),
    });
    if (!response?.ok) return null;
    const payload = await response.json();
    if (!payload?.ok || payload?.status !== "available") return null;
    return {
      values: payload?.odds?.values || {},
      fetchedAt: payload?.odds?.updatedAt || payload?.odds?.fetchedAt || new Date().toISOString(),
    };
  }

  async function recoverMissingOdds(shell) {
    const ctx = context();
    if (!ctx || !shell) return;
    resetForContext(ctx);
    const lines = rawLines();
    const missing = missingLines(lines);
    if (!missing.length) return;

    const requestKey = `${contextKey(ctx)}:${missing.map((line) => `${line.betType}:${normalizeCombination(line.combination ?? line.combo)}`).sort().join("|")}`;
    if (recoveryPromise && recoveryRequestKey === requestKey) return recoveryPromise;

    const apply = shell.querySelector('[data-mamo-auto-allocate="1"]');
    if (apply) apply.disabled = true;
    panelNote(shell, "参考オッズを取得中…");

    recoveryRequestKey = requestKey;
    recoveryPromise = (async () => {
      const types = [...new Set(missing.map((line) => String(line?.betType || "").trim()).filter(Boolean))];
      const results = await Promise.all(types.map(async (betType) => [betType, await fetchTypeOdds(ctx, betType)]));
      const byType = new Map(results);
      missing.forEach((line) => {
        const key = cacheKey(ctx, line);
        const combo = normalizeCombination(line?.combination ?? line?.combo);
        const payload = byType.get(String(line?.betType || "").trim());
        const value = oddsNumber(payload?.values?.[combo]);
        if (key && value) recoveredOdds.set(key, { value, fetchedAt: payload.fetchedAt });
      });

      const remaining = missingLines(enrichLines(rawLines(), ctx));
      window.MAMO_BET_REVIEW_ALLOCATION?.refresh?.();
      const liveShell = document.querySelector('.air-bet-review-shell[data-air-bet-review="1"]');
      if (liveShell) {
        sync(liveShell);
        if (remaining.length) {
          panelNote(liveShell, "一部の参考オッズを取得できませんでした。もう一度入力欄を開くと再取得します。");
        }
      }
    })().catch(() => {
      panelNote(shell, "参考オッズを取得できませんでした。もう一度入力欄を開くと再取得します。");
    }).finally(() => {
      recoveryPromise = null;
      recoveryRequestKey = "";
    });

    return recoveryPromise;
  }

  ensureDraftAdapter();

  document.addEventListener("click", (event) => {
    const target = event.target?.closest?.(
      '#reviewBetButton,.mamo-final-review,[data-mamo-budget-toggle="1"],[data-mamo-budget-close="1"],[data-mamo-budget-key],[data-mamo-budget-add],[data-mamo-auto-allocate="1"]'
    );
    if (!target) return;
    const shell = reviewShellFrom(target) || document.querySelector('.air-bet-review-shell[data-air-bet-review="1"]');
    queueMicrotask(() => {
      const liveShell = shell?.isConnected ? shell : document.querySelector('.air-bet-review-shell[data-air-bet-review="1"]');
      if (!liveShell) return;
      sync(liveShell);
      recoverMissingOdds(liveShell);
    });
  }, false);

  window.addEventListener("mamo:air-bet-allocation-applied", () => {
    const shell = document.querySelector('.air-bet-review-shell[data-air-bet-review="1"]');
    if (shell) sync(shell);
  });
})();
