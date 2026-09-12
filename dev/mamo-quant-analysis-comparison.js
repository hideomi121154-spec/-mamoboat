/* MAMO BOAT — STEP 7 actual vs hypothetical BET comparison.
 * Read-only. Reuses the STEP 6 capital math API and never persists simulator values.
 */
(function initMamoQuantComparison(root) {
  "use strict";

  const MIN_BET = 100;
  const STEP = 100;
  const STRESS_COUNTS = Object.freeze([5, 10, 15, 20]);

  const safeNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  function clampHypotheticalBet(value, balance) {
    const max = Math.floor(Math.max(0, safeNumber(balance)) / STEP) * STEP;
    if (max < MIN_BET) return 0;
    const rounded = Math.round(Math.max(0, safeNumber(value)) / STEP) * STEP;
    return Math.max(MIN_BET, Math.min(max, rounded || MIN_BET));
  }

  function remainingAfterLosses(balance, stake, losses) {
    return Math.max(0, Math.max(0, safeNumber(balance)) - Math.max(0, safeNumber(stake)) * losses);
  }

  function compare(balance, goal, historicalStake, hypotheticalStake) {
    const normalizedBalance = Math.max(0, safeNumber(balance));
    const normalizedGoal = Math.max(0, safeNumber(goal));
    const actualStake = Math.max(0, safeNumber(historicalStake));
    const hypothetical = clampHypotheticalBet(hypotheticalStake, normalizedBalance);
    const actualBalanceRate = normalizedBalance > 0 && actualStake > 0 ? (actualStake / normalizedBalance) * 100 : null;
    const hypotheticalBalanceRate = normalizedBalance > 0 && hypothetical > 0 ? (hypothetical / normalizedBalance) * 100 : null;
    const actualGoalRate = normalizedGoal > 0 && actualStake > 0 ? (actualStake / normalizedGoal) * 100 : null;
    const hypotheticalGoalRate = normalizedGoal > 0 && hypothetical > 0 ? (hypothetical / normalizedGoal) * 100 : null;

    return Object.freeze({
      balance: normalizedBalance,
      goal: normalizedGoal,
      actualStake,
      hypotheticalStake: hypothetical,
      stakeDelta: hypothetical - actualStake,
      actualBalanceRate,
      hypotheticalBalanceRate,
      balanceRateDelta: actualBalanceRate == null || hypotheticalBalanceRate == null ? null : hypotheticalBalanceRate - actualBalanceRate,
      actualGoalRate,
      hypotheticalGoalRate,
      stress: Object.freeze(STRESS_COUNTS.map((losses) => {
        const actualRemaining = remainingAfterLosses(normalizedBalance, actualStake, losses);
        const hypotheticalRemaining = remainingAfterLosses(normalizedBalance, hypothetical, losses);
        return Object.freeze({ losses, actualRemaining, hypotheticalRemaining, difference: hypotheticalRemaining - actualRemaining });
      })),
    });
  }

  const formatB = (value) => `${Math.round(safeNumber(value)).toLocaleString("ja-JP")} B`;
  const formatPercent = (value) => value == null ? "—" : `${value.toFixed(1)}%`;
  const signedB = (value) => `${value > 0 ? "+" : ""}${Math.round(safeNumber(value)).toLocaleString("ja-JP")} B`;

  function makeCard(label, value, subline = "") {
    const card = document.createElement("div");
    card.className = "stat-card";
    const title = document.createElement("span");
    title.textContent = label;
    const metric = document.createElement("strong");
    metric.textContent = value;
    card.append(title, metric);
    if (subline) {
      const detail = document.createElement("small");
      detail.textContent = subline;
      detail.style.display = "block";
      detail.style.marginTop = "4px";
      detail.style.fontSize = "12px";
      detail.style.fontWeight = "800";
      detail.style.color = "#64798b";
      card.appendChild(detail);
    }
    return card;
  }

  function render() {
    if (typeof document === "undefined") return false;
    const mount = document.getElementById("mamoQuantAnalysisComparison");
    const capital = root?.MAMO_QUANT_CAPITAL;
    if (!mount || !capital || typeof capital.calculate !== "function" || typeof capital.readSnapshot !== "function") return false;

    const storage = root?.localStorage;
    const goal = typeof capital.readGoal === "function" ? capital.readGoal(storage) : capital.DEFAULT_GOAL_B;
    const metrics = capital.calculate(capital.readSnapshot(storage), goal);

    const fragment = document.createDocumentFragment();
    const heading = document.createElement("div");
    heading.className = "section-head small";
    const headingCopy = document.createElement("div");
    const number = document.createElement("span");
    number.className = "section-number";
    number.textContent = "STEP 7";
    const title = document.createElement("h2");
    title.textContent = "実績と仮定の比較分析";
    headingCopy.append(number, title);
    heading.appendChild(headingCopy);
    fragment.appendChild(heading);

    const details = document.createElement("details");
    details.dataset.analysisBetComparison = "1";
    details.style.border = "1px solid #cbd6df";
    details.style.borderRadius = "10px";
    details.style.background = "#ffffff";

    const summary = document.createElement("summary");
    summary.style.cursor = "pointer";
    summary.style.padding = "12px 14px";
    summary.style.fontWeight = "800";
    summary.style.color = "#0b3554";
    summary.textContent = "今の平均BETと仮BETを比べる";

    const body = document.createElement("div");
    body.style.padding = "0 14px 14px";
    body.style.display = "grid";
    body.style.gap = "10px";

    if (metrics.balance < MIN_BET) {
      const unavailable = document.createElement("small");
      unavailable.textContent = "現在残高が100B未満のため比較できません。";
      unavailable.style.color = "#64798b";
      unavailable.style.fontWeight = "700";
      body.appendChild(unavailable);
      details.append(summary, body);
      fragment.appendChild(details);
      mount.replaceChildren(fragment);
      return true;
    }

    const maxBet = Math.max(MIN_BET, Math.floor(metrics.balance / STEP) * STEP);
    const initial = clampHypotheticalBet(metrics.averageSettledStake || MIN_BET, metrics.balance);
    const controls = document.createElement("div");
    controls.style.display = "grid";
    controls.style.gridTemplateColumns = "minmax(0,1fr) 110px";
    controls.style.gap = "10px";
    controls.style.alignItems = "center";

    const range = document.createElement("input");
    range.type = "range";
    range.min = String(MIN_BET);
    range.max = String(maxBet);
    range.step = String(STEP);
    range.value = String(initial);
    range.setAttribute("aria-label", "比較する仮BETスライダー");
    range.style.width = "100%";

    const input = document.createElement("input");
    input.type = "number";
    input.inputMode = "numeric";
    input.min = String(MIN_BET);
    input.max = String(maxBet);
    input.step = String(STEP);
    input.value = String(initial);
    input.setAttribute("aria-label", "比較する仮BET入力");
    input.style.minWidth = "0";
    input.style.padding = "9px 10px";
    input.style.border = "1px solid #cbd6df";
    input.style.borderRadius = "8px";
    input.style.font = "inherit";
    controls.append(range, input);

    const result = document.createElement("div");
    result.dataset.analysisBetComparisonResult = "1";

    function paint(value) {
      const data = compare(metrics.balance, metrics.goal, metrics.averageSettledStake, value);
      range.value = String(data.hypotheticalStake);
      input.value = String(data.hypotheticalStake);

      const out = document.createDocumentFragment();
      const cards = document.createElement("div");
      cards.className = "stats-grid";
      cards.append(
        makeCard("現在の平均BET", formatB(data.actualStake)),
        makeCard("仮BET", formatB(data.hypotheticalStake), `差 ${signedB(data.stakeDelta)}`),
        makeCard("残高比", `${formatPercent(data.actualBalanceRate)} → ${formatPercent(data.hypotheticalBalanceRate)}`),
        makeCard("目標B比", `${formatPercent(data.actualGoalRate)} → ${formatPercent(data.hypotheticalGoalRate)}`)
      );
      out.appendChild(cards);

      const list = document.createElement("div");
      list.style.marginTop = "8px";
      data.stress.forEach((scenario) => {
        const row = document.createElement("div");
        row.style.display = "grid";
        row.style.gridTemplateColumns = "auto minmax(0,1fr)";
        row.style.gap = "12px";
        row.style.padding = "9px 0";
        row.style.borderTop = "1px solid #e3e9ee";
        const left = document.createElement("strong");
        left.textContent = `${scenario.losses}連敗後`;
        const right = document.createElement("span");
        right.style.textAlign = "right";
        right.textContent = `${formatB(scenario.actualRemaining)} → ${formatB(scenario.hypotheticalRemaining)}（差 ${signedB(scenario.difference)}）`;
        row.append(left, right);
        list.appendChild(row);
      });
      out.appendChild(list);
      result.replaceChildren(out);
    }

    range.addEventListener("input", () => paint(range.value));
    input.addEventListener("change", () => paint(input.value));
    input.addEventListener("blur", () => paint(input.value));

    const note = document.createElement("small");
    note.textContent = "実績の平均BETと仮のBET額を並べて比較するだけの分析です。値は保存せず、推奨BET額・勝敗予測・到達時期は表示しません。";
    note.style.color = "#64798b";
    note.style.fontWeight = "700";

    body.append(controls, result, note);
    details.append(summary, body);
    fragment.appendChild(details);
    paint(initial);
    mount.replaceChildren(fragment);
    return true;
  }

  const api = Object.freeze({ MIN_BET, STEP, STRESS_COUNTS, clampHypotheticalBet, remainingAfterLosses, compare, render });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.MAMO_QUANT_COMPARISON = api;
})(typeof window !== "undefined" ? window : globalThis);
