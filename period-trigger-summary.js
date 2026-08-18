/* MAMO BOAT Period Trigger Summary v1
 * Connects period comparison with likely behavior triggers.
 * This module observes user behavior only; it does not predict races or recommend wagers.
 */
(() => {
  "use strict";

  const STATE_KEY = "mamoboat_v40_personal";
  const SAFE_KEY = "mamoboat_ai_safe_events";
  const DECISION_KEY = "mamoboat_decision_events_v1";
  const DAY = 24 * 60 * 60 * 1000;

  const readJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
  };
  const state = () => readJson(STATE_KEY, {}) || {};
  const safeEvents = () => {
    const v = readJson(SAFE_KEY, []);
    return Array.isArray(v) ? v : [];
  };
  const decisionEvents = () => {
    const v = readJson(DECISION_KEY, []);
    return Array.isArray(v) ? v : [];
  };
  const esc = (v) => String(v ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const fmt = (v, d = 0) => Number(v || 0).toLocaleString("ja-JP", {
    maximumFractionDigits: d, minimumFractionDigits: d,
  });

  function hourJst(value) {
    return Number(new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo", hour: "2-digit", hour12: false,
    }).format(new Date(value)));
  }

  function rangeData(start, end) {
    const records = (Array.isArray(state().records) ? state().records : [])
      .filter((r) => {
        const t = new Date(r.time || 0).getTime();
        return t >= start && t < end;
      })
      .sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));
    const safe = safeEvents().filter((e) => {
      const t = new Date(e.at || 0).getTime();
      return t >= start && t < end;
    });
    const decision = decisionEvents().filter((e) => {
      const t = new Date(e.at || 0).getTime();
      return t >= start && t < end;
    });

    const stakes = records.map((r) => Number(r.stake) || 0).filter((v) => v > 0);
    const night = records.filter((r) => hourJst(r.time || Date.now()) >= 18).length;
    const hundred = records.filter((r) => Number(r.stake) === 100).length;
    const live = safe.filter((e) => e.name === "live_open");

    let afterMissRaise = 0;
    let afterMissSamples = 0;
    let rapid = 0;
    let rapidSamples = 0;
    let longest100Run = 0;
    let run100 = 0;

    records.forEach((r, i) => {
      if (Number(r.stake) === 100) {
        run100 += 1;
        longest100Run = Math.max(longest100Run, run100);
      } else run100 = 0;

      if (!i) return;
      const prev = records[i - 1];
      const curStake = Number(r.stake) || 0;
      const prevStake = Number(prev.stake) || 0;
      const gap = (new Date(r.time || 0) - new Date(prev.time || 0)) / 60000;
      if (Number.isFinite(gap) && gap >= 0 && gap <= 180) {
        rapidSamples += 1;
        if (gap <= 10) rapid += 1;
      }
      if (prev.status === "miss" && prevStake > 0 && curStake > 0) {
        afterMissSamples += 1;
        if (curStake > prevStake) afterMissRaise += 1;
      }
    });

    const liveBeforeAir = records.filter((r) => {
      const t = new Date(r.time || 0).getTime();
      return live.some((e) => {
        const et = new Date(e.at || 0).getTime();
        return et <= t && t - et <= 30 * 60 * 1000;
      });
    }).length;

    return {
      records,
      count: records.length,
      nightRate: records.length ? night / records.length : 0,
      hundredRate: records.length ? hundred / records.length : 0,
      longest100Run,
      afterMissRate: afterMissSamples ? afterMissRaise / afterMissSamples : 0,
      afterMissSamples,
      rapidRate: rapidSamples ? rapid / rapidSamples : 0,
      rapidSamples,
      liveBeforeAirRate: records.length ? liveBeforeAir / records.length : 0,
      liveBeforeAir,
      decision,
      stakes,
    };
  }

  function diffScore(current, previous, field, minSample = 1) {
    if (current.count < minSample) return 0;
    const c = Number(current[field]) || 0;
    const p = Number(previous[field]) || 0;
    return c - p;
  }

  function candidates(current, previous) {
    const list = [];
    const push = (id, title, metric, score, text, sample) => {
      list.push({ id, title, metric, score, text, sample });
    };

    const nightDiff = diffScore(current, previous, "nightRate", 2);
    push(
      "night", "夜の参加",
      `${fmt(current.nightRate * 100)}%（前期間 ${fmt(previous.nightRate * 100)}%）`,
      Math.max(0, nightDiff) + (current.nightRate >= .6 ? .15 : 0),
      current.nightRate >= .6
        ? "AIR BETが18時以降に集中しています。"
        : "夜への強い集中はまだ確認していません。",
      current.count,
    );

    const missDiff = current.afterMissSamples ? current.afterMissRate - previous.afterMissRate : 0;
    push(
      "after_miss", "不的中後の増額",
      current.afterMissSamples ? `${fmt(current.afterMissRate * 100)}%（${current.afterMissSamples}件）` : "サンプル不足",
      Math.max(0, missDiff) + (current.afterMissRate >= .5 && current.afterMissSamples >= 2 ? .18 : 0),
      current.afterMissSamples
        ? "不的中の次にAIR BET額を上げた割合を追っています。"
        : "不的中後の次回行動はまだサンプル不足です。",
      current.afterMissSamples,
    );

    const hundredDiff = diffScore(current, previous, "hundredRate", 2);
    push(
      "hundred", "100B連続参加",
      `${fmt(current.hundredRate * 100)}% / 最長${current.longest100Run}連続`,
      Math.max(0, hundredDiff) + (current.longest100Run >= 3 ? .2 : 0),
      current.longest100Run >= 3
        ? `100Bで${current.longest100Run}レース連続した区間があります。`
        : "100Bの長い連続参加はまだ目立っていません。",
      current.count,
    );

    const liveDiff = diffScore(current, previous, "liveBeforeAirRate", 2);
    push(
      "live", "LIVE後のAIR BET",
      `${current.liveBeforeAir}回 / ${fmt(current.liveBeforeAirRate * 100)}%`,
      Math.max(0, liveDiff) + (current.liveBeforeAirRate >= .4 && current.liveBeforeAir >= 2 ? .18 : 0),
      current.liveBeforeAir
        ? "LIVEを開いてから30分以内にAIR BETした場面を追っています。"
        : "LIVE後30分以内のAIR BETは今期間まだありません。",
      current.liveBeforeAir,
    );

    const rapidDiff = current.rapidSamples ? current.rapidRate - previous.rapidRate : 0;
    push(
      "rapid", "短時間の連続参加",
      current.rapidSamples ? `10分以内 ${fmt(current.rapidRate * 100)}%` : "サンプル不足",
      Math.max(0, rapidDiff) + (current.rapidRate >= .5 && current.rapidSamples >= 2 ? .18 : 0),
      current.rapidSamples
        ? "AIR BET同士の間隔が10分以内になる割合を追っています。"
        : "連続参加の間隔を比べるにはもう少し記録が必要です。",
      current.rapidSamples,
    );

    return list.sort((a, b) => b.score - a.score);
  }

  function summaryText(top, current, previous) {
    if (!current.count) return "この期間はAIR BET記録がありません。トリガー比較は次の利用から始まります。";
    if (!previous.count) return `今期間は${current.count}回のAIR BETがあります。前期間データがまだ少ないため、まず「${top.title}」を観察候補として記録します。`;
    if (top.score < .12) return "前期間と比べて、特定のトリガーだけが大きく強まったとはまだ言えません。引き続き比較します。";
    return `前期間との差では「${top.title}」が最も目立っています。勝敗の評価ではなく、AIR BETの回数や金額が動く条件として追跡します。`;
  }

  function render() {
    const host = document.getElementById("mamoAiSafeReport");
    if (!host) return;
    let panel = document.getElementById("mamoPeriodTriggerSummary");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "mamoPeriodTriggerSummary";
      panel.className = "mamo-period-trigger";
      host.insertAdjacentElement("afterend", panel);
    }

    const now = Date.now();
    const current = rangeData(now - 7 * DAY, now);
    const previous = rangeData(now - 14 * DAY, now - 7 * DAY);
    const ranked = candidates(current, previous);
    const top = ranked[0];
    const visible = ranked.slice(0, 3);

    panel.innerHTML = `
      <div class="mpt-head">
        <div><span>MAMO AI / TRIGGER LINK</span><h3>7日間で何が動いた？</h3></div>
        <small>前7日と比較</small>
      </div>
      <div class="mpt-lead"><b>加音 守 / 観察</b><p>${esc(summaryText(top, current, previous))}</p></div>
      <div class="mpt-list">
        ${visible.map((x, i) => `<article class="${i === 0 ? "top" : ""}">
          <div><b>${esc(x.title)}</b><span>${i === 0 ? "注目" : "比較中"}</span></div>
          <strong>${esc(x.metric)}</strong>
          <p>${esc(x.text)}</p>
        </article>`).join("")}
      </div>
      <footer>夜・不的中後・100B連続・LIVE後・短時間連続参加を本人の過去データだけで比較します。因果関係や勝敗への影響を断定する表示ではありません。</footer>`;
  }

  function styles() {
    if (document.getElementById("mamoPeriodTriggerStyle")) return;
    const s = document.createElement("style");
    s.id = "mamoPeriodTriggerStyle";
    s.textContent = `
      .mamo-period-trigger{margin:14px 0 22px;padding:14px;background:#fff;border-top:5px solid var(--navy,#071b2b);box-shadow:3px 4px 0 rgba(7,27,43,.07)}
      .mpt-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}.mpt-head span{font-size:9px;font-weight:1000;color:var(--teal-dark,#007c78);letter-spacing:.12em}.mpt-head h3{margin:3px 0 10px;font-size:20px}.mpt-head small{font-size:9px;font-weight:900;color:var(--muted,#697a80)}
      .mpt-lead{padding:10px;background:#f4f8f8;border-left:4px solid var(--teal,#00a8a0)}.mpt-lead b{font-size:10px;color:var(--teal-dark,#007c78)}.mpt-lead p{margin:4px 0 0;font-size:11px;line-height:1.7}
      .mpt-list{display:grid;gap:7px;margin-top:9px}.mpt-list article{padding:10px;border:1px solid var(--soft-line,#dce6e6);background:#fafbfb}.mpt-list article.top{border-left:5px solid var(--gold,#ffc83d)}.mpt-list article>div{display:flex;justify-content:space-between;gap:8px}.mpt-list article b{font-size:12px}.mpt-list article span{font-size:9px;font-weight:1000;color:var(--teal-dark,#007c78)}.mpt-list article strong{display:block;margin-top:4px;font-size:16px}.mpt-list article p{margin:4px 0 0;font-size:10px;line-height:1.6;color:var(--muted,#697a80)}
      .mamo-period-trigger footer{margin-top:9px;font-size:9px;line-height:1.55;color:var(--muted,#697a80)}
    `;
    document.head.appendChild(s);
  }

  function boot() {
    styles();
    render();
    window.addEventListener("mamo:analysis-rendered", render);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
