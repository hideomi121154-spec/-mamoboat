/* MAMO BOAT — user-facing trifecta race result analysis.
 * Renders factual post-race review from AIR BET records.
 * No causal claims: pre-race facts, user SELF CHECK and actual finish are shown separately.
 */
(() => {
  "use strict";
  if (window.__MAMO_EDITORIAL_RACE_ANALYSIS__) return;
  window.__MAMO_EDITORIAL_RACE_ANALYSIS__ = true;

  const STORAGE_KEY = "mamoboat_v40_personal";
  const MOUNT_ID = "editorialRaceResultAnalysis";
  const BASIS_LABELS = Object.freeze({
    racer: "選手",
    motor: "モーター",
    exhibition: "展示",
    odds: "オッズ",
    start: "スタート",
    intuition: "直感",
    other: "その他",
  });
  const METRICS = Object.freeze([
    { key: "motor2Rate", label: "モーター2連率", direction: "desc", suffix: "%" },
    { key: "exhibitionTime", label: "展示タイム", direction: "asc", suffix: "" },
    { key: "averageStart", label: "平均ST", direction: "asc", suffix: "" },
    { key: "nationalWinRate", label: "全国勝率", direction: "desc", suffix: "" },
  ]);

  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const fmt = (value) => (Number(value) || 0).toLocaleString("ja-JP");

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function parseFinish(record) {
    return String(record?.resultCombo || "")
      .match(/\d+/g)?.map(Number)
      .filter((boat) => Number.isInteger(boat) && boat >= 1 && boat <= 6)
      .slice(0, 3) || [];
  }

  function analysisFor(record) {
    if (record?.resultAnalysis?.version === 1) return record.resultAnalysis;
    const finish = parseFinish(record);
    if (finish.length !== 3 || !window.MamoCore?.buildTrifectaResultAnalysis) return null;
    return window.MamoCore.buildTrifectaResultAnalysis(record, {
      entries: Array.isArray(record.entrySnapshot) ? record.entrySnapshot : [],
      result: { finish: finish.map((boatNumber, index) => ({ position: index + 1, boatNumber })) },
    });
  }

  function eligibleRecords() {
    const state = readState();
    return (Array.isArray(state.records) ? state.records : [])
      .filter((record) => record?.settled && record?.status !== "refunded")
      .map((record) => ({ record, analysis: analysisFor(record) }))
      .filter((item) => item.analysis?.betType === "trifecta")
      .sort((a, b) => new Date(b.record?.time || 0) - new Date(a.record?.time || 0));
  }

  function dateLabel(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return String(value || "");
    return `${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日`;
  }

  function rankEntries(entries, key, direction) {
    const rows = (Array.isArray(entries) ? entries : [])
      .map((entry) => ({ boatNumber: Number(entry?.boatNumber), value: Number(entry?.[key]) }))
      .filter((item) => Number.isFinite(item.boatNumber) && Number.isFinite(item.value));
    return new Map(rows.map((item) => {
      const better = rows.filter((other) => direction === "asc" ? other.value < item.value : other.value > item.value).length;
      return [item.boatNumber, { value: item.value, rank: better + 1 }];
    }));
  }

  function allFacts(record, analysis) {
    const entries = Array.isArray(record.entrySnapshot) ? record.entrySnapshot : [];
    const maps = Object.fromEntries(METRICS.map((metric) => [metric.key, rankEntries(entries, metric.key, metric.direction)]));
    const finish = Array.isArray(analysis.result) ? analysis.result.map(Number) : parseFinish(record);
    return entries
      .map((entry) => {
        const boatNumber = Number(entry.boatNumber);
        return {
          boatNumber,
          racerNumber: String(entry.racerNumber || ""),
          name: String(entry.name || ""),
          resultPosition: finish.indexOf(boatNumber) >= 0 ? finish.indexOf(boatNumber) + 1 : null,
          facts: Object.fromEntries(METRICS.map((metric) => [metric.key, maps[metric.key].get(boatNumber) || { value: null, rank: null }])),
        };
      })
      .sort((a, b) => a.boatNumber - b.boatNumber);
  }

  function boatChip(boat, focusBoat) {
    const focus = Number(boat) === Number(focusBoat);
    return `<span class="era-boat-chip boat-${Number(boat)} ${focus ? "focus" : ""}"><b>${Number(boat)}</b>号艇${focus ? "<em>注目</em>" : ""}</span>`;
  }

  function candidateBlock(title, color, candidates, actualBoat, basis, focusBoat, facts) {
    const hit = candidates.includes(Number(actualBoat));
    const focusInRole = candidates.includes(Number(focusBoat));
    const focusFact = facts.find((item) => Number(item.boatNumber) === Number(focusBoat));
    const metricKey = basis === "motor" ? "motor2Rate"
      : basis === "exhibition" ? "exhibitionTime"
      : basis === "start" ? "averageStart"
      : basis === "racer" ? "nationalWinRate"
      : null;
    const metric = METRICS.find((item) => item.key === metricKey);
    const fact = metricKey ? focusFact?.facts?.[metricKey] : null;
    const reason = focusInRole
      ? `主な根拠：<b>${esc(BASIS_LABELS[basis] || basis || "未記録")}</b>${fact?.rank ? ` / ${esc(metric?.label)} ${fact.rank}位/6艇` : ""}`
      : `SELF CHECK：<b>${esc(BASIS_LABELS[basis] || basis || "未記録")}</b>${focusBoat ? ` / 注目 ${focusBoat}号艇` : ""}`;
    return `<article class="era-role-card" style="--role-accent:${color}">
      <header><span>${esc(title)}</span><b class="${hit ? "match" : "miss"}">${hit ? "一致" : "不一致"}</b></header>
      <div class="era-role-boats">${candidates.map((boat) => boatChip(boat, focusBoat)).join("") || '<span class="era-muted">候補なし</span>'}</div>
      <p>${reason}</p>
      <footer>実結果：<b>${Number(actualBoat)}号艇</b></footer>
    </article>`;
  }

  function lineComment(line) {
    if (line.exact) return "完全一致";
    const matches = Array.isArray(line.positionMatches) ? line.positionMatches : [];
    const labels = ["1着", "2着", "3着"];
    const ok = labels.filter((_, index) => matches[index]);
    const ng = labels.filter((_, index) => !matches[index]);
    if (!ok.length) return "着順一致なし";
    if (!ng.length) return "完全一致";
    return `${ok.join("・")}は一致、${ng.join("・")}が違った`;
  }

  function metricCell(fact, metric) {
    if (!fact || !Number.isFinite(Number(fact.value))) return "—";
    const value = Number(fact.value);
    const rendered = metric.key === "averageStart"
      ? value.toFixed(2)
      : metric.key === "exhibitionTime" || metric.key === "nationalWinRate"
        ? value.toFixed(2)
        : value.toFixed(1);
    return `<b>${esc(rendered)}${metric.suffix}</b><span>${fact.rank ? `${fact.rank}位` : "—"}</span>`;
  }

  function insightList(record, analysis, facts, allRecords) {
    const notes = [];
    const basis = String(record.selfBasis || "");
    const focusBoat = Number(record.selfFocusBoat);
    const basisMetric = basis === "motor" ? METRICS[0]
      : basis === "exhibition" ? METRICS[1]
      : basis === "start" ? METRICS[2]
      : basis === "racer" ? METRICS[3]
      : null;
    if (focusBoat && basisMetric) {
      const row = facts.find((item) => item.boatNumber === focusBoat);
      const fact = row?.facts?.[basisMetric.key];
      const position = row?.resultPosition;
      if (fact?.rank) {
        notes.push(`注目した${focusBoat}号艇は、${basisMetric.label}が6艇中${fact.rank}位。実結果は${position ? `${position}着` : "1〜3着外"}でした。`);
      }
    }

    for (const position of [1, 2, 3]) {
      const row = facts.find((item) => item.resultPosition === position);
      if (!row) continue;
      const firstMetric = METRICS.find((metric) => row.facts?.[metric.key]?.rank === 1);
      if (firstMetric) notes.push(`${position}着の${row.boatNumber}号艇は、${firstMetric.label}が6艇中1位でした。`);
    }

    if (analysis.top3Coverage === 3) {
      notes.push("実際の1〜3着艇は、すべて今回の買い目の中に含まれていました。");
    } else {
      notes.push(`実際の1〜3着艇のうち、買い目に含まれていたのは${Number(analysis.top3Coverage) || 0}/3艇でした。`);
    }
    notes.push(analysis.exactOrderHit
      ? `順番まで一致した買い目が${Number(analysis.exactHitCount) || 0}点ありました。`
      : "今回は1〜3着の順番まで完全一致した買い目はありませんでした。");

    const key = [analysis.firstCandidates?.length || 0, analysis.secondCandidates?.length || 0, analysis.thirdCandidates?.length || 0].join("x");
    const comparable = allRecords
      .filter((item) => item.record.id !== record.id)
      .filter((item) => [item.analysis.firstCandidates?.length || 0, item.analysis.secondCandidates?.length || 0, item.analysis.thirdCandidates?.length || 0].join("x") === key);
    if (comparable.length >= 3) {
      const exact = comparable.filter((item) => item.analysis.exactOrderHit).length;
      notes.push(`同じ候補数構成（1着${analysis.firstCandidates.length}艇・2着${analysis.secondCandidates.length}艇・3着${analysis.thirdCandidates.length}艇）は過去${comparable.length}回あり、順番まで一致したのは${exact}回でした。`);
    } else {
      notes.push("同じ組み立ての比較は、記録が3回以上たまると表示します。");
    }
    return notes.slice(0, 6);
  }

  function renderRecord(item, allRecords) {
    const { record, analysis } = item;
    const facts = allFacts(record, analysis);
    const finish = analysis.result || parseFinish(record);
    const entryByBoat = new Map((record.entrySnapshot || []).map((entry) => [Number(entry.boatNumber), entry]));
    const payout = Number(record.payoutC) || 0;
    const stake = Number(record.stake) || (record.lines || []).reduce((sum, line) => sum + (Number(line.stake) || 0), 0);
    const net = payout - stake;
    const basis = String(record.selfBasis || "");
    const focusBoat = Number(record.selfFocusBoat) || null;
    const hitCount = Number(analysis.exactHitCount) || 0;
    const confidence = Number(record.selfConfidence) || null;
    const notes = insightList(record, analysis, facts, allRecords);

    const finishCards = finish.map((boat, index) => {
      const entry = entryByBoat.get(Number(boat)) || {};
      return `<div class="era-finish-card">
        <span>${index + 1}着</span>
        <div class="era-lane boat-${Number(boat)}">${Number(boat)}</div>
        <b>${esc(entry.name || `${boat}号艇`)}</b>
        <small>${entry.racerNumber ? esc(entry.racerNumber) : ""}</small>
      </div>`;
    }).join("");

    const rows = facts.map((row) => {
      const selected = focusBoat === row.boatNumber;
      return `<tr>
        <td><span class="era-lane boat-${row.boatNumber}">${row.boatNumber}</span></td>
        <td><b>${esc(row.name || "—")}</b><small>${esc(row.racerNumber || "")}</small></td>
        ${METRICS.map((metric) => `<td>${metricCell(row.facts[metric.key], metric)}</td>`).join("")}
        <td><b>${row.resultPosition ? `${row.resultPosition}着` : "—"}</b></td>
        <td>${selected ? `<span class="era-focus-note">◎ ${esc(BASIS_LABELS[basis] || basis || "注目")}</span>` : "—"}</td>
      </tr>`;
    }).join("");

    const lineRows = (analysis.lineResults || []).map((line, index) => {
      const stakeLine = (record.lines || []).filter((candidate) => (window.MamoCore?.normalizeBetType?.(candidate.betType) || "trifecta") === "trifecta")[index];
      const matches = line.positionMatches || [];
      return `<tr class="${line.exact ? "exact" : ""}">
        <td>${index + 1}</td>
        <td><b>${esc(line.combo)}</b></td>
        <td>${fmt(stakeLine?.stake || line.stake)}B</td>
        <td><span class="era-status ${line.exact ? "hit" : "miss"}">${line.exact ? "的中" : "不的中"}</span></td>
        <td>${matches[0] ? "○" : "×"}</td>
        <td>${matches[1] ? "○" : "×"}</td>
        <td>${matches[2] ? "○" : "×"}</td>
        <td>${esc(lineComment(line))}</td>
      </tr>`;
    }).join("");

    return `<section class="era-shell" data-record-id="${esc(record.id)}">
      <header class="era-topbar">
        <div><h1>レース結果分析</h1><p>あなたのBETと実際の結果を、事実ベースで振り返ります。</p></div>
        <div class="era-race-meta"><b>${esc(dateLabel(record.raceDate))}</b><span>${esc(record.venue || record.venueCode || "")} ${Number(record.raceNo) || ""}R</span><button type="button" data-era-open-record>記録で見る ›</button></div>
      </header>

      <div class="era-grid era-overview-grid">
        <section class="era-panel era-summary">
          <h2><span>1</span> 今回のBETまとめ</h2>
          <div class="era-summary-cards">
            <div class="accent"><small>${hitCount ? "的中" : "結果"}</small><strong>${hitCount ? `${hitCount}点的中` : "不的中"}</strong></div>
            <div><small>購入点数</small><strong>${fmt(analysis.lineCount)}点</strong></div>
            <div><small>BET総額</small><strong>${fmt(stake)}B</strong></div>
            <div><small>払戻</small><strong>${fmt(payout)}B</strong></div>
            <div><small>収支</small><strong class="${net >= 0 ? "positive" : "negative"}">${net >= 0 ? "+" : ""}${fmt(net)}B</strong></div>
          </div>
        </section>
        <section class="era-panel era-result">
          <h2>🏆 レース結果</h2>
          <div class="era-finish-grid">${finishCards}</div>
        </section>
      </div>

      <div class="era-grid era-build-grid">
        <section class="era-panel era-build">
          <h2><span>2</span> あなたの組み立て分析</h2>
          <div class="era-selfcheck">SELF CHECK：主な根拠 <b>${esc(BASIS_LABELS[basis] || basis || "未記録")}</b>${focusBoat ? ` / 注目 <b>${focusBoat}号艇</b>` : ""}${confidence ? ` / 自信 <b>${confidence}/5</b>` : ""}</div>
          <div class="era-role-grid">
            ${candidateBlock("1着軸・候補", "#1387e8", analysis.firstCandidates || [], finish[0], basis, focusBoat, facts)}
            ${candidateBlock("2着候補", "#28b867", analysis.secondCandidates || [], finish[1], basis, focusBoat, facts)}
            ${candidateBlock("3着候補", "#f0a622", analysis.thirdCandidates || [], finish[2], basis, focusBoat, facts)}
          </div>
        </section>
        <section class="era-panel era-score">
          <h2>組み立ての評価</h2>
          <dl>
            <div><dt>1着候補</dt><dd class="${analysis.positionMatches?.[0] ? "ok" : "ng"}">${analysis.positionMatches?.[0] ? "一致" : "不一致"}（${finish[0]}号艇）</dd></div>
            <div><dt>2着候補</dt><dd class="${analysis.positionMatches?.[1] ? "ok" : "ng"}">${analysis.positionMatches?.[1] ? "一致" : "不一致"}（${finish[1]}号艇）</dd></div>
            <div><dt>3着候補</dt><dd class="${analysis.positionMatches?.[2] ? "ok" : "ng"}">${analysis.positionMatches?.[2] ? "一致" : "不一致"}（${finish[2]}号艇）</dd></div>
            <div><dt>1〜3着の艇選び</dt><dd class="${analysis.top3Coverage === 3 ? "ok" : ""}">${Number(analysis.top3Coverage) || 0}/3艇</dd></div>
            <div><dt>順番までの一致</dt><dd class="${analysis.exactOrderHit ? "ok strong" : "ng"}">${analysis.exactOrderHit ? "完全一致" : "不一致"}</dd></div>
          </dl>
        </section>
      </div>

      <div class="era-grid era-detail-grid">
        <section class="era-panel era-lines">
          <h2><span>3</span> 今回の買い目一覧（3連単）</h2>
          <div class="era-table-wrap"><table><thead><tr><th>No.</th><th>買い目</th><th>BET</th><th>判定</th><th>1着</th><th>2着</th><th>3着</th><th>簡易コメント</th></tr></thead><tbody>${lineRows}</tbody></table></div>
        </section>
        <section class="era-panel era-overall">
          <h2>今回のBET全体</h2>
          <dl>
            <div><dt>買い目数</dt><dd>${fmt(analysis.lineCount)}点</dd></div>
            <div><dt>的中点数</dt><dd>${fmt(hitCount)}点</dd></div>
            <div><dt>的中率</dt><dd>${analysis.lineCount ? Math.round(hitCount / analysis.lineCount * 100) : 0}%</dd></div>
            <div><dt>払戻</dt><dd>${fmt(payout)}B</dd></div>
            <div><dt>回収率</dt><dd>${stake ? Math.round(payout / stake * 100).toLocaleString("ja-JP") : 0}%</dd></div>
          </dl>
        </section>
      </div>

      <div class="era-grid era-facts-grid">
        <section class="era-panel era-facts">
          <h2><span>4</span> 各艇のデータ比較 <small>BET成立時の公式データと実着順</small></h2>
          <div class="era-table-wrap"><table><thead><tr><th>艇</th><th>選手</th>${METRICS.map((metric) => `<th>${metric.label}</th>`).join("")}<th>結果</th><th>あなたの注目</th></tr></thead><tbody>${rows}</tbody></table></div>
        </section>
        <section class="era-panel era-insights">
          <h2><span>5</span> 💡 今回の気づき・振り返り</h2>
          <ul>${notes.map((note) => `<li>${esc(note)}</li>`).join("")}</ul>
          <p>表示しているのは「BET前の記録」「公式データ」「実着順」の一致・不一致です。勝因・敗因の因果関係は判定していません。</p>
        </section>
      </div>
    </section>`;
  }

  function render() {
    const mount = document.getElementById(MOUNT_ID);
    if (!mount) return;
    const all = eligibleRecords();
    if (!all.length) {
      mount.innerHTML = `<section class="era-empty"><span>RESULT REVIEW</span><h1>レース結果分析</h1><p>結果確定した3連単AIR BETが入ると、ここに「組み立て・買い目・6艇データ・SELF CHECK」の答え合わせを表示します。</p></section>`;
      return;
    }

    const currentId = mount.dataset.selectedRecordId;
    const selected = all.find((item) => item.record.id === currentId) || all[0];
    mount.dataset.selectedRecordId = selected.record.id;
    const options = all.map((item) => `<option value="${esc(item.record.id)}" ${item.record.id === selected.record.id ? "selected" : ""}>${esc(dateLabel(item.record.raceDate))} ${esc(item.record.venue || "")} ${Number(item.record.raceNo) || ""}R / ${esc(item.analysis.resultCombo || item.record.resultCombo || "")}</option>`).join("");
    mount.innerHTML = `<div class="era-picker"><label>分析するレース<select data-era-record-select>${options}</select></label><small>結果確定した3連単AIR BET ${all.length}件</small></div>${renderRecord(selected, all)}`;

    mount.querySelector("[data-era-record-select]")?.addEventListener("change", (event) => {
      mount.dataset.selectedRecordId = event.target.value;
      render();
    });
    mount.querySelector("[data-era-open-record]")?.addEventListener("click", () => {
      window.go?.("records");
    });
  }

  function boot() {
    render();
    window.addEventListener?.("mamo:editorial-placeholder-opened", render);
    window.addEventListener?.("pageshow", render);
    window.addEventListener?.("storage", (event) => {
      if (event.key === STORAGE_KEY) render();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.MAMO_EDITORIAL_RACE_ANALYSIS = Object.freeze({ render });
})();
