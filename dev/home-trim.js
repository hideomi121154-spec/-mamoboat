/* MAMO BOAT home trim v1
 * Removes the entire visible home-page block starting at "今日の行動記録".
 * Keeps only hidden compatibility nodes required by existing app.js updates.
 */
(() => {
  "use strict";
  if (window.__MAMO_HOME_TRIM_V1__) return;
  window.__MAMO_HOME_TRIM_V1__ = true;

  const REQUIRED_IDS = [
    "coins",
    "savedToday",
    "savedWeek",
    "savedMonth",
    "aiMemo",
    "homePressTeaser",
  ];

  function ensureCompatibilityNodes(home) {
    let compat = home.querySelector("#mamoHomeTrimCompat");
    if (!compat) {
      compat = document.createElement("div");
      compat.id = "mamoHomeTrimCompat";
      compat.hidden = true;
      compat.setAttribute("aria-hidden", "true");
      home.appendChild(compat);
    }
    REQUIRED_IDS.forEach((id) => {
      if (document.getElementById(id)) return;
      const node = id === "homePressTeaser" ? document.createElement("div") : document.createElement("span");
      node.id = id;
      compat.appendChild(node);
    });
  }

  function trimHome() {
    const home = document.getElementById("home");
    if (!home) return;

    const start = [...home.querySelectorAll(":scope > .section-head")]
      .find((node) => node.querySelector("h2")?.textContent?.trim() === "今日の行動記録");

    if (start) {
      let node = start;
      while (node) {
        const next = node.nextElementSibling;
        node.remove();
        node = next;
      }
    }

    ensureCompatibilityNodes(home);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", trimHome, { once: true });
  } else {
    trimHome();
  }

  window.addEventListener("pageshow", trimHome);
})();
