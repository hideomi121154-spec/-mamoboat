/* MAMO BOAT — single-row horizontal bottom navigation */
(() => {
  "use strict";
  if (window.__MAMO_HORIZONTAL_BOTTOM_NAV__) return;
  window.__MAMO_HORIZONTAL_BOTTOM_NAV__ = true;

  function installStyle() {
    if (document.getElementById("mamoHorizontalBottomNavStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoHorizontalBottomNavStyle";
    style.textContent = `
      @media (max-width: 743px) {
        .bottom-nav {
          display: flex !important;
          flex-wrap: nowrap !important;
          grid-template-columns: none !important;
          align-items: stretch !important;
          justify-content: flex-start !important;
          gap: 0 !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          -webkit-overflow-scrolling: touch !important;
          overscroll-behavior-x: contain !important;
          scrollbar-width: none !important;
          scroll-snap-type: x proximity;
          touch-action: pan-x !important;
          padding-left: 4px !important;
          padding-right: 4px !important;
        }
        .bottom-nav::-webkit-scrollbar { display: none !important; }
        .bottom-nav .nav {
          flex: 0 0 72px !important;
          width: 72px !important;
          min-width: 72px !important;
          max-width: 72px !important;
          min-height: 64px !important;
          padding: 7px 3px 6px !important;
          scroll-snap-align: center;
        }
        .bottom-nav .nav b {
          display: block !important;
          height: 24px !important;
          line-height: 24px !important;
          font-size: 20px !important;
        }
        .bottom-nav .nav span {
          display: block !important;
          margin-top: 2px !important;
          white-space: nowrap !important;
          font-size: 8px !important;
          line-height: 1.2 !important;
        }
        .bottom-nav .nav.active {
          flex-basis: 76px !important;
          width: 76px !important;
          max-width: 76px !important;
        }
        .app-shell {
          padding-bottom: calc(92px + env(safe-area-inset-bottom)) !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function keepActiveVisible(behavior = "smooth") {
    const nav = document.querySelector(".bottom-nav");
    const active = nav?.querySelector(".nav.active");
    if (!nav || !active) return;
    const navRect = nav.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    if (activeRect.left < navRect.left + 6 || activeRect.right > navRect.right - 6) {
      active.scrollIntoView({ behavior, block: "nearest", inline: "center" });
    }
  }

  function boot() {
    installStyle();
    keepActiveVisible("auto");
    document.addEventListener("click", (event) => {
      if (!event.target?.closest?.(".bottom-nav .nav")) return;
      setTimeout(() => keepActiveVisible("smooth"), 0);
    }, false);
    window.addEventListener("pageshow", () => keepActiveVisible("auto"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
