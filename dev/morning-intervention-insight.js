/* MAMO BOAT Morning Intervention Insight v1
 * Shows yesterday's post-intervention choices in the morning press.
 * Wording is descriptive, not causal: it says what happened after the display.
 */
(() => {
  "use strict";
  if (window.__MAMO_MORNING_INTERVENTION_V1__) return;
  window.__MAMO_MORNING_INTERVENTION_V1__ = true;

  const KEY = "mamoboat_intervention_history_v1";
  const JST = 9 * 60 * 60 * 1000;
  const DAY = 86400000;

  const read = () => {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) { return []; }
  };
  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const pad = (n) => String(n).padStart(2, "0");
  function jstDate(ms = Date.now()) {
    const d = new Date(ms + JST);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  function addDays(date, delta) {
    return jstDate(new Date(`${date}T00:00:00+09:00`).getTime() + delta * DAY);
  }
  function entryDate(entry) {
    if (entry?.raceDate) return entry.raceDate;
    const ms = new Date(entry?.at || 0).getTime();
    return Number.isFinite(ms) && ms > 0 ? jstDate(ms) : "";
  }

  function yesterdaySummary() {
    const yesterday = addDays(jstDate(), -1);
    const list = read().filter((entry) => entryDate(entry) === yesterday);
    const shown = list.filter((entry) => entry.type === "shown");
    const results = list.filter((entry) => entry.type === "result");
    const counts = { air_bet: 0, skip: 0, real_intent: 0, dismissed: 0, unknown: 0 };
    results.forEach((entry) => {
      const key = Object.prototype.hasOwnProperty.call(counts, entry.result) ? entry.result : "unknown";
      counts[key] += 1;
    });
    const seconds = results.map((entry) => Number(entry.secondsAfter)).filter(Number.isFinite);
    const avgSeconds = seconds.length ? Math.round(seconds.reduce((a, b) => a + b, 0) / seconds.length) : null;
    return { yesterday, shown: shown.length, results: results.length, counts, avgSeconds };
  }

  function narrative(summary) {
    if (!summary.shown) return {
      headline: "昨日はMAMOの比較表示はありませんでした",
      text: "普段との差が設定した基準を超えた場面は記録されていません。",
      tone: "quiet",
    };
    const c = summary.counts;
    const parts = [];
    if (c.skip) parts.push(`見送り ${c.skip}回`);
    if (c.air_bet) parts.push(`AIR BET ${c.air_bet}回`);
    if (c.real_intent) parts.push(`REAL導線 ${c.real_intent}回`);
    if (c.dismissed) parts.push(`表示を閉じる ${c.dismissed}回`);
    if (c.unknown) parts.push(`30分以内に次行動なし ${c.unknown}回`);
    const follow = parts.length ? parts.join(" / ") : "次の行動はまだ記録されていません";
    const headline = c.skip
      ? `MAMO表示後、${c.skip}回は見送りを選びました`
      : "MAMO表示後の選択を記録しました";
    const time = summary.avgSeconds == null ? "" : ` 結果が記録されるまで平均約${summary.avgSeconds}秒でした。`;
    return {
      headline,
      text: `昨日は「普段との違い」を${summary.shown}回表示。表示後30分以内の次の行動は、${follow}。${time}`,
      tone: c.skip ? "good" : "normal",
    };
  }

  function render() {
    const press = document.getElementById("mamoPressIntel");
    if (!press || (press.dataset.type && press.dataset.type !== "morning")) {
      document.getElementById("mamoMorningInterventionInsight")?.remove();
      return;
    }
    const summary = yesterdaySummary();
    const copy = narrative(summary);
    let box = document.getElementById("mamoMorningInterventionInsight");
    if (!box) {
      box = document.createElement("section");
      box.id = "mamoMorningInterventionInsight";
      box.className = "mamo-morning-intervention";
      const morning = document.getElementById("mamoMorningInsight");
      if (morning) morning.insertAdjacentElement("afterend", box);
      else press.appendChild(box);
    }
    box.className = `mamo-morning-intervention ${copy.tone}`;
    box.innerHTML = `
      <div class="mmi2-head"><span>YOUR DECISION / AFTER MAMO</span><h4>昨日、判断のあとに何を選んだか</h4></div>
      <div class="mmi2-lead"><b>${esc(copy.headline)}</b><p>${esc(copy.text)}</p></div>
      <div class="mmi2-grid">
        <div><small>比較表示</small><b>${summary.shown}回</b></div>
        <div><small>見送り</small><b>${summary.counts.skip}回</b></div>
        <div><small>AIR BET</small><b>${summary.counts.air_bet}回</b></div>
        <div><small>REAL導線</small><b>${summary.counts.real_intent}回</b></div>
      </div>
      <small class="mmi2-foot">「表示したから行動が変わった」と断定する表示ではありません。MAMO表示後30分以内に記録された次の選択を振り返っています。</small>`;
  }

  function style() {
    if (document.getElementById("mamoMorningInterventionStyle")) return;
    const s = document.createElement("style");
    s.id = "mamoMorningInterventionStyle";
    s.textContent = `
      .mamo-morning-intervention{margin-top:10px;background:#f8fbfb;border:1px solid #c8d9db;padding:12px;border-left:5px solid #0b8d91}
      .mamo-morning-intervention.good{background:#f5fbf7;border-left-color:#3d9b69}.mmi2-head span{font-size:8px;font-weight:1000;letter-spacing:.12em;color:#007c78}.mmi2-head h4{font-size:17px;margin:2px 0 8px}.mmi2-lead{padding:9px;background:#fff}.mmi2-lead b{font-size:13px}.mmi2-lead p{margin:4px 0 0;font-size:10px;line-height:1.7}.mmi2-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:7px}.mmi2-grid>div{background:#fff;padding:7px}.mmi2-grid small{display:block;font-size:8px;color:#68767e;font-weight:900}.mmi2-grid b{display:block;font-size:14px;margin-top:2px}.mmi2-foot{display:block;margin-top:7px;font-size:8px;line-height:1.55;color:#697a80}@media(max-width:520px){.mmi2-grid{grid-template-columns:repeat(2,1fr)}}`;
    document.head.appendChild(s);
  }

  function boot() {
    style();
    render();
    window.addEventListener("mamo:press-intelligence-rendered", render);
    window.addEventListener("mamo:intervention-history-updated", render);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
