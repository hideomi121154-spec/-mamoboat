/* MAMO BOAT Baseline Intervention v1
 * Shows a restrained, factual "usual self" comparison on the race screen.
 * It never predicts winners or diagnoses gambling problems.
 * The intervention result is linked to AIR BET / skip / REAL-intent actions.
 */
(() => {
  "use strict";

  const STATE_KEY = "mamoboat_v40_personal";
  const LOCAL_DECISION_KEY = "mamoboat_decision_events_v1";
  const SHOWN_KEY = "mamoboat_baseline_interventions_v1";
  const MIN_BASELINE_DAYS = 3;
  const RESULT_WINDOW_MS = 30 * 60 * 1000;
  const RESCAN_MS = 1200;

  let active = null;
  let knownRecordIds = new Set();

  const readJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
  };
  const writeJson = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  };
  const state = () => readJson(STATE_KEY, {}) || {};
  const decisionEvents = () => {
    const value = readJson(LOCAL_DECISION_KEY, []);
    return Array.isArray(value) ? value : [];
  };
  const mean = (values) => values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

  function dayKey(value = Date.now()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date(value));
    const p = Object.fromEntries(parts.map((item) => [item.type, item.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }

  function currentRace() {
    const s = state();
    const raceScreen = document.getElementById("race");
    if (!raceScreen?.classList.contains("active")) return null;
    const venueCode = String(s.venue || "");
    const raceNo = Number(s.raceNo) || null;
    if (!venueCode || !raceNo) return null;
    return {
      screen: "race",
      raceDate: window.MamoCore?.jstDate?.() || dayKey(),
      venueCode,
      raceNo,
    };
  }

  function raceKey(race) {
    return race ? `${race.raceDate}:${race.venueCode}:${race.raceNo}` : "";
  }

  function recordsForDay(records, key) {
    return records.filter((record) => {
      const recordDay = record.raceDate || dayKey(record.time || Date.now());
      return recordDay === key;
    });
  }

  function localDecisionForDay(events, key) {
    return events.filter((event) => (event.raceDate || dayKey(event.at)) === key);
  }

  function dayMetrics(records, events, key) {
    const dayRecords = recordsForDay(records, key);
    const stakes = dayRecords.map((record) => Number(record.stake) || 0).filter((value) => value > 0);
    const dayEvents = localDecisionForDay(events, key);
    const starts = dayEvents.filter((event) => event.name === "race_session_start").length;
    const skips = dayEvents.filter((event) => event.name === "skip_detected").length;
    const real = dayEvents.filter((event) => event.name === "real_transition").length;
    return {
      airCount: dayRecords.length,
      averageStake: mean(stakes),
      stakeCount: stakes.length,
      viewed: starts,
      skipRate: starts ? skips / starts : 0,
      realRate: starts ? real / starts : 0,
    };
  }

  function baseline() {
    const s = state();
    const records = Array.isArray(s.records) ? s.records : [];
    const events = decisionEvents();
    const today = dayKey();
    const keys = new Set();
    records.forEach((record) => {
      const key = record.raceDate || dayKey(record.time || Date.now());
      if (key && key !== today) keys.add(key);
    });
    events.forEach((event) => {
      const key = event.raceDate || dayKey(event.at);
      if (key && key !== today) keys.add(key);
    });
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const activeDays = [...keys]
      .filter((key) => new Date(`${key}T00:00:00+09:00`).getTime() >= cutoff)
      .map((key) => dayMetrics(records, events, key))
      .filter((metric) => metric.airCount || metric.viewed);
    return {
      samples: activeDays.length,
      airCount: mean(activeDays.map((metric) => metric.airCount)),
      averageStake: mean(activeDays.map((metric) => metric.averageStake)),
      skipRate: mean(activeDays.map((metric) => metric.skipRate)),
      realRate: mean(activeDays.map((metric) => metric.realRate)),
    };
  }

  function todayMetrics() {
    const s = state();
    const records = Array.isArray(s.records) ? s.records : [];
    return dayMetrics(records, decisionEvents(), dayKey());
  }

  function chooseTrigger(today, base) {
    if (base.samples < MIN_BASELINE_DAYS) return null;

    if (today.stakeCount >= 2 && base.averageStake > 0 && today.averageStake >= base.averageStake * 1.5) {
      const pct = Math.round((today.averageStake / base.averageStake - 1) * 100);
      return {
        key: "average_stake_up",
        severity: pct >= 100 ? "strong" : "notice",
        headline: "今日は、いつもよりBET額が大きめです",
        fact: `今日のAIR BET平均は ${Math.round(today.averageStake).toLocaleString("ja-JP")}B。普段の平均より約${pct}%高くなっています。`,
        metric: { current: Math.round(today.averageStake), baseline: Math.round(base.averageStake), unit: "B", diffPercent: pct },
      };
    }

    if (today.airCount >= 3 && base.airCount > 0 && today.airCount >= Math.max(3, base.airCount * 1.5)) {
      const pct = Math.round((today.airCount / base.airCount - 1) * 100);
      return {
        key: "air_count_up",
        severity: pct >= 100 ? "strong" : "notice",
        headline: "今日は、普段より参加ペースが速めです",
        fact: `今日のAIR参加は${today.airCount}R。普段の1日平均より約${pct}%多いペースです。`,
        metric: { current: today.airCount, baseline: Number(base.airCount.toFixed(1)), unit: "R", diffPercent: pct },
      };
    }

    if (today.viewed >= 3 && base.realRate >= 0 && today.realRate >= base.realRate + 0.15 && today.realRate >= 0.2) {
      const diffPt = Math.round((today.realRate - base.realRate) * 100);
      return {
        key: "real_rate_up",
        severity: "notice",
        headline: "今日は、REAL導線へ進む割合が普段より高めです",
        fact: `閲覧レースからREAL導線へ進む割合が、普段より${diffPt}ポイント高くなっています。`,
        metric: { current: Math.round(today.realRate * 100), baseline: Math.round(base.realRate * 100), unit: "%", diffPoint: diffPt },
      };
    }

    return null;
  }

  function shownMap() {
    const value = readJson(SHOWN_KEY, {});
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function mayShow(race, trigger) {
    const map = shownMap();
    const key = `${raceKey(race)}:${trigger.key}`;
    const last = Number(map[key] || 0);
    return !last || Date.now() - last > 6 * 60 * 60 * 1000;
  }

  function markShown(race, trigger) {
    const map = shownMap();
    map[`${raceKey(race)}:${trigger.key}`] = Date.now();
    const entries = Object.entries(map).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 200);
    writeJson(SHOWN_KEY, Object.fromEntries(entries));
  }

  function injectStyles() {
    if (document.getElementById("mamoBaselineInterventionStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoBaselineInterventionStyle";
    style.textContent = `
      .mamo-baseline-intervention{margin:10px 0 12px;padding:12px;border:1px solid rgba(7,27,43,.14);border-left:5px solid var(--gold,#ffc83d);background:#fffdf7;box-shadow:0 2px 8px rgba(7,27,43,.05)}
      .mamo-baseline-intervention.strong{border-left-color:var(--coral,#ff6b5d);background:#fff9f7}
      .mamo-baseline-intervention span{display:block;font-size:9px;font-weight:1000;letter-spacing:.1em;color:var(--teal-dark,#007c78)}
      .mamo-baseline-intervention h3{margin:4px 0 6px;font-size:16px;line-height:1.35;color:var(--navy,#071b2b)}
      .mamo-baseline-intervention p{margin:0;font-size:12px;line-height:1.65;color:#334b54}
      .mamo-baseline-intervention small{display:block;margin-top:7px;font-size:10px;line-height:1.55;color:#667b82}
      .mamo-baseline-intervention-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}
      .mamo-baseline-intervention-actions button{min-height:38px;border-radius:8px;font-weight:800;font-size:11px}
      .mamo-baseline-intervention-actions .review{border:1px solid rgba(7,27,43,.18);background:#fff;color:#17333d}
      .mamo-baseline-intervention-actions .continue{border:0;background:transparent;color:#62767d;text-decoration:underline}
    `;
    document.head.appendChild(style);
  }

  function resolve(result, details = {}) {
    if (!active) return;
    const api = window.MAMO_DECISION_EVENTS;
    if (api?.interventionResult) {
      api.interventionResult(active.id, result, {
        trigger_key: active.trigger.key,
        ...details,
      });
    }
    active = null;
    document.getElementById("mamoBaselineIntervention")?.remove();
  }

  function showIntervention(race, trigger, base) {
    if (!window.MAMO_DECISION_EVENTS?.interventionShown) return;
    const raceView = document.getElementById("raceView");
    if (!raceView || document.getElementById("mamoBaselineIntervention")) return;

    const anchor = raceView.querySelector(".mamo-decision-skip")
      || raceView.querySelector(".mamo-official-link-row")
      || raceView.querySelector(".officialmenu")
      || raceView.querySelector(".mamo-ai-actions")
      || raceView.firstElementChild;
    if (!anchor) return;

    const id = window.MAMO_DECISION_EVENTS.interventionShown({
      kind: "personal_baseline_deviation",
      messageKey: `baseline:${trigger.key}`,
      triggerKey: trigger.key,
      context: race,
    });
    active = { id, race, trigger, shownAt: Date.now() };
    markShown(race, trigger);

    const panel = document.createElement("section");
    panel.id = "mamoBaselineIntervention";
    panel.className = `mamo-baseline-intervention ${trigger.severity || "notice"}`;
    panel.innerHTML = `
      <span>いつもの自分との比較 / ${base.samples}日分</span>
      <h3>${esc(trigger.headline)}</h3>
      <p>${esc(trigger.fact)}</p>
      <small>止めるための警告ではありません。今の判断材料として、本人の過去との違いだけを表示しています。</small>
      <div class="mamo-baseline-intervention-actions">
        <button class="review" type="button" data-mamo-baseline-review>このまま判断する</button>
        <button class="continue" type="button" data-mamo-baseline-dismiss>表示を閉じる</button>
      </div>`;
    anchor.insertAdjacentElement("afterend", panel);
  }

  function evaluate() {
    if (active && Date.now() - active.shownAt > RESULT_WINDOW_MS) {
      resolve("unknown", { reason: "result_window_expired" });
    }
    if (active) return;
    const race = currentRace();
    if (!race) return;
    const base = baseline();
    const today = todayMetrics();
    const trigger = chooseTrigger(today, base);
    if (!trigger || !mayShow(race, trigger)) return;
    showIntervention(race, trigger, base);
  }

  function scanNewAirBets() {
    const s = state();
    const records = Array.isArray(s.records) ? s.records : [];
    for (const record of records) {
      if (!record?.id || knownRecordIds.has(record.id)) continue;
      knownRecordIds.add(record.id);
      if (!active) continue;
      const sameRace = String(record.venueCode || "") === String(active.race.venueCode)
        && Number(record.raceNo) === Number(active.race.raceNo)
        && String(record.raceDate || "") === String(active.race.raceDate || "");
      if (sameRace) {
        resolve("air_bet", {
          record_id: record.id,
          stake_b: Number(record.stake) || 0,
          seconds_from_show: Math.max(0, Math.round((Date.now() - active.shownAt) / 1000)),
        });
      }
    }
  }

  function handleClick(event) {
    if (event.target.closest?.("[data-mamo-baseline-dismiss]")) {
      resolve("dismissed", { reason: "user_closed" });
      return;
    }
    if (event.target.closest?.("[data-mamo-baseline-review]")) {
      const button = event.target.closest("[data-mamo-baseline-review]");
      if (button) {
        button.disabled = true;
        button.textContent = "判断を続けています";
      }
      return;
    }
    if (!active) return;
    const skipReason = event.target.closest?.("[data-decision-skip-reason]");
    if (skipReason) {
      resolve("skip", { reason: skipReason.dataset.decisionSkipReason || "other" });
      return;
    }
    const link = event.target.closest?.("a[href]");
    if (!link) return;
    const href = String(link.href || "");
    const text = String(link.textContent || "").replace(/\s+/g, " ").trim();
    const realLike = /spweb\.brtb\.jp|ib\.mbrace\.or\.jp/i.test(href)
      || (/boatrace\.jp/i.test(href) && /(投票|舟券|購入)/.test(text));
    if (realLike) resolve("real_intent", { destination: href.slice(0, 180) });
  }

  function boot() {
    injectStyles();
    const records = Array.isArray(state().records) ? state().records : [];
    knownRecordIds = new Set(records.map((record) => record?.id).filter(Boolean));
    document.addEventListener("click", handleClick, true);
    window.setInterval(() => {
      scanNewAirBets();
      evaluate();
    }, RESCAN_MS);
    evaluate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
