/*
 * MAMO BOAT Decision Conflict Core v1
 *
 * Separates information-led reconsideration from repeated, uninformed
 * approach/avoidance movement immediately before a REAL transition.
 * The core is intentionally DOM-free so the thresholds can be regression tested.
 */
((root, factory) => {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MAMO_DECISION_CONFLICT_CORE = Object.freeze(api);
})(typeof window !== "undefined" ? window : globalThis, () => {
  "use strict";

  const VERSION = 1;

  function asCount(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  function normalizeSnapshot(value) {
    const text = String(value == null ? "" : value).trim();
    return text || null;
  }

  function direction(previous, next) {
    if (next > previous) return 1;
    if (next < previous) return -1;
    return 0;
  }

  function createTracker(options = {}) {
    const startedAt = Number(options.startedAt) || Date.now();
    const state = {
      startedAt,
      informationViews: 0,
      informationKinds: new Set(),
      selectionChanges: 0,
      selectionReversals: 0,
      informedSelectionChanges: 0,
      uninformedSelectionChanges: 0,
      informedSelectionReversals: 0,
      uninformedSelectionReversals: 0,
      amountChanges: 0,
      amountDirectionChanges: 0,
      informedAmountChanges: 0,
      uninformedAmountChanges: 0,
      informedAmountDirectionChanges: 0,
      uninformedAmountDirectionChanges: 0,
      reviewOpens: 0,
      reviewReturns: 0,
      reviewLoopsWithoutInformation: 0,
      reviewLoopsWithInformation: 0,
    };

    let informationVersion = 0;
    let selectionInformationVersion = 0;
    let amountInformationVersion = 0;
    let selectionHistory = [];
    let lastSelection = null;
    let lastAmount = null;
    let lastAmountDirection = 0;
    let reviewOpen = false;
    let lastReviewReturnInformationVersion = null;

    function recordInformation(kind = "other") {
      informationVersion += 1;
      state.informationViews += 1;
      state.informationKinds.add(String(kind || "other").slice(0, 40));
      return summary();
    }

    function resetSelection(snapshot = null) {
      lastSelection = normalizeSnapshot(snapshot);
      selectionHistory = lastSelection ? [lastSelection] : [];
      selectionInformationVersion = informationVersion;
      return summary();
    }

    function recordSelection(snapshot) {
      const next = normalizeSnapshot(snapshot);
      if (!next) return summary();
      if (lastSelection == null) {
        lastSelection = next;
        selectionHistory = [next];
        selectionInformationVersion = informationVersion;
        return summary();
      }
      if (next === lastSelection) return summary();

      const informed = informationVersion > selectionInformationVersion;
      selectionInformationVersion = informationVersion;
      state.selectionChanges += 1;
      if (informed) state.informedSelectionChanges += 1;
      else state.uninformedSelectionChanges += 1;

      const isReturn = selectionHistory.slice(0, -1).includes(next);
      if (isReturn) {
        state.selectionReversals += 1;
        if (informed) state.informedSelectionReversals += 1;
        else state.uninformedSelectionReversals += 1;
      }

      lastSelection = next;
      selectionHistory.push(next);
      if (selectionHistory.length > 12) selectionHistory = selectionHistory.slice(-12);
      return summary();
    }

    function recordAmount(value) {
      const next = Number(value);
      if (!Number.isFinite(next) || next < 0) return summary();
      if (lastAmount == null) {
        lastAmount = next;
        amountInformationVersion = informationVersion;
        return summary();
      }
      const nextDirection = direction(lastAmount, next);
      if (!nextDirection) return summary();

      const informed = informationVersion > amountInformationVersion;
      amountInformationVersion = informationVersion;
      state.amountChanges += 1;
      if (informed) state.informedAmountChanges += 1;
      else state.uninformedAmountChanges += 1;

      if (lastAmountDirection && nextDirection !== lastAmountDirection) {
        state.amountDirectionChanges += 1;
        if (informed) state.informedAmountDirectionChanges += 1;
        else state.uninformedAmountDirectionChanges += 1;
      }
      lastAmountDirection = nextDirection;
      lastAmount = next;
      return summary();
    }

    function recordReviewOpen() {
      if (reviewOpen) return summary();
      state.reviewOpens += 1;
      if (lastReviewReturnInformationVersion != null) {
        if (informationVersion > lastReviewReturnInformationVersion) {
          state.reviewLoopsWithInformation += 1;
        } else {
          state.reviewLoopsWithoutInformation += 1;
        }
      }
      reviewOpen = true;
      return summary();
    }

    function recordReviewReturn() {
      if (!reviewOpen) return summary();
      state.reviewReturns += 1;
      lastReviewReturnInformationVersion = informationVersion;
      reviewOpen = false;
      return summary();
    }

    function recordReviewClosed() {
      reviewOpen = false;
      return summary();
    }

    function summary() {
      return Object.freeze({
        version: VERSION,
        startedAt: state.startedAt,
        informationViews: state.informationViews,
        informationKinds: [...state.informationKinds].sort(),
        selectionChanges: state.selectionChanges,
        selectionReversals: state.selectionReversals,
        informedSelectionChanges: state.informedSelectionChanges,
        uninformedSelectionChanges: state.uninformedSelectionChanges,
        informedSelectionReversals: state.informedSelectionReversals,
        uninformedSelectionReversals: state.uninformedSelectionReversals,
        amountChanges: state.amountChanges,
        amountDirectionChanges: state.amountDirectionChanges,
        informedAmountChanges: state.informedAmountChanges,
        uninformedAmountChanges: state.uninformedAmountChanges,
        informedAmountDirectionChanges: state.informedAmountDirectionChanges,
        uninformedAmountDirectionChanges: state.uninformedAmountDirectionChanges,
        reviewOpens: state.reviewOpens,
        reviewReturns: state.reviewReturns,
        reviewLoopsWithoutInformation: state.reviewLoopsWithoutInformation,
        reviewLoopsWithInformation: state.reviewLoopsWithInformation,
      });
    }

    return Object.freeze({
      recordInformation,
      resetSelection,
      recordSelection,
      recordAmount,
      recordReviewOpen,
      recordReviewReturn,
      recordReviewClosed,
      summary,
    });
  }

  function evaluate(input = {}) {
    const summary = {
      informationViews: asCount(input.informationViews),
      selectionChanges: asCount(input.selectionChanges),
      selectionReversals: asCount(input.selectionReversals),
      informedSelectionChanges: asCount(input.informedSelectionChanges),
      uninformedSelectionChanges: asCount(input.uninformedSelectionChanges),
      uninformedSelectionReversals: asCount(input.uninformedSelectionReversals),
      amountChanges: asCount(input.amountChanges),
      amountDirectionChanges: asCount(input.amountDirectionChanges),
      informedAmountChanges: asCount(input.informedAmountChanges),
      uninformedAmountChanges: asCount(input.uninformedAmountChanges),
      uninformedAmountDirectionChanges: asCount(input.uninformedAmountDirectionChanges),
      reviewOpens: asCount(input.reviewOpens),
      reviewReturns: asCount(input.reviewReturns),
      reviewLoopsWithoutInformation: asCount(input.reviewLoopsWithoutInformation),
      reviewLoopsWithInformation: asCount(input.reviewLoopsWithInformation),
    };

    const totalChanges = summary.selectionChanges + summary.amountChanges;
    const informedChanges = summary.informedSelectionChanges + summary.informedAmountChanges;
    const uninformedRevisions = summary.uninformedSelectionChanges
      + summary.uninformedAmountChanges
      + summary.reviewLoopsWithoutInformation;
    const informedRatio = totalChanges ? informedChanges / totalChanges : 0;

    const reviewStrong = summary.reviewReturns >= 2
      && summary.reviewLoopsWithoutInformation >= 1;
    const selectionModerate = summary.uninformedSelectionReversals >= 1;
    const selectionStrong = summary.uninformedSelectionReversals >= 2;
    const amountModerate = summary.uninformedAmountDirectionChanges >= 1;
    const amountStrong = summary.uninformedAmountDirectionChanges >= 2;
    const multiSignal = (reviewStrong && (selectionModerate || amountModerate))
      || (selectionStrong && amountModerate)
      || (amountStrong && selectionModerate);
    const informationDominant = totalChanges >= 2
      && informedRatio >= 0.6
      && summary.informationViews >= 1;

    let score = 0;
    if (reviewStrong) score += 35;
    else if (summary.reviewReturns >= 1) score += 10;
    if (selectionStrong) score += 30;
    else if (selectionModerate) score += 15;
    if (amountStrong) score += 25;
    else if (amountModerate) score += 10;
    if (summary.reviewLoopsWithoutInformation >= 1) score += 10;
    if (uninformedRevisions >= 3) score += 15;
    if (informationDominant) score -= 35;
    score = Math.max(0, Math.min(100, score));

    const shouldPause = multiSignal
      && uninformedRevisions >= 3
      && !informationDominant
      && score >= 60;

    let classification = "stable";
    if (shouldPause) classification = "conflict_high";
    else if (informationDominant) classification = "deliberation";
    else if (reviewStrong || selectionModerate || amountModerate) classification = "conflict_candidate";

    const reasons = [];
    if (reviewStrong) reasons.push("repeated_review_return");
    if (selectionModerate) reasons.push("selection_return");
    if (amountModerate) reasons.push("amount_direction_change");
    if (informationDominant) reasons.push("information_led_changes");

    return Object.freeze({
      version: VERSION,
      classification,
      score,
      shouldPause,
      reasons: Object.freeze(reasons),
      totalChanges,
      informedChanges,
      uninformedRevisions,
      informedRatio,
      informationDominant,
      reviewStrong,
      selectionStrong,
      amountStrong,
      ...summary,
    });
  }

  return Object.freeze({ VERSION, createTracker, evaluate });
});
