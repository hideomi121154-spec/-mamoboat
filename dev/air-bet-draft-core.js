/* MAMO BOAT — immutable AIR BET draft tray rules. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MamoAirBetDraftCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MODES = new Set(["normal", "box", "form"]);

  function normalizeAmount(value) {
    const raw = String(value ?? "").replaceAll(",", "").trim();
    if (!raw) return null;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric < 100) return null;
    return Math.floor(numeric / 100) * 100;
  }

  function normalizeOdds(value) {
    const match = String(value ?? "").trim().match(/^([0-9]+(?:\.[0-9]+)?)/);
    const numeric = match ? Number(match[1]) : NaN;
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }

  function normalizeCombination(value) {
    const boats = Array.isArray(value)
      ? value
      : String(value ?? "").split(/[^0-9]+/).filter(Boolean);
    const normalized = boats.map(Number).filter((boat) => Number.isInteger(boat) && boat >= 1 && boat <= 6);
    return normalized.join("-");
  }

  function createLine(input = {}) {
    const betType = String(input.betType || "").trim();
    const mode = MODES.has(input.mode) ? input.mode : "normal";
    const combination = normalizeCombination(input.combination ?? input.combo);
    if (!betType || !combination) return null;
    return {
      betType,
      mode,
      combination,
      amount: normalizeAmount(input.amount ?? input.stake),
      referenceOdds: normalizeOdds(input.referenceOdds ?? input.odds),
      oddsFetchedAt: input.oddsFetchedAt || input.oddsCapturedAt || null,
      oddsSource: input.oddsSource || null,
      oddsTimeSource: input.oddsTimeSource || null,
    };
  }

  function lineKey(line) {
    const normalized = createLine(line);
    return normalized ? `${normalized.betType}:${normalized.combination}` : "";
  }

  function appendUnique(lines, candidates) {
    const next = (lines || []).map(createLine).filter(Boolean);
    const seen = new Set(next.map(lineKey));
    const added = [];
    const duplicates = [];
    (candidates || []).forEach((candidate) => {
      const line = createLine(candidate);
      if (!line) return;
      const key = lineKey(line);
      if (seen.has(key)) {
        duplicates.push(line);
        return;
      }
      seen.add(key);
      next.push(line);
      added.push(line);
    });
    return { lines: next, added, duplicates };
  }

  function removeAt(lines, index) {
    return (lines || []).filter((_, current) => current !== Number(index)).map(createLine).filter(Boolean);
  }

  function setAmount(lines, index, amount) {
    const normalized = normalizeAmount(amount);
    return (lines || []).map((line, current) => {
      const next = createLine(line);
      return current === Number(index) ? { ...next, amount: normalized } : next;
    }).filter(Boolean);
  }

  function setAllAmounts(lines, amount) {
    const normalized = normalizeAmount(amount);
    if (!normalized) return (lines || []).map(createLine).filter(Boolean);
    return (lines || []).map((line) => ({ ...createLine(line), amount: normalized })).filter((line) => line.betType);
  }

  function addAllAmounts(lines, increment) {
    const normalizedIncrement = normalizeAmount(increment);
    if (!normalizedIncrement) return snapshot(lines);
    return (lines || []).map((line) => {
      const normalized = createLine(line);
      if (!normalized) return null;
      return {
        ...normalized,
        amount: (normalized.amount || 0) + normalizedIncrement,
      };
    }).filter(Boolean);
  }

  function total(lines) {
    return (lines || []).reduce((sum, line) => sum + (createLine(line)?.amount || 0), 0);
  }

  function incompleteCount(lines) {
    return (lines || []).filter((line) => !createLine(line)?.amount).length;
  }

  function expandBox(boats, picks, ordered) {
    const unique = [...new Set((boats || []).map(Number).filter((boat) => Number.isInteger(boat) && boat >= 1 && boat <= 6))];
    const output = [];
    const walk = (selected, remaining, start) => {
      if (selected.length === Number(picks)) {
        output.push(selected);
        return;
      }
      for (let index = start; index < remaining.length; index += 1) {
        const boat = remaining[index];
        if (selected.includes(boat)) continue;
        walk([...selected, boat], remaining, ordered ? 0 : index + 1);
      }
    };
    walk([], unique, 0);
    return output;
  }

  function expandFormation(groups) {
    const normalized = (groups || []).map((group) => [...new Set([...group].map(Number))]);
    const output = [];
    const walk = (index, selected) => {
      if (index === normalized.length) {
        output.push(selected);
        return;
      }
      normalized[index].forEach((boat) => {
        if (!selected.includes(boat)) walk(index + 1, [...selected, boat]);
      });
    };
    if (normalized.length && normalized.every((group) => group.length)) walk(0, []);
    return output;
  }

  function snapshot(lines) {
    return (lines || []).map((line) => ({ ...createLine(line) })).filter((line) => line.betType);
  }

  return Object.freeze({
    addAllAmounts,
    appendUnique,
    createLine,
    expandBox,
    expandFormation,
    incompleteCount,
    lineKey,
    normalizeAmount,
    normalizeCombination,
    normalizeOdds,
    removeAt,
    setAllAmounts,
    setAmount,
    snapshot,
    total,
  });
});
