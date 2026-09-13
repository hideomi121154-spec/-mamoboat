/* MAMO BOAT — secondary menu owner for SHOP / settings.
 * Keeps the fixed bottom navigation to six primary destinations while exposing
 * infrequent destinations from a single reusable menu on both Home and other screens.
 */
(() => {
  "use strict";
  if (window.__MAMO_SECONDARY_MENU__) return;
  window.__MAMO_SECONDARY_MENU__ = true;

  const MENU_ID = "mamoMoreNav";
  const STYLE_ID = "mamoSecondaryMenuStyle";
  const ANALYSIS_SCREEN_ID = "quantAnalysis";

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .mamo-more-wrap{position:relative;flex:0 0 auto;z-index:95}
      .mamo-more-button{width:36px;height:36px;border:1px solid #cbd7e1;border-radius:9px;background:#fff;color:#082b4a;font-weight:1000;font-size:17px;line-height:1;box-shadow:0 2px 8px rgba(8,43,74,.10)}
      .mamo-more-menu{position:absolute;right:0;top:calc(100% + 8px);z-index:96;width:184px;padding:6px;background:#fff;border:1px solid #dce5e8;border-radius:12px;box-shadow:0 10px 30px rgba(4,18,31,.22)}
      .mamo-more-menu[hidden]{display:none}
      .mamo-more-menu button{width:100%;min-height:42px;border:0;border-radius:8px;background:#fff;color:#082b4a;text-align:left;padding:9px 11px;font-weight:900}
      .mamo-more-menu button:active{background:#eef5fb}
      .mamo-more-wrap[data-host="home"]{position:absolute;top:max(14px,env(safe-area-inset-top));right:14px;z-index:30}
      .mamo-more-wrap[data-host="home"] .mamo-more-button{background:rgba(255,255,255,.94);border-color:#d6e0e8;color:#082b4a;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
      @media(max-width:390px){.mamo-more-button{width:34px;height:34px}.mamo-more-wrap[data-host="home"]{right:12px;top:max(12px,env(safe-area-inset-top))}}
    `;
    document.head.appendChild(style);
  }

  function activeScreenId() {
    return document.querySelector(".screen.active")?.id || document.body?.dataset?.screen || "home";
  }

  function syncAnalysisScreenState() {
    const analysis = document.getElementById(ANALYSIS_SCREEN_ID);
    if (!analysis?.classList.contains("active")) return false;
    if (document.body.dataset.screen !== ANALYSIS_SCREEN_ID) {
      document.body.dataset.screen = ANALYSIS_SCREEN_ID;
    }
    return true;
  }

  function closeMenu(wrap) {
    const trigger = wrap?.querySelector(".mamo-more-button");
    const menu = wrap?.querySelector(".mamo-more-menu");
    if (!menu || !trigger) return;
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  function createMenu() {
    const wrap = document.createElement("div");
    wrap.id = MENU_ID;
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
      closeMenu(wrap);
      window.go?.("shop");
      requestAnimationFrame(placeMenu);
    });

    const settingsButton = document.createElement("button");
    settingsButton.type = "button";
    settingsButton.textContent = "⚙  設定・データ";
    settingsButton.addEventListener("click", () => {
      closeMenu(wrap);
      window.go?.("settings");
      requestAnimationFrame(placeMenu);
    });

    menu.append(shopButton, settingsButton);
    wrap.append(trigger, menu);

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      menu.hidden = !menu.hidden;
      trigger.setAttribute("aria-expanded", String(!menu.hidden));
    });
    return wrap;
  }

  function placeMenu() {
    syncAnalysisScreenState();
    const screen = activeScreenId();
    const home = screen === "home";
    const host = home
      ? document.querySelector("#home .home-masthead")
      : document.querySelector(".topbar");
    if (!host) return;

    let wrap = document.getElementById(MENU_ID);
    if (!wrap) wrap = createMenu();
    const nextHost = home ? "home" : "topbar";
    wrap.dataset.host = nextHost;
    if (wrap.parentElement !== host) {
      closeMenu(wrap);
      if (home) {
        host.appendChild(wrap);
      } else {
        const wallet = host.querySelector(".wallet");
        host.insertBefore(wrap, wallet || null);
      }
    }
  }

  function boot() {
    installStyle();
    placeMenu();

    document.addEventListener("click", (event) => {
      const wrap = document.getElementById(MENU_ID);
      if (wrap && !wrap.contains(event.target)) closeMenu(wrap);
      if (event.target?.closest?.("#nav-quantAnalysis")) {
        queueMicrotask(() => {
          syncAnalysisScreenState();
          placeMenu();
        });
      }
      if (event.target?.closest?.(".bottom-nav .nav")) {
        requestAnimationFrame(placeMenu);
      }
    }, true);

    new MutationObserver(() => placeMenu()).observe(document.body, {
      attributes: true,
      attributeFilter: ["data-screen"],
    });
    window.addEventListener("pageshow", placeMenu);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.MAMO_SECONDARY_MENU = Object.freeze({ place: placeMenu, syncAnalysisScreenState });
})();
