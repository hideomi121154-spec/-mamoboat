/* MAMO BOAT Period Intervention Insight v1
 * Adds weekly/monthly summaries of choices made after MAMO baseline messages.
 * Read-only UI module. Does not own press rendering or navigation.
 */
(() => {
  "use strict";
  if (window.__MAMO_PERIOD_INTERVENTION_INSIGHT_V1__) return;
  window.__MAMO_PERIOD_INTERVENTION_INSIGHT_V1__ = true;

  const HISTORY_KEY = "mamoboat_intervention_history_v1";
  const JST = 9 * 60 * 60 * 1000;
  const DAY = 86400000;

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
  };
  const history = () => {
    const value = read(HISTORY_KEY, []);
    return Array.isArray(value) ? value : [];
  };
  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

  function jstDate(ms = Date.now()) {
    const d = new Date(ms + JST);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function addDays(date, delta) {
    const ms = new Date(`${date}T00:00:00+09:00`).getTime();
    return jstDate(ms + delta * DAY);
  }

  function dateOf(value) {
    const ms = new Date(value || 0).getTime();
    return Number.isFinite(ms) && ms > 0 ? jstDate(ms) : "";
  }

  function range(type) {
    const end = addDays(jstDate(), -1);
    const days = type === "monthly" ? 30 : 7;
    const start = addDays(end, -(days - 1));
    return { start, end, days };
  }

  function previousRange(type) {
    const current = range(type);
    const end = addDays(current.start, -1);
    const start = addDays(end, -(current.days - 1));
    return { start, end, days: current.days };
  }

  function inRange(item, r) {
    const date = dateOf(item.shownAt || item.at || item.resolvedAt);
    return date && date >= r.start && date <= r.end;
  }

  function metrics(r) {
    const rows = history().filter((item) => inRange(item, r));
    const completed = rows.filter((item) => item.result && item.result !== "unknown");
    const count = (result) => completed.filter((item) => item.result === result).length;
    const shown = rows.length;
    const skip = count("skip");
    const air = count("air_bet");
    const real = count("real_intent");
    const dismissed = count("dismissed");
    const unknown = rows.filter((item) => !item.result || item.result === "unknown").length;
    const actionable = skip + air + real;
    return {
      rows, shown, completed: completed.length, skip, air, real, dismissed, unknown, actionable,
      skipRate: actionable ? skip / actionable : 0,
      realRate: actionable ? real / actionable : 0,
      airRate: actionable ? air / actionable : 0,
    };
  }

  function deltaText(cur, prev, key, suffix = "回") {
    const a = Number(cur[key] || 0);
    const b = Number(prev[key] || 0);
    if (!b && !a) return "変化なし";
    if (!b) return `前期0 → ${a}${suffix}`;
    const d = a - b;
    if (!d) return "前期と同じ";
    return `前期より${d > 0 ? "+" : ""}${d}${suffix}`;
  }

  function rateDeltaText(cur, prev, key) {
    if (!cur.actionable || !prev.actionable) return "比較データ蓄積中";
    const d = Math.round((cur[key] - prev[key]) * 100);
    if (Math.abs(d) < 5) return "前期とほぼ同じ";
    return `前期より${d > 0 ? "+" : ""}${d}pt`;
  }

  function lead(type, cur, prev) {
    const unit = type === "monthly" ? "30日" : "7日";
    if (!cur.shown) {
      return `${unit}間では、MAMOの「普段との違い」表示はありませんでした。表示が出た期間だけ、その後の選択をここで振り返ります。`;
    }
    if (!cur.actionable) {
      return `${unit}間にMAMO表示は${cur.shown}回ありました。次の選択まで確認できたデータはまだ少ないため、傾向は断定しません。`;
    }
    const choices = [
      { key: "skip", label: "見送り", value: cur.skip },
      { key: "air", label: "AIR BET", value: cur.air },
      { key: "real", label: "REAL移行", value: cur.real },
    ].sort((a, b) => b.value - a.value);
    const top = choices[0];
    let text = `${unit}間、MAMO表示後に確認できた次の選択は${cur.actionable}回。最も多かったのは「${top.label}」${top.value}回でした。`;
    if (prev.actionable >= 2 && cur.actionable >= 2) {
      const skipDelta = Math.round((cur.skipRate - prev.skipRate) * 100);
      if (Math.abs(skipDelta) >= 10) {
        text += ` 見送りの割合は前期より${Math.abs(skipDelta)}ポイント${skipDelta > 0 ? "高く" : "低く"}なっています。`;
      }
    }
    return text;
  }

  function render() {
    const press = document.getElementById("mamoPressIntel");
    if (!press) return;
    const type = press.dataset.type || "morning";
    if (type === "morning") {
      document.getElementById("mamoPeriodInterventionInsight")?.remove();
      return;
    }
    if (!['weekly','monthly'].includes(type)) return;

    const currentRange = range(type);
    const previous = previousRange(type);
    const cur = metrics(currentRange);
    const prev = metrics(previous);

    let box = document.getElementById("mamoPeriodInterventionInsight");
    if (!box) {
      box = document.createElement("section");
      box.id = "mamoPeriodInterventionInsight";
      box.className = "mamo-period-intervention-insight";
      const results = press.querySelector(".mpi-results");
      if (results) results.insertAdjacentElement("beforebegin", box);
      else press.appendChild(box);
    }

    const label = type === "monthly" ? "MONTHLY DECISION CHANGE" : "WEEKLY DECISION CHANGE";
    const title = type === "monthly" ? "この30日、MAMO表示後に何を選んだか" : "この7日、MAMO表示後に何を選んだか";

    box.innerHTML = `
      <div class="mpii-head"><span>${label}</span><h4>${title}</h4></div>
      <p class="mpii-lead">${esc(lead(type, cur, prev))}</p>
      <div class="mpii-grid">
        <div><small>MAMO表示</small><b>${cur.shown}回</b><em>${esc(deltaText(cur, prev, "shown"))}</em></div>
        <div><small>見送り</small><b>${cur.skip}回</b><em>${esc(rateDeltaText(cur, prev, "skipRate"))}</em></div>
        <div><small>AIR BET</small><b>${cur.air}回</b><em>${esc(deltaText(cur, prev, "air"))}</em></div>
        <div><small>REAL移行</small><b>${cur.real}回</b><em>${esc(rateDeltaText(cur, prev, "realRate"))}</em></div>
      </div>
      <div class="mpii-note"><b>加音 守 / 判断の記録</b><p>MAMO表示が原因で行動が変わったとは断定しません。表示後30分以内に確認できた「次の選択」を、本人の振り返り材料として集計しています。</p></div>
      <small class="mpii-foot">対象期間 ${esc(currentRange.start)}〜${esc(currentRange.end)} / 比較：直前${currentRange.days}日間</small>`;
  }

  function style() {
    if (document.getElementById("mamoPeriodInterventionInsightStyle")) return;
    const s = document.createElement("style");
    s.id = "mamoPeriodInterventionInsightStyle";
    s.textContent = `
      .mamo-period-intervention-insight{margin-top:10px;background:#f8fbfb;border:1px solid #cddbdd;padding:12px;border-left:5px solid #008d91}
      .mpii-head span{font-size:8px;font-weight:1000;letter-spacing:.12em;color:#007c78}.mpii-head h4{font-size:17px;margin:2px 0 7px}.mpii-lead{margin:0 0 9px;font-size:10px;line-height:1.7;color:#334b54}
      .mpii-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.mpii-grid>div{background:#fff;padding:8px}.mpii-grid small{display:block;font-size:8px;color:#68767e;font-weight:900}.mpii-grid b{display:block;font-size:15px;margin-top:2px}.mpii-grid em{display:block;font-style:normal;font-size:8px;color:#007c78;font-weight:900;margin-top:2px}
      .mpii-note{margin-top:8px;padding:9px;background:#eef6f6}.mpii-note b{font-size:9px;color:#071b2b}.mpii-note p{margin:4px 0 0;font-size:9px;line-height:1.7}.mpii-foot{display:block;margin-top:6px;font-size:8px;color:#697a80}
      @media(max-width:520px){.mpii-grid{grid-template-columns:repeat(2,1fr)}}`;
    document.head.appendChild(s);
  }

  function boot() {
    style();
    render();
    window.addEventListener("mamo:press-intelligence-rendered", render);
    window.addEventListener("mamo:intervention-history-updated", render);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();
