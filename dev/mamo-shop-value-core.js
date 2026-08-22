/* MAMO SHOP VALUE — pure amount comparison helpers. */
(function attachMamoShopValueCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MamoShopValueCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMamoShopValueCore() {
  "use strict";

  function jstDate(value) {
    const date = value instanceof Date ? value : new Date(value == null ? Date.now() : value);
    if (Number.isNaN(date.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const item = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${item.year}-${item.month}-${item.day}`;
  }

  function dateOf(record) {
    if (record?.time) return jstDate(record.time);
    const raceDate = String(record?.raceDate || "");
    return /^\d{4}-\d{2}-\d{2}$/.test(raceDate) ? raceDate : "";
  }

  function amountOf(record) {
    const value = Number(record?.saved ?? record?.intendedYen ?? record?.stake ?? 0);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  function periodTotals(records, now = new Date()) {
    const today = jstDate(now);
    const [year, month, day] = today.split("-").map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const monday = new Date(Date.UTC(year, month - 1, day - ((weekday + 6) % 7)));
    const weekStart = monday.toISOString().slice(0, 10);
    const monthStart = `${today.slice(0, 7)}-01`;
    const totals = { today: 0, week: 0, month: 0, all: 0 };

    for (const record of Array.isArray(records) ? records : []) {
      const amount = amountOf(record);
      const date = dateOf(record);
      totals.all += amount;
      if (date === today) totals.today += amount;
      if (date && date >= weekStart && date <= today) totals.week += amount;
      if (date && date >= monthStart && date <= today) totals.month += amount;
    }
    return totals;
  }

  function comparePrice(price, guideAmount) {
    const productPrice = Math.max(0, Number(price) || 0);
    const guide = Math.max(0, Number(guideAmount) || 0);
    if (!productPrice || !guide) {
      return { state: "none", remaining: productPrice, ratio: 0 };
    }
    return {
      state: productPrice <= guide ? "within" : "remaining",
      remaining: Math.max(0, productPrice - guide),
      ratio: Math.min(100, Math.round((guide / productPrice) * 100)),
    };
  }

  return Object.freeze({ jstDate, amountOf, periodTotals, comparePrice });
});
