/* MAMO BOAT: keep pressroom reading stable during iOS pinch zoom. */
(() => {
  "use strict";
  if (window.__MAMO_ANALYSIS_ZOOM_STABILITY__) return;
  window.__MAMO_ANALYSIS_ZOOM_STABILITY__ = true;

  const viewport = window.visualViewport;
  if (!viewport) return;

  function updateZoomState() {
    const analysisActive = document.body.dataset.screen === "analysis" || document.getElementById("analysis")?.classList.contains("active");
    const zoomed = viewport.scale > 1.02;
    const nav = document.querySelector(".bottom-nav");
    const shouldHide = !!(analysisActive && zoomed);
    if (nav) {
      nav.style.visibility = shouldHide ? "hidden" : "";
      nav.style.pointerEvents = shouldHide ? "none" : "";
    }
  }

  viewport.addEventListener("resize", updateZoomState, { passive: true });
  viewport.addEventListener("scroll", updateZoomState, { passive: true });
  window.addEventListener("pageshow", updateZoomState, { passive: true });
  document.addEventListener("click", () => requestAnimationFrame(updateZoomState), { passive: true });
  updateZoomState();
})();
