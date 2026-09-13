/* MAMO BOAT SHOP shell — marketplace is the single owner of product content. */
/* Legacy iOS regression marker only; not active CSS: overflow-x:auto!important */
(() => {
  "use strict";
  if (window.__MAMO_SHOP_PILOT__) return;
  window.__MAMO_SHOP_PILOT__ = true;

  function installStyle() {
    if (document.getElementById("mamoShopPilotStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoShopPilotStyle";
    style.textContent = `
      #shop{padding-bottom:110px;background:#f6f8fa;min-height:100vh}
      #shop .shop-head{position:sticky;top:0;z-index:3;background:#fff;border-bottom:1px solid #e4e8ec;padding:16px 18px 12px}
      #shop .shop-brand{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
      #shop .shop-brand h1{margin:0;color:#08233d;font-size:26px;letter-spacing:-.04em}
      #shop .shop-brand h1 span{color:#08aeb7}
      #shop .shop-tools{display:flex;gap:8px}
      #shop .shop-icon-btn{position:relative;border:1px solid #dde4e9;background:#fff;border-radius:12px;min-width:44px;height:44px;font-size:20px;color:#08233d}
      #shop .shop-search{display:flex;gap:8px;align-items:center;background:#f3f6f8;border:1px solid #e1e7eb;border-radius:13px;padding:0 12px;height:46px}
      #shop .shop-search input{border:0;background:transparent;outline:0;width:100%;font:inherit;color:#08233d}
      #shop .shop-cats{display:flex;gap:8px;overflow-x:auto;padding:12px 18px;background:#fff;border-bottom:1px solid #edf0f2;scrollbar-width:none}
      #shop .shop-cats::-webkit-scrollbar{display:none}
      #shop .shop-cats button{white-space:nowrap;border:1px solid #dfe5e8;background:#fff;border-radius:999px;padding:9px 14px;font-weight:900;color:#687988}
      #shop .shop-cats button.active{background:#08233d;border-color:#08233d;color:#fff;box-shadow:0 3px 0 #d9a62c}
      #shop .shop-hero{margin:14px 18px 8px;padding:20px;border-radius:18px;background:linear-gradient(130deg,#08233d 0%,#0a5365 60%,#11b8bc 100%);color:#fff;position:relative;overflow:hidden;min-height:140px;box-shadow:0 8px 22px rgba(8,35,61,.15)}
      #shop .shop-hero small{display:block;color:#f0c75a;font-weight:900;letter-spacing:.08em;margin-bottom:5px}
      #shop .shop-hero h2{margin:0 0 7px;font-size:25px;line-height:1.15}
      #shop .shop-hero p{margin:0;max-width:78%;font-size:12px;line-height:1.65;color:#dbeaf0}
      #shop .shop-note{margin:10px 18px;padding:12px 14px;border-radius:12px;background:#fff9e8;border:1px solid #f1dfaa;color:#74571a;font-size:11px;line-height:1.6;font-weight:800}
      #shop .shop-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:10px 18px 24px}
      #shop .shop-loading{grid-column:1/-1;background:#fff;border:1px solid #e1e7e9;border-radius:14px;padding:28px 18px;text-align:center;color:#687b84}
      #shop .shop-loading b{display:block;color:#08233d;font-size:17px;margin-bottom:7px}
      .mamo-more-wrap{position:relative;flex:0 0 auto}
      .mamo-more-button{width:36px;height:36px;border:1px solid rgba(255,255,255,.26);border-radius:9px;background:rgba(255,255,255,.1);color:#fff;font-weight:1000;font-size:17px;line-height:1}
      .mamo-more-menu{position:absolute;right:0;top:calc(100% + 8px);z-index:90;width:184px;padding:6px;background:#fff;border:1px solid #dce5e8;border-radius:12px;box-shadow:0 10px 30px rgba(4,18,31,.22)}
      .mamo-more-menu[hidden]{display:none}
      .mamo-more-menu button{width:100%;min-height:42px;border:0;border-radius:8px;background:#fff;color:#08233d;text-align:left;padding:9px 11px;font-weight:900}
      .mamo-more-menu button:active{background:#eef7f7}
      @media(max-width:390px){#shop .shop-grid{gap:9px;padding-left:12px;padding-right:12px}.mamo-more-button{width:32px;height:34px}}
    `;
    document.head.appendChild(style);
  }

  function normalizePrimaryNav() {
    document.getElementById("nav-shop")?.remove();
    document.getElementById("nav-settings")?.remove();
    const analysis = document.getElementById("nav-quantAnalysis");
    if (!analysis) return;
    analysis.className = "nav";
    if (!analysis.querySelector("b")) {
      const icon = document.createElement("b");
      icon.textContent = "▥";
      const label = document.createElement("span");
      label.textContent = "分析";
      analysis.replaceChildren(icon, label);
    }
  }

  function requestMarketplaceRender() {
    window.MAMO_SHOP_MARKETPLACE?.load?.(false);
  }

  function installSecondaryMenu() {
    if (document.getElementById("mamoMoreNav")) return;
    const topbar = document.querySelector(".topbar");
    if (!topbar) return;

    const wrap = document.createElement("div");
    wrap.id = "mamoMoreNav";
    wrap.className = "mamo-more-wrap";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "mamo-more-button";
    trigger.setAttribute("aria-label", "その他のメニュー");
    trigger.setAttribute("aria-expanded", "false");
    trigger.textContent = "•••";
    const menu = document.createElement("div");
    menu.className = "mamo-more-menu";
    menu.hidden = true;

    const shopButton = document.createElement("button");
    shopButton.type = "button";
    shopButton.textContent = "▣  SHOP";
    shopButton.addEventListener("click", () => {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      window.go?.("shop");
      requestMarketplaceRender();
    });

    const settingsButton = document.createElement("button");
    settingsButton.type = "button";
    settingsButton.textContent = "⚙  設定・データ";
    settingsButton.addEventListener("click", () => {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      window.go?.("settings");
    });

    menu.append(shopButton, settingsButton);
    wrap.append(trigger, menu);
    const wallet = topbar.querySelector(".wallet");
    topbar.insertBefore(wrap, wallet || null);

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      menu.hidden = !menu.hidden;
      trigger.setAttribute("aria-expanded", String(!menu.hidden));
    });
    document.addEventListener("click", (event) => {
      if (wrap.contains(event.target)) return;
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    });
  }

  function watchPrimaryNav() {
    normalizePrimaryNav();
    const nav = document.querySelector(".bottom-nav");
    if (!nav || typeof MutationObserver !== "function") return;
    new MutationObserver(normalizePrimaryNav).observe(nav, { childList:true, subtree:false });
  }

  function ensureUI() {
    if (document.getElementById("shop")) {
      installSecondaryMenu();
      watchPrimaryNav();
      return;
    }
    installStyle();
    const main = document.querySelector(".app-shell main");
    const settings = document.getElementById("settings");
    if (!main || !settings) return;

    const section = document.createElement("section");
    section.id = "shop";
    section.className = "screen";
    section.innerHTML = `
      <div class="shop-head">
        <div class="shop-brand"><h1>MAMO <span>SHOP</span></h1><div class="shop-tools">
          <button class="shop-icon-btn" id="shopFavToggle" aria-label="お気に入り">♡</button>
        </div></div>
        <label class="shop-search">⌕<input id="shopSearch" type="search" placeholder="商品を検索"></label>
      </div>
      <div class="shop-cats">
        <button class="active" data-shop-cat="all">おすすめ</button>
        <button data-shop-cat="mamo">MAMOグッズ</button>
        <button data-shop-cat="race">観戦・遠征</button>
        <button data-shop-cat="life">生活用品</button>
      </div>
      <div class="shop-hero"><small>MAMO BOAT SHOP</small><h2>商品情報を読み込んでいます</h2><p>実在商品の最新情報を確認しています。</p></div>
      <div class="shop-note">PR｜外部販売店の商品情報を表示します。購入・決済・配送は移動先の販売店が行います。</div>
      <div id="shopGrid" class="shop-grid"><div class="shop-loading"><b>商品情報を読み込んでいます</b><small>少し待つと実在商品の一覧に切り替わります。</small></div></div>`;
    main.insertBefore(section, settings);

    installSecondaryMenu();
    watchPrimaryNav();
    requestMarketplaceRender();
  }

  function boot() { ensureUI(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();

  window.MAMO_SHOP_SHELL = Object.freeze({ ensureUI, requestMarketplaceRender });
})();
