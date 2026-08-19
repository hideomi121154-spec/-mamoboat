/* MAMO BOAT Behavior Pattern Profile v1
 * Dynamic, evidence-based behavior pattern candidates.
 * This is NOT a personality diagnosis and never predicts race outcomes.
 */
(() => {
  "use strict";
  if (window.__MAMO_BEHAVIOR_PATTERN_PROFILE_V1__) return;
  window.__MAMO_BEHAVIOR_PATTERN_PROFILE_V1__ = true;

  const STATE_KEY = "mamoboat_v40_personal";
  const DECISION_KEY = "mamoboat_decision_events_v1";
  const WINDOW_DAYS = 30;
  const MIN_RECORDS = 5;
  const JST = 9 * 60 * 60 * 1000;

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
  };
  const state = () => read(STATE_KEY, {}) || {};
  const events = () => {
    const value = read(DECISION_KEY, []);
    return Array.isArray(value) ? value : [];
  };
  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
  const cutoff = () => Date.now() - WINDOW_DAYS * 86400000;

  function hourOf(value) {
    const ms = new Date(value || 0).getTime();
    if (!Number.isFinite(ms)) return null;
    return new Date(ms + JST).getUTCHours();
  }

  function records30() {
    const records = Array.isArray(state().records) ? state().records : [];
    return records
      .filter((record) => new Date(record.time || 0).getTime() >= cutoff())
      .slice()
      .sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));
  }

  function events30() {
    return events().filter((event) => new Date(event.at || 0).getTime() >= cutoff());
  }

  function sampleLabel(sample, score) {
    if (sample < 3) return "蓄積中";
    if (sample < 5 || score < 45) return "参考";
    if (sample < 10 || score < 65) return "仮説";
    return "傾向";
  }

  function candidate(id, title, subtitle, score, sample, evidence, note, direction = "observe") {
    const normalized = clamp(Math.round(score));
    return {
      id,
      title,
      subtitle,
      score: normalized,
      sample,
      level: sampleLabel(sample, normalized),
      evidence,
      note,
      direction,
    };
  }

  function afterMissPattern(records) {
    const ratios = [];
    let rapidAfterMiss = 0;
    for (let index = 1; index < records.length; index += 1) {
      const previous = records[index - 1];
      const current = records[index];
      if (previous.status !== "miss") continue;
      const prevStake = Number(previous.stake) || 0;
      const stake = Number(current.stake) || 0;
      if (prevStake > 0 && stake > 0) ratios.push(stake / prevStake);
      const gap = (new Date(current.time || 0) - new Date(previous.time || 0)) / 60000;
      if (Number.isFinite(gap) && gap >= 0 && gap <= 10) rapidAfterMiss += 1;
    }
    if (!ratios.length) return null;
    const avgRatio = mean(ratios);
    const raiseRate = ratios.filter((ratio) => ratio > 1).length / ratios.length;
    const rapidRate = rapidAfterMiss / ratios.length;
    const score = 20 + Math.max(0, avgRatio - 1) * 38 + raiseRate * 28 + rapidRate * 20;
    return candidate(
      "after_miss_chase",
      "不的中後追随パターン",
      "不的中の直後に、次の参加が強まりやすいか",
      score,
      ratios.length,
      `不的中後${ratios.length}場面 / 増額${Math.round(raiseRate * 100)}% / 10分以内${Math.round(rapidRate * 100)}%`,
      avgRatio > 1.15
        ? "不的中後は、通常より金額や参加間隔が変わる可能性があります。"
        : "不的中後だけが特別に強まる動きは、現時点では限定的です。"
    );
  }

  function smallEntryPattern(records) {
    if (!records.length) return null;
    const hundred = records.filter((record) => Number(record.stake) === 100);
    if (!hundred.length) return null;
    let followUps = 0;
    let escalations = 0;
    hundred.forEach((record) => {
      const time = new Date(record.time || 0).getTime();
      const next = records.find((candidateRecord) => {
        const nextTime = new Date(candidateRecord.time || 0).getTime();
        return nextTime > time && nextTime - time <= 30 * 60 * 1000;
      });
      if (!next) return;
      followUps += 1;
      if ((Number(next.stake) || 0) > 100) escalations += 1;
    });
    const hundredRate = hundred.length / records.length;
    const followRate = followUps / hundred.length;
    const escalationRate = followUps ? escalations / followUps : 0;
    const score = hundredRate * 45 + followRate * 30 + escalationRate * 30;
    return candidate(
      "small_entry",
      "少額入口パターン",
      "100Bが、その後の参加の入口になっているか",
      score,
      hundred.length,
      `100B ${hundred.length}回 / 全体${Math.round(hundredRate * 100)}% / 30分以内の追加参加${Math.round(followRate * 100)}%`,
      followRate >= .5
        ? "少額参加のあとに次の参加へ続く場面があります。100B単体ではなく、その後の流れを追います。"
        : "100Bが継続参加の入口になっている証拠は、まだ強くありません。"
    );
  }

  function nightPattern(records, decisionEvents) {
    const allActions = [
      ...records.map((record) => ({ at: record.time, kind: "air" })),
      ...decisionEvents.filter((event) => event.name === "real_transition").map((event) => ({ at: event.at, kind: "real" })),
    ];
    if (allActions.length < 3) return null;
    const night = allActions.filter((action) => {
      const hour = hourOf(action.at);
      return hour != null && hour >= 18;
    });
    const rate = night.length / allActions.length;
    const nightReal = night.filter((action) => action.kind === "real").length;
    const score = rate * 80 + Math.min(20, nightReal * 5);
    return candidate(
      "night_concentration",
      "夜間集中パターン",
      "18時以降に参加・REAL移行が集まりやすいか",
      score,
      allActions.length,
      `参加・REAL ${allActions.length}件 / 18時以降${Math.round(rate * 100)}%`,
      rate >= .6
        ? "夜に判断が集中しています。時間帯と金額・見送りの関係を継続して確認します。"
        : "特定の夜時間帯だけに強く偏る状態ではありません。"
    );
  }

  function rapidPattern(records) {
    if (records.length < 3) return null;
    const gaps = [];
    for (let index = 1; index < records.length; index += 1) {
      const gap = (new Date(records[index].time || 0) - new Date(records[index - 1].time || 0)) / 60000;
      if (Number.isFinite(gap) && gap >= 0 && gap <= 180) gaps.push(gap);
    }
    if (!gaps.length) return null;
    const within10 = gaps.filter((gap) => gap <= 10).length;
    const within20 = gaps.filter((gap) => gap <= 20).length;
    const rate10 = within10 / gaps.length;
    const rate20 = within20 / gaps.length;
    const score = rate10 * 70 + rate20 * 30;
    return candidate(
      "rapid_sequence",
      "短時間連続パターン",
      "一度参加すると短い間隔で次へ進みやすいか",
      score,
      gaps.length,
      `参加間隔${gaps.length}区間 / 10分以内${Math.round(rate10 * 100)}% / 20分以内${Math.round(rate20 * 100)}%`,
      rate10 >= .4
        ? "短い間隔で参加が続く場面が目立ちます。1回ごとのBETより連続区間を見ます。"
        : "短時間に連続する参加は、現時点では支配的ではありません。"
    );
  }

  function skipStablePattern(decisionEvents) {
    const starts = decisionEvents.filter((event) => event.name === "race_session_start");
    const skips = decisionEvents.filter((event) => event.name === "skip_detected");
    if (starts.length < 3) return null;
    const rate = skips.length / starts.length;
    const score = rate * 100;
    return candidate(
      "skip_stable",
      "見送り安定パターン",
      "閲覧したレースを、そのまま参加せず見送れる割合",
      score,
      starts.length,
      `閲覧${starts.length}回 / 見送り${skips.length}回 / 見送り率${Math.round(rate * 100)}%`,
      rate >= .4
        ? "見るレースと参加するレースを分ける動きが比較的はっきりしています。"
        : "見送りはまだ少なく、参加側へ進む場面の方が多い状態です。",
      "protective"
    );
  }

  function liveReactivePattern(decisionEvents) {
    const transitions = decisionEvents.filter((event) => event.name === "real_transition");
    if (!transitions.length) return null;
    let liveBefore = 0;
    transitions.forEach((event) => {
      const sequence = Array.isArray(event.payload?.sequence) ? event.payload.sequence : [];
      if (sequence.some((action) => action.kind === "live" || /LIVE/.test(action.label || ""))) liveBefore += 1;
    });
    const rate = liveBefore / transitions.length;
    const score = rate * 100;
    return candidate(
      "live_reactive",
      "LIVE反応パターン",
      "映像視聴後にREAL導線へ進みやすいか",
      score,
      transitions.length,
      `REAL移行${transitions.length}回 / 直前30分にLIVEあり${Math.round(rate * 100)}%`,
      rate >= .5
        ? "REAL移行前にLIVE視聴が入る割合が高めです。映像が判断のきっかけになっているかを追います。"
        : "LIVE視聴がREAL移行の主要な前段になっている証拠は、まだ強くありません。"
    );
  }

  function buildProfile() {
    const records = records30();
    const decisionEvents = events30();
    const candidates = [
      afterMissPattern(records),
      smallEntryPattern(records),
      nightPattern(records, decisionEvents),
      rapidPattern(records),
      skipStablePattern(decisionEvents),
      liveReactivePattern(decisionEvents),
    ].filter(Boolean);

    const ranked = candidates
      .filter((item) => item.sample >= 3 || item.score >= 60)
      .sort((left, right) => right.score - left.score || right.sample - left.sample);

    return {
      records: records.length,
      eventCount: decisionEvents.length,
      candidates: ranked,
      primary: ranked[0] || null,
      secondary: ranked[1] || null,
    };
  }

  function render() {
    const host = document.getElementById("mamoTriggerPanel")
      || document.getElementById("mamoBaselinePanel")
      || document.getElementById("mamoDecisionPanel")
      || document.getElementById("analysisList");
    if (!host) return;

    let panel = document.getElementById("mamoBehaviorPatternProfile");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "mamoBehaviorPatternProfile";
      panel.className = "mamo-behavior-profile";
      host.insertAdjacentElement("afterend", panel);
    }

    const profile = buildProfile();
    const visible = profile.candidates.slice(0, 4);
    const enough = profile.records >= MIN_RECORDS || profile.eventCount >= 8;
    const headline = profile.primary
      ? `今もっとも強く出ているのは「${profile.primary.title}」`
      : "まだ勝負パターンを決めつけない";

    panel.innerHTML = `
      <div class="mbp-head">
        <div><span>BEHAVIOR PATTERN PROFILE</span><h3>今の勝負パターン</h3></div>
        <small>${enough ? "30日ローリング" : "データ蓄積中"}</small>
      </div>
      <div class="mbp-lead"><b>${esc(headline)}</b><p>固定された性格診断ではありません。直近30日の行動が変われば、順位もスコアも変わります。</p></div>
      ${visible.length ? `<div class="mbp-list">${visible.map((item, index) => `
        <article class="${item.direction === "protective" ? "protective" : "observe"}">
          <div class="mbp-rank"><i>${index + 1}</i><div><b>${esc(item.title)}</b><small>${esc(item.subtitle)}</small></div><strong>${item.score}</strong></div>
          <div class="mbp-bar"><span style="width:${item.score}%"></span></div>
          <p>${esc(item.note)}</p>
          <footer><span>${esc(item.level)}</span><small>${esc(item.evidence)}</small></footer>
        </article>`).join("")}</div>` : `<div class="mbp-empty">AIR BET・見送り・REAL移行の記録が増えると、複数の行動パターン候補を比較します。</div>`}
      <div class="mbp-editorial"><b>加音 守 / PROFILE NOTE</b><p>${profile.primary ? `今は「${esc(profile.primary.title)}」を最優先で追います。ただし、これはあなたを一つの型に固定するものではありません。` : "まだ型をつける段階ではありません。データが増えるまで観察を続けます。"}</p></div>
      <small class="mbp-foot">スコアは本人の直近30日データ内での観察強度です。医療的な診断、依存症判定、勝敗予測ではありません。</small>`;

    window.MAMO_BEHAVIOR_PROFILE = Object.freeze({
      version: 1,
      generatedAt: new Date().toISOString(),
      records: profile.records,
      eventCount: profile.eventCount,
      candidates: profile.candidates.map((item) => ({
        id: item.id,
        title: item.title,
        score: item.score,
        level: item.level,
        sample: item.sample,
        direction: item.direction,
      })),
    });
  }

  function styles() {
    if (document.getElementById("mamoBehaviorPatternProfileStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoBehaviorPatternProfileStyle";
    style.textContent = `
      .mamo-behavior-profile{margin:14px 0 22px;padding:14px;background:#fff;border-top:5px solid var(--teal,#00a8a0);box-shadow:3px 4px 0 rgba(7,27,43,.07)}
      .mbp-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.mbp-head span{font-size:9px;font-weight:1000;letter-spacing:.12em;color:var(--teal-dark,#007c78)}.mbp-head h3{margin:3px 0 8px;font-size:20px}.mbp-head small{font-size:9px;font-weight:900;color:var(--muted,#697a80)}
      .mbp-lead{padding:10px;background:#f4f8f8;margin-bottom:8px}.mbp-lead b{font-size:13px}.mbp-lead p{margin:4px 0 0;font-size:9px;line-height:1.6;color:#64777d}
      .mbp-list{display:grid;gap:8px}.mbp-list article{padding:10px;border:1px solid #dde6e6;background:#fff}.mbp-list article.observe{border-left:4px solid var(--gold,#ffc83d)}.mbp-list article.protective{border-left:4px solid var(--teal,#00a8a0)}
      .mbp-rank{display:grid;grid-template-columns:28px 1fr 38px;align-items:center;gap:7px}.mbp-rank i{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#071b2b;color:#fff;font-style:normal;font-size:10px;font-weight:1000}.mbp-rank b{display:block;font-size:12px}.mbp-rank small{display:block;margin-top:2px;font-size:8px;color:#6b7b80}.mbp-rank strong{font-size:18px;text-align:right;color:#071b2b}
      .mbp-bar{height:5px;margin:8px 0;background:#edf2f2;overflow:hidden}.mbp-bar span{display:block;height:100%;background:currentColor;color:var(--teal,#00a8a0)}.mbp-list article.observe .mbp-bar span{color:var(--gold,#ffc83d);background:var(--gold,#ffc83d)}
      .mbp-list p{margin:5px 0;font-size:9px;line-height:1.6;color:#334b54}.mbp-list footer{display:flex;justify-content:space-between;gap:8px;align-items:center}.mbp-list footer span{font-size:8px;font-weight:1000;color:var(--teal-dark,#007c78)}.mbp-list footer small{font-size:8px;color:#718187;text-align:right}
      .mbp-editorial{margin-top:9px;padding:9px;background:#fff9e9}.mbp-editorial b{font-size:8px;color:#071b2b}.mbp-editorial p{margin:4px 0 0;font-size:9px;line-height:1.6}.mbp-foot{display:block;margin-top:7px;font-size:8px;line-height:1.5;color:#74848a}.mbp-empty{padding:12px;background:#f4f8f8;font-size:10px;line-height:1.6;color:#5e7178}
    `;
    document.head.appendChild(style);
  }

  function boot() {
    styles();
    render();
    window.addEventListener("mamo:analysis-rendered", render);
    window.addEventListener("mamo:press-intelligence-rendered", render);
    setInterval(render, 8000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
