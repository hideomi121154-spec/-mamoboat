/* MAMO BOAT — Race Carte live state fix v3
 * Prevents official fields from remaining "未保存" when the synced snapshot has newer data.
 * Triggers bounded enrichment when Carte/environment is opened and refreshes the open sheet.
 * Legacy AIR BET records without an id are refreshed through snapshot backfill as well.
 * Fixes date-only raceDate values being rendered as 09:00 JST by preferring the real record timestamp.
 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_CARTE_LIVE_STATE_FIX_V3__) return;
  window.__MAMO_RACE_CARTE_LIVE_STATE_FIX_V3__ = true;
  window.__MAMO_RACE_CARTE_LIVE_STATE_FIX_V2__ = true;

  const KEY = "mamoboat_v40_personal";
  const loadingText = "取得中…";
  const VENUES = {
    "01":"桐生","02":"戸田","03":"江戸川","04":"平和島","05":"多摩川","06":"浜名湖",
    "07":"蒲郡","08":"常滑","09":"津","10":"三国","11":"びわこ","12":"住之江",
    "13":"尼崎","14":"鳴門","15":"丸亀","16":"児島","17":"宮島","18":"徳山",
    "19":"下関","20":"若松","21":"芦屋","22":"福岡","23":"唐津","24":"大村"
  };

  function readState(){
    try { return JSON.parse(localStorage.getItem(KEY) || "null") || {}; }
    catch (_) { return {}; }
  }

  function orderedRecords(){
    const s = readState();
    const a = Array.isArray(s.records) ? s.records : [];
    return a.filter(Boolean).slice().sort((x,y)=>String(y.time||y.createdAt||y.raceDate||"").localeCompare(String(x.time||x.createdAt||x.raceDate||"")));
  }

  function venueLabel(record){
    const direct = String(record?.venue || record?.venueName || "").replace(/\s+/g, "");
    if (direct) return direct;
    const code = String(record?.venueCode || record?.jcd || "").replace(/\D/g, "").padStart(2, "0");
    return VENUES[code] || "";
  }

  function activeRecord(){
    const overlay = document.getElementById("mamoRaceCarteOverlay");
    if (!overlay || overlay.hidden) return null;
    const title = String(overlay.querySelector(".mamo-carte-hero h2")?.textContent || "").replace(/\s+/g, "");
    const list = orderedRecords();
    return list.find(r => {
      const venue = venueLabel(r);
      const race = String(r.raceNo || r.race || "").replace(/R$/i, "");
      return venue && race && title.includes(venue) && title.includes(`${race}R`);
    }) || null;
  }

  function isDateOnly(value){
    return /^\d{4}[-/]\d{2}[-/]\d{2}$/.test(String(value ?? "").trim());
  }

  function isClockOnly(value){
    return /^\d{1,2}:\d{2}(?::\d{2})?$/.test(String(value ?? "").trim());
  }

  function formatJst(value, includeTime){
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "";
      const options = { timeZone:"Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit" };
      if (includeTime) {
        options.hour = "2-digit";
        options.minute = "2-digit";
        options.hour12 = false;
      }
      return new Intl.DateTimeFormat("ja-JP", options).format(d);
    } catch (_) {
      return "";
    }
  }

  function dateOnlyLabel(value){
    const raw = String(value ?? "").trim();
    const m = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
    if (m) return `${m[1]}/${m[2]}/${m[3]}`;
    return formatJst(value, false);
  }

  function recordTimeLabel(record){
    // Prefer an explicit race/schedule timestamp when one exists.
    const explicit = [
      record?.raceStartAt, record?.startAt, record?.scheduledAt,
      record?.deadlineAt, record?.closingAt, record?.closeAt
    ].find(v => v != null && String(v).trim() && !isDateOnly(v));
    if (explicit) {
      const label = formatJst(explicit, true);
      if (label) return label;
    }

    // The record list already uses these real timestamps. Prefer them over a
    // date-only raceDate so "2026-09-08" never becomes a fake 09:00 JST.
    const recorded = [record?.time, record?.createdAt].find(v => v != null && String(v).trim() && !isDateOnly(v) && !isClockOnly(v));
    if (recorded) {
      const label = formatJst(recorded, true);
      if (label) return label;
    }

    // Some legacy records keep only HH:mm plus raceDate.
    const clock = [record?.raceTime, record?.startTime, record?.time].find(isClockOnly);
    const baseDate = [record?.raceDate, record?.date].find(v => v != null && String(v).trim());
    if (clock && baseDate) {
      const date = String(baseDate).trim().slice(0, 10).replaceAll("/", "-");
      const label = formatJst(`${date}T${String(clock).trim()}+09:00`, true);
      if (label) return label;
    }

    // If we truly only know the date, show only the date. Never invent 09:00.
    if (baseDate) return dateOnlyLabel(baseDate) || String(baseDate).slice(0, 10);
    return "日付不明";
  }

  function paintRecordTime(){
    const overlay = document.getElementById("mamoRaceCarteOverlay");
    if (!overlay || overlay.hidden) return;
    const record = activeRecord();
    if (!record) return;
    const target = overlay.querySelector(".mamo-carte-hero p");
    if (!target) return;
    const label = recordTimeLabel(record);
    if (label && target.textContent !== label) target.textContent = label;
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

    paintRecordTime();

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
      setTimeout(paintRecordTime, 0);
    } catch (_) {
      window.MAMO_RACE_CARTE?.refresh?.();
      setTimeout(paintRecordTime, 0);
    }
  }

  function boundedEnrich(){
    enrichActive();
    setTimeout(enrichActive, 300);
    setTimeout(enrichActive, 1100);
  }

  document.addEventListener("click", event => {
    if (event.target?.closest?.(".mamo-carte-btn,[data-rx-carte]")) {
      setTimeout(() => {
        paintRecordTime();
        boundedEnrich();
      }, 0);
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
          venueLabel(r) === venueLabel(record) &&
          String(r?.raceNo || r?.race || "") === String(record?.raceNo || record?.race || "") &&
          String(r?.raceDate || r?.date || "") === String(record?.raceDate || record?.date || "")
        ));
    if (index >= 0) {
      window.MAMO_RACE_CARTE?.open?.(index);
      setTimeout(paintRecordTime, 0);
    }
  });

  window.addEventListener("pageshow", () => {
    setTimeout(() => {
      paintRecordTime();
      paintLoadingIfNeeded();
    }, 0);
    setTimeout(() => window.MAMO_RACE_CARTE_SNAPSHOT?.backfill?.(100), 150);
  });
})();
