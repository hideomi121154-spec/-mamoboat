/* MAMO BOAT — general race grade color */
(() => {
  "use strict";
  if (window.__MAMO_GENERAL_GRADE_THEME_V1__) return;
  window.__MAMO_GENERAL_GRADE_THEME_V1__ = true;

  const style = document.createElement("style");
  style.id = "mamoGeneralGradeThemeV1";
  style.textContent = `
    .grade.general{
      background:#2f6f8f!important;
      color:#fff!important;
      box-shadow:inset 0 -2px 0 rgba(5,43,68,.16)!important;
    }
  `;
  document.head.appendChild(style);
})();
