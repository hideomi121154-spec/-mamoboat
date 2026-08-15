/* MAMO BOAT v4.0.1 — character asset hotfix v8
 * Uses manually uploaded PNG character assets and a single editorial-room scene.
 */
(() => {
  "use strict";

  const ART = Object.freeze({
    mamoru: "assets/mamoru.png?v=20260815-8",
    miru: "assets/miru.png?v=20260815-8",
    shun: "assets/shun.png?v=20260815-8",
    editorial: "assets/482089DF-4357-438E-8721-A6EFC38F4891.png?v=20260815-8",
  });

  function fresh(img, src, alt) {
    if (!img) return;
    if (img.getAttribute("src") !== src) img.setAttribute("src", src);
    if (alt !== undefined) img.alt = alt;
    img.style.display = "block";
    img.style.visibility = "visible";
    img.style.opacity = "1";
  }

  function renderEditorialScene() {
    const holder = document.querySelector("#analysis .analysis-character-duo");
    if (!holder) return;

    let scene = holder.querySelector(".editorial-scene");
    if (!scene) {
      holder.replaceChildren();
      scene = document.createElement("img");
      scene.className = "editorial-scene";
      scene.alt = "加音 守と木月 美留が編集室で議論している様子";
      holder.appendChild(scene);
    }

    fresh(scene, ART.editorial, "加音 守と木月 美留が編集室で議論している様子");
    scene.style.setProperty("width", "100%", "important");
    scene.style.setProperty("max-width", "100%", "important");
    scene.style.setProperty("height", "100%", "important");
    scene.style.setProperty("object-fit", "cover", "important");
    scene.style.setProperty("object-position", "center center", "important");
    scene.style.setProperty("transform", "none", "important");
    scene.style.setProperty("filter", "none", "important");
  }

  function apply() {
    fresh(document.querySelector("#home .masthead-character"), ART.mamoru, "加音 守");
    fresh(document.querySelector("#venues .page-intro > img"), ART.shun, "一曲 瞬");
    fresh(document.querySelector("#records .page-intro > img"), ART.miru, "木月 美留");

    renderEditorialScene();

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
