/* MAMO BOAT — AIR BET layout v7
 * Presentation-only enhancement for the canonical draft tray in app.js.
 * It never wraps selection, review, wallet, record, or navigation functions.
 * Budget allocation is opt-in, uses the public draft/review APIs, and fails open.
 */
(() => {
  "use strict";
  if (window.__MAMO_BET_REVIEW_FLOW_V7__) return;
  window.__MAMO_BET_REVIEW_FLOW_V7__ = true;

  const AIR_BET_RENDERED_EVENT = "mamo:air-bet-rendered";
  const STAKE_UNIT = 100;
  const escapeHtml = (value) => String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  function racerRows() {
    return Array.from(document.querySelectorAll("#raceView .boats .boat")).map((item) => {
      const number = Number(item.querySelector(".num")?.textContent?.trim());
      const name = String(item.querySelector(":scope > div:nth-child(2) > b")?.textContent || "").trim();
      return {
        number,
        name,
        href: String(item.getAttribute("href") || "").trim(),
        racerClass: String(item.dataset.racerClass || "").trim(),
        motorNumber: String(item.dataset.motorNumber || "").trim(),
        boatPart: String(item.dataset.boatPart || "").trim(),
      };
    }).filter((item) => Number.isFinite(item.number) && item.number >= 1 && item.number <= 6 && item.name);
  }

  function ensureRacerColumn(builder) {
    const rows = racerRows();
    const existing = builder.querySelector(":scope > .mamo-racer-list");
    if (!rows.length) {
      existing?.remove();
      builder.dataset.mamoHasRacers = "false";
      return;
    }
    const signature = rows.map((item) => [
      item.number,
      item.name,
      item.href,
      item.racerClass,
      item.motorNumber,
      item.boatPart,
    ].join(":")).join("|");
    if (existing?.dataset.signature === signature) {
      builder.dataset.mamoHasRacers = "true";
      return;
    }

    existing?.remove();
    const column = document.createElement("div");
    column.className = "mamo-racer-list";
    column.dataset.signature = signature;
    column.innerHTML = `<div class="mamo-racer-head">選手</div><div class="mamo-racer-rows">${rows.map((item) => {
      const equipment = [
        item.motorNumber ? `M${item.motorNumber}` : "",
        item.boatPart ? `B${item.boatPart}` : "",
      ].filter(Boolean).join(" / ");
      const meta = [item.racerClass, equipment].filter(Boolean).join(" · ");
      return `<div class="mamo-racer-row"><span class="mamo-lane b${item.number}">${item.number}</span><span class="mamo-racer-copy"><span class="mamo-racer-identity"><b>${escapeHtml(item.name)}</b><small class="mamo-racer-meta">${escapeHtml(meta)}</small></span>${item.href ? `<a class="mamo-official-button" href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">公式情報 ↗</a>` : ""}</span></div>`;
    }).join("")}</div>`;
    builder.insertBefore(column, builder.firstChild);
    builder.dataset.mamoHasRacers = "true";
  }

  let enhancing = false;
  function enhanceBuilder() {
    if (enhancing) return;
    enhancing = true;
    try {
      const builder = document.getElementById("builder");
      if (!builder) return;
      const betdesk = builder.closest(".betdesk");
      const modeTabs = document.getElementById("modeTabs");
      const betTypeBar = betdesk?.querySelector(".bettypebar");
      if (betdesk && modeTabs && betTypeBar && modeTabs.nextElementSibling !== betTypeBar) {
        betdesk.insertBefore(modeTabs, betTypeBar);
      }

      const ranks = Array.from(builder.children || []).filter((node) =>
        node.classList?.contains("rank") && node.querySelector?.(".pick")
      );
      const pickerMode = ranks.some((rank) => rank.querySelector?.('[id^="f-"]'))
        ? "formation"
        : ranks.some((rank) => rank.querySelector?.('[id^="b-"]'))
          ? "box"
          : ranks.some((rank) => rank.querySelector?.('[id^="n-"]'))
            ? "normal"
            : "";

      builder.classList.toggle("mamo-selection-matrix", Boolean(pickerMode && ranks.length));
      ranks.forEach((rank, index) => { rank.dataset.mamoPickerRank = String(index + 1); });
      if (pickerMode && ranks.length) {
        builder.dataset.mamoPickerMode = pickerMode;
        builder.dataset.mamoPickerColumns = String(pickerMode === "box" ? 1 : ranks.length);
        ensureRacerColumn(builder);
      } else {
        delete builder.dataset.mamoPickerMode;
        delete builder.dataset.mamoPickerColumns;
        builder.querySelector(":scope > .mamo-racer-list")?.remove();
      }
      builder.querySelector("[data-add-current]")?.classList.add("mamo-add-current-draft");
      document.getElementById("reviewBetButton")?.classList.add("mamo-final-review");
    } finally {
      enhancing = false;
    }
  }

  function oddsNumber(value) {
    const match = String(value ?? "").trim().match(/^([0-9]+(?:\.[0-9]+)?)/);
    const odds = match ? Number(match[1]) : 0;
    return Number.isFinite(odds) && odds > 0 ? odds : 0;
  }

  function lineOdds(line) {
    return oddsNumber(line?.referenceOdds ?? line?.odds);
  }

  function lineAmount(line) {
    const value = Number(line?.amount ?? line?.stake);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function combinedOdds(lines) {
    if (!Array.isArray(lines) || !lines.length) return null;
    const odds = lines.map(lineOdds);
    if (odds.some((value) => !value)) return null;
    const inverseTotal = odds.reduce((sum, value) => sum + (1 / value), 0);
    return inverseTotal > 0 ? 1 / inverseTotal : null;
  }

  function equalPayoutAllocation(lines, budget, unit = STAKE_UNIT) {
    if (!Array.isArray(lines) || !lines.length) {
      return { ok: false, code: "empty" };
    }
    const safeUnit = Number(unit);
    const safeBudget = Number(budget);
    if (!Number.isFinite(safeUnit) || safeUnit <= 0 || !Number.isFinite(safeBudget) || safeBudget <= 0) {
      return { ok: false, code: "invalid_budget" };
    }
    if (safeBudget % safeUnit !== 0) {
      return { ok: false, code: "invalid_unit", unit: safeUnit };
    }
    const odds = lines.map(lineOdds);
    const missingOdds = odds.reduce((items, value, index) => {
      if (!value) items.push(index);
      return items;
    }, []);
    if (missingOdds.length) {
      return { ok: false, code: "missing_odds", missingOdds };
    }
    const minimumBudget = lines.length * safeUnit;
    if (safeBudget < minimumBudget) {
      return { ok: false, code: "budget_too_small", minimumBudget };
    }

    const totalUnits = safeBudget / safeUnit;
    const amounts = Array(lines.length).fill(safeUnit);
    for (let assigned = lines.length; assigned < totalUnits; assigned += 1) {
      let target = 0;
      let lowestPayout = amounts[0] * odds[0];
      for (let index = 1; index < amounts.length; index += 1) {
        const payout = amounts[index] * odds[index];
        if (payout < lowestPayout) {
          lowestPayout = payout;
          target = index;
        }
      }
      amounts[target] += safeUnit;
    }

    const payouts = amounts.map((amount, index) => amount * odds[index]);
    const combined = combinedOdds(lines);
    return {
      ok: true,
      budget: safeBudget,
      unit: safeUnit,
      amounts,
      payouts,
      combinedOdds: combined,
      payoutMin: Math.min(...payouts),
      payoutMax: Math.max(...payouts),
      payoutAverage: payouts.reduce((sum, value) => sum + value, 0) / payouts.length,
    };
  }

  function draftLines() {
    try {
      const lines = window.MAMO_AIR_BET_DRAFT?.snapshot?.();
      return Array.isArray(lines) ? lines : [];
    } catch (_) {
      return [];
    }
  }

  function formatB(value) {
    return `${Math.round(Number(value) || 0).toLocaleString("ja-JP")}B`;
  }

  function injectAllocationStyles() {
    if (document.querySelector('style[data-mamo-air-allocation="1"]')) return;
    const style = document.createElement("style");
    style.dataset.mamoAirAllocation = "1";
    style.textContent = `
      .air-bet-review-shell .mamo-allocation-panel{display:grid;gap:10px;padding:12px;border:1px solid rgba(8,43,74,.14);border-radius:14px;background:#f7fbff;box-sizing:border-box}
      .air-bet-review-shell .mamo-allocation-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
      .air-bet-review-shell .mamo-allocation-head span{font-size:12px;font-weight:800;color:#47657d}
      .air-bet-review-shell .mamo-allocation-head strong{font-size:24px;line-height:1;color:#0876c9}
      .air-bet-review-shell .mamo-allocation-budget{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
      .air-bet-review-shell .mamo-allocation-budget label{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;font-size:12px;font-weight:800;color:#27465f}
      .air-bet-review-shell .mamo-allocation-budget input{width:100%;min-width:0;min-height:42px;padding:8px 10px;border:1px solid #bfd0df;border-radius:10px;background:#fff;font:inherit;box-sizing:border-box}
      .air-bet-review-shell .mamo-allocation-apply{min-height:42px;padding:8px 12px;border:0;border-radius:10px;background:#0876c9;color:#fff;font-weight:900}
      .air-bet-review-shell .mamo-allocation-apply:disabled{opacity:.45}
      .air-bet-review-shell .mamo-allocation-note{font-size:11px;line-height:1.45;color:#5c7183}
      .air-bet-review-shell .mamo-allocation-status{font-size:12px;font-weight:800;color:#087346}
      .air-bet-review-shell .mamo-allocation-status:empty{display:none}
      .air-bet-review-shell .mamo-allocation-adjust{display:inline-flex;gap:6px;flex-wrap:wrap;margin-top:6px}
      .air-bet-review-shell .mamo-allocation-adjust button{min-height:34px;padding:6px 10px;border:1px solid #bfd0df;border-radius:9px;background:#fff;color:#173d5b;font-weight:800}
      @media (max-width:420px){.air-bet-review-shell .mamo-allocation-budget{grid-template-columns:1fr}.air-bet-review-shell .mamo-allocation-apply{width:100%}}
    `;
    document.head?.append(style);
  }

  function createAllocationPanel(shell) {
    const panel = document.createElement("section");
    panel.className = "mamo-allocation-panel";
    panel.dataset.mamoAllocationPanel = "1";
    panel.setAttribute("aria-label", "合成オッズと資金配分");

    const head = document.createElement("div");
    head.className = "mamo-allocation-head";
    const label = document.createElement("span");
    label.textContent = "合成オッズ";
    const odds = document.createElement("strong");
    odds.dataset.mamoCombinedOdds = "1";
    odds.textContent = "—";
    head.append(label, odds);

    const budgetRow = document.createElement("div");
    budgetRow.className = "mamo-allocation-budget";
    const budgetLabel = document.createElement("label");
    const budgetText = document.createElement("span");
    budgetText.textContent = "今回使う予算";
    const input = document.createElement("input");
    input.type = "number";
    input.inputMode = "numeric";
    input.min = String(STAKE_UNIT);
    input.step = String(STAKE_UNIT);
    input.placeholder = "予算を入力";
    input.dataset.mamoAllocationBudget = "1";
    input.setAttribute("aria-label", "資金配分に使う予算");
    const unit = document.createElement("b");
    unit.textContent = "B";
    budgetLabel.append(budgetText, input, unit);
    const apply = document.createElement("button");
    apply.type = "button";
    apply.className = "mamo-allocation-apply";
    apply.dataset.mamoAutoAllocate = "1";
    apply.textContent = "払戻を均等に自動配分";
    budgetRow.append(budgetLabel, apply);

    const note = document.createElement("div");
    note.className = "mamo-allocation-note";
    note.dataset.mamoAllocationNote = "1";
    const status = document.createElement("div");
    status.className = "mamo-allocation-status";
    status.dataset.mamoAllocationStatus = "1";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    panel.append(head, budgetRow, note, status);
    const anchor = shell.querySelector(".air-bet-review-heading");
    if (anchor?.parentNode === shell) shell.insertBefore(panel, anchor);
    else shell.prepend(panel);
    return panel;
  }

  function ensureLineAdjusters(shell) {
    shell.querySelectorAll?.(".betline[data-cart-index]").forEach((row) => {
      const edit = row.querySelector(".betline-edit");
      if (!edit || edit.querySelector('[data-mamo-allocation-adjust="1"]')) return;
      const controls = document.createElement("span");
      controls.className = "mamo-allocation-adjust";
      controls.dataset.mamoAllocationAdjust = "1";
      const minus = document.createElement("button");
      minus.type = "button";
      minus.dataset.mamoStakeDelta = String(-STAKE_UNIT);
      minus.textContent = "−100B";
      minus.setAttribute("aria-label", "この買い目を100B減らす");
      const plus = document.createElement("button");
      plus.type = "button";
      plus.dataset.mamoStakeDelta = String(STAKE_UNIT);
      plus.textContent = "+100B";
      plus.setAttribute("aria-label", "この買い目を100B増やす");
      controls.append(minus, plus);
      edit.append(controls);
    });
  }

  function refreshAllocationPanel(shell = document.querySelector('.air-bet-review-shell[data-air-bet-review="1"]')) {
    if (!shell) return;
    const lines = draftLines();
    const panel = shell.querySelector('[data-mamo-allocation-panel="1"]') || createAllocationPanel(shell);
    ensureLineAdjusters(shell);
    const combined = combinedOdds(lines);
    const oddsEl = panel.querySelector('[data-mamo-combined-odds="1"]');
    if (oddsEl) oddsEl.textContent = combined ? `${combined.toFixed(2)}倍` : "—";
    const input = panel.querySelector('[data-mamo-allocation-budget="1"]');
    if (input) input.min = String(Math.max(STAKE_UNIT, lines.length * STAKE_UNIT));
    const apply = panel.querySelector('[data-mamo-auto-allocate="1"]');
    if (apply) apply.disabled = !lines.length || !combined || typeof window.updateReviewLineStake !== "function";
    const note = panel.querySelector('[data-mamo-allocation-note="1"]');
    const payouts = lines.map((line) => {
      const amount = lineAmount(line);
      const odds = lineOdds(line);
      return amount && odds ? amount * odds : 0;
    }).filter((value) => value > 0);
    if (note) {
      if (!lines.length) note.textContent = "買い目を追加すると利用できます。";
      else if (!combined) note.textContent = "全ての買い目で参考オッズを取得できると、自動配分を利用できます。";
      else if (payouts.length === lines.length) {
        const min = Math.min(...payouts);
        const max = Math.max(...payouts);
        note.textContent = `現在の想定払戻 ${formatB(min)}〜${formatB(max)}。100B単位で厚め・抑えの調整もできます。`;
      } else {
        note.textContent = "予算を入力すると、どの買い目が当たっても払戻がなるべく近くなるよう100B単位で配分します。";
      }
    }
  }

  function applyAutoAllocation(shell) {
    const lines = draftLines();
    const input = shell?.querySelector?.('[data-mamo-allocation-budget="1"]');
    const budget = Number(input?.value);
    const result = equalPayoutAllocation(lines, budget, STAKE_UNIT);
    if (!result.ok) {
      if (result.code === "missing_odds") alert("参考オッズを取得できていない買い目があるため、自動配分できません。");
      else if (result.code === "budget_too_small") alert(`この${lines.length}点を配分するには最低${formatB(result.minimumBudget)}必要です。`);
      else if (result.code === "invalid_unit") alert("予算は100B単位で入力してください。");
      else alert("資金配分に使う予算を入力してください。");
      return;
    }
    if (typeof window.updateReviewLineStake !== "function") return;
    result.amounts.forEach((amount, index) => window.updateReviewLineStake(index, amount));
    const status = shell.querySelector('[data-mamo-allocation-status="1"]');
    if (status) status.textContent = `${formatB(result.budget)}を${result.amounts.length}点に自動配分しました。`;
    refreshAllocationPanel(shell);
    try {
      window.dispatchEvent(new CustomEvent("mamo:air-bet-allocation-applied", {
        detail: {
          budget: result.budget,
          lineCount: result.amounts.length,
          combinedOdds: result.combinedOdds,
          payoutMin: result.payoutMin,
          payoutMax: result.payoutMax,
        },
      }));
    } catch (_) {}
  }

  function adjustLineStake(button) {
    const row = button.closest?.(".betline[data-cart-index]");
    const index = Number(row?.dataset?.cartIndex);
    const delta = Number(button.dataset.mamoStakeDelta);
    const lines = draftLines();
    if (!Number.isInteger(index) || !lines[index] || !Number.isFinite(delta)) return;
    const next = Math.max(0, lineAmount(lines[index]) + delta);
    if (typeof window.updateReviewLineStake !== "function") return;
    window.updateReviewLineStake(index, next);
    const shell = button.closest?.('.air-bet-review-shell[data-air-bet-review="1"]');
    const status = shell?.querySelector?.('[data-mamo-allocation-status="1"]');
    if (status) status.textContent = next ? `この買い目を${formatB(next)}に調整しました。` : "この買い目のベット数を未入力に戻しました。";
    refreshAllocationPanel(shell);
  }

  function enhanceReviewAllocation() {
    const shell = document.querySelector('.air-bet-review-shell[data-air-bet-review="1"]');
    if (!shell) return;
    injectAllocationStyles();
    refreshAllocationPanel(shell);
  }

  function onDocumentClick(event) {
    const target = event.target;
    if (!target?.closest) return;
    if (target.closest("#reviewBetButton")) {
      enhanceReviewAllocation();
      return;
    }
    const shell = target.closest('.air-bet-review-shell[data-air-bet-review="1"]');
    if (!shell) return;
    const auto = target.closest('[data-mamo-auto-allocate="1"]');
    if (auto) {
      applyAutoAllocation(shell);
      return;
    }
    const adjust = target.closest("[data-mamo-stake-delta]");
    if (adjust) {
      adjustLineStake(adjust);
      return;
    }
    refreshAllocationPanel(shell);
  }

  function onDocumentInput(event) {
    const target = event.target;
    if (!target?.closest) return;
    const shell = target.closest?.('.air-bet-review-shell[data-air-bet-review="1"]');
    if (!shell) return;
    if (target.matches?.(".betline-stake-input") || target.matches?.('[data-mamo-allocation-budget="1"]')) {
      refreshAllocationPanel(shell);
    }
  }

  function boot() {
    enhanceBuilder();
    window.addEventListener(AIR_BET_RENDERED_EVENT, enhanceBuilder);
    window.addEventListener("pageshow", enhanceBuilder);
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("input", onDocumentInput);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.MAMO_BET_REVIEW_LAYOUT = Object.freeze({ refresh: enhanceBuilder });
  window.MAMO_BET_REVIEW_ALLOCATION = Object.freeze({
    combinedOdds,
    allocate: equalPayoutAllocation,
    refresh: enhanceReviewAllocation,
    unit: STAKE_UNIT,
  });
})();
