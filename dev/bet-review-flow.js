/* MAMO BOAT — AIR BET review flow v1
 * First ticket can move straight from selection -> review.
 * Review modal exposes an explicit confirm vs add/modify choice.
 */
(() => {
  "use strict";
  if (window.__MAMO_BET_REVIEW_FLOW_V1__) return;
  window.__MAMO_BET_REVIEW_FLOW_V1__ = true;

  const originalReviewBet = window.reviewBet;
  if (typeof originalReviewBet !== "function") return;

  function cartIsEmpty() {
    const count = document.getElementById("cartCount")?.textContent || "";
    if (/^\s*0\s*点/.test(count)) return true;
    const cart = document.getElementById("cart");
    return !cart || !String(cart.textContent || "").trim();
  }

  function activeModeLabel() {
    return String(document.querySelector("#modeTabs .active, .bet-tabs .active")?.textContent || "通常").trim();
  }

  function addCurrentDraftIfFirstTicket() {
    if (!cartIsEmpty()) return;
    const label = activeModeLabel();
    if (/BOX/i.test(label) && typeof window.addBox === "function") {
      window.addBox();
      return;
    }
    if (/フォーメーション/.test(label) && typeof window.addForm === "function") {
      window.addForm();
      return;
    }
    if (typeof window.addNormal === "function") window.addNormal();
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
          const target = document.querySelector("#raceView .betdesk, #builder");
          target?.scrollIntoView?.({ block: "center", behavior: "smooth" });
        }, 80);
      });
      confirm.insertAdjacentElement("beforebegin", addMore);
    }

    if (!modal.querySelector("[data-mamo-review-guide]")) {
      const guide = document.createElement("div");
      guide.dataset.mamoReviewGuide = "1";
      guide.className = "mamo-air-review-guide";
      guide.innerHTML = "<b>この内容でよければ決定。</b><span>追加・変更したい場合は下のボタンから戻れます。</span>";
      const purchaseHeading = [...modal.querySelectorAll("h3")].find((node) => /購入内容/.test(node.textContent || ""));
      (purchaseHeading || confirm).insertAdjacentElement(purchaseHeading ? "beforebegin" : "beforebegin", guide);
    }
  }

  window.reviewBet = () => {
    addCurrentDraftIfFirstTicket();
    originalReviewBet();
    setTimeout(enhanceReviewModal, 0);
  };

  const style = document.createElement("style");
  style.id = "mamoBetReviewFlowStyle";
  style.textContent = `
    .mamo-air-review-guide{margin:10px 0 12px;padding:11px 12px;border:1px solid #d7e2e4;border-left:4px solid #0a948c;border-radius:10px;background:#f5fbfa;color:#17333d}
    .mamo-air-review-guide b,.mamo-air-review-guide span{display:block}
    .mamo-air-review-guide b{font-size:13px;margin-bottom:3px}.mamo-air-review-guide span{font-size:10px;color:#687b82;line-height:1.5}
    .mamo-air-review-add{margin-top:12px!important;background:#fff!important;color:#0b2a42!important;border:1px solid #aebfc3!important}
    .mamo-air-review-confirm{margin-top:8px!important;font-size:16px!important}
  `;
  document.head.appendChild(style);
})();
