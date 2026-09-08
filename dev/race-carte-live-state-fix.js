/* MAMO BOAT — Race Carte live state fix v1
 * Prevents official fields from flashing "未保存" while the synced snapshot is still loading.
 * Triggers bounded enrichment when Carte/environment is opened and refreshes the open sheet.
 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_CARTE_LIVE_STATE_FIX_V1__) return;
  window.__MAMO_RACE_CARTE_LIVE_STATE_FIX_V1__ = true;

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

  function paintLoadingIfNeeded(){
    const overlay = document.getElementById("mamoRaceCarteOverlay");
    if (!overlay || overlay.hidden) return;
    const record = activeRecord();
    if (!record || hasEnvironment(record)) return;

    const activeTab = [...overlay.querySelectorAll(".mamo-carte-tab")].find(t => t.classList.contains("active"));
    if (!activeTab || !/環境情報/.test(activeTab.textContent || "")) return;

    overlay.querySelectorAll(".mamo-carte-kv b").forEach(el => {
      const t = String(el.textContent || "").trim();
      if (t === "未保存" || t === "—") el.textContent = loadingText;
    });
  }

  async function enrichActive(){
    const record = activeRecord();
    if (!record?.id) return;
    paintLoadingIfNeeded();
    try {
      const changed = await window.MAMO_RACE_CARTE_SNAPSHOT?.enrichRecordById?.(record.id);
      if (!changed) window.MAMO_RACE_CARTE?.refresh?.();
    } catch (_) {}
  }

  function boundedEnrich(){
    enrichActive();
    setTimeout(enrichActive, 250);
    setTimeout(enrichActive, 900);
  }

  document.addEventListener("click", event => {
    if (event.target?.closest?.(".mamo-carte-btn,[data-rx-carte]")) {
      setTimeout(boundedEnrich, 0);
      return;
    }
    const tab = event.target?.closest?.(".mamo-carte-tab");
    if (tab && /環境情報/.test(tab.textContent || "")) setTimeout(boundedEnrich, 0);
  }, true);

  window.addEventListener("mamo:race-carte-snapshot", () => {
    const record = activeRecord();
    if (record && hasEnvironment(record)) window.MAMO_RACE_CARTE?.open?.(orderedRecords().findIndex(r => r?.id === record.id));
  });

  window.addEventListener("pageshow", () => setTimeout(paintLoadingIfNeeded, 0));
})();
