/* MAMO BOAT — Race Carte live state fix v2
 * Prevents official fields from remaining "未保存" when the synced snapshot has newer data.
 * Triggers bounded enrichment when Carte/environment is opened and refreshes the open sheet.
 * Legacy AIR BET records without an id are refreshed through snapshot backfill as well.
 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_CARTE_LIVE_STATE_FIX_V2__) return;
  window.__MAMO_RACE_CARTE_LIVE_STATE_FIX_V2__ = true;

  const KEY = "mamoboat_v40_personal";
  const loadingText = "取得中…";

  function readState(){
    try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; }
    catch (_) { return {}; }
  }

  function orderedRecords(){
    const s = readState();
    const a = Array.isArray(s.records) ? s.records : [];
    return a.filter(Boolean).slice().sort((x,y)=>String(y.time||y.createdAt||y.raceDate||"").localeCompare(String(x.time||x.createdAt||x.raceDate||"")));
  }

  function activeRecord(){
    const overlay = document.getElementById("mamoRaceCarteOverlay");
    if (!overlay || overlay.hidden) return null;
    const title = String(overlay.querySelector(".mamo-carte-hero h2")?.textContent || "").replace(/\s+/g, "");
    const list = orderedRecords();
    return list.find(r => {
      const venue = String(r.venue || r.venueName || "").replace(/\s+/g, "");
      const race = String(r.raceNo || r.race || "").replace(/R$/i, "");
      return venue && race && title.includes(venue) && title.includes(`${race}R`);
    }) || null;
  }

  function hasEnvironment(record){
    const e = record?.environmentSnapshot || record?.weatherSnapshot || record?.conditions || record?.environment || {};
    return !![
      e.weather, e.condition, record?.weather,
      e.windDirection, e.wind, record?.windDirection,
      e.windSpeed, record?.windSpeed,
      e.waveHeight, e.wave, record?.waveHeight,
      e.airTemperature, e.temperature, record?.airTemperature,
      e.waterTemperature, record?.waterTemperature
    ].find(v => v !== undefined && v !== null && String(v).trim() !== "");
  }

  function hasTechnique(record){
    return !![
      record?.resultTechnique,
      record?.resultSnapshot?.kimarite,
      record?.resultSnapshot?.winningMethod,
      record?.resultSnapshot?.technique,
      record?.kimarite,
      record?.winningMethod,
      record?.technique
    ].find(v => v !== undefined && v !== null && String(v).trim() !== "" && String(v).trim() !== "未保存");
  }

  function paintLoadingIfNeeded(){
    const overlay = document.getElementById("mamoRaceCarteOverlay");
    if (!overlay || overlay.hidden) return;
    const record = activeRecord();
    if (!record) return;

    const activeTab = [...overlay.querySelectorAll(".mamo-carte-tab")].find(t => t.classList.contains("active"));
    if (activeTab && /環境情報/.test(activeTab.textContent || "") && !hasEnvironment(record)) {
      overlay.querySelectorAll(".mamo-carte-kv b").forEach(el => {
        const t = String(el.textContent || "").trim();
        if (t === "未保存" || t === "—") el.textContent = loadingText;
      });
    }

    if (!hasTechnique(record)) {
      overlay.querySelectorAll(".mamo-carte-kv").forEach(card => {
        const label = String(card.querySelector("span")?.textContent || "").trim();
        const value = card.querySelector("b");
        if (value && /決まり手/.test(label) && ["未保存","—"].includes(String(value.textContent || "").trim())) {
          value.textContent = loadingText;
        }
      });
    }
  }

  async function enrichActive(){
    const record = activeRecord();
    if (!record) return;
    paintLoadingIfNeeded();
    try {
      const api = window.MAMO_RACE_CARTE_SNAPSHOT;
      let changed = false;
      if (record.id && api?.enrichRecordById) {
        changed = !!(await api.enrichRecordById(record.id));
      }
      // Older records do not always have an id. Also use backfill when the
      // id-based refresh found nothing, so newly published kimarite can reach
      // an already settled local AIR BET record.
      if ((!record.id || !changed || !hasTechnique(record)) && api?.backfill) {
        changed = !!(await api.backfill(100)) || changed;
      }
      if (!changed) window.MAMO_RACE_CARTE?.refresh?.();
    } catch (_) {
      window.MAMO_RACE_CARTE?.refresh?.();
    }
  }

  function boundedEnrich(){
    enrichActive();
    setTimeout(enrichActive, 300);
    setTimeout(enrichActive, 1100);
  }

  document.addEventListener("click", event => {
    if (event.target?.closest?.(".mamo-carte-btn,[data-rx-carte]")) {
      setTimeout(boundedEnrich, 0);
      return;
    }
    const tab = event.target?.closest?.(".mamo-carte-tab");
    if (tab && /環境情報|カルテ/.test(tab.textContent || "")) setTimeout(boundedEnrich, 0);
  }, true);

  window.addEventListener("mamo:race-carte-snapshot", () => {
    const record = activeRecord();
    if (!record) return;
    const list = orderedRecords();
    const index = record.id
      ? list.findIndex(r => r?.id === record.id)
      : list.findIndex(r => r === record || (
          String(r?.venue || r?.venueName || "") === String(record?.venue || record?.venueName || "") &&
          String(r?.raceNo || r?.race || "") === String(record?.raceNo || record?.race || "") &&
          String(r?.raceDate || r?.date || "") === String(record?.raceDate || record?.date || "")
        ));
    if (index >= 0) window.MAMO_RACE_CARTE?.open?.(index);
  });

  window.addEventListener("pageshow", () => {
    setTimeout(paintLoadingIfNeeded, 0);
    setTimeout(() => window.MAMO_RACE_CARTE_SNAPSHOT?.backfill?.(100), 150);
  });
})();
