(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MamoCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const VENUE_CODES = Array.from({ length: 24 }, (_, index) =>
    String(index + 1).padStart(2, "0")
  );

  function normalizeCombo(value) {
    return String(value || "")
      .replace(/\s/g, "")
      .replace(/[―ー−]/g, "-");
  }

  function payoutList(result) {
    if (!result) return [];
    const raw = Array.isArray(result.sanrensho)
      ? result.sanrensho
      : result.sanrensho
        ? [result.sanrensho]
        : [];
    return raw
      .map((item) => ({
        combination: normalizeCombo(item.combination),
        payout: Number(item.payout) || 0,
        popularity: item.popularity == null ? null : Number(item.popularity),
      }))
      .filter((item) => item.combination && item.payout > 0);
  }

  function findRace(dataset, venueCode, raceNo) {
    const venue = (dataset && dataset.venues || []).find(
      (item) => String(item.code).padStart(2, "0") === String(venueCode).padStart(2, "0")
    );
    return venue && (venue.races || []).find(
      (item) => Number(item.number) === Number(raceNo)
    );
  }

  function recordStake(record) {
    const direct = Number(record && record.stake);
    if (Number.isFinite(direct) && direct >= 0) return direct;
    return (record && record.lines || []).reduce(
      (sum, line) => sum + (Number(line.stake) || 0),
      0
    );
  }

  function settleRecord(record, dataset) {
    if (!record || record.settled || !dataset || record.raceDate !== dataset.date) {
      return { changed: false, payoutAdded: 0, hit: false, refunded: false };
    }
    const race = findRace(dataset, record.venueCode, record.raceNo);
    if (!race || !race.result) {
      return { changed: false, payoutAdded: 0, hit: false, refunded: false };
    }

    if (race.result.payoutStatus === "notEstablished") {
      const refund = recordStake(record);
      record.status = "refunded";
      record.payoutStatus = "notEstablished";
      record.payoutC = refund;
      record.resultCombo = "不成立";
      record.resultPayout = null;
      record.resultPayouts = [];
      record.settled = true;
      record.settledAt = new Date().toISOString();
      return { changed: true, payoutAdded: refund, hit: false, refunded: true };
    }

    if (race.result.settleable === false) {
      return { changed: false, payoutAdded: 0, hit: false, refunded: false };
    }

    const payouts = payoutList(race.result);
    if (!payouts.length) {
      return { changed: false, payoutAdded: 0, hit: false, refunded: false };
    }

    const winning = new Map(payouts.map((item) => [item.combination, item]));
    let payoutC = 0;
    for (const line of record.lines || []) {
      const payout = winning.get(normalizeCombo((line.combo || []).join("-")));
      if (payout) payoutC += ((Number(line.stake) || 0) / 100) * payout.payout;
    }

    record.status = payoutC > 0 ? "hit" : "miss";
    record.payoutStatus = "paid";
    record.payoutC = Math.round(payoutC);
    record.resultCombo = payouts[0].combination;
    record.resultPayout = payouts[0].payout;
    record.resultPayouts = payouts.map((item) => ({
      combo: item.combination,
      payout: item.payout,
      popularity: item.popularity,
    }));
    record.settled = true;
    record.settledAt = new Date().toISOString();
    return {
      changed: true,
      payoutAdded: record.payoutC,
      hit: record.status === "hit",
      refunded: false,
    };
  }

  function validEntry(entry, expectedBoat) {
    return !!entry
      && Number(entry.boatNumber) === expectedBoat
      && /^\d{4}$/.test(String(entry.racerNumber || ""))
      && String(entry.name || "").trim().length > 0;
  }

  function validateDataset(dataset) {
    if (!dataset || !/^\d{4}-\d{2}-\d{2}$/.test(dataset.date || "")) return false;
    if (!Array.isArray(dataset.venues) || dataset.venues.length !== 24) return false;
    const codes = dataset.venues.map((venue) => String(venue.code).padStart(2, "0"));
    if (new Set(codes).size !== 24 || VENUE_CODES.some((code) => !codes.includes(code))) {
      return false;
    }

    for (const venue of dataset.venues) {
      const races = Array.isArray(venue.races) ? venue.races : [];
      if (!venue.active) {
        if (races.length) return false;
        continue;
      }
      if (races.length !== 12) return false;
      for (let index = 0; index < 12; index += 1) {
        const race = races[index];
        if (!race || Number(race.number) !== index + 1) return false;
        if (!race.closeTime || Number.isNaN(new Date(race.closeTime).getTime())) return false;
        if (!Array.isArray(race.entries) || race.entries.length !== 6) return false;
        for (let boat = 1; boat <= 6; boat += 1) {
          if (!validEntry(race.entries[boat - 1], boat)) return false;
        }
      }
    }
    return true;
  }

  function jstDate(value) {
    const date = value instanceof Date ? value : new Date(value == null ? Date.now() : value);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const item = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${item.year}-${item.month}-${item.day}`;
  }

  function savedTotals(records, now = new Date()) {
    const today = jstDate(now);
    const [year, month, day] = today.split("-").map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const monday = new Date(Date.UTC(year, month - 1, day - ((weekday + 6) % 7)));
    const weekStart = monday.toISOString().slice(0, 10);
    const monthStart = `${today.slice(0, 7)}-01`;
    const totals = { today: 0, week: 0, month: 0, all: 0 };
    for (const record of records || []) {
      const amount = Number(record.saved) || 0;
      const recordDate = record.time ? jstDate(record.time) : record.raceDate;
      totals.all += amount;
      if (recordDate === today) totals.today += amount;
      if (recordDate && recordDate >= weekStart && recordDate <= today) totals.week += amount;
      if (recordDate && recordDate >= monthStart && recordDate <= today) totals.month += amount;
    }
    return totals;
  }

  function behaviorStats(records, windowMinutes = 30) {
    const ordered = (records || [])
      .filter((record) => !Number.isNaN(new Date(record.time).getTime()))
      .slice()
      .sort((a, b) => new Date(a.time) - new Date(b.time));
    const windowMs = windowMinutes * 60 * 1000;
    const chaseIndexes = new Set();
    let postLossChase = 0;
    let escalation = 0;
    let rapid = 0;

    ordered.forEach((record, index) => {
      if (record.reason === "取り返したい") chaseIndexes.add(index);
      if (!index) return;
      const previous = ordered[index - 1];
      const elapsed = new Date(record.time) - new Date(previous.time);
      const currentAmount = Number(record.intendedYen ?? record.stake ?? 0) || 0;
      const previousAmount = Number(previous.intendedYen ?? previous.stake ?? 0) || 0;
      if (elapsed >= 0 && elapsed <= windowMs && currentAmount > previousAmount) {
        escalation += 1;
        if (previous.status === "miss") {
          postLossChase += 1;
          chaseIndexes.add(index);
        }
      }
    });
    for (let index = 2; index < ordered.length; index += 1) {
      const elapsed = new Date(ordered[index].time) - new Date(ordered[index - 2].time);
      if (elapsed >= 0 && elapsed <= windowMs) rapid += 1;
    }

    const reviewed = ordered.filter((record) => record.afterUrge != null);
    const urgeDrop = reviewed.length
      ? reviewed.reduce(
        (sum, record) => sum + (Number(record.urge) - Number(record.afterUrge)),
        0
      ) / reviewed.length
      : null;
    const byReason = {};
    const byVenue = {};
    ordered.forEach((record) => {
      const reason = record.reason || "未入力";
      byReason[reason] = (byReason[reason] || 0) + 1;
      if (Number(record.saved) > 0) {
        const venue = record.venue || record.venueCode || "不明";
        byVenue[venue] = (byVenue[venue] || 0) + Number(record.saved);
      }
    });
    return {
      chase: chaseIndexes.size,
      declaredChase: ordered.filter((record) => record.reason === "取り返したい").length,
      postLossChase,
      escalation,
      rapid,
      urgeDrop,
      topReason: Object.entries(byReason).sort((a, b) => b[1] - a[1])[0] || null,
      topVenue: Object.entries(byVenue).sort((a, b) => b[1] - a[1])[0] || null,
    };
  }

  return {
    normalizeCombo,
    payoutList,
    findRace,
    settleRecord,
    validateDataset,
    savedTotals,
    behaviorStats,
    jstDate,
  };
});
