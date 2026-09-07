/* MAMO BOAT — AIR BET multi-add flow v1
 * Keep users on the betting screen while they add multiple selections.
 * Final review happens only after the cart is built.
 */
(() => {
  "use strict";
  if (window.__MAMO_AIR_BET_MULTI_ADD_V1__) return;
  window.__MAMO_AIR_BET_MULTI_ADD_V1__ = true;

  const previousReviewBet = window.reviewBet;
  if (typeof previousReviewBet !== "function") return;

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

  function cartCount() {
    const text = String(document.getElementById("cartCount")?.textContent || "");
    const match = text.match(/(\d+)\s*点/);
    if (match) return Number(match[1]) || 0;
    return document.querySelectorAll("#cart .cartrow").length;
  }

  function addCurrentDraft() {
    if (!currentDraftIsComplete()) return false;
    const label = activeModeLabel();
    if (/BOX/i.test(label) && typeof window.addBox === "function") return window.addBox();
    if (/フォーメーション/.test(label) && typeof window.addForm === "function") return window.addForm();
    if (typeof window.addNormal === "function") return window.addNormal();
    return false;
  }

  function notice(message, kind = "good") {
    const node = document.getElementById("addedNotice") || document.getElementById("cartSum");
    if (!node) return;
    node.textContent = message;
    node.classList.remove("mamo-multi-good", "mamo-multi-warn");
    node.classList.add(kind === "warn" ? "mamo-multi-warn" : "mamo-multi-good");
  }

  function ensureFinalButton() {
    const betdesk = document.querySelector("#raceView .betdesk");
    const cartSum = document.getElementById("cartSum");
    if (!betdesk || !cartSum) return;

    let button = betdesk.querySelector("[data-mamo-final-review]");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.dataset.mamoFinalReview = "1";
      button.className = "btn primary full mamo-final-review";
      button.addEventListener("click", () => {
        if (!cartCount()) {
          notice("先に買い目を1点以上追加してください。", "warn");
          return;
        }
        previousReviewBet();
      });
      cartSum.insertAdjacentElement("afterend", button);
    }

    const count = cartCount();
    button.textContent = count > 0 ? `金額・オッズを確認（${count}点）` : "金額・オッズを確認";
    button.disabled = count <= 0;
  }

  function enhance() {
    const betdesk = document.querySelector("#raceView .betdesk");
    if (!betdesk) return;

    const reviewButton = betdesk.querySelector('button[onclick="reviewBet()"]');
    if (reviewButton) {
      reviewButton.textContent = "この買い目を追加";
      reviewButton.classList.add("mamo-add-current-bet");
    }

    const title = betdesk.querySelector(".cart-title small");
    if (title) title.textContent = "買い目はこの画面で何点でも追加できます";

    ensureFinalButton();
  }

  let adding = false;
  window.reviewBet = async () => {
    if (adding) return;
    if (!currentDraftIsComplete()) {
      if (cartCount() > 0) {
        notice("現在の選択が未完成です。選択を完成させるか、そのまま下の「金額・オッズを確認」へ進めます。", "warn");
      } else {
        notice("買い目を完成させてから追加してください。", "warn");
      }
      return;
    }

    adding = true;
    const button = document.querySelector("#raceView .mamo-add-current-bet");
    const old = button?.textContent || "この買い目を追加";
    if (button) {
      button.disabled = true;
      button.textContent = "追加中…";
    }

    try {
      const before = cartCount();
      await Promise.resolve(addCurrentDraft());
      const after = cartCount();
      if (after > before) {
        notice(`買い目を追加しました。現在 ${after}点です。続けて別の買い目を選べます。`);
      } else {
        notice("同じ買い目がすでに入っているか、追加できませんでした。", "warn");
      }
      enhance();
    } catch (error) {
      console.error("AIR BET買い目追加に失敗しました", error);
      notice("買い目を追加できませんでした。もう一度お試しください。", "warn");
    } finally {
      adding = false;
      if (button) {
        button.disabled = false;
        button.textContent = old;
      }
      ensureFinalButton();
    }
  };

  const style = document.createElement("style");
  style.id = "mamoAirBetMultiAddStyleV1";
  style.textContent = `
    .mamo-add-current-bet{margin-top:10px!important;background:#0b3047!important;color:#fff!important;box-shadow:0 4px 0 #d8a62e!important;font-size:15px!important}
    .mamo-final-review{margin-top:10px!important;min-height:52px!important;background:#e91d2b!important;color:#fff!important;box-shadow:0 4px 0 #9d111a!important;font-size:15px!important}
    .mamo-final-review:disabled{opacity:.42!important;box-shadow:none!important}
    .mamo-multi-good,.mamo-multi-warn{display:block!important;margin-top:8px!important;padding:10px 11px!important;border-radius:9px!important;font-size:10px!important;font-weight:900!important;line-height:1.5!important}
    .mamo-multi-good{border:1px solid #b9ddd8!important;background:#eefaf8!important;color:#0b625e!important}
    .mamo-multi-warn{border:1px solid #f0c7c9!important;background:#fff5f6!important;color:#a51f28!important}
  `;
  document.head.appendChild(style);

  document.addEventListener("click", (event) => {
    if (event.target?.closest?.("#nav-race, .racechip, .bettypebtn, #modeTabs button, .xbtn, .cart-tools button")) {
      setTimeout(enhance, 0);
    }
  }, false);
  window.addEventListener("mamo:air-bet-rendered", enhance);
  window.addEventListener("pageshow", () => {
    if (document.body?.dataset?.screen === "race") enhance();
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enhance, { once:true });
  else enhance();

  window.MAMO_AIR_BET_MULTI_ADD = Object.freeze({ refresh: enhance });
})();
