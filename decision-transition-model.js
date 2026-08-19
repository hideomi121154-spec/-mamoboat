/* MAMO BOAT Decision Transition Model v1
 * Captures AIR/REAL/SKIP decision journeys per race.
 * REAL purchase is self-reported; opening an official link is only intent.
 */
(() => {
  "use strict";
  if (window.__MAMO_DECISION_TRANSITION_MODEL_V1__) return;
  window.__MAMO_DECISION_TRANSITION_MODEL_V1__ = true;

  const STATE_KEY = "mamoboat_v40_personal";
  const JOURNEY_KEY = "mamoboat_decision_journeys_v1";
  const MAX_JOURNEYS = 300;
  const SCAN_MS = 1200;
  let seenAirIds = new Set();
  let initialized = false;

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  };
  const state = () => read(STATE_KEY, {}) || {};
  const uid = () => window.crypto?.randomUUID?.() || `journey-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

  function jstDate() {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit" }).formatToParts(new Date());
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }

  function currentRace() {
    const s = state();
    const screen = document.getElementById("race");
    if (!screen?.classList.contains("active")) return null;
    const venueCode = String(s.venue || "");
    const raceNo = Number(s.raceNo) || null;
    if (!venueCode || !raceNo) return null;
    return { raceDate: window.MamoCore?.jstDate?.() || jstDate(), venueCode, raceNo, screen:"race" };
  }

  function keyOf(context) {
    return context ? `${context.raceDate}:${context.venueCode}:${context.raceNo}` : "";
  }

  function journeys() {
    const value = read(JOURNEY_KEY, []);
    return Array.isArray(value) ? value : [];
  }

  function saveJourneys(rows) {
    write(JOURNEY_KEY, rows.slice(-MAX_JOURNEYS));
    window.dispatchEvent(new CustomEvent("mamo:decision-journey-updated"));
  }

  function getJourney(context, create = true) {
    const rows = journeys();
    const key = keyOf(context);
    let row = rows.find((item) => item.key === key);
    if (!row && create) {
      row = {
        id: uid(), key, raceDate:context.raceDate, venueCode:context.venueCode, raceNo:context.raceNo,
        startedAt:new Date().toISOString(), updatedAt:new Date().toISOString(), actions:[],
        air:null, real:null, final:null, transition:null,
      };
      rows.push(row);
      saveJourneys(rows);
    }
    return row || null;
  }

  function deriveTransition(row) {
    const kinds = row.actions.map((a) => a.kind);
    const firstAir = kinds.indexOf("air");
    const firstReal = kinds.indexOf("real");
    const hasSkip = kinds.includes("skip");
    if (firstAir >= 0 && firstReal >= 0) return firstAir < firstReal ? "AIR_TO_REAL" : "REAL_TO_AIR";
    if (firstAir >= 0 && hasSkip) return "AIR_TO_SKIP";
    if (firstReal >= 0 && hasSkip) return "REAL_TO_SKIP";
    if (firstAir >= 0) return "AIR_ONLY";
    if (firstReal >= 0) return "REAL_ONLY";
    if (hasSkip) return "SKIP_ONLY";
    return null;
  }

  function emit(name, payload, context) {
    const api = window.MAMO_DECISION_EVENTS;
    if (api?.send) api.send(name, payload, context);
    else window.dispatchEvent(new CustomEvent("mamo:transition-event", { detail:{ name, payload, context } }));
  }

  function updateJourney(context, mutator) {
    const rows = journeys();
    const key = keyOf(context);
    let index = rows.findIndex((item) => item.key === key);
    if (index < 0) {
      rows.push({ id:uid(), key, raceDate:context.raceDate, venueCode:context.venueCode, raceNo:context.raceNo, startedAt:new Date().toISOString(), updatedAt:new Date().toISOString(), actions:[], air:null, real:null, final:null, transition:null });
      index = rows.length - 1;
    }
    const row = rows[index];
    mutator(row);
    row.updatedAt = new Date().toISOString();
    const before = row.transition;
    row.transition = deriveTransition(row);
    rows[index] = row;
    saveJourneys(rows);
    if (row.transition && row.transition !== before) {
      emit("decision_transition_recorded", {
        journey_id: row.id,
        transition: row.transition,
        air_stake_b: Number(row.air?.stakeB) || 0,
        real_stake_yen: Number(row.real?.stakeYen) || 0,
        same_ticket: row.real?.sameTicket ?? null,
      }, context);
    }
    return row;
  }

  function markAir(record) {
    const context = { raceDate:record.raceDate || jstDate(), venueCode:String(record.venueCode || ""), raceNo:Number(record.raceNo)||null, screen:"race" };
    if (!context.venueCode || !context.raceNo) return;
    updateJourney(context, (row) => {
      if (row.actions.some((a) => a.kind === "air" && a.recordId === record.id)) return;
      row.air = {
        recordId: record.id,
        stakeB: Number(record.stake) || 0,
        lines: Array.isArray(record.lines) ? record.lines.slice(0, 20) : [],
        at: record.time || new Date().toISOString(),
      };
      row.actions.push({ kind:"air", at:record.time || new Date().toISOString(), recordId:record.id });
    });
  }

  function markSkip(context, reason = "explicit") {
    if (!context) return;
    updateJourney(context, (row) => {
      row.actions.push({ kind:"skip", at:new Date().toISOString(), reason });
      row.final = "skip";
    });
  }

  function markReal(context, { amount, sameTicket, note = "" }) {
    if (!context) return;
    const stakeYen = Math.max(0, Math.round(Number(amount) || 0));
    if (!stakeYen) return;
    const row = updateJourney(context, (journey) => {
      journey.real = { stakeYen, sameTicket: sameTicket === true, note:String(note||"").slice(0,120), at:new Date().toISOString() };
      journey.actions.push({ kind:"real", at:new Date().toISOString(), stakeYen, sameTicket:sameTicket===true });
      journey.final = "real";
    });
    emit("decision_real_confirmed", {
      journey_id: row.id,
      amount_yen: stakeYen,
      same_ticket: sameTicket === true,
      had_air_before: !!row.air,
      air_stake_b: Number(row.air?.stakeB) || 0,
    }, context);
  }

  function airSummary(row) {
    if (!row?.air) return "このレースのAIR BET記録はありません。";
    const lines = Array.isArray(row.air.lines) ? row.air.lines : [];
    const text = lines.slice(0, 4).map((line) => {
      const combo = Array.isArray(line.combo) ? line.combo.join("-") : String(line.combo || "—");
      return `${combo} ${Math.round(Number(line.stake)||0).toLocaleString("ja-JP")}B`;
    }).join(" / ");
    return `AIR ${Math.round(Number(row.air.stakeB)||0).toLocaleString("ja-JP")}B${text ? ` ・ ${text}` : ""}`;
  }

  function ensurePanel() {
    const context = currentRace();
    const raceView = document.getElementById("raceView");
    if (!context || !raceView) return;
    let panel = document.getElementById("mamoAirRealBridge");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "mamoAirRealBridge";
      panel.className = "mamo-air-real-bridge";
      panel.innerHTML = `
        <div class="marb-head"><span>AIR / REAL</span><b>この勝負をどう残す？</b></div>
        <p data-marb-air-summary></p>
        <div class="marb-actions">
          <button type="button" data-marb-real-same>AIRと同じ内容でREALを記録</button>
          <button type="button" data-marb-real-only>REALを記録</button>
          <button type="button" data-marb-air-only>AIRのままにする</button>
        </div>
        <div class="marb-form" data-marb-form hidden>
          <label>実際に使った金額 <input type="number" min="100" step="100" inputmode="numeric" data-marb-amount> 円</label>
          <div><button type="button" data-marb-save>記録する</button><button type="button" data-marb-cancel>戻る</button></div>
        </div>
        <small data-marb-status>REALは自己申告です。公式投票サイトを開いただけでは「購入」と記録しません。</small>`;
      const anchor = raceView.querySelector(".mamo-decision-skip") || raceView.querySelector(".mamo-official-link-row") || raceView.lastElementChild;
      anchor?.insertAdjacentElement("afterend", panel);
    }
    panel.dataset.raceKey = keyOf(context);
    const row = getJourney(context, true);
    const summary = panel.querySelector("[data-marb-air-summary]");
    if (summary) summary.textContent = airSummary(row);
    const sameButton = panel.querySelector("[data-marb-real-same]");
    if (sameButton) sameButton.hidden = !row?.air;
    const airOnly = panel.querySelector("[data-marb-air-only]");
    if (airOnly) airOnly.hidden = !row?.air;
  }

  function openForm(mode) {
    const panel = document.getElementById("mamoAirRealBridge");
    const context = currentRace();
    if (!panel || !context) return;
    const row = getJourney(context, true);
    panel.dataset.realMode = mode;
    const input = panel.querySelector("[data-marb-amount]");
    if (input) input.value = mode === "same" && row?.air?.stakeB ? String(Math.round(row.air.stakeB)) : "";
    const form = panel.querySelector("[data-marb-form]");
    if (form) form.hidden = false;
    input?.focus();
  }

  function handleClick(event) {
    const context = currentRace();
    if (!context) return;
    if (event.target.closest?.("[data-marb-real-same]")) { openForm("same"); return; }
    if (event.target.closest?.("[data-marb-real-only]")) { openForm("manual"); return; }
    if (event.target.closest?.("[data-marb-air-only]")) {
      const row = updateJourney(context, (journey) => { journey.final = "air"; });
      const status = document.querySelector("[data-marb-status]");
      if (status) status.textContent = `✓ ${row.transition === "REAL_TO_AIR" ? "REAL→AIR" : "AIRのみ"}として記録しました。`;
      return;
    }
    if (event.target.closest?.("[data-marb-cancel]")) {
      const form = document.querySelector("[data-marb-form]"); if (form) form.hidden = true; return;
    }
    if (event.target.closest?.("[data-marb-save]")) {
      const panel = document.getElementById("mamoAirRealBridge");
      const input = panel?.querySelector("[data-marb-amount]");
      const amount = Number(input?.value || 0);
      if (amount < 100) { input?.focus(); return; }
      markReal(context, { amount, sameTicket: panel?.dataset.realMode === "same" });
      const form = panel?.querySelector("[data-marb-form]"); if (form) form.hidden = true;
      const row = getJourney(context, false);
      const status = panel?.querySelector("[data-marb-status]");
      if (status) status.textContent = `✓ ${row?.transition || "REAL"} / ${Math.round(amount).toLocaleString("ja-JP")}円を記録しました。`;
      return;
    }
    const skip = event.target.closest?.("[data-decision-skip-reason]");
    if (skip) markSkip(context, skip.dataset.decisionSkipReason || "other");
  }

  function scanAir() {
    const records = Array.isArray(state().records) ? state().records : [];
    if (!initialized) {
      records.forEach((record) => record?.id && seenAirIds.add(record.id));
      initialized = true;
    } else {
      records.forEach((record) => {
        if (!record?.id || seenAirIds.has(record.id)) return;
        seenAirIds.add(record.id);
        markAir(record);
      });
    }
    const context = currentRace();
    if (context) {
      const matching = records.filter((r) => String(r.venueCode||"")===String(context.venueCode) && Number(r.raceNo)===Number(context.raceNo) && (!r.raceDate || r.raceDate===context.raceDate));
      matching.forEach(markAir);
    }
  }

  function styles() {
    if (document.getElementById("mamoAirRealBridgeStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoAirRealBridgeStyle";
    style.textContent = `
      .mamo-air-real-bridge{margin:10px 0 14px;padding:11px;border:1px solid rgba(7,27,43,.14);border-left:5px solid var(--teal,#00a8a0);background:#fff}
      .marb-head span{display:block;font-size:8px;font-weight:1000;letter-spacing:.12em;color:var(--teal-dark,#007c78)}.marb-head b{display:block;margin-top:2px;font-size:14px}.mamo-air-real-bridge>p{margin:7px 0;font-size:9px;line-height:1.55;color:#536970}
      .marb-actions{display:grid;gap:6px}.marb-actions button,.marb-form button{min-height:38px;border:1px solid rgba(7,27,43,.17);background:#f8faf9;color:#17333d;font-weight:800;border-radius:8px}.marb-form{margin-top:8px;padding:9px;background:#f5f8f8}.marb-form label{font-size:10px;font-weight:800}.marb-form input{width:110px;min-height:34px;margin:0 4px;border:1px solid #cfdada;border-radius:6px;padding:4px 7px}.marb-form>div{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px}.mamo-air-real-bridge>small{display:block;margin-top:7px;font-size:8px;line-height:1.45;color:#728287}
    `;
    document.head.appendChild(style);
  }

  function boot() {
    styles();
    document.addEventListener("click", handleClick, true);
    scanAir();
    ensurePanel();
    setInterval(() => { scanAir(); ensurePanel(); }, SCAN_MS);
  }

  window.MAMO_DECISION_JOURNEYS = Object.freeze({
    version:1,
    list:journeys,
    markReal,
    markSkip,
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
