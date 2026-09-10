/* MAMO BOAT — persistent official BOAT RACE link */
(() => {
  "use strict";
  const OFFICIAL = "https://www.boatrace.jp/owpc/pc/race/index";

  function injectStyle() {
    if (document.getElementById("mamoOfficialLinkStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoOfficialLinkStyle";
    style.textContent = `
      .mamo-official-link-row{display:grid;grid-template-columns:1fr;gap:8px;margin:10px 0 12px}
      .mamo-official-link-row a{display:flex;align-items:center;justify-content:center;min-height:46px;padding:0 12px;text-decoration:none;font-weight:1000;border:2px solid #00a8a0;background:#eefafa;color:#071b2b;border-radius:5px}
      .mamo-official-link-row small{display:block;color:#697a80;font-size:9px;line-height:1.5}
    `;
    document.head.appendChild(style);
  }

  function ensureOfficialButton() {
    const race = document.getElementById("race");
    const raceView = document.getElementById("raceView");
    if (!race || !raceView || !race.classList.contains("active")) return;

    const dock = document.getElementById("mamoHomeOfficialDock")
      || window.MAMO_HOME_OFFICIAL_DOCK?.ensure?.();
    const scope = dock || raceView;
    if (scope.querySelector(".mamo-official-link-row")) return;

    const aiActions = scope.querySelector(".mamo-ai-actions");
    const officialMenu = scope.querySelector(".officialmenu");
    const target = aiActions || officialMenu || scope.firstElementChild;
    if (!target) return;

    const row = document.createElement("div");
    row.className = "mamo-official-link-row";
    row.innerHTML = `
      <a href="${OFFICIAL}" target="_blank" rel="noopener noreferrer" aria-label="BOAT RACE公式サイトを開く">BOAT RACE公式 ↗</a>
      <small>出走表・オッズ・結果などの最終確認はBOAT RACE公式サイトで行えます。</small>`;
    target.insertAdjacentElement("afterend", row);
  }

  function boot() {
    injectStyle();
    ensureOfficialButton();
    document.addEventListener("click", () => setTimeout(ensureOfficialButton, 60), true);
    window.addEventListener("hashchange", () => setTimeout(ensureOfficialButton, 60));
    setInterval(ensureOfficialButton, 4000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();
})();

/* Race Carte snapshot capture is isolated from navigation and race rendering. */
(() => {
  if (document.querySelector('script[data-mamo-race-carte-snapshot="1"]')) return;
  const script = document.createElement("script");
  script.src = "race-carte-snapshot.js?v=20260907-1";
  script.async = true;
  script.dataset.mamoRaceCarteSnapshot = "1";
  document.head.appendChild(script);
})();
