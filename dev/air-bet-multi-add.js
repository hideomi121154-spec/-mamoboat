/* MAMO BOAT — AIR BET multi-add compatibility + selection reference odds v6.
 * Keeps the existing one-tap venue return, live-odds preview, and review helpers
 * without re-rendering the race/builder DOM. Emptying the review stays in place.
 */
(() => {
  "use strict";
  if (window.__MAMO_AIR_BET_MULTI_ADD_V6__) return;
  window.__MAMO_AIR_BET_MULTI_ADD_V6__ = true;

  let oddsAbort = null;
  let oddsRequestKey = "";

  function ensureVenueBackButton() {
    if (document.body?.dataset?.screen !== "race") return;
    const raceView = document.getElementById("raceView");
    if (!raceView || raceView.querySelector("[data-mamo-back-venues]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.mamoBackVenues = "1";
    button.className = "mamo-back-venues";
    button.setAttribute("aria-label", "全国24場の一覧へ戻る");
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "←";
    const label = document.createElement("b");
    label.textContent = "全国24場へ戻る";
    const hint = document.createElement("small");
    hint.textContent = "別の開催場を見る";
    button.append(arrow, label, hint);
    button.addEventListener("click", () => {
      window.go?.("venues");
      window.MAMO_VENUE_LIVE_PRIORITY?.refresh?.();
    });
    const path = raceView.querySelector(".race-path");
    if (path) path.before(button);
    else raceView.prepend(button);
  }

  function currentContext() {
    const oddsLink = document.getElementById("officialOddsMain");
    if (!oddsLink?.href) return null;
    try {
      const url = new URL(oddsLink.href, location.href);
      const venueCode = url.searchParams.get("jcd");
      const raceNo = Number(url.searchParams.get("rno"));
      const hd = url.searchParams.get("hd") || "";
      const date = /^\d{8}$/.test(hd) ? `${hd.slice(0, 4)}-${hd.slice(4, 6)}-${hd.slice(6, 8)}` : "";
      const activeType = document.querySelector(".bettypebtn.active[id^='type-']")?.id?.replace("type-", "") || "";
      return venueCode && raceNo && date && activeType ? { date, venueCode, raceNo, betType: activeType } : null;
    } catch (_) { return null; }
  }

  function selectedNormalCombo() {
    const selected = [...document.querySelectorAll("#builder .pick.sel[id^='n-']")]
      .map((button) => {
        const match = button.id.match(/^n-(\d+)-(\d+)$/);
        return match ? { index: Number(match[1]), boat: Number(match[2]) } : null;
      }).filter(Boolean).sort((a, b) => a.index - b.index);
    const ranks = [...new Set([...document.querySelectorAll("#builder .pick[id^='n-']")].map((button) => Number(button.id.split("-")[1])))].sort((a, b) => a - b);
    if (!ranks.length || selected.length !== ranks.length) return null;
    if (selected.some((item, index) => item.index !== ranks[index])) return null;
    return selected.map((item) => item.boat).join("-");
  }

  function showReferenceOdds() {
    const notice = document.getElementById("addedNotice");
    const context = currentContext();
    const combo = selectedNormalCombo();
    if (!notice || !context || !combo) return;
    const requestKey = `${context.date}:${context.venueCode}:${context.raceNo}:${context.betType}:${combo}`;
    if (requestKey === oddsRequestKey) return;
    oddsRequestKey = requestKey;
    oddsAbort?.abort?.();
    oddsAbort = new AbortController();
    fetch("https://mihicuoijitluvrufsoj.supabase.co/functions/v1/boatrace-odds", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(context), signal: oddsAbort.signal,
    }).then((response) => response.ok ? response.json() : null).then((payload) => {
      if (requestKey !== oddsRequestKey) return;
      const value = payload?.ok && payload.status === "available" ? payload.odds?.values?.[combo] : null;
      if (value == null || value === "") return;
      notice.className = "added-notice show reference-odds-preview";
      notice.textContent = `参考オッズ　${value}倍`;
    }).catch((error) => {
      if (error?.name !== "AbortError") console.warn("選択中の参考オッズ取得に失敗しました", error);
    });
  }

  function enhanceReviewStakeTools() {
    const tools = document.getElementById("reviewStakeTools");
    if (!tools || tools.dataset.mamoIncrementV1 === "1") return;
    tools.dataset.mamoIncrementV1 = "1";
    const title = tools.querySelector(":scope > span");
    if (title) title.textContent = "全ての買い目にまとめて追加";
    const buttons = [...tools.querySelectorAll("button[data-review-stake]")];
    const increments = [100, 1000, 10000];
    buttons.forEach((button, index) => {
      if (index >= increments.length) { button.remove(); return; }
      const value = increments[index];
      button.dataset.reviewStake = String(value);
      button.dataset.mamoStakeIncrement = String(value);
      button.textContent = `＋${value.toLocaleString("ja-JP")}B`;
      button.removeAttribute("onclick");
      button.setAttribute("aria-label", `全ての買い目に${value.toLocaleString("ja-JP")}B追加`);
    });
    const custom = tools.querySelector(".review-stake-custom");
    if (custom) {
      const input = custom.querySelector("input");
      if (input) input.placeholder = "直接入力";
    }
    if (!tools.querySelector("[data-mamo-clear-review]")) {
      const clear = document.createElement("button");
      clear.type = "button";
      clear.dataset.mamoClearReview = "1";
      clear.className = "mamo-clear-review";
      clear.textContent = "全買い目を削除";
      clear.setAttribute("aria-label", "全ての買い目をまとめて削除");
      tools.append(clear);
    }
  }

  function addStakeToAll(amount) {
    const inputs = [...document.querySelectorAll("[data-air-bet-review] ~ .betreceipt .betline-stake-input, .betreceipt[data-editable-cart='true'] .betline-stake-input")];
    inputs.forEach((input) => {
      const row = input.closest(".betline[data-cart-index]");
      const index = Number(row?.dataset?.cartIndex);
      if (!Number.isInteger(index)) return;
      const current = Math.max(0, Number(input.value) || 0);
      window.updateReviewLineStake?.(index, current + amount);
    });
  }

  function showEmptyReview() {
    const summary = document.getElementById("reviewBetSummary");
    if (summary) {
      summary.classList.remove("stake-required-notice");
      summary.innerHTML = "<b>0点 / 0B</b>";
    }
    const receipt = document.querySelector(".betreceipt[data-editable-cart='true']");
    if (receipt) {
      const meta = receipt.querySelector("#reviewBetReceiptMeta");
      if (meta) meta.textContent = "0点";
      const lines = receipt.querySelector(".betlines");
      if (lines) lines.innerHTML = '<div class="notice warn" data-mamo-empty-review="1">買い目はありません。</div>';
    }
    const input = document.getElementById("reviewAllStakeInput");
    if (input) input.value = "";
    const confirmButton = document.querySelector("#modal button[onclick='placeBet()']");
    if (confirmButton) confirmButton.disabled = true;
  }

  function clearAllReviewLines() {
    window.clearCart?.();
    if ((window.MAMO_AIR_BET_DRAFT?.status?.().count || 0) === 0) showEmptyReview();
  }

  function clearLastReviewLineWithoutClosing() {
    window.clearCart?.();
    if ((window.MAMO_AIR_BET_DRAFT?.status?.().count || 0) === 0) showEmptyReview();
  }

  function refresh() {
    ensureVenueBackButton();
    window.MAMO_AIR_BET_DRAFT?.refresh?.();
    enhanceReviewStakeTools();
  }

  document.addEventListener("click", (event) => {
    const target = event.target?.closest?.("button, a");
    if (!target) return;
    if (target.matches("#nav-race, .racechip, .venue-card-main, .venue-switch-card, [onclick^='jumpRace']")) refresh();
    if (target.matches("#builder .pick[id^='n-']")) queueMicrotask(showReferenceOdds);
    if (target.matches("[data-mamo-stake-increment]")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      addStakeToAll(Number(target.dataset.mamoStakeIncrement) || 0);
    }
    if (target.matches("[data-mamo-clear-review]")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      clearAllReviewLines();
    }
    if (target.matches(".betline-remove") && (window.MAMO_AIR_BET_DRAFT?.status?.().count || 0) === 1) {
      event.preventDefault();
      event.stopImmediatePropagation();
      clearLastReviewLineWithoutClosing();
    }
    if (target.matches("#reviewBetButton, [onclick='reviewBet()']")) setTimeout(enhanceReviewStakeTools, 0);
  }, true);

  const observer = new MutationObserver(() => enhanceReviewStakeTools());
  if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("mamo:air-bet-rendered", refresh);
  window.addEventListener("pageshow", refresh);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh, { once: true });
  else refresh();
  window.MAMO_AIR_BET_MULTI_ADD = Object.freeze({ refresh, showReferenceOdds, enhanceReviewStakeTools });
})();
