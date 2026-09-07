/* MAMO BOAT — live venue priority UX v1
 * Makes currently available venues obvious without rewriting app navigation.
 * Enhances only #venues after the core render completes.
 */
(() => {
  "use strict";
  if (window.__MAMO_VENUE_LIVE_PRIORITY_V1__) return;
  window.__MAMO_VENUE_LIVE_PRIORITY_V1__ = true;

  const STYLE_ID = "mamoVenueLivePriorityV1";
  let liveOnly = false;

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #venues .filter-rail{align-items:stretch;gap:8px;padding-bottom:12px}
      #venues .filter{min-height:44px;border-radius:9px;padding:8px 14px;font-size:11px}
      #venues .mamo-live-filter{border-color:#e91d2b;background:#fff;color:#d71926;font-weight:1000}
      #venues .mamo-live-filter.active{background:#e91d2b;color:#fff;box-shadow:0 4px 0 #a90d18}
      #venues .mamo-live-guide{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 2px 12px;padding:11px 12px;border:1px solid #ffc8cd;border-left:5px solid #e91d2b;border-radius:10px;background:#fff5f6;color:#0b3047}
      #venues .mamo-live-guide b{display:block;font-size:13px;line-height:1.35}
      #venues .mamo-live-guide small{display:block;margin-top:2px;color:#6d7e89;font-size:8px;font-weight:800}
      #venues .mamo-live-guide strong{flex:0 0 auto;color:#d71926;font-size:12px;white-space:nowrap}
      #venues .venue-card.compact.mamo-live-open{border-color:#e91d2b;box-shadow:0 5px 0 rgba(233,29,43,.18);filter:none;opacity:1}
      #venues .venue-card.compact.mamo-live-open .venue-card-main{padding-top:38px;background:linear-gradient(180deg,#fff7f8 0,#fff 36%)}
      #venues .venue-card.compact.mamo-live-urgent{border-color:#f36b21;box-shadow:0 5px 0 rgba(243,107,33,.18)}
      #venues .mamo-live-badge{position:absolute;left:9px;top:8px;z-index:3;display:inline-flex;align-items:center;gap:5px;min-height:24px;padding:4px 9px;border-radius:999px;background:#e91d2b;color:#fff;font-size:9px;font-weight:1000;letter-spacing:.02em;box-shadow:0 2px 8px rgba(164,9,22,.18)}
      #venues .mamo-live-urgent .mamo-live-badge{background:#f36b21}
      #venues .mamo-live-badge::before{content:"";width:7px;height:7px;border-radius:50%;background:#fff}
      #venues .venue-card.compact .venue-next.mamo-live-next{display:grid;grid-template-columns:auto 1fr;gap:3px 7px;align-items:center;margin-top:9px;padding:9px 8px;background:#fff0f2;color:#0b3047;border-top:1px solid #ffd3d7}
      #venues .venue-card.compact .venue-next.mamo-live-next span{font-size:10px;font-weight:1000;color:#0b3047}
      #venues .venue-card.compact .venue-next.mamo-live-next strong{justify-self:end;color:#d71926;font-size:10px;font-weight:1000}
      #venues .venue-card.compact .venue-next.mamo-live-next b{grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:5px;margin-top:2px;color:#e91d2b;font-size:15px;font-weight:1000;line-height:1.15}
      #venues .venue-card.compact.mamo-live-urgent .venue-next.mamo-live-next{background:#fff3eb;border-top-color:#ffd0b6}
      #venues .venue-card.compact.mamo-live-urgent .venue-next.mamo-live-next strong,#venues .venue-card.compact.mamo-live-urgent .venue-next.mamo-live-next b{color:#ed5b12}
      #venues .venue-card.compact.mamo-ended{border-color:#c8d2d7;box-shadow:none;filter:saturate(.2);opacity:.68}
      #venues .venue-card.compact.mamo-ended .venue-next{background:#edf2f4!important;color:#667984!important}
      #venues .venue-card.compact.mamo-ended .venue-next strong{color:#667984!important}
      #venues .venue-card[hidden]{display:none!important}
      @media(max-width:390px){
        #venues .filter{padding-left:11px;padding-right:11px;font-size:10px}
        #venues .mamo-live-guide{padding:9px 10px}
        #venues .mamo-live-guide b{font-size:11px}
        #venues .venue-card.compact.mamo-live-open .venue-card-main{padding-top:35px}
        #venues .mamo-live-badge{left:6px;top:6px;font-size:8px;padding:4px 7px}
        #venues .venue-card.compact .venue-next.mamo-live-next b{font-size:13px}
      }
    `;
    document.head.appendChild(style);
  }

  function closeTimestamp(card) {
    const strong = card.querySelector(".venue-next strong");
    const match = String(strong?.textContent || "").match(/(\d{1,2}):(\d{2})/);
    const date = document.getElementById("dataDate")?.textContent?.trim();
    if (!match || !/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return NaN;
    return new Date(`${date}T${String(match[1]).padStart(2,"0")}:${match[2]}:00+09:00`).getTime();
  }

  function remainingLabel(close) {
    if (!Number.isFinite(close)) return "締切時刻を確認";
    const minutes = Math.max(1, Math.ceil((close - Date.now()) / 60000));
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      return `あと ${hours}時間${rest ? `${rest}分` : ""}`;
    }
    return `あと ${minutes}分`;
  }

  function ensureFilter(rail) {
    let button = rail.querySelector(".mamo-live-filter");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "filter mamo-live-filter";
      rail.prepend(button);
    }
    return button;
  }

  function enhanceCard(card) {
    card.classList.remove("mamo-live-open", "mamo-live-urgent", "mamo-ended");
    card.querySelector(".mamo-live-badge")?.remove();
    const next = card.querySelector(".venue-next");
    if (!next) return { live:false, close:Infinity };

    if (card.classList.contains("active-card")) {
      const original = String(next.textContent || "").replace(/\s+/g, " ").trim();
      const race = original.match(/(?:次|NEXT)\s*(\d+)R/i)?.[1] || original.match(/(\d+)R/)?.[1] || "—";
      const time = original.match(/(\d{1,2}:\d{2})/)?.[1] || "—";
      const close = closeTimestamp(card);
      const remainingMinutes = Number.isFinite(close) ? Math.ceil((close - Date.now()) / 60000) : Infinity;
      const urgent = remainingMinutes > 0 && remainingMinutes <= 10;
      card.classList.add("mamo-live-open");
      if (urgent) card.classList.add("mamo-live-urgent");
      const badge = document.createElement("span");
      badge.className = "mamo-live-badge";
      badge.textContent = urgent ? "まもなく締切" : "受付中";
      card.prepend(badge);
      next.classList.add("mamo-live-next");
      next.innerHTML = `<span>次 ${race}R</span><strong>締切 ${time}</strong><b>◷ ${remainingLabel(close)}</b>`;
      card.dataset.liveClose = Number.isFinite(close) ? String(close) : "";
      return { live:true, close:Number.isFinite(close) ? close : Infinity };
    }

    next.classList.remove("mamo-live-next");
    if (card.classList.contains("closed")) {
      card.classList.add("mamo-ended");
      next.innerHTML = "<span>✓ 本日終了</span><strong>結果確定</strong>";
    }
    card.dataset.liveClose = "";
    return { live:false, close:Infinity };
  }

  function updateCoreLabels(rail, liveCount, activeCount, offCount) {
    const active = rail.querySelector('[data-filter="active"]');
    const all = rail.querySelector('[data-filter="all"]');
    const off = rail.querySelector('[data-filter="off"]');
    if (active) active.textContent = `本日開催 ${activeCount}場`;
    if (all) all.textContent = "全24場";
    if (off) off.textContent = `本日なし ${offCount}場`;
    const live = ensureFilter(rail);
    live.textContent = `受付中 ${liveCount}場`;
    live.classList.toggle("active", liveOnly);
    if (liveOnly) rail.querySelectorAll('[data-filter]').forEach(button => button.classList.remove("active"));
  }

  function ensureGuide(list, liveCount) {
    const screen = document.getElementById("venues");
    let guide = screen?.querySelector(".mamo-live-guide");
    if (!screen || !list) return;
    if (!guide) {
      guide = document.createElement("div");
      guide.className = "mamo-live-guide";
      list.before(guide);
    }
    guide.innerHTML = `<div><b>● 今、AIR BETできるレース場</b><small>受付中は締切が近い順に表示しています</small></div><strong>${liveCount}場</strong>`;
  }

  function enhance() {
    installStyle();
    const screen = document.getElementById("venues");
    const list = document.getElementById("venueList");
    const rail = screen?.querySelector(".filter-rail");
    if (!screen || !list || !rail) return;

    const cards = [...list.querySelectorAll(".venue-card.compact")];
    const rows = cards.map(card => ({ card, ...enhanceCard(card) }));
    const liveRows = rows.filter(row => row.live).sort((a,b) => a.close - b.close);
    const endedRows = rows.filter(row => !row.live && row.card.classList.contains("closed"));
    const offRows = rows.filter(row => row.card.classList.contains("inactive"));
    const activeCount = liveRows.length + endedRows.length;

    if (liveOnly) {
      rows.forEach(row => { row.card.hidden = !row.live; });
    } else {
      rows.forEach(row => { row.card.hidden = false; });
    }

    if (liveOnly || rail.querySelector('[data-filter="active"]')?.classList.contains("active")) {
      [...liveRows, ...endedRows, ...offRows].forEach(row => list.appendChild(row.card));
    }

    updateCoreLabels(rail, liveRows.length, activeCount, offRows.length);
    ensureGuide(list, liveRows.length);
  }

  function installEvents() {
    const originalSetFilter = window.setFilter;
    if (typeof originalSetFilter === "function" && !originalSetFilter.__mamoLivePriorityWrapped) {
      const wrapped = function(filter) {
        liveOnly = false;
        const result = originalSetFilter.apply(this, arguments);
        enhance();
        return result;
      };
      wrapped.__mamoLivePriorityWrapped = true;
      window.setFilter = wrapped;
    }

    document.addEventListener("click", event => {
      const liveButton = event.target?.closest?.(".mamo-live-filter");
      if (liveButton) {
        event.preventDefault();
        liveOnly = true;
        if (typeof originalSetFilter === "function") originalSetFilter("active");
        enhance();
        return;
      }
      if (event.target?.closest?.("#nav-venues")) enhance();
    }, false);
    window.addEventListener("pageshow", () => {
      if (document.body?.dataset?.screen === "venues") enhance();
    });
  }

  function boot() {
    installStyle();
    installEvents();
    if (document.body?.dataset?.screen === "venues" || document.getElementById("venues")?.classList.contains("active")) enhance();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once:true });
  else boot();

  window.MAMO_VENUE_LIVE_PRIORITY = Object.freeze({ refresh:enhance });
})();

/* Load same-screen multi-selection AIR BET flow after core/review flow. */
(() => {
  if (document.querySelector('script[data-mamo-air-bet-multi-add="1"]')) return;
  const script = document.createElement("script");
  script.src = "air-bet-multi-add.js?v=20260907-1";
  script.async = true;
  script.dataset.mamoAirBetMultiAdd = "1";
  document.head.appendChild(script);
})();
