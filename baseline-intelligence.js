/* MAMO BOAT Baseline Intelligence v1
 * Personal baseline + today's deviation analysis.
 * Read-only: does not touch AIR BET, wallet, settlement, or navigation logic.
 */
(() => {
  "use strict";

  const STATE_KEY = "mamoboat_v40_personal";
  const SAFE_EVENT_KEY = "mamoboat_ai_safe_events";
  const DECISION_EVENT_KEY = "mamoboat_decision_events_v1";

  const readJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
  };
  const state = () => readJson(STATE_KEY, {}) || {};
  const safeEvents = () => {
    const value = readJson(SAFE_EVENT_KEY, []);
    return Array.isArray(value) ? value : [];
  };
  const decisionEvents = () => {
    const value = readJson(DECISION_EVENT_KEY, []);
    return Array.isArray(value) ? value : [];
  };
  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const fmt = (value, digits = 0) => Number(value || 0).toLocaleString("ja-JP", {
    maximumFractionDigits: digits, minimumFractionDigits: digits,
  });
  const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  function dayKey(value = Date.now()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date(value));
    const p = Object.fromEntries(parts.map((item) => [item.type, item.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }

  function eventTime(item) {
    return new Date(item?.at || item?.time || 0).getTime();
  }

  function recordDay(record) {
    return record?.raceDate || dayKey(record?.time || Date.now());
  }

  function uniqueRaceCount(events) {
    const keys = new Set();
    events.forEach((event) => {
      if (!event?.venueCode || !event?.raceNo) return;
      keys.add(`${event.raceDate || dayKey(event.at)}:${event.venueCode}:${Number(event.raceNo)}`);
    });
    return keys.size;
  }

  function buildWindow(startMs, endMs) {
    const s = state();
    const records = (Array.isArray(s.records) ? s.records : []).filter((record) => {
      const time = new Date(record.time || 0).getTime();
      return time >= startMs && time < endMs;
    });
    const safe = safeEvents().filter((event) => {
      const time = eventTime(event);
      return time >= startMs && time < endMs;
    });
    const decision = decisionEvents().filter((event) => {
      const time = eventTime(event);
      return time >= startMs && time < endMs;
    });

    const stakes = records.map((record) => Number(record.stake) || 0).filter((value) => value > 0);
    const raceStarts = decision.filter((event) => event.name === "race_session_start");
    const skips = decision.filter((event) => event.name === "skip_detected");
    const real = decision.filter((event) => event.name === "real_transition");
    const live = safe.filter((event) => event.name === "live_open");
    const activeSeconds = safe.filter((event) => event.name === "active_seconds")
      .reduce((sum, event) => sum + (Number(event.payload?.seconds) || 0), 0);
    const hundred = stakes.filter((value) => value === 100).length;
    const viewed = raceStarts.length || uniqueRaceCount(decision);

    return {
      records,
      stakes,
      airCount: records.length,
      averageStake: mean(stakes),
      maxStake: stakes.length ? Math.max(...stakes) : 0,
      hundredRate: stakes.length ? hundred / stakes.length : 0,
      viewed,
      skips: skips.length,
      skipRate: viewed ? skips.length / viewed : 0,
      realCount: real.length,
      realRate: viewed ? real.length / viewed : 0,
      liveCount: live.length,
      activeSeconds,
    };
  }

  function dailyBaseline(daysBack = 30) {
    const now = new Date();
    const today = dayKey(now);
    const allRecords = Array.isArray(state().records) ? state().records : [];
    const days = new Map();

    const addDay = (key) => {
      if (!key || key === today || days.has(key)) return;
      const start = new Date(`${key}T00:00:00+09:00`).getTime();
      days.set(key, buildWindow(start, start + 24 * 60 * 60 * 1000));
    };

    allRecords.forEach((record) => addDay(recordDay(record)));
    decisionEvents().forEach((event) => addDay(event.raceDate || dayKey(event.at)));
    safeEvents().forEach((event) => addDay(dayKey(event.at)));

    const sorted = [...days.entries()]
      .filter(([key]) => {
        const t = new Date(`${key}T00:00:00+09:00`).getTime();
        return Date.now() - t <= daysBack * 24 * 60 * 60 * 1000;
      })
      .sort((a, b) => b[0].localeCompare(a[0]));

    const active = sorted.filter(([, x]) => x.viewed || x.airCount || x.realCount || x.liveCount);
    const samples = active.length;
    const aggregate = (field) => mean(active.map(([, x]) => Number(x[field]) || 0));
    return {
      samples,
      airCount: aggregate("airCount"),
      averageStake: aggregate("averageStake"),
      hundredRate: aggregate("hundredRate"),
      viewed: aggregate("viewed"),
      skipRate: aggregate("skipRate"),
      realCount: aggregate("realCount"),
      realRate: aggregate("realRate"),
      liveCount: aggregate("liveCount"),
      activeSeconds: aggregate("activeSeconds"),
    };
  }

  function todayWindow() {
    const key = dayKey();
    const start = new Date(`${key}T00:00:00+09:00`).getTime();
    return buildWindow(start, start + 24 * 60 * 60 * 1000);
  }

  function pctDiff(current, baseline) {
    if (!baseline) return null;
    return (current - baseline) / Math.abs(baseline);
  }

  function ppDiff(current, baseline) {
    return (current - baseline) * 100;
  }

  function arrow(current, baseline, percentage = false) {
    if (baseline == null || !Number.isFinite(baseline)) return "—";
    const diff = percentage ? ppDiff(current, baseline) : pctDiff(current, baseline);
    if (diff == null) return "—";
    const threshold = percentage ? 5 : 0.15;
    if (diff > threshold) return `↑ ${percentage ? "+" + fmt(diff, 0) + "pt" : "+" + fmt(diff * 100, 0) + "%"}`;
    if (diff < -threshold) return `↓ ${percentage ? fmt(diff, 0) + "pt" : fmt(diff * 100, 0) + "%"}`;
    return "→ 普段並み";
  }

  function confidence(samples) {
    if (samples >= 14) return { label:"傾向", className:"strong", text:"過去14日以上の本人データと比較" };
    if (samples >= 7) return { label:"仮説", className:"medium", text:"過去7日以上の本人データと比較" };
    if (samples >= 3) return { label:"参考", className:"light", text:"まだサンプルが少ないため参考値" };
    return { label:"蓄積中", className:"light", text:"比較には3日以上の利用データが必要" };
  }

  function hypotheses(today, base) {
    if (base.samples < 3) return ["まだ個人ベースラインを作成中です。3日以上の利用データがたまると『普段との違い』を比較します。"];
    const lines = [];

    const stakeDiff = pctDiff(today.averageStake, base.averageStake);
    if (today.stakes.length >= 2 && stakeDiff != null && stakeDiff >= .30) {
      lines.push(`今日はAIR BET平均額が普段より約${fmt(stakeDiff * 100)}%高めです。勝負を強く選んだ日なのか、今後REAL移行との関係を確認します。`);
    } else if (today.stakes.length >= 2 && stakeDiff != null && stakeDiff <= -.30) {
      lines.push(`今日はAIR BET平均額が普段より約${fmt(Math.abs(stakeDiff) * 100)}%低めです。少額参加が増えた日の可能性があります。`);
    }

    const skipDiff = ppDiff(today.skipRate, base.skipRate);
    if (today.viewed >= 3 && skipDiff >= 15) {
      lines.push(`今日は見送り率が普段より${fmt(skipDiff)}ポイント高く、見るレースと参加するレースを分ける動きが強めです。`);
    } else if (today.viewed >= 3 && skipDiff <= -15) {
      lines.push(`今日は見送り率が普段より${fmt(Math.abs(skipDiff))}ポイント低く、普段より多くの閲覧レースで参加・REAL移行しています。`);
    }

    const realDiff = ppDiff(today.realRate, base.realRate);
    if (today.viewed >= 3 && today.realCount && realDiff >= 10) {
      lines.push(`今日は閲覧レースからREAL導線へ移る割合が普段より${fmt(realDiff)}ポイント高めです。直前の操作列と合わせて理由を追います。`);
    }

    const hundredDiff = ppDiff(today.hundredRate, base.hundredRate);
    if (today.stakes.length >= 3 && hundredDiff >= 20) {
      lines.push(`100B参加率が普段より${fmt(hundredDiff)}ポイント高めです。『とりあえず参加』に近い行動かどうかは断定せず、継続して比較します。`);
    } else if (today.stakes.length >= 3 && hundredDiff <= -20) {
      lines.push(`100B参加率が普段より${fmt(Math.abs(hundredDiff))}ポイント低く、BET額に強弱をつける動きが増えています。`);
    }

    if (!lines.length) lines.push("今日は主要な行動指標が普段の範囲内です。大きな変化はまだ検出していません。");
    return lines.slice(0, 3);
  }

  function render() {
    const analysis = document.getElementById("analysis");
    if (!analysis) return;
    const anchor = document.getElementById("mamoDecisionPanel") || document.getElementById("mamoAiSafeReport") || document.getElementById("analysisList");
    if (!anchor) return;

    let panel = document.getElementById("mamoBaselinePanel");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "mamoBaselinePanel";
      panel.className = "mamo-baseline-panel";
      anchor.insertAdjacentElement("afterend", panel);
    }

    const today = todayWindow();
    const base = dailyBaseline(30);
    const conf = confidence(base.samples);
    const notes = hypotheses(today, base);
    const metric = (label, current, baseline, displayCurrent, displayBase, percentage = false) => `
      <div class="mamo-baseline-metric">
        <span>${label}</span>
        <strong>${displayCurrent}</strong>
        <small>普段 ${displayBase}</small>
        <em>${arrow(current, baseline, percentage)}</em>
      </div>`;

    panel.innerHTML = `
      <div class="mamo-baseline-head">
        <div><span>PERSONAL BASELINE</span><h3>今日と「普段」を比べる</h3></div>
        <div class="mamo-baseline-confidence ${conf.className}"><b>${conf.label}</b><small>${base.samples}日分</small></div>
      </div>
      <p class="mamo-baseline-explain">${esc(conf.text)}。他人との比較ではなく、あなた自身の過去だけを基準にします。</p>
      <div class="mamo-baseline-grid">
        ${metric("AIR参加数", today.airCount, base.airCount, `${today.airCount}R`, base.samples ? `${fmt(base.airCount,1)}R/日` : "—")}
        ${metric("平均AIR BET", today.averageStake, base.averageStake, today.stakes.length ? `${fmt(today.averageStake)}B` : "—", base.samples ? `${fmt(base.averageStake)}B` : "—")}
        ${metric("100B率", today.hundredRate, base.hundredRate, today.stakes.length ? `${fmt(today.hundredRate*100)}%` : "—", base.samples ? `${fmt(base.hundredRate*100)}%` : "—", true)}
        ${metric("見送り率", today.skipRate, base.skipRate, today.viewed ? `${fmt(today.skipRate*100)}%` : "—", base.samples ? `${fmt(base.skipRate*100)}%` : "—", true)}
        ${metric("REAL移行率", today.realRate, base.realRate, today.viewed ? `${fmt(today.realRate*100)}%` : "—", base.samples ? `${fmt(base.realRate*100)}%` : "—", true)}
        ${metric("LIVE閲覧", today.liveCount, base.liveCount, `${today.liveCount}回`, base.samples ? `${fmt(base.liveCount,1)}回/日` : "—")}
      </div>
      <div class="mamo-baseline-notes">
        <strong>加音 守 / 今日の比較メモ</strong>
        ${notes.map((note) => `<p>${esc(note)}</p>`).join("")}
      </div>
      <small class="mamo-baseline-foot">「傾向」は本人の過去データとの統計的な比較表示で、診断・勝敗予測ではありません。データが少ない間は断定しません。</small>`;
  }

  function styles() {
    if (document.getElementById("mamoBaselineStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoBaselineStyle";
    style.textContent = `
      .mamo-baseline-panel{margin:14px 0 22px;padding:14px;background:#fff;border-top:5px solid var(--coral,#ff6b5d);box-shadow:3px 4px 0 rgba(7,27,43,.07)}
      .mamo-baseline-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.mamo-baseline-head>div:first-child span{font-size:9px;font-weight:1000;letter-spacing:.12em;color:var(--coral,#ff6b5d)}.mamo-baseline-head h3{margin:3px 0 8px;font-size:20px}.mamo-baseline-confidence{min-width:70px;padding:6px 8px;text-align:center;background:#f4f8f8}.mamo-baseline-confidence b{display:block;font-size:11px}.mamo-baseline-confidence small{display:block;margin-top:2px;font-size:8px;color:var(--muted,#697a80)}.mamo-baseline-confidence.strong{border-bottom:3px solid var(--teal,#00a8a0)}.mamo-baseline-confidence.medium{border-bottom:3px solid var(--gold,#ffc83d)}.mamo-baseline-confidence.light{border-bottom:3px solid #b9c7ca}
      .mamo-baseline-explain{margin:0 0 10px;color:var(--muted,#697a80);font-size:9px;line-height:1.6}.mamo-baseline-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.mamo-baseline-metric{padding:9px;background:#f4f8f8;border:1px solid var(--soft-line,#dce6e6)}.mamo-baseline-metric span{display:block;font-size:8px;font-weight:900;color:var(--muted,#697a80)}.mamo-baseline-metric strong{display:block;margin-top:3px;font-size:17px}.mamo-baseline-metric small{display:block;margin-top:2px;font-size:8px;color:var(--muted,#697a80)}.mamo-baseline-metric em{display:block;margin-top:5px;font-style:normal;font-size:9px;font-weight:1000;color:var(--teal-dark,#007c78)}
      .mamo-baseline-notes{margin-top:11px;padding:10px;border-left:4px solid var(--coral,#ff6b5d);background:#fff7f5}.mamo-baseline-notes>strong{font-size:10px}.mamo-baseline-notes p{margin:6px 0 0;font-size:11px;line-height:1.7}.mamo-baseline-foot{display:block;margin-top:9px;color:var(--muted,#697a80);font-size:8px;line-height:1.6}
      @media(max-width:540px){.mamo-baseline-grid{grid-template-columns:repeat(2,1fr)}}`;
    document.head.appendChild(style);
  }

  function boot() {
    styles();
    render();
    window.addEventListener("mamo:analysis-rendered", render);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
