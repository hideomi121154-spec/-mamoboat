/* MAMO BOAT — Race Carte snapshot enrichment v1
 * Enriches AIR BET records with the race data available in the synced dataset.
 * No MutationObserver / no navigation rewrite / no race DOM rewrite.
 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_CARTE_SNAPSHOT_V1__) return;
  window.__MAMO_RACE_CARTE_SNAPSHOT_V1__ = true;

  const KEY = "mamoboat_v40_personal";
  const safeNumber = value => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  const first = (...values) => values.find(v => v !== undefined && v !== null && v !== "");

  function readState() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
    catch (_) { return null; }
  }
  function writeState(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (_) { return false; }
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
      raceItem?.weather,
      raceItem?.conditions,
      raceItem?.result?.environment,
      raceItem?.result?.weather,
      {}
    );
    const obj = typeof source === "object" && source ? source : {};
    return {
      weather: String(first(obj.weather, obj.condition, raceItem?.weatherLabel, "")),
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

  async function datasetFor(date) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const path = date === today ? "data/today.json" : `data/${date}.json`;
    const response = await fetch(`${path}?carte=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function findRace(dataset, record) {
    const venue = (dataset?.venues || []).find(v => String(v?.code) === String(record?.venueCode));
    return venue?.races?.find(r => Number(r?.number) === Number(record?.raceNo)) || null;
  }

  function mergeRecord(record, raceItem) {
    if (!record || !raceItem) return false;
    let changed = false;
    const entries = Array.isArray(raceItem.entries) ? raceItem.entries.map(racerSnapshot) : [];
    if (entries.length) {
      const before = JSON.stringify(record.entrySnapshot || []);
      const after = JSON.stringify(entries);
      if (before !== after) { record.entrySnapshot = entries; changed = true; }
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

    if (raceItem?.result && !record.resultSnapshot) {
      record.resultSnapshot = raceItem.result;
      changed = true;
    }
    if (!record.snapshotCapturedAt) {
      record.snapshotCapturedAt = new Date().toISOString();
      changed = true;
    }
    record.snapshotVersion = 1;
    return changed;
  }

  async function enrichRecordById(recordId) {
    const state = readState();
    if (!state || !Array.isArray(state.records)) return false;
    const record = state.records.find(r => r?.id === recordId);
    if (!record?.raceDate || !record?.venueCode || !record?.raceNo) return false;
    try {
      const dataset = await datasetFor(record.raceDate);
      const raceItem = findRace(dataset, record);
      if (!raceItem || !mergeRecord(record, raceItem)) return false;
      writeState(state);
      window.dispatchEvent(new CustomEvent("mamo:race-carte-snapshot", { detail: { recordId } }));
      window.MAMO_RACE_CARTE?.refresh?.();
      return true;
    } catch (error) {
      console.warn("レースカルテ用スナップショット取得に失敗しました", error);
      return false;
    }
  }

  async function backfill(limit = 20) {
    const state = readState();
    if (!state || !Array.isArray(state.records) || !state.records.length) return;
    const targets = [...state.records].reverse().filter(r => r?.raceDate && r?.venueCode && r?.raceNo).slice(0, limit);
    const dates = [...new Set(targets.map(r => r.raceDate))];
    const datasets = new Map();
    for (const date of dates) {
      try { datasets.set(date, await datasetFor(date)); } catch (_) {}
    }
    let changed = false;
    for (const record of targets) {
      const dataset = datasets.get(record.raceDate);
      const raceItem = dataset ? findRace(dataset, record) : null;
      if (raceItem && mergeRecord(record, raceItem)) changed = true;
    }
    if (changed) {
      writeState(state);
      window.dispatchEvent(new CustomEvent("mamo:race-carte-snapshot", { detail: { backfill: true } }));
      window.MAMO_RACE_CARTE?.refresh?.();
    }
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

  function enhanceOpenCarteDisplay() {
    document.addEventListener("click", event => {
      const carteButton = event.target?.closest?.(".mamo-carte-btn");
      if (carteButton) {
        const index = Number(carteButton.dataset.raceCarteIndex);
        const state = readState();
        const ordered = [...(state?.records || [])].filter(Boolean).sort((a,b) => String(b.time || b.createdAt || b.raceDate || "").localeCompare(String(a.time || a.createdAt || a.raceDate || "")));
        const record = ordered[index];
        if (record?.id) enrichRecordById(record.id);
      }
      const racerTab = event.target?.closest?.('[data-carte-tab="racers"]');
      if (!racerTab) return;
      setTimeout(() => {
        const panel = document.querySelector('[data-carte-panel="racers"] .mamo-carte-block');
        if (!panel) return;
        const overlay = document.getElementById("mamoRaceCarteOverlay");
        const title = overlay?.querySelector(".mamo-carte-hero h2")?.textContent || "";
        const state = readState();
        const record = [...(state?.records || [])].reverse().find(r => title.includes(String(r?.venue || "")) && title.includes(`${r?.raceNo}R`));
        const entries = record?.entrySnapshot || [];
        if (!entries.length) return;
        panel.innerHTML = `<h3>AIR BET時点の選手・艇データ</h3><div class="mamo-carte-racers">${entries.map(e => {
          const rate = v => v == null ? "—" : Number(v).toFixed(2);
          const pct = v => v == null ? "—" : `${Number(v).toFixed(1)}%`;
          return `<div class="mamo-carte-racer" style="grid-template-columns:34px 1fr"><i>${e.boatNumber}</i><div><b>${e.name || `${e.boatNumber}号艇`} / ${e.class || "—"}</b><span style="display:block;margin-top:3px">全国 ${rate(e.nationalWinRate)} / 当地 ${rate(e.localWinRate)} / ST ${e.averageStart == null ? "—" : Number(e.averageStart).toFixed(2)} / F${e.flyingCount ?? "—"} L${e.lateCount ?? "—"}</span><span style="display:block;margin-top:2px">M${e.motorNumber ?? "—"} 2連率 ${pct(e.motor2Rate)} / B${e.boatNumberPart ?? "—"} 2連率 ${pct(e.boat2Rate)} / 展示 ${e.exhibitionTime ?? "—"}</span></div></div>`;
        }).join("")}</div><div class="mamo-carte-note">AIR BET時点で公式同期データに存在した値を保存します。公式同期元にない項目は「—」表示です。</div>`;
      }, 0);
    }, { passive: true });
  }

  function boot() {
    wrapPlaceBet();
    enhanceOpenCarteDisplay();
    backfill();
    document.addEventListener("click", event => {
      if (event.target?.closest?.("#nav-records")) setTimeout(() => backfill(), 0);
    }, { passive: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.MAMO_RACE_CARTE_SNAPSHOT = Object.freeze({ backfill, enrichRecordById });
})();
