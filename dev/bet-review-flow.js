/* MAMO BOAT — AIR BET review flow v3
 * Current draft replaces stale purchase content by default.
 * Existing purchase content is appended only after an explicit "買い目を追加" action.
 */
(() => {
  "use strict";
  if (window.__MAMO_BET_REVIEW_FLOW_V3__) return;
  window.__MAMO_BET_REVIEW_FLOW_V3__ = true;

  const originalReviewBet = window.reviewBet;
  if (typeof originalReviewBet !== "function") return;

  const originalPickNormal = window.pickNormal;
  if (typeof originalPickNormal === "function") {
    window.pickNormal = (index, boat) => {
      const selectedButton = document.getElementById(`n-${index}-${boat}`);
      if (!selectedButton?.classList?.contains("sel")) {
        return originalPickNormal(index, boat);
      }

      const keepSelections = Array.from(document.querySelectorAll("#builder .rank"))
        .map((rank) => {
          const selected = rank.querySelector('[id^="n-"].sel');
          const match = selected?.id?.match(/^n-(\d+)-(\d+)$/);
          if (!match) return null;
          const selectedIndex = Number(match[1]);
          const selectedBoat = Number(match[2]);
          if (selectedIndex === Number(index) && selectedBoat === Number(boat)) return null;
          return { index: selectedIndex, boat: selectedBoat };
        })
        .filter(Boolean);

      // app.js の通常選択は null を直接セットするAPIを公開していないため、
      // 通常モードだけ安全に初期化し、残す選択を元の選択関数で復元する。
      if (typeof window.setMode === "function") {
        window.setMode("normal");
        keepSelections.forEach((selection) => {
          originalPickNormal(selection.index, selection.boat);
        });
        return;
      }

      return originalPickNormal(index, boat);
    };
  }

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

  function clearCommittedCartForReplacement() {
    const cart = document.getElementById("cart");
    const rows = Array.from(cart?.querySelectorAll?.(".cartrow") || []);
    if (!rows.length || typeof window.removeLine !== "function") return 0;
    for (let index = rows.length - 1; index >= 0; index -= 1) {
      window.removeLine(index);
    }
    return rows.length;
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

    if (builder.classList && builder.dataset) {
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
      const verticalMode = Boolean(pickerMode && ranks.length);

      builder.classList.remove("mamo-formation-matrix");
      builder.classList.toggle("mamo-selection-matrix", verticalMode);
      delete builder.dataset.mamoFormationColumns;
      builder.querySelector(".mamo-formation-matrix-guide")?.remove();
      ranks.forEach((rank) => {
        if (rank.dataset) delete rank.dataset.mamoFormationRank;
      });

      if (verticalMode) {
        builder.dataset.mamoPickerMode = pickerMode;
        builder.dataset.mamoPickerColumns = String(pickerMode === "box" ? 1 : ranks.length);
        ranks.forEach((rank, index) => {
          if (rank.dataset) rank.dataset.mamoPickerRank = String(index + 1);
        });

        if (!builder.querySelector(".mamo-selection-matrix-guide")) {
          const guide = document.createElement("div");
          guide.className = "mamo-selection-matrix-guide";
          if (pickerMode === "box") {
            guide.innerHTML = "<b>艇を縦に選択</b><span>BOXに含める艇を選びます。選んだ艇だけ色が付きます。</span>";
          } else if (ranks.length === 1) {
            guide.innerHTML = "<b>艇を縦に選択</b><span>候補の艇を選びます。選んだマスだけ色が付きます。</span>";
          } else if (pickerMode === "normal") {
            guide.innerHTML = "<b>候補列ごとに縦で選択</b><span>各列から1艇ずつ選びます。選んだマスだけ色が付きます。</span>";
          } else {
            guide.innerHTML = "<b>候補列ごとに縦で選択</b><span>各列から候補を選びます。選んだマスだけ色が付きます。</span>";
          }
          builder.insertBefore(guide, builder.firstChild);
        }
      } else {
        delete builder.dataset.mamoPickerMode;
        delete builder.dataset.mamoPickerColumns;
        builder.querySelector(".mamo-selection-matrix-guide")?.remove();
      }
    }

    const title = document.querySelector(".cart-title small");
    const titleCopy = "現在の選択を確認。追加は確認画面から行えます";
    if (title && title.textContent !== titleCopy) title.textContent = titleCopy;
  }

  let appendRequested = false;

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
      addMore.textContent = "買い目を追加";
      addMore.addEventListener("click", () => {
        appendRequested = true;
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
      guide.innerHTML = "<b>この内容でよければAIR BETを決定。</b><span>別の買い目を足す場合だけ「買い目を追加」へ。選び直した場合は現在の選択で購入内容を置き換えます。</span>";
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
        if (!appendRequested) clearCommittedCartForReplacement();
        await Promise.resolve(addCurrentDraft());
        appendRequested = false;
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
  style.id = "mamoBetReviewFlowStyleV3";
  style.textContent = `
    #builder button[hidden]{display:none!important}
    .mamo-review-selection-hint{color:#b4232d!important;font-weight:900!important}
    .mamo-air-review-guide{margin:10px 0 12px;padding:11px 12px;border:1px solid #d7e2e4;border-left:4px solid #0a948c;border-radius:10px;background:#f5fbfa;color:#17333d}
    .mamo-air-review-guide b,.mamo-air-review-guide span{display:block}
    .mamo-air-review-guide b{font-size:13px;margin-bottom:3px}.mamo-air-review-guide span{font-size:10px;color:#687b82;line-height:1.5}
    .mamo-air-review-add{margin-top:12px!important;background:#fff!important;color:#0b2a42!important;border:1px solid #aebfc3!important}
    .mamo-air-review-confirm{margin-top:8px!important;font-size:16px!important}

    /* All AIR BET modes share one vertical selection language. */
    #builder.mamo-selection-matrix{display:grid;gap:8px;margin-top:10px;align-items:start}
    #builder.mamo-selection-matrix[data-mamo-picker-columns="1"]{grid-template-columns:1fr}
    #builder.mamo-selection-matrix[data-mamo-picker-columns="2"]{grid-template-columns:repeat(2,minmax(0,1fr))}
    #builder.mamo-selection-matrix[data-mamo-picker-columns="3"]{grid-template-columns:repeat(3,minmax(0,1fr))}
    #builder.mamo-selection-matrix[data-mamo-picker-columns="1"]>.rank{width:min(430px,100%);justify-self:center}
    #builder.mamo-selection-matrix .mamo-selection-matrix-guide{grid-column:1/-1;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:11px 12px;border:1px solid #d6e0e6;border-left:5px solid #dc2029;border-radius:12px;background:#f7f9fc;color:#082b4a}
    #builder.mamo-selection-matrix .mamo-selection-matrix-guide b{flex:0 0 auto;font-size:12px;font-weight:1000}
    #builder.mamo-selection-matrix .mamo-selection-matrix-guide span{color:#61778a;font-size:9px;font-weight:750;line-height:1.45;text-align:right}
    #builder.mamo-selection-matrix>.rank{min-width:0;margin:0}
    #builder.mamo-selection-matrix>.rank h3{display:grid;place-items:center;min-height:40px;margin:0 0 7px;padding:7px 4px;border:1px solid #cfdbe2;border-radius:11px;background:#eef3f7;color:#082b4a;font-size:11px;font-weight:1000}
    #builder.mamo-selection-matrix>.rank[data-mamo-picker-rank="1"] h3{border-top:4px solid #dc2029}
    #builder.mamo-selection-matrix>.rank[data-mamo-picker-rank="2"] h3{border-top:4px solid #082b4a}
    #builder.mamo-selection-matrix>.rank[data-mamo-picker-rank="3"] h3{border-top:4px solid #3a6792}
    #builder.mamo-selection-matrix>.rank .betgrid{display:grid;grid-template-columns:1fr;gap:6px}
    #builder.mamo-selection-matrix>.rank .pick{--mamo-boat-accent:#cad4da;position:relative;min-width:0;min-height:49px;border:1px solid #cad7de!important;border-radius:11px;background:#fff!important;color:#082b4a!important;outline:0!important;box-shadow:inset 4px 0 var(--mamo-boat-accent)!important;transform:none!important;font-size:17px;font-weight:1000;transition:background .14s ease,color .14s ease,border-color .14s ease,box-shadow .14s ease,opacity .14s ease}
    #builder.mamo-selection-matrix>.rank .pick.b1{--mamo-boat-accent:#d6dade}
    #builder.mamo-selection-matrix>.rank .pick.b2{--mamo-boat-accent:#33383d}
    #builder.mamo-selection-matrix>.rank .pick.b3{--mamo-boat-accent:#d74449}
    #builder.mamo-selection-matrix>.rank .pick.b4{--mamo-boat-accent:#376ed0}
    #builder.mamo-selection-matrix>.rank .pick.b5{--mamo-boat-accent:#f0cf40}
    #builder.mamo-selection-matrix>.rank .pick.b6{--mamo-boat-accent:#41a56b}
    #builder.mamo-selection-matrix>.rank .pick.sel::after{content:"✓";position:absolute;top:5px;right:7px;font-size:10px;font-weight:1000}
    #builder.mamo-selection-matrix>.rank[data-mamo-picker-rank="1"] .pick.sel{border-color:#dc2029!important;background:#dc2029!important;color:#fff!important;box-shadow:inset 4px 0 rgba(255,255,255,.9),0 4px 11px rgba(220,32,41,.22)!important}
    #builder.mamo-selection-matrix>.rank[data-mamo-picker-rank="2"] .pick.sel{border-color:#082b4a!important;background:#082b4a!important;color:#fff!important;box-shadow:inset 4px 0 rgba(255,255,255,.85),0 4px 11px rgba(8,43,74,.18)!important}
    #builder.mamo-selection-matrix>.rank[data-mamo-picker-rank="3"] .pick.sel{border-color:#3a6792!important;background:#3a6792!important;color:#fff!important;box-shadow:inset 4px 0 rgba(255,255,255,.85),0 4px 11px rgba(58,103,146,.18)!important}
    #builder.mamo-selection-matrix[data-mamo-picker-mode="box"]>.rank .pick.sel{border-color:#082b4a!important;background:#082b4a!important;color:#fff!important;box-shadow:inset 5px 0 #dc2029,0 4px 11px rgba(8,43,74,.18)!important}
    #builder.mamo-selection-matrix>.btn{grid-column:1/-1}
    @media(max-width:390px){
      #builder.mamo-selection-matrix{gap:6px}
      #builder.mamo-selection-matrix .mamo-selection-matrix-guide{display:block;padding:10px}
      #builder.mamo-selection-matrix .mamo-selection-matrix-guide span{display:block;margin-top:3px;text-align:left}
      #builder.mamo-selection-matrix>.rank h3{min-height:37px;font-size:10px}
      #builder.mamo-selection-matrix>.rank .pick{min-height:46px;font-size:16px}
    }
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
