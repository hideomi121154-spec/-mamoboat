from pathlib import Path
import re

root = Path(".")
app_path = root / "dev/app.js"
app = app_path.read_text(encoding="utf-8")

module = r'''(() => {
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
'''
(root / "dev/pressroom-membership.js").write_text(module, encoding="utf-8")

block = re.compile(
    r"  function renderMembershipPanel\(\) \{.*?\n  \}\n\n"
    r"  function updatePlanUI\(\) \{.*?\n  \}\n\n"
    r"(?=  function renderPressroom\(\))",
    re.S,
)
adapter = '''  const membershipController = window.MAMO_PRESSROOM_MEMBERSHIP?.create({
    getPressroom: () => S.pressroom,
    plans: PRESS_PLANS,
    save,
    trackEvent,
    openModal,
    updateReportTabsUI,
  });
  if (!membershipController) {
    throw new Error("MAMO pressroom membership module failed to initialize");
  }
  const renderMembershipPanel = membershipController.renderMembershipPanel;
  const updatePlanUI = membershipController.updatePlanUI;
  window.openMembershipPlans = membershipController.openMembershipPlans;
  window.selectPilotPlan = membershipController.selectPilotPlan;

'''
app, count = block.subn(adapter, app, count=1)
if count != 1:
    raise SystemExit(f"membership render block replacement count={count}")

handlers = re.compile(
    r"  window\.openMembershipPlans = \(\) => \{.*?\n  \};\n\n"
    r"  window\.selectPilotPlan = \(key\) => \{.*?\n  \};\n\n"
    r"(?=  window\.openDeepInterview)",
    re.S,
)
app, count = handlers.subn("", app, count=1)
if count != 1:
    raise SystemExit(f"membership handler replacement count={count}")
app_path.write_text(app, encoding="utf-8")

index_path = root / "dev/index.html"
index = index_path.read_text(encoding="utf-8")
old = '  <script src="pilot-config.js?v=20260830-2"></script>\n  <script src="app.js?v=20260830-1"></script>'
new = '  <script src="pilot-config.js?v=20260830-3"></script>\n  <script src="pressroom-membership.js?v=20260830-1"></script>\n  <script src="app.js?v=20260830-2"></script>'
if old not in index:
    raise SystemExit("dev/index.html script marker not found")
index_path.write_text(index.replace(old, new, 1), encoding="utf-8")

pilot_path = root / "dev/pilot-config.js"
pilot = pilot_path.read_text(encoding="utf-8")
old_sw_refresh = '["sw-refresh.js?v=20260830-34","sw-refresh"]'
if old_sw_refresh not in pilot:
    raise SystemExit("pilot-config sw-refresh marker not found")
pilot_path.write_text(
    pilot.replace(old_sw_refresh, '["sw-refresh.js?v=20260830-35","sw-refresh"]', 1),
    encoding="utf-8",
)

refresh_path = root / "dev/sw-refresh.js"
refresh = refresh_path.read_text(encoding="utf-8")
old_banner = "/* MAMO BOAT Service Worker refresh v34 — release the iOS race event-loop fix. */"
if old_banner not in refresh:
    raise SystemExit("sw-refresh banner marker not found")
refresh_path.write_text(
    refresh.replace(
        old_banner,
        "/* MAMO BOAT Service Worker refresh v35 — load the extracted pressroom membership module. */",
        1,
    ),
    encoding="utf-8",
)

sw_path = root / "dev/sw.js"
sw = sw_path.read_text(encoding="utf-8")
old_cache = "mamoboat-v411-ios-race-unlock-48-dev"
new_cache = "mamoboat-v411-pressroom-module-49-dev"
if old_cache not in sw:
    raise SystemExit("service worker cache marker not found")
sw = sw.replace(old_cache, new_cache, 1)
shell_marker = '"./core.js","./pilot-config.js","./app.js",'
if shell_marker not in sw:
    raise SystemExit("service worker shell marker not found")
sw = sw.replace(
    shell_marker,
    '"./core.js","./pilot-config.js","./pressroom-membership.js","./app.js",',
    1,
)
sw_path.write_text(sw, encoding="utf-8")

for base in (root / "tests", root / "dev/tests"):
    if not base.exists():
        continue
    for path in base.rglob("*.js"):
        text = path.read_text(encoding="utf-8")
        changed = text.replace(old_cache, new_cache).replace(
            "Service Worker refresh v34", "Service Worker refresh v35"
        )
        if changed != text:
            path.write_text(changed, encoding="utf-8")

test = r'''const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const devRoot = path.resolve(__dirname, "..");
const moduleSource = fs.readFileSync(path.join(devRoot, "pressroom-membership.js"), "utf8");
const appSource = fs.readFileSync(path.join(devRoot, "app.js"), "utf8");
const indexSource = fs.readFileSync(path.join(devRoot, "index.html"), "utf8");

function element() {
  const classes = new Set();
  return {
    dataset: {},
    classList: {
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
    setAttribute(name, value) { this[name] = value; },
    textContent: "",
    innerHTML: "",
    checked: false,
    disabled: false,
  };
}

test("membership UI is owned by the extracted module", () => {
  assert.doesNotMatch(appSource, /function renderMembershipPanel\(/);
  assert.doesNotMatch(appSource, /window\.openMembershipPlans = \(\) =>/);
  assert.match(appSource, /MAMO_PRESSROOM_MEMBERSHIP\?\.create/);
  assert.match(moduleSource, /function renderMembershipPanel\(/);
  assert.match(moduleSource, /function updatePlanUI\(/);
  assert.doesNotMatch(moduleSource, /scrollTo|scrollBy|visualViewport|requestAnimationFrame|MutationObserver/);

  const membershipIndex = indexSource.indexOf("pressroom-membership.js?v=20260830-1");
  const appIndex = indexSource.indexOf("app.js?v=20260830-2");
  assert.ok(membershipIndex >= 0 && appIndex > membershipIndex, "membership module must load before app.js");
});

test("plan selection mutates only pressroom state and uses lightweight UI updates", () => {
  const ids = new Map([
    ["membershipPanel", element()],
    ["pressPlanBadge", element()],
    ["membershipCurrentTitle", element()],
    ["membershipCurrentPrice", element()],
    ["membershipDeepInterview", element()],
    ["morningToggle", element()],
    ["weeklyToggle", element()],
    ["monthlyToggle", element()],
  ]);
  const buttons = ["free", "bronze", "silver", "gold"].map((key) => {
    const button = element();
    button.dataset.pilotPlan = key;
    return button;
  });
  const document = {
    getElementById(id) { return ids.get(id) || null; },
    querySelectorAll(selector) { return selector === "[data-pilot-plan]" ? buttons : []; },
  };
  const window = {};
  vm.runInNewContext(moduleSource, { window, document, Object, String, TypeError });

  const state = {
    plan: "free",
    morningEnabled: false,
    weeklyEnabled: false,
    monthlyEnabled: false,
  };
  const plans = {
    free: { label: "FREE", name: "基本機能", rank: 0, price: "0円" },
    bronze: { label: "BRONZE", name: "MAMO RECORD", rank: 1, price: "390円/月" },
    silver: { label: "SILVER", name: "MAMO INSIGHT", rank: 2, price: "690円/月" },
    gold: { label: "GOLD", name: "MAMO PRESS", rank: 3, price: "1,190円/月" },
  };
  let saveCount = 0;
  const events = [];
  let tabUpdates = 0;
  let modalHtml = "";
  const controller = window.MAMO_PRESSROOM_MEMBERSHIP.create({
    getPressroom: () => state,
    plans,
    save: () => { saveCount += 1; },
    trackEvent: (name, payload) => events.push([name, payload]),
    openModal: (html) => { modalHtml = html; },
    updateReportTabsUI: () => { tabUpdates += 1; },
  });

  controller.renderMembershipPanel();
  const initialMarkup = ids.get("membershipPanel").innerHTML;
  controller.renderMembershipPanel();
  assert.equal(ids.get("membershipPanel").innerHTML, initialMarkup, "membership DOM is generated once");

  controller.selectPilotPlan("gold");
  assert.equal(state.plan, "gold");
  assert.equal(state.morningEnabled, true);
  assert.equal(state.weeklyEnabled, true);
  assert.equal(state.monthlyEnabled, true);
  assert.equal(saveCount, 1);
  assert.equal(events[0][0], "pilot_plan_selected");
  assert.equal(events[0][1].plan, "gold");
  assert.equal(events[0][1].billing_started, false);
  assert.equal(buttons[3].classList.contains("selected"), true);
  assert.equal(ids.get("membershipDeepInterview").disabled, false);
  assert.equal(ids.get("morningToggle").disabled, false);

  controller.selectPilotPlan("bronze");
  assert.equal(state.plan, "bronze");
  assert.equal(state.morningEnabled, false);
  assert.equal(state.weeklyEnabled, false);
  assert.equal(state.monthlyEnabled, false);
  assert.equal(buttons[1].classList.contains("selected"), true);
  assert.equal(ids.get("membershipDeepInterview").disabled, true);
  assert.equal(ids.get("morningToggle").disabled, true);
  assert.ok(tabUpdates >= 2);

  controller.openMembershipPlans();
  assert.match(modalHtml, /FREE \/ BRONZE \/ SILVER \/ GOLD/);
});
'''
(root / "dev/tests/pressroom-membership-module.test.js").write_text(test, encoding="utf-8")

workflow_path = root / ".github/workflows/test.yml"
workflow = workflow_path.read_text(encoding="utf-8")
check_marker = "          node --check dev/bet-review-flow.js\n"
if check_marker not in workflow:
    raise SystemExit("CI syntax marker not found")
workflow = workflow.replace(
    check_marker,
    check_marker + "          node --check dev/pressroom-membership.js\n",
    1,
)
run_marker = "          node tests/ios-race-event-loop-regression.test.js\n"
if run_marker not in workflow:
    raise SystemExit("CI test marker not found")
workflow = workflow.replace(
    run_marker,
    run_marker + "          node --test dev/tests/pressroom-membership-module.test.js\n",
    1,
)
workflow_path.write_text(workflow, encoding="utf-8")
