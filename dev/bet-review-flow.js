/* MAMO BOAT — AIR BET review flow v2
 * The builder no longer asks users to press an intermediate "買い目を追加" button.
 * Selected draft -> AIR BETを確認 -> 決定 / 買い目を追加・修正.
 */
(() => {
  "use strict";
  if (window.__MAMO_BET_REVIEW_FLOW_V2__) return;
  window.__MAMO_BET_REVIEW_FLOW_V2__ = true;

  const originalReviewBet = window.reviewBet;
  if (typeof originalReviewBet !== "function") return;

  function cartHasItems() {
    const count = document.getElementById("cartCount")?.textContent || "";
    if (/\b[1-9]\d*\s*点/.test(count)) return true;
    const cart = document.getElementById("cart");
    return !!cart?.querySelector?.(".cartrow");
  }

  function activeModeLabel() {
    return String(document.querySelector("#modeTabs .active, .bet-tabs .active")?.textContent || "通常").trim();
  }

  function currentDraftIsComplete() {
    const builder = document.getElementById("builder");
    if (!builder) return false;
    const label = activeModeLabel();

    if (/BOX/i.test(label)) {
      const heading = builder.querySelector(".rank h3")?.textContent || "";
      const required = Number(String(heading).match(/(\d+)艇以上/)?.[1] || 2);
      return builder.querySelectorAll(".pick.sel").length >= required;
    }

    const ranks = [...builder.querySelectorAll(".rank")];
    if (!ranks.length) return false;
    return ranks.every((rank) => rank.querySelector(".pick.sel"));
  }

  function addCurrentDraft() {
    if (!currentDraftIsComplete()) return false;
    const label = activeModeLabel();
    if (/BOX/i.test(label) && typeof window.addBox === "function") {
      return window.addBox();
    }
    if (/フォーメーション/.test(label) && typeof window.addForm === "function") {
      return window.addForm();
    }
    if (typeof window.addNormal === "function") {
      return window.addNormal();
    }
    return false;
  }

  function showSelectionHint(message = "買い目を選んでから「AIR BETを確認」を押してください。") {
    const notice = document.getElementById("addedNotice") || document.getElementById("cartSum");
    if (notice) {
      notice.textContent = message;
      notice.classList.add("mamo-review-selection-hint");
    }
  }

  function enhanceBuilder() {
    const builder = document.getElementById("builder");
    if (!builder) return;
    [...builder.querySelectorAll("button")].forEach((button) => {
      const text = String(button.textContent || "").trim();
      if (/^(買い目を追加|BOXを追加|フォーメーションを追加)$/.test(text)) {
        button.hidden = true;
        button.setAttribute("aria-hidden", "true");
        button.tabIndex = -1;
      }
    });

    const title = document.querySelector(".cart-title small");
    const titleCopy = "確認画面から、追加・修正できます";
    // This function runs from a child-list observer. An unconditional
    // textContent assignment observes its own write and can starve Safari's
    // event loop forever as soon as the race screen is rendered.
    if (title && title.textContent !== titleCopy) title.textContent = titleCopy;
  }

  function enhanceReviewModal() {
    const modal = document.getElementById("modal");
    if (!modal) return;
    const confirm = [...modal.querySelectorAll("button")].find((button) => /AIR BETを確定する|AIR BETを決定/.test(button.textContent || ""));
    if (!confirm) return;

    confirm.textContent = "AIR BETを決定";
    confirm.classList.add("mamo-air-review-confirm");

    if (!modal.querySelector("[data-mamo-add-more]")) {
      const addMore = document.createElement("button");
      addMore.type = "button";
      addMore.dataset.mamoAddMore = "1";
      addMore.className = "btn secondary full mamo-air-review-add";
      addMore.textContent = "買い目を追加・修正";
      addMore.addEventListener("click", () => {
        window.closeModal?.();
        setTimeout(() => {
          enhanceBuilder();
          document.getElementById("builder")?.scrollIntoView?.({ block: "center", behavior: "smooth" });
        }, 50);
      });
      confirm.insertAdjacentElement("beforebegin", addMore);
    }

    if (!modal.querySelector("[data-mamo-review-guide]")) {
      const guide = document.createElement("div");
      guide.dataset.mamoReviewGuide = "1";
      guide.className = "mamo-air-review-guide";
      guide.innerHTML = "<b>この内容でよければAIR BETを決定。</b><span>もう1点追加したい、または内容を直したい場合は「買い目を追加・修正」へ。</span>";
      const purchaseHeading = [...modal.querySelectorAll("h3")].find((node) => /購入内容/.test(node.textContent || ""));
      (purchaseHeading || confirm).insertAdjacentElement("beforebegin", guide);
    }
  }

  let reviewInFlight = false;
  window.reviewBet = async () => {
    if (reviewInFlight) return;
    const reviewButton = document.querySelector('button[onclick="reviewBet()"]');
    const originalLabel = reviewButton?.textContent || "AIR BETを確認";
    reviewInFlight = true;
    if (reviewButton) {
      reviewButton.disabled = true;
      reviewButton.textContent = "確認中…";
    }

    try {
      if (currentDraftIsComplete()) {
        await Promise.resolve(addCurrentDraft());
      } else if (!cartHasItems()) {
        showSelectionHint();
        return;
      }

      if (!cartHasItems()) {
        showSelectionHint("買い目を追加できませんでした。通信状態を確認して、もう一度お試しください。");
        return;
      }
      originalReviewBet();
      setTimeout(enhanceReviewModal, 0);
    } catch (error) {
      console.error("AIR BET確認画面を開けませんでした", error);
      showSelectionHint("確認画面を開けませんでした。もう一度お試しください。");
    } finally {
      reviewInFlight = false;
      if (reviewButton) {
        reviewButton.disabled = false;
        reviewButton.textContent = originalLabel;
      }
    }
  };

  const style = document.createElement("style");
  style.id = "mamoBetReviewFlowStyleV2";
  style.textContent = `
    #builder button[hidden]{display:none!important}
    .mamo-review-selection-hint{color:#b4232d!important;font-weight:900!important}
    .mamo-air-review-guide{margin:10px 0 12px;padding:11px 12px;border:1px solid #d7e2e4;border-left:4px solid #0a948c;border-radius:10px;background:#f5fbfa;color:#17333d}
    .mamo-air-review-guide b,.mamo-air-review-guide span{display:block}
    .mamo-air-review-guide b{font-size:13px;margin-bottom:3px}.mamo-air-review-guide span{font-size:10px;color:#687b82;line-height:1.5}
    .mamo-air-review-add{margin-top:12px!important;background:#fff!important;color:#0b2a42!important;border:1px solid #aebfc3!important}
    .mamo-air-review-confirm{margin-top:8px!important;font-size:16px!important}
  `;
  document.head.appendChild(style);

  function boot() {
    enhanceBuilder();
    const raceView = document.getElementById("raceView");
    if (raceView) new MutationObserver(enhanceBuilder).observe(raceView, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
