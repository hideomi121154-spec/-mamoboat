/*
 * MAMO BOAT Decision Conflict Guard v1
 *
 * AIR BET remains free to explore. Only a REAL-site transition can be paused,
 * and only when multiple uninformed back-and-forth signals overlap.
 */
(() => {
  "use strict";
  if (window.__MAMO_DECISION_CONFLICT_GUARD_V1__) return;
  window.__MAMO_DECISION_CONFLICT_GUARD_V1__ = true;

  const CORE = window.MAMO_DECISION_CONFLICT_CORE;
  if (!CORE?.createTracker || !CORE?.evaluate) return;

  const APP_STATE_KEY = "mamoboat_v40_personal";
  const LOCAL_EVENT_KEY = "mamoboat_decision_conflict_v1";
  const MAX_LOCAL_EVENTS = 500;
  const REAL_HOSTS = new Set(["spweb.brtb.jp", "ib.mbrace.or.jp"]);
  const shownRaceKeys = new Set();
  const bypassOnce = new WeakSet();

  let active = null;
  let reviewModalVisible = false;
  let openOverlay = null;

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function readState() {
    return readJson(APP_STATE_KEY, {});
  }

  function localEvents() {
    const saved = readJson(LOCAL_EVENT_KEY, { version: 1, events: [] });
    if (Array.isArray(saved)) return saved;
    return Array.isArray(saved?.events) ? saved.events : [];
  }

  function writeLocalEvent(name, context, payload = {}) {
    try {
      const events = localEvents();
      events.push({
        at: new Date().toISOString(),
        name: String(name || "event").slice(0, 60),
        raceKey: context?.key || null,
        raceDate: context?.raceDate || null,
        venueCode: context?.venueCode || null,
        raceNo: context?.raceNo || null,
        payload,
      });
      localStorage.setItem(LOCAL_EVENT_KEY, JSON.stringify({
        version: 1,
        events: events.slice(-MAX_LOCAL_EVENTS),
      }));
    } catch (_) {
      // Storage can be unavailable in private mode. The guard still works in memory.
    }
  }

  function jstDate() {
    try {
      const date = window.MamoCore?.jstDate?.();
      if (date) return date;
    } catch (_) {
      // Fall through to a locale-independent formatter.
    }
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
    } catch (_) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function currentContext() {
    const state = readState();
    const venueCode = String(state?.venue || "").padStart(2, "0");
    const raceNo = Number(state?.raceNo) || null;
    if (!/^(0[1-9]|1[0-9]|2[0-4])$/.test(venueCode) || !raceNo) return null;
    const raceDate = jstDate();
    return {
      screen: document.body?.dataset?.screen || "race",
      raceDate,
      venueCode,
      raceNo,
      key: `${raceDate}:${venueCode}:${raceNo}`,
    };
  }

  function publicSummary(input) {
    return {
      model_version: Number(input.version) || 1,
      classification: input.classification || null,
      score: Number(input.score) || 0,
      should_pause: input.shouldPause === true,
      information_views: Number(input.informationViews) || 0,
      selection_changes: Number(input.selectionChanges) || 0,
      selection_reversals: Number(input.selectionReversals) || 0,
      uninformed_selection_reversals: Number(input.uninformedSelectionReversals) || 0,
      amount_changes: Number(input.amountChanges) || 0,
      amount_direction_changes: Number(input.amountDirectionChanges) || 0,
      uninformed_amount_direction_changes: Number(input.uninformedAmountDirectionChanges) || 0,
      review_opens: Number(input.reviewOpens) || 0,
      review_returns: Number(input.reviewReturns) || 0,
      review_loops_without_information: Number(input.reviewLoopsWithoutInformation) || 0,
      uninformed_revisions: Number(input.uninformedRevisions) || 0,
      informed_ratio: Number((Number(input.informedRatio) || 0).toFixed(2)),
      reasons: Array.isArray(input.reasons) ? input.reasons.slice(0, 5) : [],
    };
  }

  function hasActivity(summary) {
    return Number(summary?.informationViews) > 0
      || Number(summary?.selectionChanges) > 0
      || Number(summary?.amountChanges) > 0
      || Number(summary?.reviewOpens) > 0;
  }

  function flushActive(reason) {
    if (!active || active.flushed) return;
    const evaluation = CORE.evaluate(active.tracker.summary());
    if (hasActivity(evaluation)) {
      writeLocalEvent("decision_conflict_session_summary", active.context, {
        reason: String(reason || "closed").slice(0, 30),
        ...publicSummary(evaluation),
      });
    }
    active.flushed = true;
  }

  function ensureActive() {
    const context = currentContext();
    if (!context) return null;
    if (active?.context?.key === context.key) return active;
    flushActive("race_changed");
    active = {
      context,
      tracker: CORE.createTracker(),
      flushed: false,
    };
    reviewModalVisible = false;
    return active;
  }

  function isRealAnchor(target) {
    const anchor = target?.closest?.("a[href]");
    if (!anchor) return null;
    const text = String(anchor.textContent || "").replace(/\s+/g, " ").trim();
    const action = String(anchor.dataset?.mamoAction || anchor.dataset?.aiAction || "").toLowerCase();
    let host = "";
    try {
      host = new URL(anchor.href, location.href).hostname.toLowerCase();
    } catch (_) {
      return null;
    }
    if (action === "real" || REAL_HOSTS.has(host) || /REAL投票/i.test(text)) return anchor;
    if (/boatrace\.jp$/i.test(host) && /(投票|舟券|購入)/.test(text)) return anchor;
    return null;
  }

  function wasAlreadyShown(context) {
    if (shownRaceKeys.has(context.key)) return true;
    const found = localEvents().some((event) => (
      event?.name === "decision_conflict_intervention_shown"
      && event?.raceKey === context.key
    ));
    if (found) shownRaceKeys.add(context.key);
    return found;
  }

  function markShown(context, evaluation) {
    shownRaceKeys.add(context.key);
    writeLocalEvent("decision_conflict_intervention_shown", context, publicSummary(evaluation));
  }

  function recordResult(context, result, evaluation, details = {}) {
    writeLocalEvent("decision_conflict_intervention_result", context, {
      result,
      ...details,
      ...publicSummary(evaluation),
    });
  }

  function closeOverlay() {
    if (!openOverlay) return;
    const { node, keyHandler } = openOverlay;
    openOverlay = null;
    document.removeEventListener("keydown", keyHandler, true);
    node.dataset.mamoConflictOpen = "false";
    node.setAttribute("aria-hidden", "true");
    node.style.pointerEvents = "none";
    node.replaceChildren();
    node.remove();
  }

  function returnToAirBuilder() {
    const builder = document.getElementById("builder");
    if (!builder) return;
    try {
      builder.scrollIntoView({ block: "start", behavior: "auto" });
    } catch (_) {
      builder.scrollIntoView?.();
    }
    const selected = builder.querySelector(".pick.sel") || builder.querySelector(".pick");
    try {
      selected?.focus?.({ preventScroll: true });
    } catch (_) {
      selected?.focus?.();
    }
  }

  function continueToReal(anchor) {
    bypassOnce.add(anchor);
    if (typeof anchor.click === "function" && anchor.isConnected !== false) {
      anchor.click();
      return;
    }
    const target = anchor.target || "_self";
    if (target === "_self") location.assign(anchor.href);
    else window.open(anchor.href, target, "noopener,noreferrer");
  }

  function makeElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function showIntervention(anchor, session, evaluation) {
    closeOverlay();
    const context = session.context;
    const details = publicSummary(evaluation);
    const fallbackId = `conflict-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const interventionId = window.MAMO_DECISION_EVENTS?.interventionShown?.({
      id: fallbackId,
      kind: "decision_conflict",
      messageKey: "decision_conflict_multi_signal_v1",
      triggerKey: "multi_signal_without_new_information",
      details,
      context,
    }) || fallbackId;

    const overlay = makeElement("div", "mamo-conflict-overlay");
    overlay.id = "mamoDecisionConflictOverlay";
    overlay.dataset.mamoConflictOpen = "true";
    overlay.setAttribute("role", "presentation");

    const dialog = makeElement("section", "mamo-conflict-dialog");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "mamoConflictTitle");
    dialog.setAttribute("aria-describedby", "mamoConflictDescription");

    const kicker = makeElement("span", "mamo-conflict-kicker", "REAL移行前の確認");
    const title = makeElement("h2", "", "決める直前の往復が重なっています");
    title.id = "mamoConflictTitle";
    const description = makeElement(
      "p",
      "mamo-conflict-description",
      "新しいオッズや出走表を確認して考え直した変更とは別に、情報確認を挟まない戻し直しが複数重なりました。"
    );
    description.id = "mamoConflictDescription";

    const facts = makeElement("div", "mamo-conflict-facts");
    const factLines = [];
    if (evaluation.reviewReturns) factLines.push(`確認画面から買い目へ戻った：${evaluation.reviewReturns}回`);
    if (evaluation.uninformedSelectionReversals) factLines.push(`新しい情報なしで前の選択へ戻した：${evaluation.uninformedSelectionReversals}回`);
    if (evaluation.uninformedAmountDirectionChanges) factLines.push(`新しい情報なしで金額変更の向きが変わった：${evaluation.uninformedAmountDirectionChanges}回`);
    factLines.forEach((line) => facts.appendChild(makeElement("p", "", line)));

    const question = makeElement("p", "mamo-conflict-question", "いったん区切る選択もできます。");
    const note = makeElement(
      "small",
      "mamo-conflict-note",
      "迷いの強さは質問していません。このレース内の操作の往復だけを見ています。艇番・買い目そのものは判定後に保存・送信しません。"
    );

    const actions = makeElement("div", "mamo-conflict-actions");
    const skipButton = makeElement("button", "mamo-conflict-skip", "今回は見送る");
    const airButton = makeElement("button", "mamo-conflict-air", "AIR BETに戻る");
    const continueButton = makeElement("button", "mamo-conflict-continue", "このまま公式サイトへ進む");
    [skipButton, airButton, continueButton].forEach((button) => {
      button.type = "button";
      actions.appendChild(button);
    });

    let settled = false;
    const finish = (result, extra = {}) => {
      if (settled) return;
      settled = true;
      recordResult(context, result, evaluation, extra);
      window.MAMO_DECISION_EVENTS?.interventionResult?.(
        interventionId,
        result,
        { kind: "decision_conflict", trigger_key: "multi_signal_without_new_information", ...details, ...extra }
      );
      closeOverlay();
    };

    skipButton.addEventListener("click", () => finish("skip", { explicit: true }));
    airButton.addEventListener("click", () => {
      finish("return_to_air", { explicit: true });
      setTimeout(returnToAirBuilder, 0);
    });
    continueButton.addEventListener("click", () => {
      finish("continue_to_real", { explicit: true });
      continueToReal(anchor);
    });

    const keyHandler = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      finish("dismissed", { source: "escape" });
    };

    dialog.append(kicker, title, description, facts, question, note, actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    document.addEventListener("keydown", keyHandler, true);
    openOverlay = {
      node: overlay,
      keyHandler,
      dismiss: () => finish("dismissed", { source: "pagehide" }),
    };
    try {
      skipButton.focus({ preventScroll: true });
    } catch (_) {
      skipButton.focus?.();
    }
  }

  function handleRealCapture(event) {
    const anchor = isRealAnchor(event.target);
    if (!anchor) return;
    if (bypassOnce.has(anchor)) {
      bypassOnce.delete(anchor);
      return;
    }

    const session = ensureActive();
    if (!session) return;
    const evaluation = CORE.evaluate(session.tracker.summary());
    writeLocalEvent("decision_conflict_evaluated", session.context, publicSummary(evaluation));
    if (!evaluation.shouldPause || wasAlreadyShown(session.context)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    markShown(session.context, evaluation);
    showIntervention(anchor, session, evaluation);
  }

  function informationKind(target) {
    const element = target?.closest?.("a[href],button");
    if (!element || isRealAnchor(element)) return null;
    const text = String(element.textContent || "").replace(/\s+/g, " ").trim();
    const href = String(element.href || "");
    const action = String(element.dataset?.mamoAction || element.dataset?.aiAction || "").toLowerCase();
    if (action === "live" || /LIVE|ライブ|レース映像/.test(text) || /race\.boatcast\.jp/.test(href)) return "live";
    if (/オッズ/.test(text)) return "odds";
    if (/出走表|番組表/.test(text)) return "entries";
    if (/選手|レーサー/.test(text)) return "racer";
    if (/直前情報|展示/.test(text)) return "before";
    if (/結果|払戻/.test(text)) return "result";
    if (/BOAT\s*RACE公式|公式サイト/.test(text) || /boatrace\.jp/.test(href)) return "official";
    return null;
  }

  function selectionSnapshot() {
    const builder = document.getElementById("builder");
    if (!builder) return null;
    const type = document.querySelector(".bettypebtn.active")?.id || "type";
    const mode = document.querySelector("#modeTabs .active")?.id || "mode";
    const ranks = [...builder.querySelectorAll(".rank")];
    if (!ranks.length) return null;
    const selections = ranks.map((rank) => [...rank.querySelectorAll(".pick.sel")]
      .map((button) => String(button.textContent || "").trim())
      .filter(Boolean)
      .sort((a, b) => Number(a) - Number(b))
      .join(",") || "-");
    return `${type}|${mode}|${selections.join(";")}`;
  }

  function totalAmount() {
    const inputs = [...document.querySelectorAll('#cart input[aria-label="投票メダル"]')];
    if (!inputs.length) return null;
    return inputs.reduce((sum, input) => {
      const value = Number(String(input.value || "").replace(/,/g, ""));
      return sum + (Number.isFinite(value) && value > 0 ? value : 0);
    }, 0);
  }

  function handleClickBubble(event) {
    const session = ensureActive();
    if (!session) return;
    const target = event.target;

    if (target?.closest?.(".bettypebtn, .bet-tab")) {
      session.tracker.resetSelection(selectionSnapshot());
      return;
    }

    const info = informationKind(target);
    if (info) session.tracker.recordInformation(info);

    if (target?.closest?.("#builder .pick")) {
      session.tracker.recordSelection(selectionSnapshot());
    }

    if (target?.closest?.("[data-mamo-add-more], .mamo-bet-modal-back")) {
      session.tracker.recordReviewReturn();
    }

    const amountControl = target?.closest?.('#cartTools button, button[onclick^="setAllStakes"], button.xbtn, button[onclick^="removeLine"]');
    if (amountControl) {
      const amount = totalAmount();
      if (amount != null) session.tracker.recordAmount(amount);
    }
  }

  function handleAmountCapture(event) {
    const control = event.target?.closest?.('#cartTools button, button[onclick^="setAllStakes"], button.xbtn, button[onclick^="removeLine"]');
    if (!control) return;
    const session = ensureActive();
    const amount = totalAmount();
    if (session && amount != null) session.tracker.recordAmount(amount);
  }

  function handleAmountFocus(event) {
    const input = event.target?.closest?.('input[aria-label="投票メダル"]');
    if (!input) return;
    const session = ensureActive();
    const amount = totalAmount();
    if (session && amount != null) session.tracker.recordAmount(amount);
  }

  function handleChangeBubble(event) {
    const input = event.target?.closest?.('input[aria-label="投票メダル"]');
    if (!input) return;
    const session = ensureActive();
    const amount = totalAmount();
    if (session && amount != null) session.tracker.recordAmount(amount);
  }

  function isReviewModalOpen() {
    const background = document.getElementById("modalBg");
    const modal = document.getElementById("modal");
    if (!background?.classList.contains("show") || !modal) return false;
    const text = String(modal.textContent || "");
    return /購入内容/.test(text) && /AIR BET/.test(text);
  }

  function syncReviewModal() {
    const visible = isReviewModalOpen();
    if (visible === reviewModalVisible) return;
    const session = ensureActive();
    if (visible && session) {
      const amount = totalAmount();
      if (amount != null) session.tracker.recordAmount(amount);
      session.tracker.recordReviewOpen();
    } else if (!visible && session) {
      session.tracker.recordReviewClosed();
    }
    reviewModalVisible = visible;
  }

  function injectStyles() {
    if (document.getElementById("mamoDecisionConflictStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoDecisionConflictStyle";
    style.textContent = `
      .mamo-conflict-overlay{position:fixed;inset:0;z-index:32000;display:flex;align-items:flex-end;justify-content:center;padding:18px 14px calc(18px + env(safe-area-inset-bottom));background:rgba(4,23,39,.78);overflow-y:auto;overscroll-behavior:contain}
      .mamo-conflict-dialog{width:min(100%,520px);max-height:calc(100dvh - 36px);overflow:auto;border-radius:22px;background:#fff;padding:21px 18px 18px;color:#102d3d;box-shadow:0 24px 70px rgba(0,0,0,.32)}
      .mamo-conflict-kicker{display:block;margin-bottom:7px;color:#bd1722;font-size:11px;font-weight:1000;letter-spacing:.12em}
      .mamo-conflict-dialog h2{margin:0;font-size:22px;line-height:1.35;color:#082b4a}
      .mamo-conflict-description{margin:10px 0 12px;color:#415d6c;font-size:14px;line-height:1.65}
      .mamo-conflict-facts{display:grid;gap:6px;margin:0 0 12px;padding:11px 12px;border-left:4px solid #e51d2a;border-radius:10px;background:#fff4f4}
      .mamo-conflict-facts p{margin:0;color:#66242a;font-size:12px;font-weight:800;line-height:1.5}
      .mamo-conflict-question{margin:12px 0 8px;color:#082b4a;font-size:15px;font-weight:1000}
      .mamo-conflict-note{display:block;margin-bottom:14px;color:#687d88;font-size:10px;line-height:1.55}
      .mamo-conflict-actions{display:grid;gap:8px}
      .mamo-conflict-actions button{min-height:48px;border-radius:12px;padding:11px 13px;font:900 14px/1.25 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}
      .mamo-conflict-skip{border:0;background:#082b4a;color:#fff}
      .mamo-conflict-air{border:1px solid #8fa7b4;background:#fff;color:#082b4a}
      .mamo-conflict-continue{min-height:42px!important;border:0;background:transparent;color:#647985;text-decoration:underline;text-underline-offset:3px}
      @media(min-width:600px){.mamo-conflict-overlay{align-items:center}.mamo-conflict-dialog{padding:25px 24px 21px}}
      @media(prefers-reduced-motion:reduce){.mamo-conflict-overlay,.mamo-conflict-dialog{scroll-behavior:auto!important}}
    `;
    document.head.appendChild(style);
  }

  function boot() {
    injectStyles();
    // Registered before other decision collectors: a paused click must not be
    // misreported as an actual REAL-site transition.
    document.addEventListener("click", handleRealCapture, true);
    document.addEventListener("click", handleAmountCapture, true);
    document.addEventListener("click", handleClickBubble, false);
    document.addEventListener("change", handleChangeBubble, false);
    document.addEventListener("focusin", handleAmountFocus, true);

    const modalRoot = document.getElementById("modalBg");
    if (modalRoot && typeof MutationObserver === "function") {
      new MutationObserver(syncReviewModal).observe(modalRoot, {
        attributes: true,
        attributeFilter: ["class"],
        childList: true,
        subtree: true,
      });
    }
    syncReviewModal();

    window.addEventListener("pagehide", () => {
      openOverlay?.dismiss?.();
      flushActive("pagehide");
      closeOverlay();
    });
    window.addEventListener("pageshow", () => {
      if (openOverlay && !openOverlay.node?.isConnected) openOverlay = null;
    });
  }

  window.MAMO_DECISION_CONFLICT_GUARD = Object.freeze({
    version: 1,
    evaluateCurrent() {
      const session = ensureActive();
      return session ? CORE.evaluate(session.tracker.summary()) : null;
    },
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
