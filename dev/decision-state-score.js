/* MAMO BOAT Decision State Score v1
 * Summarizes deviation from the user's own recent baseline into a 0-100 observation score.
 * Read-only analytics: no race prediction, diagnosis, or wagering recommendation.
 * Rendering rule: create DOM once, then update text/class/style only (no periodic innerHTML rebuild).
 */
(() => {
  "use strict";
  if (window.__MAMO_DECISION_STATE_SCORE_V1__) return;
  window.__MAMO_DECISION_STATE_SCORE_V1__ = true;

  const STATE_KEY = "mamoboat_v40_personal";
  const DECISION_KEY = "mamoboat_decision_events_v1";
  const DAYS = 30;
  const MIN_BASELINE_DAYS = 3;
  const JST = 9 * 60 * 60 * 1000;
  const DAY_MS = 86400000;
  const UPDATE_MS = 5000;

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
  };
  const state = () => read(STATE_KEY, {}) || {};
  const events = () => {
    const value = read(DECISION_KEY, []);
    return Array.isArray(value) ? value : [];
  };
  const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
  const mean = (xs) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;

  function dayKey(value = Date.now()) {
    const d = new Date(new Date(value).getTime() + JST);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }

  function recordDay(record) {
    return String(record?.raceDate || dayKey(record?.time || Date.now()));
  }

  function eventDay(event) {
    return String(event?.raceDate || dayKey(event?.at || Date.now()));
  }

  function metricsForDay(key) {
    const records = (Array.isArray(state().records) ? state().records : []).filter((r) => recordDay(r) === key);
    const decision = events().filter((e) => eventDay(e) === key);
    const stakes = records.map((r) => Number(r.stake) || 0).filter((n) => n > 0);
    const starts = decision.filter((e) => e.name === "race_session_start").length;
    const skips = decision.filter((e) => e.name === "skip_detected").length;
    const reals = decision.filter((e) => e.name === "real_transition").length;
    const hundred = stakes.filter((n) => n === 100).length;
    return {
      airCount: records.length,
      averageStake: mean(stakes),
      hundredRate: stakes.length ? hundred / stakes.length : 0,
      viewed: starts,
      skipRate: starts ? skips / starts : 0,
      realRate: starts ? reals / starts : 0,
    };
  }

  function baseline() {
    const today = dayKey();
    const keys = new Set();
    const cutoff = Date.now() - DAYS * DAY_MS;
    const records = Array.isArray(state().records) ? state().records : [];
    records.forEach((r) => {
      const k = recordDay(r);
      if (k !== today && new Date(`${k}T00:00:00+09:00`).getTime() >= cutoff) keys.add(k);
    });
    events().forEach((e) => {
      const k = eventDay(e);
      if (k !== today && new Date(`${k}T00:00:00+09:00`).getTime() >= cutoff) keys.add(k);
    });
    const days = [...keys].map(metricsForDay).filter((m) => m.airCount || m.viewed);
    const avg = (field) => mean(days.map((m) => Number(m[field]) || 0));
    return {
      samples: days.length,
      airCount: avg("airCount"),
      averageStake: avg("averageStake"),
      hundredRate: avg("hundredRate"),
      skipRate: avg("skipRate"),
      realRate: avg("realRate"),
    };
  }

  function positiveDeviation(current, base, cap = 2) {
    if (!(base > 0)) return 0;
    return clamp((current / base - 1) / cap, 0, 1);
  }

  function pointDeviation(current, base, cap = .5) {
    return clamp((current - base) / cap, 0, 1);
  }

  function inversePointDeviation(current, base, cap = .5) {
    return clamp((base - current) / cap, 0, 1);
  }

  function compoundSignal() {
    const compound = window.MAMO_COMPOUND_PATTERN;
    if (!compound || !Array.isArray(compound.patterns)) return { score: 0, title: null };
    const strong = compound.patterns.find((p) => p.support >= 3 && p.lift >= 1.5 && p.score >= 55);
    if (!strong) return { score: 0, title: null };
    return { score: clamp((Number(strong.score) || 0) / 100, 0, 1), title: strong.title || null };
  }

  function compute() {
    const base = baseline();
    const today = metricsForDay(dayKey());
    if (base.samples < MIN_BASELINE_DAYS) {
      return { ready: false, score: null, level: "蓄積中", samples: base.samples, factors: [] };
    }

    const factors = [
      { key: "stake", label: "平均AIR BET", value: positiveDeviation(today.averageStake, base.averageStake, 1.5), weight: .25 },
      { key: "pace", label: "参加ペース", value: positiveDeviation(today.airCount, base.airCount, 1.5), weight: .20 },
      { key: "real", label: "REAL移行率", value: pointDeviation(today.realRate, base.realRate, .4), weight: .20 },
      { key: "skip", label: "見送り率低下", value: inversePointDeviation(today.skipRate, base.skipRate, .4), weight: .15 },
      { key: "hundred", label: "100B率", value: pointDeviation(today.hundredRate, base.hundredRate, .5), weight: .08 },
    ];
    const compound = compoundSignal();
    factors.push({ key: "compound", label: compound.title ? `複合: ${compound.title}` : "複合条件", value: compound.score, weight: .12 });

    const raw = factors.reduce((sum, f) => sum + f.value * f.weight, 0);
    const score = Math.round(clamp(raw * 100));
    const sorted = factors.filter((f) => f.value > .05).sort((a, b) => b.value * b.weight - a.value * a.weight);
    const level = score >= 70 ? "普段との差が大きい" : score >= 45 ? "普段との差あり" : score >= 20 ? "少し違う" : "普段の範囲";
    return {
      ready: true,
      score,
      level,
      samples: base.samples,
      factors: sorted.map((f) => ({ key: f.key, label: f.label, strength: Math.round(f.value * 100) })),
      today,
      baseline: base,
    };
  }

  function ensurePanel() {
    const analysis = document.getElementById("analysis");
    if (!analysis) return null;
    const host = document.getElementById("mamoBaselinePanel") || document.getElementById("analysisList");
    if (!host) return null;
    let panel = document.getElementById("mamoDecisionStateScore");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "mamoDecisionStateScore";
    panel.className = "mamo-state-score";

    const head = document.createElement("div"); head.className = "mss-head";
    const titleWrap = document.createElement("div");
    const kicker = document.createElement("span"); kicker.textContent = "DECISION STATE";
    const title = document.createElement("h3"); title.textContent = "今の自分と普段の距離";
    titleWrap.append(kicker, title);
    const badge = document.createElement("small"); badge.dataset.mss = "samples";
    head.append(titleWrap, badge);

    const scoreRow = document.createElement("div"); scoreRow.className = "mss-score-row";
    const score = document.createElement("strong"); score.dataset.mss = "score";
    const level = document.createElement("b"); level.dataset.mss = "level";
    scoreRow.append(score, level);

    const meter = document.createElement("div"); meter.className = "mss-meter";
    const fill = document.createElement("span"); fill.dataset.mss = "fill"; meter.appendChild(fill);
    const note = document.createElement("p"); note.dataset.mss = "note";
    const factor = document.createElement("small"); factor.dataset.mss = "factor";
    const foot = document.createElement("footer"); foot.textContent = "本人の過去30日との比較指標です。危険度・依存症・勝敗を判定するスコアではありません。";
    panel.append(head, scoreRow, meter, note, factor, foot);
    host.insertAdjacentElement("afterend", panel);
    return panel;
  }

  function updatePanel() {
    const panel = ensurePanel();
    if (!panel) return;
    const result = compute();
    const scoreEl = panel.querySelector('[data-mss="score"]');
    const levelEl = panel.querySelector('[data-mss="level"]');
    const samplesEl = panel.querySelector('[data-mss="samples"]');
    const fillEl = panel.querySelector('[data-mss="fill"]');
    const noteEl = panel.querySelector('[data-mss="note"]');
    const factorEl = panel.querySelector('[data-mss="factor"]');

    samplesEl.textContent = `${result.samples}日分`;
    if (!result.ready) {
      scoreEl.textContent = "—";
      levelEl.textContent = "蓄積中";
      fillEl.style.width = "0%";
      noteEl.textContent = "3日以上の本人データがたまると、今と普段の差を比較します。";
      factorEl.textContent = "他人との比較は行いません。";
      panel.dataset.level = "building";
    } else {
      scoreEl.textContent = String(result.score);
      levelEl.textContent = result.level;
      fillEl.style.width = `${result.score}%`;
      const top = result.factors.slice(0, 2).map((f) => f.label);
      noteEl.textContent = result.score < 20
        ? "主要な行動指標は、今のところ普段の範囲にあります。"
        : `今の差に効いている主な要素は ${top.length ? top.join(" / ") : "複数の小さな変化"} です。`;
      factorEl.textContent = result.factors.length
        ? result.factors.slice(0, 3).map((f) => `${f.label} ${f.strength}`).join(" ・ ")
        : "大きな偏りは検出していません。";
      panel.dataset.level = result.score >= 70 ? "high" : result.score >= 45 ? "medium" : result.score >= 20 ? "low" : "normal";
    }

    window.MAMO_DECISION_STATE = Object.freeze({
      version: 1,
      generatedAt: new Date().toISOString(),
      ...result,
    });
  }

  function styles() {
    if (document.getElementById("mamoDecisionStateScoreStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoDecisionStateScoreStyle";
    style.textContent = `
      .mamo-state-score{margin:14px 0 22px;padding:14px;background:#fff;border-top:5px solid var(--teal,#00a8a0);box-shadow:3px 4px 0 rgba(7,27,43,.07)}
      .mss-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}.mss-head span{font-size:9px;font-weight:1000;letter-spacing:.12em;color:var(--teal-dark,#007c78)}.mss-head h3{margin:3px 0 8px;font-size:20px}.mss-head>small{font-size:9px;font-weight:900;color:#6d7d83}
      .mss-score-row{display:flex;align-items:baseline;gap:10px}.mss-score-row strong{font-size:42px;line-height:1;color:#071b2b}.mss-score-row b{font-size:12px;color:#53686f}
      .mss-meter{height:8px;margin:9px 0;background:#edf2f2;overflow:hidden}.mss-meter span{display:block;height:100%;width:0;background:var(--teal,#00a8a0);transition:width .25s ease}
      .mamo-state-score[data-level="medium"] .mss-meter span{background:var(--gold,#ffc83d)}.mamo-state-score[data-level="high"] .mss-meter span{background:var(--coral,#ff6b5d)}
      .mamo-state-score p{margin:7px 0 4px;font-size:10px;line-height:1.65;color:#334b54}.mamo-state-score>small{display:block;font-size:8px;line-height:1.55;color:#687a80}.mamo-state-score footer{margin-top:7px;font-size:8px;line-height:1.5;color:#74848a}
    `;
    document.head.appendChild(style);
  }

  function boot() {
    styles();
    updatePanel();
    window.addEventListener("mamo:analysis-rendered", updatePanel);
    window.setInterval(() => {
      const analysis = document.getElementById("analysis");
      if (analysis?.classList.contains("active") || document.body?.dataset?.screen === "analysis") updatePanel();
    }, UPDATE_MS);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
