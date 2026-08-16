/* MAMO BOAT Morning Delivery v1 — delivers the prior day's behavior press on next open. */
(() => {
  "use strict";
  if (window.__MAMO_MORNING_DELIVERY_V1__) return;
  window.__MAMO_MORNING_DELIVERY_V1__ = true;

  const STATE_KEY = "mamoboat_v40_personal";
  const EVENT_KEY = "mamoboat_decision_events_v1";
  const READ_KEY = "mamoboat_morning_press_read_v1";
  const JST_OFFSET = 9 * 60 * 60 * 1000;

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (_) { return fallback; }
  };
  const pad = n => String(n).padStart(2, "0");
  function jstDateString(ms = Date.now()) {
    const d = new Date(ms + JST_OFFSET);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
  }
  function previousJstDate() {
    return jstDateString(Date.now() - 86400000);
  }
  function eventDate(value) {
    const ms = new Date(value || 0).getTime();
    return Number.isFinite(ms) && ms > 0 ? jstDateString(ms) : "";
  }
  function activityFor(date) {
    const state = read(STATE_KEY, {});
    const records = Array.isArray(state.records) ? state.records : [];
    const events = read(EVENT_KEY, []);
    const air = records.filter(r => String(r.raceDate || eventDate(r.time)) === date);
    const decision = Array.isArray(events)
      ? events.filter(e => eventDate(e.at) === date && ["skip_detected","real_transition","decision_action","race_session_start"].includes(e.name))
      : [];
    const skips = decision.filter(e => e.name === "skip_detected").length;
    const reals = decision.filter(e => e.name === "real_transition").length;
    const lives = decision.filter(e => e.name === "decision_action" && e.payload?.kind === "live").length;
    return { air: air.length, skips, reals, lives, total: air.length + decision.length };
  }
  function readMap() {
    const value = read(READ_KEY, {});
    return value && typeof value === "object" ? value : {};
  }
  function isRead(deliveryDate) {
    return !!readMap()[deliveryDate];
  }
  function markRead(deliveryDate, sourceDate) {
    const map = readMap();
    map[deliveryDate] = { readAt: new Date().toISOString(), sourceDate };
    localStorage.setItem(READ_KEY, JSON.stringify(map));
  }
  function payload() {
    const deliveryDate = jstDateString();
    const sourceDate = previousJstDate();
    const activity = activityFor(sourceDate);
    return { deliveryDate, sourceDate, activity, unread: activity.total > 0 && !isRead(deliveryDate) };
  }

  window.openMorningPress = () => {
    const p = payload();
    if (p.activity.total > 0) markRead(p.deliveryDate, p.sourceDate);
    document.getElementById("mamoMorningDelivery")?.classList.add("read");
    document.getElementById("nav-analysis")?.classList.remove("morning-unread");
    if (typeof window.go === "function") window.go("analysis");
    setTimeout(() => {
      if (typeof window.setReportType === "function") window.setReportType("morning");
      const externalMorning = document.querySelector("#mamoPressIntel [data-p='morning']");
      if (externalMorning) externalMorning.click();
      (document.getElementById("pressPaper") || document.getElementById("mamoPressIntel"))?.scrollIntoView({ block: "start" });
    }, 120);
  };

  function render() {
    const home = document.getElementById("home");
    if (!home) return;
    const p = payload();
    let card = document.getElementById("mamoMorningDelivery");
    if (!p.unread) {
      card?.remove();
      document.getElementById("nav-analysis")?.classList.remove("morning-unread");
      return;
    }
    if (!card) {
      card = document.createElement("button");
      card.id = "mamoMorningDelivery";
      card.type = "button";
      card.className = "morning-delivery";
      card.onclick = window.openMorningPress;
      const anchor = document.getElementById("settledNotice") || home.querySelector(".home-titlebar");
      anchor?.insertAdjacentElement("afterend", card);
    }
    const a = p.activity;
    card.innerHTML = `<span class="md-paper">MAMO BOAT PRESS</span><span class="md-new">NEW</span><strong>朝刊が届いています</strong><small>加音 守が、昨日のあなたの勝負をまとめました。</small><span class="md-meta">昨日：AIR ${a.air}回${a.skips ? ` / 見送り ${a.skips}回` : ""}${a.reals ? ` / REAL導線 ${a.reals}回` : ""}</span><b>朝刊を読む →</b>`;
    document.getElementById("nav-analysis")?.classList.add("morning-unread");
  }

  function installStyle() {
    if (document.getElementById("mamoMorningDeliveryStyle")) return;
    const s = document.createElement("style");
    s.id = "mamoMorningDeliveryStyle";
    s.textContent = `
      .morning-delivery{position:relative;width:calc(100% - 0px);margin:11px 0 13px;padding:16px 17px;text-align:left;border:1px solid #dccb9e;border-left:5px solid #d8a12a;border-radius:13px;background:linear-gradient(105deg,#fffdf7,#f8f2e4);color:#10263b;box-shadow:0 5px 15px rgba(8,35,61,.07)}
      .morning-delivery .md-paper{display:block;color:#8b6b23;font-size:8px;font-weight:1000;letter-spacing:.13em}.morning-delivery .md-new{position:absolute;right:14px;top:13px;padding:3px 7px;border-radius:999px;background:#f25d50;color:white;font-size:7px;font-weight:1000;letter-spacing:.08em}.morning-delivery strong{display:block;margin:5px 0 3px;font-size:18px;letter-spacing:-.03em}.morning-delivery small{display:block;color:#52636d;font-size:10px;line-height:1.6}.morning-delivery .md-meta{display:block;margin-top:9px;color:#087d77;font-size:9px;font-weight:900}.morning-delivery>b{display:block;margin-top:9px;color:#08233d;font-size:10px}.morning-delivery:active{transform:translateY(1px)}
      .bottom-nav .nav.morning-unread::before{content:"";position:absolute;top:5px;right:27%;width:7px;height:7px;border-radius:50%;background:#f25d50;box-shadow:0 0 0 2px #fffdf8}
    `;
    document.head.appendChild(s);
  }

  function boot() {
    installStyle();
    render();
    const obs = new MutationObserver(() => render());
    obs.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
    setInterval(render, 15000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
