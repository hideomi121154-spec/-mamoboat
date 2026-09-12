/* MAMO BOAT — STEP 6.2 capital resilience / custom goal foundation.
 * Reads the current B balance and settled AIR BET records.
 * The only writable state is a dedicated analysis-goal localStorage key.
 * AIR BET, wallet, records, pressroom, SHOP, Supabase, and navigation are never mutated.
 */
(function initMamoQuantCapital(root) {
  "use strict";

  const STORAGE_KEY = "mamoboat_v40_personal";
  const GOAL_STORAGE_KEY = "mamoboat_quant_goal_v1";
  const DEFAULT_GOAL_B = 1000000;
  const MIN_GOAL_B = 10000;
  const MAX_GOAL_B = 100000000;
  const STRESS_COUNTS = Object.freeze([5, 10, 15, 20]);
  const SETTLED = new Set(["hit", "miss", "refunded"]);

  const safeNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  function normalizeGoal(value, fallback = DEFAULT_GOAL_B) {
    const number = Math.round(safeNumber(value));
    if (number < MIN_GOAL_B || number > MAX_GOAL_B) return fallback;
    return number;
  }

  function readGoal(storage) {
    try {
      const source = storage || root?.localStorage;
      return normalizeGoal(source?.getItem?.(GOAL_STORAGE_KEY), DEFAULT_GOAL_B);
    } catch (_) {
      return DEFAULT_GOAL_B;
    }
  }

  function writeGoal(storage, value) {
    const normalized = normalizeGoal(value, null);
    if (normalized == null) return false;
    try {
      const source = storage || root?.localStorage;
      source?.setItem?.(GOAL_STORAGE_KEY, String(normalized));
      return true;
    } catch (_) {
      return false;
    }
  }

  function recordStake(record) {
    const direct = safeNumber(record?.stake ?? record?.total);
    if (direct > 0) return direct;
    const lines = Array.isArray(record?.lines) ? record.lines : [];
    return lines.reduce((sum, line) => sum + Math.max(0, safeNumber(line?.stake)), 0);
  }

  function stressScenarios(balance, averageStake) {
    return Object.freeze(STRESS_COUNTS.map((losses) => {
      const lossAmount = Math.max(0, averageStake) * losses;
      return Object.freeze({
        losses,
        lossAmount,
        remaining: Math.max(0, balance - lossAmount),
      });
    }));
  }

  function calculate(state, goal = DEFAULT_GOAL_B) {
    const normalizedGoal = normalizeGoal(goal, DEFAULT_GOAL_B);
    const balance = Math.max(0, safeNumber(state?.coins));
    const records = Array.isArray(state?.records) ? state.records : [];
    const settled = records.filter((record) => SETTLED.has(record?.status));
    const stakes = settled.map(recordStake).filter((stake) => stake > 0);
    const averageSettledStake = stakes.length
      ? stakes.reduce((sum, stake) => sum + stake, 0) / stakes.length
      : 0;
    const progress = normalizedGoal > 0 ? (balance / normalizedGoal) * 100 : 0;
    const remaining = Math.max(0, normalizedGoal - balance);
    const averageStakeBalanceRate = balance > 0 && averageSettledStake > 0
      ? (averageSettledStake / balance) * 100
      : null;

    return Object.freeze({
      goal: normalizedGoal,
      balance,
      progress,
      remaining,
      settledCount: settled.length,
      averageSettledStake,
      averageStakeBalanceRate,
      stress: stressScenarios(balance, averageSettledStake),
    });
  }

  function readSnapshot(storage) {
    try {
      const source = storage || root?.localStorage;
      const raw = source?.getItem?.(STORAGE_KEY);
      if (!raw) return Object.freeze({ coins: 0, records: [] });
      const parsed = JSON.parse(raw);
      return Object.freeze({
        coins: Math.max(0, safeNumber(parsed?.coins)),
        records: Array.isArray(parsed?.records) ? parsed.records.slice() : [],
      });
    } catch (_) {
      return Object.freeze({ coins: 0, records: [] });
    }
  }

  const formatB = (value) => `${Math.round(safeNumber(value)).toLocaleString("ja-JP")} B`;
  const formatPercent = (value) => value == null ? "—" : `${value.toFixed(1)}%`;
  const goalLabel = (goal) => {
    const number = Math.round(safeNumber(goal));
    if (number >= 10000 && number % 10000 === 0) return `${(number / 10000).toLocaleString("ja-JP")}万B`;
    return formatB(number).replace(" B", "B");
  };

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

  function buildGoalEditor(metrics) {
    const details = document.createElement("details");
    details.dataset.analysisCapitalGoal = "1";
    details.style.marginTop = "12px";
    details.style.border = "1px solid #cbd6df";
    details.style.borderRadius = "10px";
    details.style.background = "#ffffff";

    const summary = document.createElement("summary");
    summary.style.cursor = "pointer";
    summary.style.padding = "12px 14px";
    summary.style.fontWeight = "800";
    summary.style.color = "#0b3554";
    summary.textContent = `目標Bを変更する（現在 ${goalLabel(metrics.goal)}）`;

    const form = document.createElement("form");
    form.style.padding = "0 14px 14px";
    form.style.display = "grid";
    form.style.gridTemplateColumns = "minmax(0,1fr) auto";
    form.style.gap = "8px";

    const input = document.createElement("input");
    input.type = "number";
    input.inputMode = "numeric";
    input.min = String(MIN_GOAL_B);
    input.max = String(MAX_GOAL_B);
    input.step = "1000";
    input.value = String(metrics.goal);
    input.setAttribute("aria-label", "目標B");
    input.style.minWidth = "0";
    input.style.padding = "10px 12px";
    input.style.border = "1px solid #cbd6df";
    input.style.borderRadius = "8px";
    input.style.font = "inherit";

    const button = document.createElement("button");
    button.type = "submit";
    button.textContent = "保存";
    button.style.padding = "10px 14px";
    button.style.border = "0";
    button.style.borderRadius = "8px";
    button.style.background = "#0b3554";
    button.style.color = "#ffffff";
    button.style.fontWeight = "800";

    const note = document.createElement("small");
    note.style.gridColumn = "1 / -1";
    note.style.color = "#64798b";
    note.style.fontWeight = "700";
    note.textContent = "10,000B〜100,000,000Bで設定できます。100万Bは初期例です。";

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!writeGoal(root?.localStorage, input.value)) {
        input.setCustomValidity("目標Bは10,000B〜100,000,000Bで入力してください。");
        input.reportValidity();
        return;
      }
      input.setCustomValidity("");
      render();
    });

    form.append(input, button, note);
    details.append(summary, form);
    return details;
  }

  function buildStress(metrics) {
    const details = document.createElement("details");
    details.dataset.analysisCapitalStress = "1";
    details.style.marginTop = "12px";
    details.style.border = "1px solid #cbd6df";
    details.style.borderRadius = "10px";
    details.style.background = "#ffffff";

    const summary = document.createElement("summary");
    summary.style.cursor = "pointer";
    summary.style.padding = "12px 14px";
    summary.style.fontWeight = "800";
    summary.style.color = "#0b3554";
    summary.textContent = "連敗ストレスを見る";

    const body = document.createElement("div");
    body.style.padding = "0 14px 14px";
    body.style.display = "grid";
    body.style.gap = "1px";

    metrics.stress.forEach((scenario) => {
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "auto minmax(0,1fr)";
      row.style.gap = "12px";
      row.style.padding = "10px 0";
      row.style.borderTop = "1px solid #e3e9ee";
      const label = document.createElement("strong");
      label.textContent = `${scenario.losses}連敗`;
      const value = document.createElement("span");
      value.style.textAlign = "right";
      value.textContent = `損失 ${formatB(scenario.lossAmount)} / 残高 ${formatB(scenario.remaining)}`;
      row.append(label, value);
      body.appendChild(row);
    });

    const note = document.createElement("small");
    note.textContent = "平均確定BETをそのまま使い、各回を全損したと仮定する単純ストレス計算です。将来の連敗数や損失を予測するものではありません。";
    note.style.color = "#64798b";
    note.style.fontWeight = "700";
    note.style.paddingTop = "8px";
    body.appendChild(note);

    details.append(summary, body);
    return details;
  }

  function render() {
    if (typeof document === "undefined") return false;
    const mount = document.getElementById("mamoQuantAnalysisCapital");
    if (!mount) return false;

    const storage = root?.localStorage;
    const metrics = calculate(readSnapshot(storage), readGoal(storage));
    const fragment = document.createDocumentFragment();

    const heading = document.createElement("div");
    heading.className = "section-head small";
    const headingCopy = document.createElement("div");
    const number = document.createElement("span");
    number.className = "section-number";
    number.textContent = "STEP 6.2";
    const title = document.createElement("h2");
    title.textContent = "資金耐久・目標B PROJECT";
    headingCopy.append(number, title);
    heading.appendChild(headingCopy);

    const goalText = goalLabel(metrics.goal);
    const grid = document.createElement("div");
    grid.className = "stats-grid";
    grid.append(
      makeCard("現在のB残高", formatB(metrics.balance)),
      makeCard(`${goalText}進捗`, formatPercent(metrics.progress), "未来予測ではなく現在地点"),
      makeCard(`${goalText}まで残り`, formatB(metrics.remaining)),
      makeCard("平均確定BET", formatB(metrics.averageSettledStake), metrics.averageStakeBalanceRate == null ? "残高比 —" : `現在残高比 ${formatPercent(metrics.averageStakeBalanceRate)}`)
    );

    const progress = document.createElement("div");
    progress.style.marginTop = "12px";
    progress.style.height = "12px";
    progress.style.borderRadius = "999px";
    progress.style.background = "#e5ebf0";
    progress.style.overflow = "hidden";
    const fill = document.createElement("div");
    fill.style.height = "100%";
    fill.style.width = `${Math.max(0, Math.min(100, metrics.progress))}%`;
    fill.style.background = "#0b3554";
    progress.appendChild(fill);

    const note = document.createElement("div");
    note.className = "analysis-note";
    note.style.marginTop = "12px";
    note.textContent = `確定済みAIR BET ${metrics.settledCount}件を使って平均BETを算出しています。目標進捗は現在残高÷設定目標Bの単純比率です。推奨BET額や到達時期は表示しません。目標Bだけを分析専用設定として端末内に保存します。`;

    fragment.append(heading, grid, progress, buildGoalEditor(metrics), buildStress(metrics), note);
    mount.replaceChildren(fragment);
    return true;
  }

  const api = Object.freeze({
    GOAL_STORAGE_KEY,
    DEFAULT_GOAL_B,
    MIN_GOAL_B,
    MAX_GOAL_B,
    STRESS_COUNTS,
    normalizeGoal,
    readGoal,
    writeGoal,
    recordStake,
    stressScenarios,
    calculate,
    readSnapshot,
    render,
  });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.MAMO_QUANT_CAPITAL = api;
})(typeof window !== "undefined" ? window : globalThis);
