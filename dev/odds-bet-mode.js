/* MAMO BOAT — Odds Bet mode v1
 * Additive AIR BET mode. It does not replace placeBet, wallet, records, or the
 * canonical draft. New selections are handed to the existing normal 3連単 path.
 */
(() => {
  "use strict";
  if (window.__MAMO_ODDS_BET_MODE_V1__) return;
  window.__MAMO_ODDS_BET_MODE_V1__ = true;

  const ENDPOINT = "https://mihicuoijitluvrufsoj.supabase.co/functions/v1/boatrace-odds";
  let active = false;
  let axisBoat = 1;
  let axisPosition = 0;
  let busy = false;
  let currentKey = "";
  let oddsValues = null;
  let fetchController = null;

  const oddsNumber = (value) => {
    const match = String(value ?? "").trim().match(/^([0-9]+(?:\.[0-9]+)?)/);
    const number = match ? Number(match[1]) : 0;
    return Number.isFinite(number) && number > 0 ? number : 0;
  };

  function axisCombos(boat, position) {
    const target = Number(boat);
    const slot = Number(position);
    if (!Number.isInteger(target) || target < 1 || target > 6 || ![0, 1, 2].includes(slot)) return [];
    const result = [];
    for (let first = 1; first <= 6; first += 1) {
      for (let second = 1; second <= 6; second += 1) {
        if (second === first) continue;
        for (let third = 1; third <= 6; third += 1) {
          if (third === first || third === second) continue;
          const combo = [first, second, third];
          if (combo[slot] === target) result.push(combo);
        }
      }
    }
    return result;
  }

  function combinedOddsFromValues(values) {
    if (!Array.isArray(values) || !values.length) return null;
    const odds = values.map(oddsNumber);
    if (odds.some((value) => !value)) return null;
    const inverse = odds.reduce((sum, value) => sum + (1 / value), 0);
    return inverse > 0 ? 1 / inverse : null;
  }

  function draftLines() {
    try {
      const lines = window.MAMO_AIR_BET_DRAFT?.snapshot?.();
      return Array.isArray(lines) ? lines : [];
    } catch (_) {
      return [];
    }
  }

  function context() {
    try {
      const status = window.MAMO_AIR_BET_DRAFT?.status?.() || {};
      const raceDate = String(status.raceDate || "");
      const venueCode = String(status.venueCode || "").replace(/\D/g, "").padStart(2, "0");
      const raceNo = Number(status.raceNo);
      if (!raceDate || !venueCode || !raceNo) return null;
      return { raceDate, venueCode, raceNo, key: `${raceDate}:${venueCode}:${raceNo}` };
    } catch (_) {
      return null;
    }
  }

  function racerRows() {
    return Array.from(document.querySelectorAll("#raceView .boats .boat")).map((item) => {
      const number = Number(item.querySelector(".num")?.textContent?.trim());
      const name = String(item.querySelector(":scope > div:nth-child(2) > b")?.textContent || "").trim();
      return {
        number,
        name,
        racerClass: String(item.dataset.racerClass || "").trim(),
      };
    }).filter((item) => Number.isInteger(item.number) && item.number >= 1 && item.number <= 6);
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function comboKey(combo) {
    return combo.join("-");
  }

  function addedTrifectaLines() {
    return draftLines().filter((line) => String(line?.betType || "") === "trifecta");
  }

  function summaryData() {
    const lines = addedTrifectaLines();
    const combined = combinedOddsFromValues(lines.map((line) => line?.referenceOdds ?? line?.odds));
    return { count: lines.length, combined };
  }

  function setTabState() {
    const tabs = document.getElementById("modeTabs");
    if (!tabs) return;
    tabs.querySelectorAll(".bet-tab").forEach((button) => {
      button.classList.toggle("active", button.id === "bt-odds" && active);
    });
  }

  function ensureTab() {
    const tabs = document.getElementById("modeTabs");
    if (!tabs) return;
    let button = document.getElementById("bt-odds");
    if (!button) {
      button = element("button", "bet-tab", "オッズ投票");
      button.id = "bt-odds";
      button.type = "button";
      button.addEventListener("click", activate);
      tabs.append(button);
    }
    const count = tabs.querySelectorAll(":scope > .bet-tab").length;
    tabs.style.gridTemplateColumns = `repeat(${Math.max(1, count)},1fr)`;
    setTabState();
  }

  function selectedBoatCard(racer) {
    const card = element("button", `mamo-odds-racer b${racer.number}${racer.number === axisBoat ? " active" : ""}`);
    card.type = "button";
    card.dataset.oddsAxisBoat = String(racer.number);
    const number = element("b", "mamo-odds-racer-number", racer.number);
    const copy = element("span", "mamo-odds-racer-copy");
    copy.append(
      element("strong", "", racer.name || `${racer.number}号艇`),
      element("small", "", racer.racerClass || "級別—")
    );
    card.append(number, copy);
    return card;
  }

  function axisButton(index) {
    const button = element("button", index === axisPosition ? "active" : "", `${index + 1}着軸`);
    button.type = "button";
    button.dataset.oddsAxisPosition = String(index);
    return button;
  }

  function combinationCell(combo) {
    const wrap = element("div", "mamo-odds-combo");
    combo.forEach((boat, index) => {
      const chip = element("span", `b${boat}`, boat);
      wrap.append(chip);
      if (index < combo.length - 1) wrap.append(element("i", "", "→"));
    });
    return wrap;
  }

  function renderList(list) {
    const added = new Set(addedTrifectaLines().map((line) => String(line?.combination || line?.combo || "").replaceAll("→", "-").replace(/\s+/g, "")));
    const combos = axisCombos(axisBoat, axisPosition);
    const rows = combos.map((combo) => {
      const key = comboKey(combo);
      const row = element("div", "mamo-odds-row");
      row.append(combinationCell(combo));
      const odds = oddsNumber(oddsValues?.[key]);
      row.append(element("strong", "mamo-odds-value", odds ? `${odds.toFixed(1)}倍` : "—"));
      const add = element("button", added.has(key) ? "is-added" : "", added.has(key) ? "追加済み" : "＋ 追加");
      add.type = "button";
      add.dataset.oddsAdd = key;
      add.disabled = busy || added.has(key) || !odds;
      row.append(add);
      return row;
    });
    list.replaceChildren(...rows);
  }

  function renderSummary(summary) {
    const data = summaryData();
    summary.replaceChildren();
    const count = element("div", "mamo-odds-summary-count");
    count.append(element("span", "", "3連単 選択中"), element("strong", "", `${data.count}点`));
    const combined = element("div", "mamo-odds-summary-combined");
    combined.append(element("span", "", "合成オッズ"), element("strong", "", data.combined ? `${data.combined.toFixed(2)}倍` : "—"));
    summary.append(count, combined);
  }

  function renderMode() {
    if (!active) return;
    const builder = document.getElementById("builder");
    if (!builder) return;
    builder.classList.add("mamo-odds-bet-mode");

    const racers = racerRows();
    const shell = element("section", "mamo-odds-shell");
    shell.dataset.mamoOddsBetMode = "1";

    const heading = element("div", "mamo-odds-heading");
    heading.append(element("strong", "", "軸の選手を選ぶ"), element("small", "", "艇番＋選手名で切り替え"));
    shell.append(heading);

    const racerGrid = element("div", "mamo-odds-racers");
    const normalized = Array.from({ length: 6 }, (_, index) => racers.find((item) => item.number === index + 1) || ({ number: index + 1, name: "", racerClass: "" }));
    normalized.forEach((racer) => racerGrid.append(selectedBoatCard(racer)));
    shell.append(racerGrid);

    const selected = normalized.find((item) => item.number === axisBoat) || normalized[0];
    const selectedBar = element("div", "mamo-odds-selected");
    selectedBar.append(
      element("span", `mamo-odds-selected-number b${selected.number}`, selected.number),
      element("strong", "", selected.name || `${selected.number}号艇`),
      element("small", "", selected.racerClass || "級別—")
    );
    shell.append(selectedBar);

    const axis = element("div", "mamo-odds-axis");
    [0, 1, 2].forEach((index) => axis.append(axisButton(index)));
    shell.append(axis);

    const listHead = element("div", "mamo-odds-list-head");
    listHead.append(element("strong", "", `${axisBoat}号艇 ${axisPosition + 1}着軸の買い目`), element("small", "", "全20点"));
    shell.append(listHead);

    const list = element("div", "mamo-odds-list");
    list.dataset.mamoOddsList = "1";
    if (!oddsValues) list.append(element("div", "mamo-odds-loading", "参考オッズを取得中…"));
    else renderList(list);
    shell.append(list);

    const summary = element("div", "mamo-odds-summary");
    summary.dataset.mamoOddsSummary = "1";
    renderSummary(summary);
    shell.append(summary);

    builder.replaceChildren(shell);
    setTabState();
  }

  async function loadOdds() {
    const next = context();
    if (!active || !next) return;
    if (currentKey === next.key && oddsValues) {
      renderMode();
      return;
    }
    currentKey = next.key;
    oddsValues = null;
    fetchController?.abort?.();
    fetchController = typeof AbortController === "function" ? new AbortController() : null;
    renderMode();
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: next.raceDate,
          venueCode: next.venueCode,
          raceNo: next.raceNo,
          betType: "trifecta",
        }),
        ...(fetchController ? { signal: fetchController.signal } : {}),
      });
      const payload = response.ok ? await response.json() : null;
      if (!active || currentKey !== next.key) return;
      oddsValues = payload?.ok && payload?.status === "available" && payload?.odds?.values
        ? payload.odds.values
        : {};
      renderMode();
    } catch (error) {
      if (error?.name === "AbortError" || !active || currentKey !== next.key) return;
      oddsValues = {};
      renderMode();
    }
  }

  function activate() {
    if (busy) return;
    active = false;
    window.setBetType?.("trifecta");
    active = true;
    axisBoat = 1;
    axisPosition = 0;
    currentKey = "";
    oddsValues = null;
    ensureTab();
    renderMode();
    loadOdds();
    window.MAMO_TRACK_EVENT?.("odds_bet_mode_opened", { source: "air_bet" });
  }

  function deactivate() {
    active = false;
    fetchController?.abort?.();
    fetchController = null;
    const builder = document.getElementById("builder");
    builder?.classList?.remove("mamo-odds-bet-mode");
  }

  async function addCombo(key, button) {
    if (busy) return;
    const combo = String(key || "").split("-").map(Number);
    if (combo.length !== 3 || new Set(combo).size !== 3 || combo.some((boat) => boat < 1 || boat > 6)) return;
    busy = true;
    if (button) button.disabled = true;
    try {
      combo.forEach((boat, index) => window.pickNormal?.(index, boat));
      const added = await window.addNormal?.();
      if (!added) combo.forEach((boat, index) => window.pickNormal?.(index, boat));
      window.MAMO_TRACK_EVENT?.("odds_bet_line_added", { combination: key, added: Number(added) || 0 });
    } finally {
      busy = false;
      if (active) renderMode();
    }
  }

  function onClick(event) {
    const target = event.target?.closest?.("[data-odds-axis-boat],[data-odds-axis-position],[data-odds-add]");
    if (!target || !active) return;
    if (target.dataset.oddsAxisBoat) {
      axisBoat = Number(target.dataset.oddsAxisBoat);
      renderMode();
      return;
    }
    if (target.dataset.oddsAxisPosition) {
      axisPosition = Number(target.dataset.oddsAxisPosition);
      renderMode();
      return;
    }
    if (target.dataset.oddsAdd) addCombo(target.dataset.oddsAdd, target);
  }

  function onCaptureClick(event) {
    const coreTab = event.target?.closest?.("#modeTabs .bet-tab:not(#bt-odds), .bettypebtn, [data-race-chip], .racechip");
    if (coreTab && active) deactivate();
  }

  function boot() {
    ensureTab();
    document.addEventListener("click", onCaptureClick, true);
    document.addEventListener("click", onClick, false);
    window.addEventListener("mamo:air-bet-rendered", () => {
      ensureTab();
      if (active) renderMode();
    });
    window.addEventListener("mamo:venues-opened", deactivate);
  }

  window.MAMO_ODDS_BET_MODE_TEST = Object.freeze({ axisCombos, combinedOddsFromValues });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
