/* MAMO BOAT — Race Carte snapshot enrichment v2
 * Backfills existing AIR BET records from synced official data.
 * No MutationObserver / no navigation rewrite / no race DOM rewrite.
 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_CARTE_SNAPSHOT_V2__) return;
  window.__MAMO_RACE_CARTE_SNAPSHOT_V2__ = true;

  const KEY = "mamoboat_v40_personal";
  const first = (...values) => values.find(v => v !== undefined && v !== null && v !== "");
  const safeNumber = value => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  function readState() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
    catch (_) { return null; }
  }
  function writeState(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (_) { return false; }
  }
  function orderedRecords(state) {
    return [...(state?.records || [])].filter(Boolean).sort((a,b) =>
      String(b.time || b.createdAt || b.raceDate || "").localeCompare(String(a.time || a.createdAt || a.raceDate || ""))
    );
  }

  function racerSnapshot(entry) {
    return {
      boatNumber: safeNumber(entry?.boatNumber),
      racerNumber: String(first(entry?.racerNumber, "")),
      name: String(first(entry?.name, "")),
      class: String(first(entry?.class, entry?.grade, "")),
      branch: String(first(entry?.branch, "")),
      age: safeNumber(entry?.age),
      weight: safeNumber(entry?.weight),
      nationalWinRate: safeNumber(first(entry?.nationalWinRate, entry?.nationalRate, entry?.winRate, entry?.zenkokuRate)),
      localWinRate: safeNumber(first(entry?.localWinRate, entry?.localRate, entry?.venueWinRate, entry?.touchiRate)),
      averageStart: safeNumber(first(entry?.averageStart, entry?.avgStart, entry?.averageST, entry?.stAverage)),
      flyingCount: safeNumber(first(entry?.flyingCount, entry?.fCount, entry?.F)),
      lateCount: safeNumber(first(entry?.lateCount, entry?.lCount, entry?.L)),
      motorNumber: safeNumber(first(entry?.motorNumber, entry?.motor)),
      motor2Rate: safeNumber(first(entry?.motor2Rate, entry?.motorSecondRate, entry?.motor2WinRate, entry?.motorRate)),
      boatNumberPart: safeNumber(first(entry?.boatPart, entry?.boatNumberPart, entry?.boat)),
      boat2Rate: safeNumber(first(entry?.boat2Rate, entry?.boatSecondRate, entry?.boat2WinRate, entry?.boatRate)),
      exhibitionTime: safeNumber(first(entry?.exhibitionTime, entry?.tenjiTime, entry?.displayTime)),
      exhibitionCourse: safeNumber(first(entry?.exhibitionCourse, entry?.course, entry?.entryCourse)),
    };
  }

  function environmentSnapshot(raceItem) {
    const source = first(
      raceItem?.environment,
      raceItem?.environmentSnapshot,
      raceItem?.conditions,
      raceItem?.result?.environment,
      raceItem?.result?.weather,
      {}
    );
    const obj = typeof source === "object" && source ? source : {};
    return {
      weather: String(first(obj.weather, obj.condition, raceItem?.weatherLabel, raceItem?.weather, "")),
      windDirection: String(first(obj.windDirection, obj.wind, raceItem?.windDirection, "")),
      windSpeed: safeNumber(first(obj.windSpeed, raceItem?.windSpeed)),
      waveHeight: safeNumber(first(obj.waveHeight, obj.wave, raceItem?.waveHeight)),
      airTemperature: safeNumber(first(obj.airTemperature, obj.temperature, raceItem?.airTemperature)),
      waterTemperature: safeNumber(first(obj.waterTemperature, raceItem?.waterTemperature)),
    };
  }

  function techniqueFromRace(raceItem) {
    return String(first(
      raceItem?.result?.kimarite,
      raceItem?.result?.winningMethod,
      raceItem?.result?.technique,
      raceItem?.kimarite,
      raceItem?.winningMethod,
      ""
    ));
  }

  function todayJst() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone:"Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit"
    }).format(new Date());
  }

  async function fetchJson(path) {
    const response = await fetch(`${path}?carte=${Date.now()}`, { cache:"no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function datasetFor(date) {
    const paths = date === todayJst()
      ? ["data/today.json", `data/${date}.json`]
      : [`data/${date}.json`];
    let lastError = null;
    for (const path of paths) {
      try {
        const data = await fetchJson(path);
        if (data?.venues?.length) return data;
      } catch (error) { lastError = error; }
    }
    throw lastError || new Error("dataset unavailable");
  }

  function findRace(dataset, record) {
    const venueCode = String(record?.venueCode || "").padStart(2,"0");
    const venue = (dataset?.venues || []).find(v => String(v?.code || "").padStart(2,"0") === venueCode);
    return venue?.races?.find(r => Number(r?.number) === Number(record?.raceNo)) || null;
  }

  function mergeRecord(record, raceItem) {
    if (!record || !raceItem) return false;
    let changed = false;

    const entries = Array.isArray(raceItem.entries) ? raceItem.entries.map(racerSnapshot) : [];
    if (entries.length && JSON.stringify(record.entrySnapshot || []) !== JSON.stringify(entries)) {
      record.entrySnapshot = entries;
      changed = true;
    }

    const env = environmentSnapshot(raceItem);
    const hasEnv = Object.values(env).some(v => v !== null && v !== "");
    if (hasEnv && JSON.stringify(record.environmentSnapshot || {}) !== JSON.stringify(env)) {
      record.environmentSnapshot = env;
      changed = true;
    }

    const technique = techniqueFromRace(raceItem);
    if (technique && record.resultTechnique !== technique) {
      record.resultTechnique = technique;
      changed = true;
    }

    if (raceItem?.result && JSON.stringify(record.resultSnapshot || null) !== JSON.stringify(raceItem.result)) {
      record.resultSnapshot = raceItem.result;
      changed = true;
    }

    if (changed || !record.snapshotCapturedAt) {
      record.snapshotCapturedAt = new Date().toISOString();
      record.snapshotVersion = 2;
    }
    return changed;
  }

  function activeCarteIndex() {
    const overlay = document.getElementById("mamoRaceCarteOverlay");
    if (!overlay || overlay.hidden) return null;
    const title = overlay.querySelector(".mamo-carte-hero h2")?.textContent || "";
    const list = orderedRecords(readState());
    const index = list.findIndex(r => title.includes(String(r?.venue || r?.venueName || "")) && title.includes(`${r?.raceNo}R`));
    return index >= 0 ? index : null;
  }

  function refreshOpenCarte() {
    const index = activeCarteIndex();
    if (index != null) window.MAMO_RACE_CARTE?.open?.(index);
  }

  function notify(detail) {
    window.dispatchEvent(new CustomEvent("mamo:race-carte-snapshot", { detail }));
    window.MAMO_RACE_CARTE?.refresh?.();
    refreshOpenCarte();
  }

  async function enrichRecordById(recordId) {
    const state = readState();
    if (!state || !Array.isArray(state.records)) return false;
    const record = state.records.find(r => r?.id === recordId);
    if (!record?.raceDate || !record?.venueCode || !record?.raceNo) return false;
    try {
      const raceItem = findRace(await datasetFor(record.raceDate), record);
      if (!raceItem) return false;
      if (!mergeRecord(record, raceItem)) return false;
      writeState(state);
      notify({ recordId, backfill:true });
      return true;
    } catch (error) {
      console.warn("レースカルテ補完に失敗しました", error);
      return false;
    }
  }

  async function backfill(limit = 100) {
    const state = readState();
    if (!state || !Array.isArray(state.records) || !state.records.length) return false;
    const targets = [...state.records].reverse()
      .filter(r => r?.raceDate && r?.venueCode && r?.raceNo)
      .slice(0, Math.max(1, limit));
    const datasets = new Map();
    for (const date of [...new Set(targets.map(r => r.raceDate))]) {
      try { datasets.set(date, await datasetFor(date)); } catch (_) {}
    }
    let changed = false;
    for (const record of targets) {
      const raceItem = findRace(datasets.get(record.raceDate), record);
      if (raceItem && mergeRecord(record, raceItem)) changed = true;
    }
    if (changed) {
      writeState(state);
      notify({ backfill:true, count:targets.length });
    }
    return changed;
  }

  function wrapPlaceBet() {
    const original = window.placeBet;
    if (typeof original !== "function" || original.__mamoCarteWrapped) return;
    const wrapped = function(...args) {
      const before = readState();
      const beforeIds = new Set((before?.records || []).map(r => r?.id));
      const result = original.apply(this, args);
      setTimeout(() => {
        const after = readState();
        const created = [...(after?.records || [])].reverse().find(r => r?.id && !beforeIds.has(r.id));
        if (created?.id) enrichRecordById(created.id);
      }, 0);
      return result;
    };
    wrapped.__mamoCarteWrapped = true;
    window.placeBet = wrapped;
  }

  function enhanceClicks() {
    document.addEventListener("click", event => {
      const carteButton = event.target?.closest?.(".mamo-carte-btn");
      if (carteButton) {
        const index = Number(carteButton.dataset.raceCarteIndex);
        const record = orderedRecords(readState())[index];
        if (record?.id) {
          enrichRecordById(record.id);
          setTimeout(() => enrichRecordById(record.id), 900);
          setTimeout(() => enrichRecordById(record.id), 2400);
        }
      }
      if (event.target?.closest?.("#nav-records")) setTimeout(() => backfill(100), 0);
    }, { passive:true });
  }

  function boot() {
    wrapPlaceBet();
    enhanceClicks();
    backfill(100);
    setTimeout(() => backfill(100), 1500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();

  window.MAMO_RACE_CARTE_SNAPSHOT = Object.freeze({ backfill, enrichRecordById });
})();
