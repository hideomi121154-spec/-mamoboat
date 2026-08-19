/* MAMO BOAT Decision Transition Model v1
 * One race = one decision journey.
 * REAL purchase is self-reported. Opening an official site is only intent.
 */
(() => {
  "use strict";
  if (window.__MAMO_DECISION_TRANSITION_MODEL_V1__) return;
  window.__MAMO_DECISION_TRANSITION_MODEL_V1__ = true;

  const STATE_KEY = "mamoboat_v40_personal";
  const JOURNEY_KEY = "mamoboat_decision_journeys_v1";
  const MAX_JOURNEYS = 300;
  const SCAN_MS = 900;
  let initialized = false;
  const seenAirIds = new Set();

  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} };
  const state = () => read(STATE_KEY, {}) || {};
  const uid = () => window.crypto?.randomUUID?.() || `journey-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  function jstDate() {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone:"Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit"
    }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }

  function currentRace() {
    const s = state();
    if (!document.getElementById("race")?.classList.contains("active")) return null;
    const venueCode = String(s.venue || "");
    const raceNo = Number(s.raceNo) || null;
    if (!venueCode || !raceNo) return null;
    return { screen:"race", raceDate:window.MamoCore?.jstDate?.() || jstDate(), venueCode, raceNo };
  }

  const keyOf = (c) => c ? `${c.raceDate}:${c.venueCode}:${c.raceNo}` : "";
  const rows = () => { const v = read(JOURNEY_KEY, []); return Array.isArray(v) ? v : []; };
  function save(list) {
    write(JOURNEY_KEY, list.slice(-MAX_JOURNEYS));
    window.dispatchEvent(new CustomEvent("mamo:decision-journey-updated"));
  }
  function emit(name, payload, context) { window.MAMO_DECISION_EVENTS?.track?.(name, payload, context); }

  function derive(actions) {
    const firstAir = actions.findIndex((a) => a.kind === "air");
    const firstReal = actions.findIndex((a) => a.kind === "real");
    const firstSkip = actions.findIndex((a) => a.kind === "skip");
    if (firstAir >= 0 && firstReal >= 0) return firstAir < firstReal ? "AIR_TO_REAL" : "REAL_TO_AIR";
    if (firstAir >= 0 && firstSkip >= 0) return firstAir < firstSkip ? "AIR_TO_SKIP" : "SKIP_TO_AIR";
    if (firstReal >= 0 && firstSkip >= 0) return firstReal < firstSkip ? "REAL_TO_SKIP" : "SKIP_TO_REAL";
    if (firstAir >= 0) return "AIR_ONLY";
    if (firstReal >= 0) return "REAL_ONLY";
    if (firstSkip >= 0) return "SKIP_ONLY";
    return null;
  }

  function update(context, mutator) {
    if (!context) return null;
    const list = rows();
    const key = keyOf(context);
    let i = list.findIndex((x) => x.key === key);
    if (i < 0) {
      list.push({ id:uid(), key, raceDate:context.raceDate, venueCode:context.venueCode, raceNo:context.raceNo,
        startedAt:new Date().toISOString(), updatedAt:new Date().toISOString(), actions:[], air:null, real:null, final:null, transition:null });
      i = list.length - 1;
    }
    const row = list[i];
    const before = row.transition;
    mutator(row);
    row.updatedAt = new Date().toISOString();
    row.transition = derive(row.actions);
    list[i] = row;
    save(list);
    if (row.transition && row.transition !== before) {
      emit("decision_transition_recorded", {
        journey_id:row.id, transition:row.transition, action_count:row.actions.length,
        air_stake_b:Number(row.air?.stakeB)||0, real_stake_yen:Number(row.real?.stakeYen)||0,
        same_ticket:row.real?.sameTicket ?? null, final:row.final || null,
      }, context);
    }
    return row;
  }

  function markAir(record) {
    const context = { screen:"race", raceDate:record.raceDate || jstDate(), venueCode:String(record.venueCode||""), raceNo:Number(record.raceNo)||null };
    if (!context.venueCode || !context.raceNo) return;
    update(context, (row) => {
      if (row.actions.some((a) => a.kind === "air" && a.recordId === record.id)) return;
      row.air = { recordId:record.id, stakeB:Number(record.stake)||0, lines:Array.isArray(record.lines)?record.lines.slice(0,20):[], at:record.time || new Date().toISOString() };
      row.actions.push({ kind:"air", at:row.air.at, recordId:record.id, stakeB:row.air.stakeB });
      if (!row.real) row.final = "air";
    });
  }

  function markSkip(context, reason) {
    update(context, (row) => {
      row.actions.push({ kind:"skip", at:new Date().toISOString(), reason:reason || "explicit" });
      row.final = "skip";
    });
  }

  function markReal(context, amount, sameTicket) {
    const stakeYen = Math.max(0, Math.round(Number(amount)||0));
    if (!context || stakeYen < 100) return null;
    const row = update(context, (x) => {
      x.real = { stakeYen, sameTicket:sameTicket === true, at:new Date().toISOString(), source:"self_report" };
      x.actions.push({ kind:"real", at:x.real.at, stakeYen, sameTicket:sameTicket === true, source:"self_report" });
      x.final = "real";
    });
    if (row) emit("decision_real_confirmed", {
      journey_id:row.id, amount_yen:stakeYen, same_ticket:sameTicket === true,
      had_air_before:!!row.air, air_stake_b:Number(row.air?.stakeB)||0,
      transition:row.transition, source:"self_report",
    }, context);
    return row;
  }

  function findRow(context) { return rows().find((x) => x.key === keyOf(context)) || null; }

  function airText(row) {
    if (!row?.air) return "AIR BETをしていない場合も、REALだけ買った記録を残せます。";
    const lines = (row.air.lines || []).slice(0, 4).map((line) => {
      const combo = Array.isArray(line.combo) ? line.combo.join("-") : String(line.combo || "—");
      return `${combo} ${Math.round(Number(line.stake)||0).toLocaleString("ja-JP")}B`;
    }).join(" / ");
    return `このレースのAIR：${Math.round(Number(row.air.stakeB)||0).toLocaleString("ja-JP")}B${lines ? ` ｜ ${lines}` : ""}`;
  }

  function createPanel() {
    const panel = document.createElement("section");
    panel.id = "mamoAirRealBridge";
    panel.className = "mamo-air-real-bridge";
    panel.innerHTML = `
      <div class="marb-kicker">AIR BETの次に記録</div>
      <div class="marb-head"><b>実際の舟券はどうした？</b><span>REALは自己申告で記録します</span></div>
      <p data-marb-summary></p>
      <div class="marb-actions">
        <button type="button" data-marb-same><strong>AIRと同じ舟券で買った</strong><small>金額だけ入力</small></button>
        <button type="button" data-marb-real><strong>内容を変えて買った</strong><small>実際の金額を入力</small></button>
        <button type="button" data-marb-air><strong>買わなかった</strong><small>AIRだけで完結</small></button>
      </div>
      <div class="marb-form" data-marb-form hidden>
        <label><span>実際に使った金額</span><div><input type="number" min="100" step="100" inputmode="numeric" data-marb-amount><b>円</b></div></label>
        <div><button type="button" data-marb-save>この内容で記録</button><button type="button" data-marb-cancel>戻る</button></div>
      </div>
      <small data-marb-status>公式サイトを開いただけではREAL購入扱いにしません。</small>`;
    return panel;
  }

  function placePanel(panel, raceView) {
    const betdesk = raceView.querySelector(".betdesk");
    if (betdesk) {
      if (panel.previousElementSibling !== betdesk) betdesk.insertAdjacentElement("afterend", panel);
      return;
    }
    const airHeading = [...raceView.querySelectorAll(".section-head")].find((x) => /AIR BET/i.test(x.textContent || ""));
    if (airHeading) {
      const next = airHeading.nextElementSibling;
      (next || airHeading).insertAdjacentElement("afterend", panel);
      return;
    }
    raceView.appendChild(panel);
  }

  function ensurePanel() {
    const context = currentRace();
    const raceView = document.getElementById("raceView");
    if (!context || !raceView) return;
    let panel = document.getElementById("mamoAirRealBridge");
    if (!panel) panel = createPanel();
    placePanel(panel, raceView);

    const row = findRow(context);
    panel.dataset.raceKey = keyOf(context);
    panel.querySelector("[data-marb-summary]").textContent = airText(row);
    const same = panel.querySelector("[data-marb-same]");
    const real = panel.querySelector("[data-marb-real]");
    const airOnly = panel.querySelector("[data-marb-air]");
    if (row?.air) {
      same.hidden = false;
      real.querySelector("strong").textContent = "内容を変えて買った";
      airOnly.hidden = false;
    } else {
      same.hidden = true;
      real.querySelector("strong").textContent = "REALだけ買った";
      airOnly.hidden = true;
    }
  }

  function openForm(mode) {
    const panel = document.getElementById("mamoAirRealBridge");
    const context = currentRace();
    if (!panel || !context) return;
    panel.dataset.mode = mode;
    const row = findRow(context);
    const input = panel.querySelector("[data-marb-amount]");
    input.value = mode === "same" && row?.air?.stakeB ? String(Math.round(row.air.stakeB)) : "";
    panel.querySelector("[data-marb-form]").hidden = false;
    input?.focus();
  }

  function onClick(event) {
    const context = currentRace();
    if (!context) return;
    if (event.target.closest?.("[data-marb-same]")) return openForm("same");
    if (event.target.closest?.("[data-marb-real]")) return openForm("manual");
    if (event.target.closest?.("[data-marb-air]")) {
      const row = update(context, (x) => { x.final = "air"; });
      const s = document.querySelector("[data-marb-status]");
      if (s) s.textContent = `✓ ${row?.transition === "REAL_TO_AIR" ? "REAL→AIR" : "AIRのみ"}として記録しました。`;
      return;
    }
    if (event.target.closest?.("[data-marb-cancel]")) {
      const form = document.querySelector("[data-marb-form]"); if (form) form.hidden = true; return;
    }
    if (event.target.closest?.("[data-marb-save]")) {
      const panel = document.getElementById("mamoAirRealBridge");
      const amount = Number(panel?.querySelector("[data-marb-amount]")?.value || 0);
      if (amount < 100) return;
      const row = markReal(context, amount, panel?.dataset.mode === "same");
      panel.querySelector("[data-marb-form]").hidden = true;
      panel.querySelector("[data-marb-status]").textContent = `✓ ${row?.transition || "REAL"} / ${Math.round(amount).toLocaleString("ja-JP")}円を記録しました。`;
      return;
    }
    const skip = event.target.closest?.("[data-decision-skip-reason]");
    if (skip) markSkip(context, skip.dataset.decisionSkipReason || "other");
  }

  function scanAir() {
    const records = Array.isArray(state().records) ? state().records : [];
    if (!initialized) {
      records.forEach((r) => r?.id && seenAirIds.add(r.id));
      initialized = true;
    }
    records.forEach((r) => {
      if (!r?.id || seenAirIds.has(r.id)) return;
      seenAirIds.add(r.id); markAir(r);
    });
    const context = currentRace();
    if (context) records.filter((r) => String(r.venueCode||"")===context.venueCode && Number(r.raceNo)===context.raceNo && (!r.raceDate || r.raceDate===context.raceDate)).forEach(markAir);
  }

  function styles() {
    if (document.getElementById("mamoAirRealBridgeStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoAirRealBridgeStyle";
    style.textContent = `
      .mamo-air-real-bridge{margin:12px 0 22px;padding:16px;border:2px solid #0aa39a;border-radius:14px;background:linear-gradient(180deg,#f2fffd,#fff);box-shadow:0 8px 22px rgba(7,27,43,.10)}
      .marb-kicker{display:inline-flex;margin-bottom:7px;padding:4px 8px;border-radius:999px;background:#0a8f88;color:#fff;font-size:9px;font-weight:1000;letter-spacing:.08em}
      .marb-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px}.marb-head b{font-size:19px;line-height:1.25;color:#071b2b}.marb-head span{font-size:9px;font-weight:800;color:#60767c}
      .mamo-air-real-bridge>p{margin:10px 0 12px;padding:9px 10px;border-radius:9px;background:#f5f8f8;font-size:10px;line-height:1.55;color:#405a63}
      .marb-actions{display:grid;gap:8px}.marb-actions button{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:52px;padding:10px 12px;border:1px solid rgba(7,27,43,.16);border-radius:10px;background:#fff;color:#17333d;text-align:left}.marb-actions button strong{font-size:13px;font-weight:1000}.marb-actions button small{font-size:9px;color:#71848a;white-space:nowrap}.marb-actions button:first-child{border-color:#0aa39a;background:#ecfffc}
      .marb-form{margin-top:10px;padding:12px;border-radius:10px;background:#edf5f5}.marb-form label>span{display:block;margin-bottom:6px;font-size:10px;font-weight:900}.marb-form label>div{display:flex;align-items:center;gap:5px}.marb-form input{width:140px;min-height:42px;padding:0 10px;border:1px solid #9db4b8;border-radius:8px;font-size:18px;font-weight:900}.marb-form>div{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.marb-form button{min-height:42px;border:1px solid rgba(7,27,43,.16);border-radius:8px;background:#fff;font-weight:900}.marb-form button:first-child{background:#071b2b;color:#fff}
      .mamo-air-real-bridge>small{display:block;margin-top:9px;font-size:9px;line-height:1.45;color:#728287}
    `;
    document.head.appendChild(style);
  }

  function boot() {
    styles(); scanAir(); ensurePanel();
    document.addEventListener("click", onClick, true);
    setInterval(() => { scanAir(); ensurePanel(); }, SCAN_MS);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true }); else boot();
})();