(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MamoCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const VENUE_CODES = Array.from({ length: 24 }, (_, index) =>
    String(index + 1).padStart(2, "0")
  );

  const BET_TYPES = {
    win: { label: "単勝", picks: 1, ordered: true },
    place: { label: "複勝", picks: 1, ordered: true },
    exacta: { label: "2連単", picks: 2, ordered: true },
    quinella: { label: "2連複", picks: 2, ordered: false },
    wide: { label: "拡連複", picks: 2, ordered: false },
    trifecta: { label: "3連単", picks: 3, ordered: true },
    trio: { label: "3連複", picks: 3, ordered: false },
  };

  const BET_TYPE_ALIASES = {
    "単勝": "win",
    "複勝": "place",
    "2連単": "exacta",
    "２連単": "exacta",
    "2連複": "quinella",
    "２連複": "quinella",
    "拡連複": "wide",
    "3連単": "trifecta",
    "３連単": "trifecta",
    "3連複": "trio",
    "３連複": "trio",
  };

  function normalizeBetType(value) {
    const key = String(value || "trifecta");
    return BET_TYPES[key] ? key : BET_TYPE_ALIASES[key] || "trifecta";
  }

  function normalizeCombo(value) {
    return String(value || "")
      .replace(/\s/g, "")
      .replace(/[―ー−]/g, "-");
  }

  function canonicalCombo(value, betType = "trifecta") {
    const type = normalizeBetType(betType);
    const parts = (Array.isArray(value) ? value : normalizeCombo(value).split("-"))
      .map(Number)
      .filter((boat) => Number.isInteger(boat) && boat >= 1 && boat <= 6);
    if (!BET_TYPES[type].ordered) parts.sort((a, b) => a - b);
    return parts.join("-");
  }

  function payoutList(result, betType = "trifecta") {
    if (!result) return [];
    const type = normalizeBetType(betType);
    const typePayouts = result.payouts && result.payouts[type];
    const fallback = type === "trifecta" ? result.sanrensho : null;
    const source = typePayouts == null ? fallback : typePayouts;
    const raw = Array.isArray(source)
      ? source
      : source
        ? [source]
        : [];
    return raw
      .map((item) => ({
        betType: type,
        combination: canonicalCombo(item.combination, type),
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

  function resultRefundBoats(result) {
    const explicit = (result && result.refundBoats || [])
      .map(Number)
      .filter((boat) => Number.isInteger(boat) && boat >= 1 && boat <= 6);
    if (explicit.length) return new Set(explicit);

    // 旧JSONとの互換用。F/L/欠場など明確に返還となる状態だけ補助判定する。
    const derived = (result && result.statuses || [])
      .filter((item) => {
        const status = String(item && item.status || "").trim();
        return /^F\d?$/.test(status)
          || /^L\d?$/.test(status)
          || ["欠", "欠場", "返", "返還", "除", "除外"].includes(status);
      })
      .map((item) => Number(item.boatNumber))
      .filter((boat) => Number.isInteger(boat) && boat >= 1 && boat <= 6);
    return new Set(derived);
  }

  function elapsedMinutes(startValue, endValue) {
    const start = new Date(startValue || "").getTime();
    const end = new Date(endValue || "").getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
    return Math.round(((end - start) / 60000) * 100) / 100;
  }

  function stampResultTiming(record, race, reflectedAt) {
    const reflected = new Date(reflectedAt || "");
    const reflectedIso = Number.isFinite(reflected.getTime())
      ? reflected.toISOString()
      : new Date().toISOString();
    const closeTime = race.closeTime || record.closeTime || null;
    const fetchedAt = race.result?.fetchedAt || null;
    const closeToReflected = elapsedMinutes(closeTime, reflectedIso);
    const closeToFetched = elapsedMinutes(closeTime, fetchedAt);
    const fetchedMs = new Date(fetchedAt || "").getTime();
    const reflectedMs = new Date(reflectedIso).getTime();

    record.settledAt = reflectedIso;
    record.resultReflectedAt = reflectedIso;
    record.resultFetchedAt = fetchedAt;
    record.resultLatencyMinutes = closeToReflected;
    record.resultFetchLatencyMinutes = closeToFetched;
    record.resultDeliverySeconds = Number.isFinite(fetchedMs) && reflectedMs >= fetchedMs
      ? Math.round((reflectedMs - fetchedMs) / 1000)
      : null;
  }

  function resultLatencyStats(records) {
    const numericValues = (key) => (records || []).flatMap((record) => {
      const raw = record?.[key];
      if (raw == null || raw === "") return [];
      const value = Number(raw);
      return Number.isFinite(value) && value >= 0 ? [value] : [];
    }).sort((a, b) => a - b);
    const values = numericValues("resultLatencyMinutes");
    const fetchedValues = numericValues("resultFetchLatencyMinutes");
    const median = (items) => {
      if (!items.length) return null;
      const middle = Math.floor(items.length / 2);
      return items.length % 2
        ? items[middle]
        : Math.round(((items[middle - 1] + items[middle]) / 2) * 100) / 100;
    };
    const average = (items) => items.length
      ? Math.round((items.reduce((sum, value) => sum + value, 0) / items.length) * 100) / 100
      : null;
    return {
      samples: values.length,
      medianMinutes: median(values),
      averageMinutes: average(values),
      minMinutes: values[0] ?? null,
      maxMinutes: values[values.length - 1] ?? null,
      fetchedSamples: fetchedValues.length,
      fetchedMedianMinutes: median(fetchedValues),
    };
  }

  function settleRecord(record, dataset, reflectedAt = new Date().toISOString()) {
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
      record.refundC = refund;
      record.resultCombo = "不成立";
      record.resultPayout = null;
      record.resultPayouts = [];
      record.settled = true;
      stampResultTiming(record, race, reflectedAt);
      return { changed: true, payoutAdded: refund, hit: false, refunded: true };
    }

    if (race.result.settleable === false) {
      return { changed: false, payoutAdded: 0, hit: false, refunded: false };
    }

    const lines = record.lines || [];
    const lineTypes = [...new Set(lines.map(
      (line) => normalizeBetType(line.betType)
    ))];
    const notEstablishedTypes = new Set(
      (race.result.notEstablishedTypes || []).map(normalizeBetType)
    );
    const refundBoats = resultRefundBoats(race.result);
    const payoutsByType = new Map(lineTypes.map(
      (type) => [type, payoutList(race.result, type)]
    ));
    if (lineTypes.some(
      (type) => !notEstablishedTypes.has(type) && !payoutsByType.get(type).length
    )) {
      return { changed: false, payoutAdded: 0, hit: false, refunded: false };
    }

    let payoutC = 0;
    let refundedC = 0;
    for (const line of lines) {
      const type = normalizeBetType(line.betType);
      const stake = Number(line.stake) || 0;
      const combo = (line.combo || []).map(Number);
      if (notEstablishedTypes.has(type) || combo.some((boat) => refundBoats.has(boat))) {
        payoutC += stake;
        refundedC += stake;
        continue;
      }
      const winning = new Map(
        payoutsByType.get(type).map((item) => [item.combination, item])
      );
      const payout = winning.get(canonicalCombo(combo, type));
      if (payout) payoutC += (stake / 100) * payout.payout;
    }

    record.status = payoutC > refundedC
      ? "hit"
      : refundedC > 0 && refundedC === recordStake(record)
        ? "refunded"
        : "miss";
    record.payoutStatus = record.status === "refunded" ? "notEstablished" : "paid";
    record.payoutC = Math.round(payoutC);
    record.refundC = Math.round(refundedC);
    record.resultCombo = (race.result.finish || []).slice(0, 3)
      .map((item) => item.boatNumber).join("-") || "確定";
    const relevantPayouts = lineTypes.flatMap((type) =>
      payoutsByType.get(type).map((item) => ({
        betType: type,
        combo: item.combination,
        payout: item.payout,
        popularity: item.popularity,
      }))
    );
    record.resultPayout = relevantPayouts[0]?.payout || null;
    record.resultPayouts = relevantPayouts;
    record.settled = true;
    stampResultTiming(record, race, reflectedAt);
    return {
      changed: true,
      payoutAdded: record.payoutC,
      hit: record.status === "hit",
      refunded: record.status === "refunded",
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

  function rewardOutcome(record) {
    if (!record || record.rewardChallenge !== true) return "not-selected";
    if (!record.settled) return "pending";
    if (record.status === "hit") return "double-win";
    if (["miss", "refunded"].includes(record.status)) return "defense-stamp";
    return "pending";
  }

  function rewardMetrics(records, now = new Date()) {
    const today = jstDate(now);
    const list = records || [];
    const challenges = list.filter((record) => record.rewardChallenge === true);
    const doubleWins = list.filter((record) =>
      (record.rewardOutcome || rewardOutcome(record)) === "double-win"
    );
    const defenseStamps = list.filter((record) =>
      (record.rewardOutcome || rewardOutcome(record)) === "defense-stamp"
    );
    return {
      challenges: challenges.length,
      doubleWins: doubleWins.length,
      defenseStamps: defenseStamps.length,
      defenseMilestones: Math.floor(defenseStamps.length / 5),
      stampProgress: defenseStamps.length % 5,
      todayChallenge: challenges.find((record) => record.raceDate === today) || null,
    };
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
    const virtualHits = ordered.filter((record) => record.status === "hit");
    const reward = rewardMetrics(ordered);
    const intendedTotal = ordered.reduce(
      (sum, record) => sum + (Number(record.intendedYen) || 0),
      0
    );
    return {
      chase: chaseIndexes.size,
      declaredChase: ordered.filter((record) => record.reason === "取り返したい").length,
      postLossChase,
      escalation,
      rapid,
      urgeDrop,
      topReason: Object.entries(byReason).sort((a, b) => b[1] - a[1])[0] || null,
      topVenue: Object.entries(byVenue).sort((a, b) => b[1] - a[1])[0] || null,
      records: ordered.length,
      replacedTotal: intendedTotal,
      virtualHits: virtualHits.length,
      virtualHitRate: ordered.filter((record) => record.settled).length
        ? virtualHits.length / ordered.filter((record) => record.settled).length
        : null,
      intendedTotal,
      intendedAverage: ordered.length ? intendedTotal / ordered.length : 0,
      doubleWins: reward.doubleWins,
      defenseStamps: reward.defenseStamps,
    };
  }

  return {
    BET_TYPES,
    normalizeBetType,
    normalizeCombo,
    canonicalCombo,
    payoutList,
    findRace,
    settleRecord,
    resultLatencyStats,
    validateDataset,
    savedTotals,
    rewardOutcome,
    rewardMetrics,
    behaviorStats,
    jstDate,
  };
});
