/* MAMO BOAT — AIR BET review flow v5
 * Compact race/bet selection layout for iPhone Safari/PWA.
 * Keeps AIR BET logic intact while reducing vertical travel and integrating racer info.
 */
(() => {
  "use strict";
  if (window.__MAMO_BET_REVIEW_FLOW_V5__) return;
  window.__MAMO_BET_REVIEW_FLOW_V5__ = true;

  const originalReviewBet = window.reviewBet;
  if (typeof originalReviewBet !== "function") return;
  const AIR_BET_RENDERED_EVENT = "mamo:air-bet-rendered";
  const escapeHtml = (value) => String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

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
    if (/BOX/i.test(label) && typeof window.addBox === "function") return window.addBox();
    if (/フォーメーション/.test(label) && typeof window.addForm === "function") return window.addForm();
    if (typeof window.addNormal === "function") return window.addNormal();
    return false;
  }

  function clearCommittedCartForReplacement() {
    const cart = document.getElementById("cart");
    const rows = Array.from(cart?.querySelectorAll?.(".cartrow") || []);
    if (!rows.length || typeof window.removeLine !== "function") return 0;
    for (let index = rows.length - 1; index >= 0; index -= 1) window.removeLine(index);
    return rows.length;
  }

  function showSelectionHint(message = "買い目を選んでから「この買い目で次へ進む」を押してください。") {
    const notice = document.getElementById("addedNotice") || document.getElementById("cartSum");
    if (!notice) return;
    notice.textContent = message;
    notice.classList.add("mamo-review-selection-hint");
  }

  function racerRows() {
    return Array.from(document.querySelectorAll("#raceView .boats .boat")).map((item) => {
      const number = Number(item.querySelector(".num")?.textContent?.trim());
      const name = String(item.querySelector(":scope > div:nth-child(2) > b")?.textContent || "").trim();
      const href = String(item.getAttribute("href") || "").trim();
      const racerClass = String(item.dataset.racerClass || "").trim();
      const motorNumber = String(item.dataset.motorNumber || "").trim();
      const boatPart = String(item.dataset.boatPart || "").trim();
      return { number, name, href, racerClass, motorNumber, boatPart };
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
      return `
      <div class="mamo-racer-row">
        <span class="mamo-lane b${item.number}">${item.number}</span>
        <span class="mamo-racer-copy"><span class="mamo-racer-identity"><b>${escapeHtml(item.name)}</b><small class="mamo-racer-meta">${escapeHtml(meta)}</small></span>${item.href ? `<a class="mamo-official-button" href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">公式情報 ↗</a>` : ""}</span>
      </div>`;
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

      builder.querySelectorAll(".mamo-selection-matrix-guide,.mamo-formation-matrix-guide").forEach((node) => node.remove());

      [...builder.querySelectorAll("button")].forEach((button) => {
        const text = String(button.textContent || "").trim();
        if (/^(買い目を追加|BOXを追加|フォーメーションを追加)$/.test(text)) {
          if (!button.hidden) button.hidden = true;
          if (button.getAttribute("aria-hidden") !== "true") button.setAttribute("aria-hidden", "true");
          if (button.tabIndex !== -1) button.tabIndex = -1;
        }
      });

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

      builder.classList.remove("mamo-formation-matrix");
      builder.classList.toggle("mamo-selection-matrix", Boolean(pickerMode && ranks.length));
      delete builder.dataset.mamoFormationColumns;

      ranks.forEach((rank, index) => {
        if (!rank.dataset) return;
        delete rank.dataset.mamoFormationRank;
        rank.dataset.mamoPickerRank = String(index + 1);
      });

      if (pickerMode && ranks.length) {
        builder.dataset.mamoPickerMode = pickerMode;
        builder.dataset.mamoPickerColumns = String(pickerMode === "box" ? 1 : ranks.length);
        ensureRacerColumn(builder);
      } else {
        delete builder.dataset.mamoPickerMode;
        delete builder.dataset.mamoPickerColumns;
        builder.querySelector(":scope > .mamo-racer-list")?.remove();
      }

      const reviewButton = betdesk?.querySelector('button[onclick="reviewBet()"]');
      if (reviewButton) {
        if (reviewButton.textContent !== "この買い目で次へ進む") {
          reviewButton.textContent = "この買い目で次へ進む";
        }
        reviewButton.classList.add("mamo-next-bet");
      }

      const title = betdesk?.querySelector(".cart-title small");
      const titleCopy = "現在の選択を確認。追加は確認画面から行えます";
      if (title && title.textContent !== titleCopy) title.textContent = titleCopy;
    } finally {
      enhancing = false;
    }
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
    const originalLabel = reviewButton?.textContent || "この買い目で次へ進む";
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
  style.id = "mamoBetReviewFlowStyleV6";
  style.textContent = `
    #builder button[hidden]{display:none!important}
    .mamo-review-selection-hint{display:block!important;margin:8px 0!important;padding:9px 10px!important;color:#b4232d!important;font-weight:900!important;background:#fff5f5!important;border-radius:10px!important}
    .mamo-air-review-guide{margin:10px 0 12px;padding:11px 12px;border:1px solid #d7e2e4;border-left:4px solid #0a948c;border-radius:10px;background:#f5fbfa;color:#17333d}
    .mamo-air-review-guide b,.mamo-air-review-guide span{display:block}
    .mamo-air-review-guide b{font-size:13px;margin-bottom:3px}.mamo-air-review-guide span{font-size:10px;color:#687b82;line-height:1.5}
    .mamo-air-review-add{margin-top:12px!important;background:#fff!important;color:#0b2a42!important;border:1px solid #aebfc3!important}
    .mamo-air-review-confirm{margin-top:8px!important;font-size:16px!important}

    /* Compact order: mode -> bet type -> short guide -> integrated racer picker. */
    .betdesk #modeTabs{margin:0 0 10px!important;min-height:48px!important}
    .betdesk #modeTabs .bet-tab{min-height:48px!important;font-size:14px!important;font-weight:950!important}
    .betdesk .bettypebar{margin:0 0 9px!important;gap:7px!important}
    .betdesk .bettypebar .bettypebtn{min-height:46px!important;padding:8px 6px!important;font-size:12px!important;font-weight:950!important}
    .betdesk #betGuide{margin:0 0 8px!important;padding:8px 10px!important;background:#f3f8fb!important;border:1px solid #dce7ec!important}
    .betdesk #betGuide>div:first-child{margin:0!important;font-size:11px!important;line-height:1.45!important}
    .betdesk .odds-snapshot,.betdesk .odds-caution,.betdesk .odds-now{display:none!important}
    .betdesk .cart-title,.betdesk #cartSum{display:none!important}
    #raceView .betdesk #cart{display:grid!important;gap:7px!important;margin-top:8px!important}
    #raceView .betdesk #cart>.muted{display:none!important}
    #raceView .betdesk #cart .cartrow{display:grid!important;grid-template-columns:48px minmax(54px,1fr) minmax(92px,1.15fr) 52px!important;gap:6px!important;align-items:center!important;padding:7px!important;border:1px solid #d8e2e5!important;border-radius:10px!important;background:#fff!important}
    #raceView .betdesk #cart .cartrow.stake-missing{border-color:#d8a62e!important;background:#fffdf6!important}
    #raceView .betdesk #cart .cart-combo{font-size:14px!important;color:#082b4a!important;text-align:center!important}
    #raceView .betdesk #cart .cart-stake{min-width:0!important;border:1px solid #b9cbd2!important;border-radius:8px!important;overflow:hidden!important}
    #raceView .betdesk #cart .cart-stake-input{min-width:0!important;min-height:42px!important;padding:6px 2px 6px 6px!important;border:0!important;background:#fff!important;color:#082b4a!important;font-size:16px!important;font-weight:1000!important;text-align:right!important}
    #raceView .betdesk #cart .cart-stake>span{padding-right:6px!important;color:#657886!important;font-size:9px!important}
    #raceView .betdesk #cart .cart-odds,#raceView .betdesk #cart .odds-input{display:none!important}
    #raceView .betdesk #cart .xbtn{width:100%!important;min-height:42px!important;height:auto!important;padding:5px 2px!important;border:1px solid #efc3bf!important;border-radius:8px!important;background:#fff7f6!important;color:#9c3d36!important;font-size:9px!important;font-weight:1000!important}
    #raceView .betdesk #cartTools{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:7px!important;margin:8px 0 0!important;overflow:visible!important}
    #raceView .betdesk #cartTools>span{grid-column:1/-1!important;width:auto!important;color:#657886!important;font-size:10px!important}
    #raceView .betdesk #cartTools>#cartStakeSummary.is-required{padding:8px 10px!important;border-left:4px solid #d8a62e!important;border-radius:7px!important;background:#fff9e8!important;color:#082b4a!important;font-size:11px!important}
    #raceView .betdesk #cartTools>button{min-width:0!important;min-height:42px!important;padding:6px 3px!important;border-radius:9px!important;font-size:11px!important}
    #raceView .betdesk #cartTools>button[aria-pressed="true"]{border-color:#082b4a!important;background:#082b4a!important;color:#fff!important;box-shadow:0 3px 0 #d8a62e!important}
    #raceView .betdesk #cartTools>.cart-custom-stake{grid-column:1/-1!important;display:grid!important;gap:5px!important;padding:8px!important;border:1px solid #d8e2e5!important;border-radius:10px!important;background:#f7fafb!important}
    #raceView .betdesk #cartTools>.cart-custom-stake>label{font-size:9px!important}
    #raceView .betdesk #cartTools>.cart-custom-stake>div{display:grid!important;grid-template-columns:minmax(0,1fr) auto minmax(92px,.75fr)!important;gap:6px!important}
    #raceView .betdesk #cartTools>.cart-custom-stake input{min-width:0!important;min-height:42px!important;font-size:16px!important}
    #raceView .betdesk #cartTools>.cart-custom-stake button{min-width:92px!important;min-height:42px!important;border:0!important;border-radius:8px!important;background:#0b8f88!important;color:#fff!important;font-size:10px!important;font-weight:1000!important}
    #raceView .betdesk #cartTools>.clear{grid-column:1/-1!important;min-height:42px!important;background:#fff7f6!important;color:#9c3d36!important;border-color:#efc3bf!important}
    .betdesk #addedNotice:not(.show):not(.duplicate):not(.mamo-review-selection-hint){display:none!important}
    .betdesk .mamo-next-bet{margin-top:10px!important;min-height:56px!important;border-radius:14px!important;background:#e61f2a!important;color:#fff!important;font-size:16px!important;font-weight:1000!important;box-shadow:0 5px 0 #9f1720!important}

    /* One integrated table: racer + 1st/2nd/3rd columns. */
    #builder.mamo-selection-matrix{display:grid!important;gap:6px!important;margin-top:0!important;align-items:start!important}
    #builder.mamo-selection-matrix[data-mamo-has-racers="true"][data-mamo-picker-columns="1"]{grid-template-columns:minmax(142px,1.55fr) minmax(86px,1fr)!important}
    #builder.mamo-selection-matrix[data-mamo-has-racers="true"][data-mamo-picker-columns="2"]{grid-template-columns:minmax(126px,1.45fr) repeat(2,minmax(70px,1fr))!important}
    #builder.mamo-selection-matrix[data-mamo-has-racers="true"][data-mamo-picker-columns="3"]{grid-template-columns:minmax(120px,1.5fr) repeat(3,minmax(58px,1fr))!important}
    #builder.mamo-selection-matrix[data-mamo-has-racers="false"][data-mamo-picker-columns="1"]{grid-template-columns:1fr!important}
    #builder.mamo-selection-matrix[data-mamo-has-racers="false"][data-mamo-picker-columns="2"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}
    #builder.mamo-selection-matrix[data-mamo-has-racers="false"][data-mamo-picker-columns="3"]{grid-template-columns:repeat(3,minmax(0,1fr))!important}
    #builder.mamo-selection-matrix .mamo-selection-matrix-guide,#builder.mamo-selection-matrix .mamo-formation-matrix-guide{display:none!important}
    #builder.mamo-selection-matrix>.rank{min-width:0!important;margin:0!important;width:auto!important}
    #builder.mamo-selection-matrix>.rank h3,.mamo-racer-head{display:grid!important;place-items:center!important;min-height:40px!important;margin:0 0 6px!important;padding:6px 3px!important;border:1px solid #cfdbe2!important;border-radius:9px!important;background:#eef3f7!important;color:#082b4a!important;font-size:10px!important;font-weight:1000!important}
    #builder.mamo-selection-matrix>.rank[data-mamo-picker-rank="1"] h3{border-top:4px solid #dc2029!important}
    #builder.mamo-selection-matrix>.rank[data-mamo-picker-rank="2"] h3{border-top:4px solid #082b4a!important}
    #builder.mamo-selection-matrix>.rank[data-mamo-picker-rank="3"] h3{border-top:4px solid #3a6792!important}
    #builder.mamo-selection-matrix>.rank .betgrid,.mamo-racer-rows{display:grid!important;grid-template-columns:1fr!important;gap:6px!important}
    #builder.mamo-selection-matrix>.rank .pick{--mamo-boat-accent:#cad4da;position:relative!important;min-width:0!important;min-height:55px!important;padding:6px 2px!important;border:1px solid #cad7de!important;border-radius:9px!important;background:#fff!important;color:#082b4a!important;outline:0!important;box-shadow:inset 4px 0 var(--mamo-boat-accent)!important;transform:none!important;font-size:17px!important;font-weight:1000!important;transition:background .14s ease,color .14s ease,border-color .14s ease,box-shadow .14s ease,opacity .14s ease!important}
    #builder.mamo-selection-matrix>.rank .pick.b1{--mamo-boat-accent:#d6dade}
    #builder.mamo-selection-matrix>.rank .pick.b2{--mamo-boat-accent:#33383d}
    #builder.mamo-selection-matrix>.rank .pick.b3{--mamo-boat-accent:#d74449}
    #builder.mamo-selection-matrix>.rank .pick.b4{--mamo-boat-accent:#376ed0}
    #builder.mamo-selection-matrix>.rank .pick.b5{--mamo-boat-accent:#f0cf40}
    #builder.mamo-selection-matrix>.rank .pick.b6{--mamo-boat-accent:#41a56b}
    #builder.mamo-selection-matrix>.rank .pick.sel::after{content:"✓";position:absolute;top:4px;right:6px;font-size:9px;font-weight:1000}
    #builder.mamo-selection-matrix>.rank[data-mamo-picker-rank="1"] .pick.sel{border-color:#dc2029!important;background:#dc2029!important;color:#fff!important;box-shadow:inset 4px 0 rgba(255,255,255,.9),0 3px 9px rgba(220,32,41,.2)!important}
    #builder.mamo-selection-matrix>.rank[data-mamo-picker-rank="2"] .pick.sel{border-color:#082b4a!important;background:#082b4a!important;color:#fff!important;box-shadow:inset 4px 0 rgba(255,255,255,.85),0 3px 9px rgba(8,43,74,.17)!important}
    #builder.mamo-selection-matrix>.rank[data-mamo-picker-rank="3"] .pick.sel{border-color:#3a6792!important;background:#3a6792!important;color:#fff!important;box-shadow:inset 4px 0 rgba(255,255,255,.85),0 3px 9px rgba(58,103,146,.17)!important}
    #builder.mamo-selection-matrix[data-mamo-picker-mode="box"]>.rank .pick.sel{border-color:#082b4a!important;background:#082b4a!important;color:#fff!important;box-shadow:inset 5px 0 #dc2029,0 3px 9px rgba(8,43,74,.17)!important}
    #builder.mamo-selection-matrix>.btn{grid-column:1/-1!important}

    .mamo-racer-list{min-width:0!important;margin:0!important}
    .mamo-racer-head{border-top:4px solid #d8a62e!important}
    .mamo-racer-row{min-height:55px!important;display:grid!important;grid-template-columns:30px minmax(0,1fr)!important;align-items:center!important;gap:7px!important;padding:3px 5px 3px 3px!important;border:1px solid #dbe4e8!important;border-radius:9px!important;background:#fff!important;overflow:hidden!important}
    .mamo-lane{width:29px!important;height:40px!important;display:grid!important;place-items:center!important;border-radius:7px!important;font-size:16px!important;font-weight:1000!important;background:#f4f4f4!important;color:#092b49!important}
    .mamo-lane.b1{background:#f4f4f4!important;color:#0b2438!important;border:2px solid #cfd5d8!important}
    .mamo-lane.b2{background:#303438!important;color:#fff!important}
    .mamo-lane.b3{background:#e34a4f!important;color:#fff!important}
    .mamo-lane.b4{background:#3975d6!important;color:#fff!important}
    .mamo-lane.b5{background:#f0cf3d!important;color:#111!important}
    .mamo-lane.b6{background:#3ca568!important;color:#fff!important}
    .mamo-racer-copy{min-width:0!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:4px!important}
    .mamo-racer-identity{display:block!important;min-width:0!important}
    .mamo-racer-identity>b{display:block!important;min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:#082b4a!important;font-size:11px!important;font-weight:1000!important}
    .mamo-racer-meta{display:block!important;margin-top:2px!important;color:#657886!important;font-size:9px!important;font-weight:900!important;line-height:1.15!important;white-space:nowrap!important}
    .mamo-official-button{flex:0 0 auto!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:30px!important;padding:4px 6px!important;border:1px solid #7fbdf0!important;border-radius:8px!important;background:#f7fbff!important;color:#0871cf!important;text-decoration:none!important;font-size:8px!important;font-weight:1000!important;white-space:nowrap!important}

    @media(max-width:390px){
      .betdesk #modeTabs{min-height:46px!important}
      .betdesk #modeTabs .bet-tab{min-height:46px!important;font-size:13px!important}
      .betdesk .bettypebar{gap:6px!important}
      .betdesk .bettypebar .bettypebtn{min-height:44px!important;font-size:11px!important;padding:6px 3px!important}
      #builder.mamo-selection-matrix{gap:5px!important}
      #builder.mamo-selection-matrix[data-mamo-has-racers="true"][data-mamo-picker-columns="3"]{grid-template-columns:minmax(112px,1.48fr) repeat(3,minmax(54px,1fr))!important}
      #builder.mamo-selection-matrix>.rank h3,.mamo-racer-head{min-height:37px!important;font-size:9px!important;margin-bottom:5px!important}
      #builder.mamo-selection-matrix>.rank .betgrid,.mamo-racer-rows{gap:5px!important}
      #builder.mamo-selection-matrix>.rank .pick,.mamo-racer-row{min-height:52px!important}
      #builder.mamo-selection-matrix>.rank .pick{font-size:16px!important}
      .mamo-racer-row{grid-template-columns:27px minmax(0,1fr)!important;gap:5px!important;padding:2px 4px 2px 2px!important}
      .mamo-lane{width:27px!important;height:37px!important;font-size:15px!important}
      .mamo-racer-copy{display:block!important}
      .mamo-racer-identity>b{font-size:10px!important;line-height:1.2!important}
      .mamo-racer-meta{font-size:8px!important}
      .mamo-official-button{display:inline-flex!important;margin-top:2px!important;min-height:20px!important;padding:1px 4px!important;border-radius:6px!important;font-size:7px!important}
    }
  `;
  document.getElementById("mamoBetReviewFlowStyleV3")?.remove();
  document.getElementById("mamoBetReviewFlowStyleV4")?.remove();
  document.getElementById("mamoBetReviewFlowStyleV5")?.remove();
  document.head.appendChild(style);

  function boot() {
    enhanceBuilder();
    window.addEventListener(AIR_BET_RENDERED_EVENT, enhanceBuilder);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
