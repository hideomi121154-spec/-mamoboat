/* MAMO BOAT v4.0.1 — character asset hotfix v7
 * Uses manually uploaded PNG character assets to avoid broken WebP/cache issues.
 */
(() => {
  "use strict";

  const ART = Object.freeze({
    mamoru: "assets/mamoru.png?v=20260815-7",
    miru: "assets/miru.png?v=20260815-7",
    shun: "assets/shun.png?v=20260815-7",
  });

  function fresh(img, src, alt) {
    if (!img) return;
    if (img.getAttribute("src") !== src) img.setAttribute("src", src);
    if (alt !== undefined) img.alt = alt;
    img.style.display = "block";
    img.style.visibility = "visible";
    img.style.opacity = "1";
  }

  function apply() {
    fresh(document.querySelector("#home .masthead-character"), ART.mamoru, "加音 守");
    fresh(document.querySelector("#venues .page-intro > img"), ART.shun, "一曲 瞬");
    fresh(document.querySelector("#records .page-intro > img"), ART.miru, "木月 美留");

    const duo = document.querySelector("#analysis .analysis-character-duo");
    if (duo) {
      fresh(duo.querySelector(".duo-mamoru"), ART.mamoru, "加音 守");
      fresh(duo.querySelector(".duo-miru"), ART.miru, "木月 美留");
    }

    fresh(document.querySelector("#analysis .cast-profile-card.mamoru .cast-thumb img"), ART.mamoru, "加音 守");
    fresh(document.querySelector("#analysis .cast-profile-card.miru .cast-thumb img"), ART.miru, "木月 美留");
    fresh(document.querySelector("#analysis .cast-profile-card.shun .cast-thumb img"), ART.shun, "一曲 瞬");
  }

  document.addEventListener("click", (event) => {
    const card = event.target.closest?.(".cast-profile-card");
    if (!card) return;
    const src = card.classList.contains("mamoru") ? ART.mamoru
      : card.classList.contains("miru") ? ART.miru
      : card.classList.contains("shun") ? ART.shun
      : null;
    if (!src) return;
    requestAnimationFrame(() => fresh(document.getElementById("castProfileImage"), src, card.querySelector("h3")?.textContent || ""));
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  } else {
    apply();
  }

  const observer = new MutationObserver(() => apply());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 12000);
})();
