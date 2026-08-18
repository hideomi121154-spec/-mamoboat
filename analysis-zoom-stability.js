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
    document.documentElement.classList.toggle("mamo-analysis-zoomed", !!(analysisActive && zoomed));
  }

  viewport.addEventListener("resize", updateZoomState, { passive: true });
  viewport.addEventListener("scroll", updateZoomState, { passive: true });
  window.addEventListener("pageshow", updateZoomState, { passive: true });
  document.addEventListener("click", () => requestAnimationFrame(updateZoomState), { passive: true });
  updateZoomState();
})();
