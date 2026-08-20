/* MAMO BOAT home Mamoru scale override v1 */
(() => {
  "use strict";
  if (window.__MAMO_HOME_MAMORU_SCALE_V1__) return;
  window.__MAMO_HOME_MAMORU_SCALE_V1__ = true;

  const style = document.createElement("style");
  style.id = "mamoHomeMamoruScaleV1";
  style.textContent = `
    body[data-screen="home"] .home-masthead .masthead-character,
    #home.active .home-masthead .masthead-character {
      transform: translateX(10%) scale(1.55) !important;
      transform-origin: 72% 52% !important;
      object-position: 58% 24% !important;
    }
    @media (max-width: 620px) {
      body[data-screen="home"] .home-masthead .masthead-character,
      #home.active .home-masthead .masthead-character {
        transform: translateX(11%) scale(1.55) !important;
        transform-origin: 72% 52% !important;
        object-position: 58% 24% !important;
      }
    }
  `;
  document.head.appendChild(style);
})();
