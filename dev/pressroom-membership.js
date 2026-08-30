(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const esc = (value) => String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  function create({ getPressroom, plans, save, trackEvent, openModal, updateReportTabsUI }) {
    if (typeof getPressroom !== "function") throw new TypeError("getPressroom is required");
    if (!plans || typeof plans !== "object") throw new TypeError("plans are required");
    if (typeof save !== "function") throw new TypeError("save is required");
    if (typeof trackEvent !== "function") throw new TypeError("trackEvent is required");
    if (typeof openModal !== "function") throw new TypeError("openModal is required");
    if (typeof updateReportTabsUI !== "function") throw new TypeError("updateReportTabsUI is required");

    function currentPlanKey() {
      const pressroom = getPressroom();
      return plans[pressroom?.plan] ? pressroom.plan : "free";
    }

    function renderMembershipPanel() {
      const target = byId("membershipPanel");
      if (!target || target.dataset.planUiReady === "true") return;
      target.innerHTML = `<div class="membership-current"><span>CURRENT PILOT PLAN</span><h3 id="membershipCurrentTitle"></h3><b id="membershipCurrentPrice"></b><p>PILOT版では決済されません。AIR BET・実レース結果・B精算・安全機能は全プラン共通で無料です。</p></div>
        <div class="membership-points membership-selectable" role="group" aria-label="PILOTプラン">
          <button data-pilot-plan="free" type="button" aria-pressed="false" onclick="selectPilotPlan('free')"><b>FREE</b><span>基本5項目・安全機能・今日の小さな気づき1件</span></button>
          <button data-pilot-plan="bronze" type="button" aria-pressed="false" onclick="selectPilotPlan('bronze')"><b>BRONZE / MAMO RECORD</b><span>7日・30日の行動時間、予定と実際、結果後の動き</span></button>
          <button data-pilot-plan="silver" type="button" aria-pressed="false" onclick="selectPilotPlan('silver')"><b>SILVER / MAMO INSIGHT</b><span>結果・次の閲覧・AIR BET額・公式移動を組み合わせた週間分析</span></button>
          <button data-pilot-plan="gold" type="button" aria-pressed="false" onclick="selectPilotPlan('gold')"><b>GOLD / MAMO PRESS</b><span>朝刊・週間・月刊、長期変化、選んだテーマの深掘り</span></button>
        </div>
        <button id="membershipDeepInterview" class="btn secondary full membership-deep-action" type="button" onclick="openDeepInterview()">深掘りするテーマを選ぶ（GOLD）</button>
        <button class="btn primary full" type="button" onclick="openMembershipPlans()">プラン設計を確認する</button>`;
      target.dataset.planUiReady = "true";
    }

    function updatePlanUI() {
      const pressroom = getPressroom();
      const planKey = currentPlanKey();
      const plan = plans[planKey];
      const badge = byId("pressPlanBadge");
      const currentTitle = byId("membershipCurrentTitle");
      const currentPrice = byId("membershipCurrentPrice");
      const deepInterview = byId("membershipDeepInterview");

      if (badge) badge.textContent = `${plan.label} / ${plan.name}`;
      if (currentTitle) currentTitle.textContent = `${plan.label}・${plan.name}`;
      if (currentPrice) currentPrice.textContent = plan.price;

      document.querySelectorAll("[data-pilot-plan]").forEach((button) => {
        const selected = button.dataset.pilotPlan === planKey;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });

      if (deepInterview) {
        const enabled = planKey === "gold";
        deepInterview.disabled = !enabled;
        deepInterview.setAttribute("aria-disabled", enabled ? "false" : "true");
        deepInterview.classList.toggle("is-disabled", !enabled);
      }

      const settingControls = {
        morningToggle: pressroom.morningEnabled,
        weeklyToggle: pressroom.weeklyEnabled,
        monthlyToggle: pressroom.monthlyEnabled,
      };
      Object.entries(settingControls).forEach(([id, checked]) => {
        const control = byId(id);
        if (!control) return;
        control.checked = checked;
        control.disabled = planKey !== "gold";
        control.setAttribute("aria-disabled", planKey === "gold" ? "false" : "true");
      });

      updateReportTabsUI();
    }

    function openMembershipPlans() {
      const pressroom = getPressroom();
      openModal(`<div class="plan-modal"><span class="kicker">MAMO BOAT PRESS</span><h2>FREE / BRONZE / SILVER / GOLD</h2><p>価格は検証中です。PILOT版では料金は発生せず、分析の深さだけを4段階で確認します。</p>
        <div class="plan-modal-grid">
          ${Object.entries(plans).map(([key, plan]) => `<button class="plan-option ${pressroom.plan === key ? "current" : ""}" type="button" onclick="selectPilotPlan('${key}');closeModal()"><span>${esc(plan.label)}</span><h3>${esc(plan.name)}</h3><b>${esc(plan.price)}</b><small>${key === "free" ? "基本5項目・安全機能・小さな気づき1件" : key === "bronze" ? "7日・30日と単独条件の比較" : key === "silver" ? "複数条件を組み合わせた週間分析" : "朝刊・週間・月刊・長期変化"}</small></button>`).join("")}
        </div>
        <div class="notice editorial-safety"><b>課金で変わるのは分析の深さです。</b><br>安全介入、データ削除、基本記録は無料のままです。</div>
        <button class="btn secondary full" type="button" onclick="closeModal()">閉じる</button>
      </div>`);
    }

    function selectPilotPlan(key) {
      if (!plans[key]) return;
      const pressroom = getPressroom();
      pressroom.plan = key;
      const pressEnabled = key === "gold";
      pressroom.morningEnabled = pressEnabled;
      pressroom.weeklyEnabled = pressEnabled;
      pressroom.monthlyEnabled = pressEnabled;
      trackEvent("pilot_plan_selected", { plan: key, billing_started: false });
      save();
      updatePlanUI();
    }

    return Object.freeze({
      renderMembershipPanel,
      updatePlanUI,
      openMembershipPlans,
      selectPilotPlan,
    });
  }

  window.MAMO_PRESSROOM_MEMBERSHIP = Object.freeze({ create });
})();
