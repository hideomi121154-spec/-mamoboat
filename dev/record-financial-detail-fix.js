/* MAMO BOAT — unified record financial detail fix v1
 * Restores prominent participation odds and official payout amounts
 * in the one-race/one-card record UI without re-rendering the record list.
 */
(() => {
  "use strict";
  if (window.__MAMO_RECORD_FINANCIAL_DETAIL_V1__) return;
  window.__MAMO_RECORD_FINANCIAL_DETAIL_V1__ = true;

  const KEY = "mamoboat_v40_personal";
  const fmt = (value) => Math.round(Number(value) || 0).toLocaleString("ja-JP");
  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  function readRecords() {
    try {
      const state = JSON.parse(localStorage.getItem(KEY) || "null");
      return Array.isArray(state?.records) ? state.records : [];
    } catch (_) {
      return [];
    }
  }

  function recordTimeLabel(record) {
    try {
      return new Date(record.time || record.createdAt).toLocaleString("ja-JP", {
        month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit"
      });
    } catch (_) {
      return "";
    }
  }

  function venueRaceLabel(record) {
    const venue = String(record.venue || record.venueName || "").trim();
    const race = Number(record.raceNo || record.race) || "";
    return `${venue} ${race}R`.trim();
  }

  function oddsValues(record) {
    const values = (Array.isArray(record.lines) ? record.lines : [])
      .map((line) => Number(line?.referenceOdds ?? line?.odds))
      .filter((value) => Number.isFinite(value) && value > 0);
    return values;
  }

  function oddsSummary(record) {
    const values = oddsValues(record);
    if (!values.length) return "—";
    const min = Math.min(...values);
    const max = Math.max(...values);
    const f = (value) => Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
    return min === max ? `${f(min)}倍` : `${f(min)}〜${f(max)}倍`;
  }

  function resultCombo(record) {
    return String(record.resultCombo || record?.result?.combo || "").trim();
  }

  function officialPayout(record) {
    const direct = Number(record.resultPayout ?? record.officialPayout ?? record?.result?.payout);
    if (Number.isFinite(direct) && direct > 0) return direct;

    const payouts = Array.isArray(record.resultPayouts) ? record.resultPayouts : [];
    if (!payouts.length) return 0;
    const winning = resultCombo(record);
    const exact = payouts.find((item) => {
      const combo = String(item?.combo || item?.combination || "").trim();
      const type = String(item?.betType || item?.type || "").toLowerCase();
      return combo === winning && (!type || type === "trifecta");
    }) || payouts.find((item) => String(item?.combo || item?.combination || "").trim() === winning)
      || payouts.find((item) => Number(item?.payout) > 0);
    return Number(exact?.payout) || 0;
  }

  function payoutDetail(record) {
    const payouts = Array.isArray(record.resultPayouts) ? record.resultPayouts : [];
    if (!payouts.length) return "";
    return payouts
      .filter((item) => Number(item?.payout) > 0)
      .slice(0, 8)
      .map((item) => {
        const combo = String(item?.combo || item?.combination || "").trim();
        const label = String(item?.label || item?.betLabel || "").trim();
        return `<span>${esc([label, combo].filter(Boolean).join(" "))}<b>${fmt(item.payout)}円</b></span>`;
      })
      .join("");
  }

  function findRecordForCard(card, records, used) {
    const heading = String(card.querySelector("header h3")?.textContent || "").trim();
    const time = String(card.querySelector("header time")?.textContent || "").trim();
    let fallback = -1;
    for (let i = 0; i < records.length; i += 1) {
      if (used.has(i)) continue;
      if (venueRaceLabel(records[i]) !== heading) continue;
      if (fallback < 0) fallback = i;
      if (recordTimeLabel(records[i]) === time) return i;
    }
    return fallback;
  }

  function enhanceCard(card, record) {
    if (!card || !record) return;
    const odds = oddsSummary(record);
    const payout = officialPayout(record);

    let panel = card.querySelector(":scope > .rx-financial-restore");
    if (!panel) {
      panel = document.createElement("section");
      panel.className = "rx-financial-restore";
      const money = card.querySelector(":scope > .rx-summary-money");
      (money || card.querySelector(":scope > .rx-result-row"))?.insertAdjacentElement("afterend", panel);
    }
    if (!panel) return;

    const detail = payoutDetail(record);
    panel.innerHTML = `
      <div><span>参加時参考オッズ</span><strong>${esc(odds)}</strong></div>
      <div class="official"><span>公式払戻</span><strong>${payout > 0 ? `${fmt(payout)}円` : (record.settled ? "—" : "確定待ち")}</strong></div>
      ${detail ? `<details><summary>公式払戻の内訳</summary><div>${detail}</div></details>` : ""}
    `;
  }

  function installStyle() {
    if (document.getElementById("mamoRecordFinancialDetailV1")) return;
    const style = document.createElement("style");
    style.id = "mamoRecordFinancialDetailV1";
    style.textContent = `
      #records .rx-financial-restore{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:9px 0 0}
      #records .rx-financial-restore>div{padding:10px 11px;border:1px solid #dce6ea;border-radius:9px;background:#f7fafb}
      #records .rx-financial-restore>div.official{background:#fff8ee;border-color:#efd6ad}
      #records .rx-financial-restore span{display:block;color:#748892;font-size:8px;font-weight:900}
      #records .rx-financial-restore strong{display:block;margin-top:3px;color:#0a3554;font-size:16px;font-weight:1000}
      #records .rx-financial-restore .official strong{color:#b45a00}
      #records .rx-financial-restore details{grid-column:1/-1;padding:8px 10px;border:1px solid #e2e9ec;border-radius:8px;background:#fff}
      #records .rx-financial-restore summary{color:#536b77;font-size:9px;font-weight:900;cursor:pointer}
      #records .rx-financial-restore details div{display:grid;gap:4px;margin-top:7px}
      #records .rx-financial-restore details span{display:flex;justify-content:space-between;gap:10px;font-size:9px;color:#506773}
      #records .rx-financial-restore details b{color:#0a3554}
    `;
    document.head.appendChild(style);
  }

  function refresh() {
    installStyle();
    const cards = Array.from(document.querySelectorAll("#airOutcomeBlock .rx-card.rx-unified"));
    if (!cards.length) return;
    const records = readRecords().slice().sort((a, b) => new Date(b.time || b.createdAt || 0) - new Date(a.time || a.createdAt || 0));
    const used = new Set();
    cards.forEach((card) => {
      const index = findRecordForCard(card, records, used);
      if (index < 0) return;
      used.add(index);
      enhanceCard(card, records[index]);
    });
  }

  function scheduleRefresh() {
    requestAnimationFrame(() => requestAnimationFrame(refresh));
  }

  document.addEventListener("click", (event) => {
    if (event.target?.closest?.("#nav-records,[data-rx-filter],[data-rec]")) scheduleRefresh();
  }, false);
  window.addEventListener("pageshow", scheduleRefresh);
  window.addEventListener("storage", (event) => { if (event.key === KEY) scheduleRefresh(); });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleRefresh, { once: true });
  else scheduleRefresh();

  window.MAMO_RECORD_FINANCIAL_DETAIL = Object.freeze({ refresh });
})();
