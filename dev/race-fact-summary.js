/* MAMO BOAT — race fact summary v1
 * Read-only presentation of official race facts already present in today.json.
 * No prediction, recommendation, bet mutation, wallet mutation or record mutation.
 */
(() => {
  "use strict";
  if (window.__MAMO_RACE_FACT_SUMMARY_V1__) return;
  window.__MAMO_RACE_FACT_SUMMARY_V1__ = true;

  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const num = (value) => {
    if (value == null || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const fmt = (value, digits = 2) => {
    const n = num(value);
    if (n == null) return "—";
    return n.toFixed(digits).replace(/\.00$/, "");
  };

  const compact1 = (value) => {
    const n = num(value);
    if (n == null) return "—";
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  };

  const boat = (entry) => Number(entry?.boatNumber) || 0;

  function ranked(entries, key, direction = "desc") {
    return (entries || [])
      .map((entry) => ({ entry, value: num(entry?.[key]) }))
      .filter((item) => item.value != null)
      .sort((a, b) => direction === "asc" ? a.value - b.value : b.value - a.value);
  }

  function topFact(entries, key, direction = "desc") {
    return ranked(entries, key, direction)[0] || null;
  }

  function boatBadge(entry) {
    const n = boat(entry);
    return `<span class="race-fact-boat b${n}">${n || "—"}号艇</span>`;
  }

  function chip(label, value, tone = "") {
    return `<span class="race-fact-chip ${tone ? `tone-${tone}` : ""}"><small>${esc(label)}</small><b>${esc(value)}</b></span>`;
  }

  function playerRow(entries) {
    const local = topFact(entries, "localWinRate", "desc");
    const start = topFact(entries, "averageStart", "asc");
    const penalties = (entries || []).filter((entry) =>
      (num(entry?.flyingCount) || 0) > 0 || (num(entry?.lateCount) || 0) > 0
    );

    const facts = [];
    if (local) facts.push(chip(
      `${boat(local.entry)}号艇 当地勝率`,
      fmt(local.value, 2),
      "blue"
    ));
    if (start) facts.push(chip(
      `${boat(start.entry)}号艇 平均ST`,
      fmt(start.value, 2),
      "navy"
    ));
    if (penalties.length) {
      const entry = penalties[0];
      const f = num(entry.flyingCount) || 0;
      const l = num(entry.lateCount) || 0;
      facts.push(chip(
        `${boat(entry)}号艇`,
        [f ? `F${f}` : "", l ? `L${l}` : ""].filter(Boolean).join(" / "),
        "warn"
      ));
    }
    if (!facts.length) facts.push(chip("選手データ", "取得待ち", "muted"));

    return `<div class="race-fact-row">
      <div class="race-fact-label"><span aria-hidden="true">●</span><b>選手情報</b></div>
      <div class="race-fact-values">${facts.slice(0, 3).join("")}</div>
    </div>`;
  }

  function venueRow(context) {
    const env = context?.environment || {};
    const venueName = context?.venueName || "";
    const facts = [];
    if (venueName) facts.push(chip("開催場", venueName, "blue"));
    if (env.weather) facts.push(chip("天候", env.weather));
    const windSpeed = num(env.windSpeed);
    if (env.windDirection || windSpeed != null) {
      const wind = `${env.windDirection || ""}${windSpeed != null ? `${compact1(windSpeed)}m` : ""}`;
      facts.push(chip("風", wind || "—", "navy"));
    }
    const wave = num(env.waveHeight);
    if (wave != null) facts.push(chip("波", `${compact1(wave)}cm`));
    if (!facts.length) facts.push(chip("当日水面", "取得待ち", "muted"));

    return `<div class="race-fact-row">
      <div class="race-fact-label"><span aria-hidden="true">≋</span><b>場所の特徴</b></div>
      <div class="race-fact-values">${facts.slice(0, 4).join("")}</div>
    </div>`;
  }

  function motorRow(entries) {
    const motor2 = topFact(entries, "motor2Rate", "desc");
    const motor3 = topFact(entries, "motor3Rate", "desc");
    const facts = [];
    if (motor2) facts.push(chip(
      `${boat(motor2.entry)}号艇 M${motor2.entry?.motorNumber || "—"}`,
      `2連率 ${fmt(motor2.value, 1)}%`,
      "green"
    ));
    if (motor3 && (!motor2 || boat(motor3.entry) !== boat(motor2.entry))) {
      facts.push(chip(
        `${boat(motor3.entry)}号艇 M${motor3.entry?.motorNumber || "—"}`,
        `3連率 ${fmt(motor3.value, 1)}%`,
        "blue"
      ));
    }
    if (!facts.length) facts.push(chip("モーター", "取得待ち", "muted"));

    return `<div class="race-fact-row">
      <div class="race-fact-label"><span aria-hidden="true">⚙</span><b>モーター</b></div>
      <div class="race-fact-values">${facts.join("")}</div>
    </div>`;
  }

  function exhibitionRow(entries, carteSource) {
    const exhibition = topFact(entries, "exhibitionTime", "asc");
    const previewCount = Number(carteSource?.previewParsedRacers) || 0;
    const fetchedAt = carteSource?.previewFetchedAt || "";
    const facts = [];
    if (exhibition) {
      const count = ranked(entries, "exhibitionTime", "asc").length;
      facts.push(chip(
        `${count === 6 ? "展示トップ" : "展示タイム"} ${boat(exhibition.entry)}号艇`,
        fmt(exhibition.value, 2),
        "blue"
      ));
      facts.push(chip("取得", `${count}/6艇`));
    } else {
      facts.push(chip("展示", "直前データ待ち", "muted"));
      if (previewCount > 0) facts.push(chip("取得状況", `${previewCount}/6艇`));
    }
    if (fetchedAt) {
      let label = "";
      try {
        label = new Date(fetchedAt).toLocaleTimeString("ja-JP", {
          timeZone: "Asia/Tokyo",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch (_) {}
      if (label) facts.push(chip("最終確認", label));
    }

    return `<div class="race-fact-row">
      <div class="race-fact-label"><span aria-hidden="true">▥</span><b>展示</b></div>
      <div class="race-fact-values">${facts.slice(0, 3).join("")}</div>
      <div class="race-fact-note">展示タイムは展示航走後に公式データが公開されてから反映します。</div>
    </div>`;
  }

  function summaryRow(entries) {
    const local = topFact(entries, "localWinRate", "desc");
    const motor = topFact(entries, "motor2Rate", "desc");
    const exhibition = topFact(entries, "exhibitionTime", "asc");
    const parts = [];
    if (local) parts.push(`当地勝率 ${boat(local.entry)}号艇 ${fmt(local.value, 2)}`);
    if (motor) parts.push(`モーター2連率 ${boat(motor.entry)}号艇 ${fmt(motor.value, 1)}%`);
    if (exhibition) parts.push(`展示 ${boat(exhibition.entry)}号艇 ${fmt(exhibition.value, 2)}`);
    const text = parts.length ? parts.join(" / ") : "取得済みの事実をここに整理します。";

    return `<div class="race-fact-row race-fact-summary-row">
      <div class="race-fact-label"><span aria-hidden="true">★</span><b>まとめ</b></div>
      <p>${esc(text)}</p>
    </div>`;
  }

  function detailTable(entries) {
    const rows = (entries || []).map((entry) => {
      const penalties = [
        (num(entry.flyingCount) || 0) ? `F${num(entry.flyingCount)}` : "",
        (num(entry.lateCount) || 0) ? `L${num(entry.lateCount)}` : "",
      ].filter(Boolean).join("/");
      return `<tr>
        <th>${boatBadge(entry)} ${esc(entry.name || "")}</th>
        <td>${esc(entry.class || "—")}</td>
        <td>${fmt(entry.localWinRate, 2)}</td>
        <td>${fmt(entry.averageStart, 2)}</td>
        <td>${penalties || "—"}</td>
        <td>${entry.motorNumber ? `M${esc(entry.motorNumber)}` : "—"} / ${fmt(entry.motor2Rate, 1)}%</td>
        <td>${fmt(entry.exhibitionTime, 2)}</td>
      </tr>`;
    }).join("");

    return `<div class="race-fact-detail-scroll">
      <table class="race-fact-table">
        <thead><tr><th>選手</th><th>級別</th><th>当地</th><th>平均ST</th><th>F/L</th><th>モーター</th><th>展示</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  function render(context = {}) {
    const entries = Array.isArray(context.entries) ? context.entries : [];
    if (entries.length !== 6) return "";

    return `<section class="race-fact-card" aria-label="レース事実まとめ">
      <div class="race-fact-head">
        <div><b>事実まとめ</b><small>公式データを見やすく整理</small></div>
        <details class="race-fact-more">
          <summary aria-label="事実まとめの詳細を開く">＋</summary>
          <div class="race-fact-more-panel">
            <b>6艇の詳細</b>
            ${detailTable(entries)}
          </div>
        </details>
      </div>
      ${playerRow(entries)}
      ${venueRow(context)}
      ${motorRow(entries)}
      ${exhibitionRow(entries, context.carteSource)}
      ${summaryRow(entries)}
      <p class="race-fact-source">事実表示のみ。予想・推奨ではありません。欠損データは「取得待ち」と表示します。</p>
    </section>`;
  }

  window.MAMO_RACE_FACT_SUMMARY = Object.freeze({ render });
})();