/* MAMO BOAT billing UI: LIVE=false until rights review and payment-provider approval. */
(() => {
  "use strict";
  const PLANS = Object.freeze({
    bronze: { name: "BRONZE", price: 390, detail: "7日・30日の行動比較" },
    silver: { name: "SILVER", price: 690, detail: "行動指数と週間分析" },
    gold: { name: "GOLD", price: 1190, detail: "朝刊・週間・月刊・深掘り" }
  });
  const LIVE = window.MAMO_BILLING_LIVE === true;
  const URL = "https://mihicuoijitluvrufsoj.supabase.co";
  const API = URL + "/functions/v1/membership-api";
  const PUBLISHABLE = window.MAMOBOAT_PILOT?.collector?.publishableKey || "";
  let client = null, verified = "free", currentStatus = "inactive", busy = false;
  let selected = "gold";

  function esc(x) {
    return String(x ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function getClient() {
    if (!client && LIVE && window.supabase?.createClient && PUBLISHABLE) {
      client = window.supabase.createClient(URL, PUBLISHABLE, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
    return client;
  }
  function track(plan) {
    try { window.MAMO_TRACK_EVENT?.("pilot_plan_selected", { plan, billing_started: false }, { screen: "membership" }); } catch (_) {}
  }
  async function authed(action, extra = {}) {
    const sb = getClient();
    if (!sb) throw new Error("認証モジュールを読み込めません。");
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.access_token) throw new Error("ログインしてください。");
    const response = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + session.access_token, "apikey": PUBLISHABLE },
      body: JSON.stringify({ action, ...extra })
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || "手続きを完了できませんでした。");
    return json;
  }
  async function refresh() {
    if (!LIVE) return { plan: "free", status: "prelaunch" };
    try {
      const data = await authed("status");
      verified = ["bronze", "silver", "gold"].includes(data.plan) ? data.plan : "free";
      currentStatus = data.status || "inactive";
    } catch (_) {
      verified = "free";
      currentStatus = "inactive";
    }
    window.MAMO_SET_VERIFIED_PLAN?.(verified);
    return { plan: verified, status: currentStatus };
  }
  function content() {
    const cards = Object.entries(PLANS).map(([key, item]) =>
      '<button type="button" class="mamo-billing-plan" data-plan="' + key + '" aria-pressed="' + (selected === key) + '">' +
      '<b>' + item.name + '・月' + item.price.toLocaleString("ja-JP") + '円</b><span>' + esc(item.detail) + '</span></button>'
    ).join("");
    const intro = LIVE ? '決済の前にメール認証が必要です。課金はStripeの安全な決済画面で行います。'
      : '現在は課金していません。まずプランへの関心を記録し、価格・商用データ・決済の審査を進めています。';
    return '<section id="mamoBillingDialog" role="dialog" aria-modal="true" aria-labelledby="mamoBillingTitle">' +
      '<div class="mamo-billing-panel"><button type="button" class="mamo-billing-close" aria-label="閉じる">×</button>' +
      '<small>MAMO BOAT MEMBERSHIP</small><h2 id="mamoBillingTitle">行動を、もっと深く振り返る。</h2><p>' + intro + '</p>' +
      '<div class="mamo-billing-free"><b>FREE はずっと無料</b><span>AIR BET・基本記録・安全機能・データ削除と書き出し</span></div>' +
      '<div class="mamo-billing-plans">' + cards + '</div>' +
      (LIVE ? '<label for="mamoBillingEmail">メールアドレス</label><input id="mamoBillingEmail" type="email" autocomplete="email" placeholder="you@example.com">' +
        '<button class="mamo-billing-action" data-action="login">ログイン用リンクを送信</button>' +
        '<button class="mamo-billing-action" data-action="checkout">選択プランを申し込む</button>' +
        '<button class="mamo-billing-action secondary" data-action="portal">契約・解約の管理</button>' :
        '<button class="mamo-billing-action" data-action="interest">このプランに興味がある</button>') +
      '<p class="mamo-billing-message" role="status" aria-live="polite"></p>' +
      '<small class="mamo-billing-disclaimer">勝敗予想、舟券購入、換金、賞品の提供はありません。実レースのデータは利用条件を確認中です。</small>' +
      '</div></section>';
  }
  function style() {
    if (document.getElementById("mamoBillingStyle")) return;
    const s = document.createElement("style");
    s.id = "mamoBillingStyle";
    s.textContent = '#mamoBillingDialog{position:fixed;z-index:16000;inset:0;overflow-y:auto;background:rgba(4,23,36,.72);display:flex;align-items:flex-start;justify-content:center;padding:20px 12px}'+
      '.mamo-billing-panel{position:relative;background:#fff;max-width:540px;width:100%;margin:24px auto;border-radius:20px;padding:25px 22px;color:#082b4a;font:inherit;box-shadow:0 15px 70px #0004}'+
      '.mamo-billing-panel h2{font-size:25px;line-height:1.35;margin:8px 0}.mamo-billing-panel p{font-size:13px;line-height:1.7;color:#486071}'+
      '.mamo-billing-close{position:absolute;right:12px;top:10px;border:0;background:#eff4f6;border-radius:999px;width:36px;height:36px;font-size:24px}'+
      '.mamo-billing-free{display:grid;gap:3px;padding:12px;border:1px solid #bedcce;border-radius:12px;background:#effaf3;font-size:13px}'+
      '.mamo-billing-free span{font-size:12px}.mamo-billing-plans{display:grid;gap:9px;margin:16px 0}'+
      '.mamo-billing-plan{display:grid;gap:5px;text-align:left;background:#f8fafb;border:2px solid #d7e0e7;padding:14px;border-radius:12px;color:#082b4a;cursor:pointer}'+
      '.mamo-billing-plan[aria-pressed="true"]{border-color:#0e98a7;background:#effaff}.mamo-billing-plan span{font-size:12px}'+
      '.mamo-billing-action{display:block;width:100%;background:#082b4a;color:white;border:0;border-radius:11px;padding:13px;margin:9px 0;font-weight:bold}'+
      '.mamo-billing-action.secondary{background:#e9eef2;color:#082b4a}.mamo-billing-panel input{width:100%;padding:12px;border:1px solid #c5d1db;border-radius:10px;margin:6px 0}'+
      '.mamo-billing-disclaimer{display:block;line-height:1.6;color:#637782}.mamo-billing-message{min-height:20px}';
    document.head.appendChild(s);
  }
  async function handleAction(action, msg) {
    if (busy) return;
    busy = true;
    msg.textContent = "処理中です…";
    try {
      if (action === "interest") {
        track(selected);
        msg.textContent = PLANS[selected].name + "への関心を記録しました。現在は課金されません。";
      } else if (action === "login") {
        const email = document.getElementById("mamoBillingEmail")?.value.trim();
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("メールアドレスを入力してください。");
        const sb = getClient();
        if (!sb) throw new Error("認証が利用できません。");
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: "https://mamoboat.com/dev/?billing=login" } });
        if (error) throw error;
        msg.textContent = "ログイン用リンクを送信しました。メールを確認してください。";
      } else if (action === "checkout") {
        const data = await authed("checkout", { plan: selected });
        if (!data.url || !data.url.startsWith("https://checkout.stripe.com/")) throw new Error("決済URLを確認できません。");
        location.assign(data.url);
      } else if (action === "portal") {
        const data = await authed("portal");
        if (!data.url || !data.url.startsWith("https://billing.stripe.com/")) throw new Error("管理URLを確認できません。");
        location.assign(data.url);
      }
    } catch (e) { msg.textContent = e?.message || "操作を完了できませんでした。"; }
    finally { busy = false; }
  }
  function open(plan) {
    if (PLANS[plan]) selected = plan;
    document.getElementById("mamoBillingDialog")?.remove();
    style();
    document.body.insertAdjacentHTML("beforeend", content());
    const root = document.getElementById("mamoBillingDialog");
    root.querySelector(".mamo-billing-close").addEventListener("click", () => root.remove());
    root.querySelectorAll("[data-plan]").forEach(button => button.addEventListener("click", () => {
      selected = button.dataset.plan;
      root.querySelectorAll("[data-plan]").forEach(b => b.setAttribute("aria-pressed", String(b === button)));
    }));
    root.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => {
      handleAction(button.dataset.action, root.querySelector(".mamo-billing-message"));
    }));
    if (LIVE) refresh().then(s => {
      const msg = root.querySelector(".mamo-billing-message");
      if (msg) msg.textContent = s.plan === "free" ? "未契約またはログイン前です。" : "現在の契約: " + s.plan.toUpperCase();
    });
  }
  window.MAMO_MEMBERSHIP = Object.freeze({
    isLive: LIVE, open, refresh, verifiedPlan: () => verified, plans: PLANS
  });
  if (LIVE) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh, { once: true });
    else refresh();
  }
})();
