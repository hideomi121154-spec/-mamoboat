/* MAMO BOAT Compound Pattern Intelligence v1
 * Finds combinations of observable conditions that coincide with REAL transitions.
 * This is exploratory behavior analysis, not diagnosis or wagering advice.
 */
(() => {
  "use strict";
  if (window.__MAMO_COMPOUND_PATTERN_V1__) return;
  window.__MAMO_COMPOUND_PATTERN_V1__ = true;

  const STATE_KEY = "mamoboat_v40_personal";
  const DECISION_KEY = "mamoboat_decision_events_v1";
  const WINDOW_DAYS = 30;
  const OUTCOME_WINDOW_MS = 30 * 60 * 1000;
  const MIN_SUPPORT = 3;
  const JST = 9 * 60 * 60 * 1000;

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
  };
  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const state = () => read(STATE_KEY, {}) || {};
  const events = () => {
    const value = read(DECISION_KEY, []);
    return Array.isArray(value) ? value : [];
  };
  const cutoff = () => Date.now() - WINDOW_DAYS * 86400000;

  function hourOf(value) {
    const ms = new Date(value || 0).getTime();
    if (!Number.isFinite(ms)) return null;
    return new Date(ms + JST).getUTCHours();
  }

  function records30() {
    const records = Array.isArray(state().records) ? state().records : [];
    return records.filter((record) => new Date(record.time || 0).getTime() >= cutoff())
      .slice().sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));
  }

  function events30() {
    return events().filter((event) => new Date(event.at || 0).getTime() >= cutoff());
  }

  function sameRace(record, event) {
    return String(record.venueCode || "") === String(event.venueCode || "")
      && Number(record.raceNo) === Number(event.raceNo)
      && (!record.raceDate || !event.raceDate || String(record.raceDate) === String(event.raceDate));
  }

  function actionOutcome(record, decisionEvents) {
    const t = new Date(record.time || 0).getTime();
    const after = decisionEvents.filter((event) => {
      const et = new Date(event.at || 0).getTime();
      return et >= t && et - t <= OUTCOME_WINDOW_MS;
    });
    const real = after.some((event) => event.name === "real_transition" && sameRace(record, event));
    const skip = after.some((event) => event.name === "skip_detected" && sameRace(record, event));
    return { real, skip };
  }

  function liveBefore(record, decisionEvents) {
    const t = new Date(record.time || 0).getTime();
    return decisionEvents.some((event) => {
      if (event.name !== "decision_action" || event.payload?.kind !== "live") return false;
      const et = new Date(event.at || 0).getTime();
      return et <= t && t - et <= OUTCOME_WINDOW_MS && sameRace(record, event);
    });
  }

  function buildRows() {
    const records = records30();
    const decisionEvents = events30();
    return records.map((record, index) => {
      const previous = index > 0 ? records[index - 1] : null;
      const t = new Date(record.time || 0).getTime();
      const prevT = previous ? new Date(previous.time || 0).getTime() : NaN;
      const gapMinutes = Number.isFinite(prevT) ? (t - prevT) / 60000 : null;
      const flags = [];
      if ((hourOf(record.time) ?? -1) >= 18) flags.push("night");
      if (Number(record.stake) === 100) flags.push("small_entry");
      if (previous?.status === "miss") flags.push("after_miss");
      if (gapMinutes != null && gapMinutes >= 0 && gapMinutes <= 10) flags.push("rapid");
      if (Number(record.urge) >= 7) flags.push("high_urge");
      if (Number(record.conf) <= 4) flags.push("low_confidence");
      if (liveBefore(record, decisionEvents)) flags.push("live_before");
      return { record, flags, outcome: actionOutcome(record, decisionEvents) };
    });
  }

  const LABELS = {
    night: "夜間",
    small_entry: "100B入口",
    after_miss: "不的中後",
    rapid: "10分以内",
    high_urge: "衝動7以上",
    low_confidence: "自信度4以下",
    live_before: "LIVE後",
  };

  function combinations(items, size) {
    const out = [];
    const walk = (start, picked) => {
      if (picked.length === size) { out.push(picked.slice()); return; }
      for (let i = start; i < items.length; i += 1) {
        picked.push(items[i]); walk(i + 1, picked); picked.pop();
      }
    };
    walk(0, []);
    return out;
  }

  function analyze() {
    const rows = buildRows();
    const allRealRate = rows.length ? rows.filter((row) => row.outcome.real).length / rows.length : 0;
    const availableFlags = [...new Set(rows.flatMap((row) => row.flags))];
    const combos = [...combinations(availableFlags, 2), ...combinations(availableFlags, 3)];
    const found = [];

    combos.forEach((combo) => {
      const matched = rows.filter((row) => combo.every((flag) => row.flags.includes(flag)));
      if (matched.length < MIN_SUPPORT) return;
      const realCount = matched.filter((row) => row.outcome.real).length;
      const skipCount = matched.filter((row) => row.outcome.skip).length;
      const realRate = realCount / matched.length;
      const skipRate = skipCount / matched.length;
      const lift = allRealRate > 0 ? realRate / allRealRate : realRate > 0 ? 2 : 1;
      const evidenceScore = Math.min(40, matched.length * 5);
      const liftScore = Math.min(45, Math.max(0, lift - 1) * 35);
      const outcomeScore = Math.min(15, realRate * 20);
      const score = Math.round(Math.min(100, evidenceScore + liftScore + outcomeScore));
      found.push({ combo, support: matched.length, realCount, skipCount, realRate, skipRate, lift, score });
    });

    found.sort((a, b) => b.score - a.score || b.support - a.support);
    return {
      rowCount: rows.length,
      overallRealRate: allRealRate,
      patterns: found,
      primary: found[0] || null,
    };
  }

  function level(item) {
    if (!item || item.support < 3) return "蓄積中";
    if (item.support < 5 || item.score < 50) return "参考";
    if (item.support < 10 || item.score < 70) return "仮説";
    return "傾向";
  }

  function title(item) {
    return item.combo.map((flag) => LABELS[flag] || flag).join(" × ");
  }

  function render() {
    const host = document.getElementById("mamoBehaviorPatternProfile")
      || document.getElementById("mamoTriggerPanel")
      || document.getElementById("mamoBaselinePanel")
      || document.getElementById("analysisList");
    if (!host) return;

    let panel = document.getElementById("mamoCompoundPatternPanel");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "mamoCompoundPatternPanel";
      panel.className = "mamo-compound-pattern";
      host.insertAdjacentElement("afterend", panel);
    }

    const analysis = analyze();
    const visible = analysis.patterns.filter((item) => item.support >= MIN_SUPPORT).slice(0, 4);
    const overall = Math.round(analysis.overallRealRate * 100);

    panel.innerHTML = `
      <div class="mcp-head"><div><span>COMPOUND PATTERN</span><h3>条件が重なった時の判断</h3></div><small>直近30日</small></div>
      <p class="mcp-intro">単独の癖ではなく、2〜3条件が同時に起きた場面を比較します。全AIR BET後30分のREAL移行率は${overall}%です。</p>
      ${visible.length ? `<div class="mcp-list">${visible.map((item, index) => `
        <article>
          <div class="mcp-title"><i>${index + 1}</i><b>${esc(title(item))}</b><strong>${item.score}</strong></div>
          <div class="mcp-stats"><span>該当<b>${item.support}場面</b></span><span>REAL<b>${Math.round(item.realRate * 100)}%</b></span><span>見送り<b>${Math.round(item.skipRate * 100)}%</b></span><span>全体比<b>${analysis.overallRealRate > 0 ? item.lift.toFixed(1) + "倍" : "比較中"}</b></span></div>
          <p>${item.realRate > analysis.overallRealRate + .1 ? "この条件が重なった場面では、普段よりREAL導線へ進む割合が高めです。" : "この組み合わせだけでREAL移行が強まる証拠は、まだ限定的です。"}</p>
          <small>${level(item)} / 最低3場面以上だけ表示</small>
        </article>`).join("")}</div>` : `<div class="mcp-empty">複合条件を比較できる場面がまだ3件未満です。記録が増えると自動で組み合わせを探索します。</div>`}
      <div class="mcp-note"><b>加音 守 / COMBINATION NOTE</b><p>${analysis.primary ? `今は「${esc(title(analysis.primary))}」の組み合わせを追っています。単独条件より、重なった瞬間に判断が変わるかを確認します。` : "単独の数字だけでは決めつけない。条件が重なった時に何が起きるかを追います。"}</p></div>
      <footer>これは本人の行動履歴内の関連を示す探索分析です。因果関係・依存症・勝敗を判定するものではありません。</footer>`;

    window.MAMO_COMPOUND_PATTERN = Object.freeze({
      version: 1,
      generatedAt: new Date().toISOString(),
      rowCount: analysis.rowCount,
      overallRealRate: analysis.overallRealRate,
      patterns: analysis.patterns.slice(0, 10).map((item) => ({
        flags: item.combo.slice(),
        title: title(item),
        support: item.support,
        realRate: item.realRate,
        skipRate: item.skipRate,
        lift: item.lift,
        score: item.score,
        level: level(item),
      })),
    });
  }

  function styles() {
    if (document.getElementById("mamoCompoundPatternStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoCompoundPatternStyle";
    style.textContent = `
      .mamo-compound-pattern{margin:14px 0 22px;padding:14px;background:#fff;border-top:5px solid #071b2b;box-shadow:3px 4px 0 rgba(7,27,43,.07)}
      .mcp-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.mcp-head span{font-size:9px;font-weight:1000;letter-spacing:.12em;color:var(--teal-dark,#007c78)}.mcp-head h3{margin:3px 0 8px;font-size:20px}.mcp-head small{font-size:9px;font-weight:900;color:#6e7f85}
      .mcp-intro{margin:0 0 9px;padding:9px;background:#f4f8f8;font-size:9px;line-height:1.6;color:#50656c}.mcp-list{display:grid;gap:8px}.mcp-list article{padding:10px;border:1px solid #dfe7e7;border-left:4px solid var(--gold,#ffc83d)}
      .mcp-title{display:grid;grid-template-columns:25px 1fr 38px;gap:7px;align-items:center}.mcp-title i{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#071b2b;color:#fff;font-style:normal;font-size:9px;font-weight:1000}.mcp-title b{font-size:12px}.mcp-title strong{text-align:right;font-size:18px}
      .mcp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:8px}.mcp-stats span{padding:6px;background:#f7f9f9;font-size:8px;color:#6a7b81}.mcp-stats b{display:block;margin-top:2px;font-size:11px;color:#071b2b}.mcp-list p{margin:7px 0 3px;font-size:9px;line-height:1.6}.mcp-list article>small{font-size:8px;color:#708187}
      .mcp-note{margin-top:9px;padding:9px;background:#fff9e9}.mcp-note b{font-size:8px}.mcp-note p{margin:4px 0 0;font-size:9px;line-height:1.6}.mcp-empty{padding:12px;background:#f4f8f8;font-size:10px;line-height:1.6;color:#5e7178}.mamo-compound-pattern>footer{margin-top:7px;font-size:8px;line-height:1.5;color:#74848a}
      @media(max-width:520px){.mcp-stats{grid-template-columns:repeat(2,1fr)}}`;
    document.head.appendChild(style);
  }

  function boot() {
    styles();
    render();
    window.addEventListener("mamo:analysis-rendered", render);
    window.addEventListener("mamo:press-intelligence-rendered", render);
    setInterval(render, 10000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
