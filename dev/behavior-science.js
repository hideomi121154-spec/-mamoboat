/*
 * MAMO BOAT Behavior Science v1
 *
 * Observes sequence, latency, stake change, plan/action mismatch, and official-site
 * return time. It never infers a feeling from one action and never diagnoses
 * dependence. Comparisons are within-person and show opportunity limitations.
 */
(() => {
  "use strict";
  if (window.__MAMO_BEHAVIOR_SCIENCE_V1__) return;
  window.__MAMO_BEHAVIOR_SCIENCE_V1__ = true;

  const APP_KEY = "mamoboat_v40_personal";
  const RECORD_KEY = "mamoboat_record_v1";
  const STORE_KEY = "mamoboat_behavior_science_v1";
  const MAX_EVENTS = 6000;
  const EPISODE_WINDOW = 8 * 60 * 60 * 1000;
  const INTENT_LABELS = Object.freeze({
    planned: "ある",
    undecided: "まだわからない",
    none: "ない",
  });

  let schedule = null;
  let lastRaceKey = "";
  let lastScreen = "";
  let intentEditing = false;
  let intentSignature = "";
  let analysisSignature = "";

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch (_) { return fallback; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  };
  const esc = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const uid = () => window.crypto?.randomUUID?.()
    || `bs-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const ms = (value) => {
    const result = new Date(value || 0).getTime();
    return Number.isFinite(result) ? result : 0;
  };
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
  const arr = (value) => Array.isArray(value) ? value : [];
  const dayKey = (value = Date.now()) => {
    try {
      const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
      }).formatToParts(new Date(value)).map((part) => [part.type, part.value]));
      return `${parts.year}-${parts.month}-${parts.day}`;
    } catch (_) {
      return new Date(value).toISOString().slice(0, 10);
    }
  };
  const recordId = (record) => String(record?.id || [
    record?.time, record?.raceDate, record?.venueCode || record?.venue, record?.raceNo, record?.stake,
  ].filter((value) => value != null && value !== "").join(":"));
  const outcomeOf = (record) => {
    const status = String(record?.status || "").toLowerCase();
    if (["hit", "won", "win"].includes(status)) return "hit";
    if (["miss", "lost", "loss"].includes(status)) return "miss";
    if (status === "refunded") return "refund";
    return "unknown";
  };
  const outcomeLabel = (value) => ({ hit: "的中", miss: "不的中", refund: "返還" }[value] || "結果確定");
  const median = (values) => {
    const list = values.filter((value) => Number.isFinite(value)).sort((left, right) => left - right);
    if (!list.length) return null;
    const middle = Math.floor(list.length / 2);
    return list.length % 2 ? list[middle] : (list[middle - 1] + list[middle]) / 2;
  };
  const ratio = (next, current) => Number.isFinite(next) && Number.isFinite(current) && current > 0
    ? next / current
    : null;
  const duration = (seconds) => {
    if (!Number.isFinite(seconds)) return "—";
    if (seconds < 60) return `${Math.max(1, Math.round(seconds))}秒`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}分`;
    const hours = seconds / 3600;
    return hours < 10 ? `${hours.toFixed(1)}時間` : `${Math.round(hours)}時間`;
  };
  const bfmt = (value) => Number.isFinite(value)
    ? `${Math.round(value).toLocaleString("ja-JP")}B`
    : "—";

  function store() {
    const value = read(STORE_KEY, {}) || {};
    return {
      version: 1,
      events: arr(value.events),
      intents: value.intents && typeof value.intents === "object" ? value.intents : {},
      seenRecordIds: arr(value.seenRecordIds),
      pendingOfficial: value.pendingOfficial || null,
    };
  }

  function contextFrom(input = {}) {
    const app = read(APP_KEY, {}) || {};
    return {
      raceDate: input.raceDate || dayKey(),
      venueCode: input.venueCode || app.venue || null,
      raceNo: input.raceNo == null ? (Number(app.raceNo) || null) : Number(input.raceNo),
      recordId: input.recordId || null,
    };
  }

  function publish(event) {
    const api = window.MAMO_DECISION_EVENTS;
    if (!api?.track) return;
    try {
      api.track(`behavior_${event.type}`, {
        behavior_science_version: 1,
        record_id: event.recordId,
        ...event.payload,
      }, {
        screen: document.body?.dataset?.screen || "unknown",
        raceDate: event.raceDate,
        venueCode: event.venueCode,
        raceNo: event.raceNo,
      });
    } catch (_) {}
  }

  function addEvent(type, input = {}, payload = {}, options = {}) {
    const current = store();
    const context = contextFrom(input);
    const event = {
      id: options.id || uid(),
      type,
      at: new Date(options.at || Date.now()).toISOString(),
      day: dayKey(options.at || Date.now()),
      ...context,
      payload: payload && typeof payload === "object" ? payload : {},
    };
    current.events.push(event);
    current.events = current.events.slice(-MAX_EVENTS);
    write(STORE_KEY, current);
    if (options.remote !== false) publish(event);
    if (document.body?.dataset?.screen === "analysis") queueMicrotask(() => renderAnalysis(true));
    return event;
  }

  function scheduleOpportunity(at = Date.now(), selected = {}) {
    const races = arr(schedule?.venues).flatMap((venue) => arr(venue?.races).map((race) => ({
      venueCode: String(venue.code || ""),
      raceNo: Number(race.number) || null,
      closeAt: ms(race.closeTime),
    }))).filter((race) => race.closeAt > at).sort((left, right) => left.closeAt - right.closeAt);
    const selectedRace = races.find((race) => String(race.venueCode) === String(selected.venueCode || "")
      && Number(race.raceNo) === Number(selected.raceNo));
    return {
      openRaceCount: races.length,
      nextCloseSeconds: races.length ? Math.max(0, Math.round((races[0].closeAt - at) / 1000)) : null,
      selectedCloseSeconds: selectedRace ? Math.max(0, Math.round((selectedRace.closeAt - at) / 1000)) : null,
    };
  }

  async function loadSchedule() {
    if (typeof fetch !== "function") return;
    try {
      const response = await fetch(`data/today.json?behavior=${Date.now()}`, { cache: "no-store" });
      if (response.ok) schedule = await response.json();
    } catch (_) {}
  }

  function currentRace() {
    if (document.body?.dataset?.screen !== "race") return null;
    const app = read(APP_KEY, {}) || {};
    const venueCode = String(app.venue || "");
    const raceNo = Number(app.raceNo) || null;
    if (!venueCode || !raceNo) return null;
    return { raceDate: schedule?.date || dayKey(), venueCode, raceNo };
  }

  function scanRaceView() {
    const screen = document.body?.dataset?.screen || "";
    const race = currentRace();
    const key = race ? `${race.raceDate}:${race.venueCode}:${race.raceNo}` : "";
    if (race && (key !== lastRaceKey || lastScreen !== "race")) {
      addEvent("race_view", race, scheduleOpportunity(Date.now(), race));
    }
    lastRaceKey = key;
    lastScreen = screen;
  }

  function airPayload(record, eventAt = Date.now()) {
    const at = ms(eventAt) || Date.now();
    return {
      stakeB: number(record?.stake) || 0,
      lineCount: arr(record?.lines).length,
      closeTime: record?.closeTime || null,
      secondsToClose: record?.closeTime
        ? Math.max(0, Math.round((ms(record.closeTime) - at) / 1000))
        : null,
      ...scheduleOpportunity(at, record),
    };
  }

  function scanRecords() {
    const app = read(APP_KEY, {}) || {};
    const records = arr(app.records);
    const current = store();
    const seen = new Set(current.seenRecordIds);
    const firstPass = !current.seenRecordIds.length;
    const newlySeen = [];
    records.forEach((record) => {
      const id = recordId(record);
      if (!id || seen.has(id)) return;
      seen.add(id);
      newlySeen.push(id);
      addEvent("air_bet", {
        raceDate: record.raceDate,
        venueCode: record.venueCode,
        raceNo: record.raceNo,
        recordId: id,
      }, airPayload(record, record.time), {
        at: record.time || Date.now(),
        remote: !firstPass,
      });
    });
    if (newlySeen.length) {
      const latest = store();
      latest.seenRecordIds = [...seen].slice(-4000);
      write(STORE_KEY, latest);
    }

    const recordState = read(RECORD_KEY, {}) || {};
    Object.values(recordState.postReflections || {}).forEach((observation) => {
      if (!observation?.observed || !observation.recordId) return;
      const record = records.find((item) => recordId(item) === String(observation.recordId));
      if (record) recordResultSeen(record, observation.source || "result_check", observation.recordedAt);
    });
  }

  function recordResultSeen(record, source = "result_sheet_shown", at = Date.now()) {
    const id = recordId(record);
    if (!id) return null;
    const current = store();
    const existing = current.events.find((event) => event.type === "result_seen" && event.recordId === id);
    if (existing) return existing;
    return addEvent("result_seen", {
      raceDate: record.raceDate,
      venueCode: record.venueCode,
      raceNo: record.raceNo,
      recordId: id,
    }, {
      outcome: outcomeOf(record),
      stakeB: number(record.stake) || 0,
      payoutB: number(record.payoutC) || 0,
      resultCombo: record.resultCombo || null,
      source,
      ...scheduleOpportunity(ms(at) || Date.now(), record),
    }, { at });
  }

  function officialKind(link) {
    const href = String(link?.href || "");
    const text = String(link?.textContent || "").replace(/\s+/g, " ").trim();
    if (/spweb\.brtb\.jp|ib\.mbrace\.or\.jp/i.test(href) || /REAL投票|投票サイト|舟券購入/.test(text)) return "real_intent";
    if (/結果|払戻|照合/.test(text) || /raceresult|result/i.test(href)) return "result_info";
    return "official_info";
  }

  function recordOfficialExit(link) {
    const href = String(link?.href || "");
    if (!/boatrace\.jp|brtb\.jp|mbrace\.or\.jp/i.test(href)) return;
    const race = currentRace() || contextFrom();
    const event = addEvent("official_exit", race, {
      destinationKind: officialKind(link),
      destinationHost: (() => { try { return new URL(href).host; } catch (_) { return "official"; } })(),
      linkText: String(link.textContent || "").replace(/\s+/g, " ").trim().slice(0, 100),
      ...scheduleOpportunity(Date.now(), race),
    });
    const current = store();
    current.pendingOfficial = {
      exitId: event.id,
      at: event.at,
      hiddenAt: null,
      raceDate: event.raceDate,
      venueCode: event.venueCode,
      raceNo: event.raceNo,
      destinationKind: event.payload.destinationKind,
    };
    write(STORE_KEY, current);
  }

  function markOfficialHidden() {
    const current = store();
    if (!current.pendingOfficial || current.pendingOfficial.hiddenAt) return;
    current.pendingOfficial.hiddenAt = new Date().toISOString();
    write(STORE_KEY, current);
  }

  function finishOfficialReturn(source = "visible") {
    const current = store();
    const pending = current.pendingOfficial;
    if (!pending) return;
    const started = ms(pending.hiddenAt || pending.at);
    const elapsed = started ? (Date.now() - started) / 1000 : 0;
    if (elapsed < 1) return;
    if (elapsed > 12 * 60 * 60) {
      current.pendingOfficial = null;
      write(STORE_KEY, current);
      return;
    }
    current.pendingOfficial = null;
    write(STORE_KEY, current);
    addEvent("official_return", pending, {
      exitId: pending.exitId,
      destinationKind: pending.destinationKind,
      awaySeconds: Math.round(elapsed),
      source,
      ...scheduleOpportunity(Date.now(), pending),
    });
  }

  function opportunityBand(event) {
    const seconds = number(event?.payload?.selectedCloseSeconds ?? event?.payload?.nextCloseSeconds);
    if (!Number.isFinite(seconds)) return "unknown";
    if (seconds <= 10 * 60) return "under10";
    if (seconds <= 30 * 60) return "under30";
    return "over30";
  }

  function buildEpisodes(events, records, intents) {
    const list = arr(events).slice().sort((left, right) => ms(left.at) - ms(right.at));
    const recordMap = new Map(arr(records).map((record) => [recordId(record), record]));
    const resultEvents = list.filter((event) => event.type === "result_seen")
      .filter((event, index, values) => values.findIndex((item) => item.recordId === event.recordId) === index);
    return resultEvents.map((result, index) => {
      const start = ms(result.at);
      const nextResult = resultEvents[index + 1];
      const end = Math.min(start + EPISODE_WINDOW, nextResult ? ms(nextResult.at) : Infinity);
      const subsequent = list.filter((event) => ms(event.at) > start && ms(event.at) < end);
      const nextRace = subsequent.find((event) => event.type === "race_view"
        && !(String(event.venueCode) === String(result.venueCode) && Number(event.raceNo) === Number(result.raceNo)));
      const nextAir = subsequent.find((event) => event.type === "air_bet" && event.recordId !== result.recordId);
      const officialExits = subsequent.filter((event) => event.type === "official_exit" && event.payload?.destinationKind === "real_intent");
      const officialReturns = officialExits.map((exit) => subsequent.find((event) => event.type === "official_return" && event.payload?.exitId === exit.id)).filter(Boolean);
      const officialExit = officialExits[0] || null;
      const officialReturn = officialReturns[0] || null;
      const officialAwaySeconds = median(officialReturns.map((event) => number(event.payload?.awaySeconds)));
      const action = [nextRace, nextAir, officialExit].filter(Boolean).sort((left, right) => ms(left.at) - ms(right.at))[0] || null;
      const record = recordMap.get(result.recordId) || {};
      const nextRecord = nextAir ? recordMap.get(nextAir.recordId) || {} : {};
      const currentStake = number(result.payload?.stakeB ?? record.stake) || 0;
      const nextStake = nextAir ? number(nextAir.payload?.stakeB ?? nextRecord.stake) : null;
      return {
        id: result.recordId,
        result,
        record,
        outcome: result.payload?.outcome || outcomeOf(record),
        startedAt: result.at,
        stakeB: currentStake,
        intent: intents[result.day]?.value || null,
        action,
        actionSeconds: action ? Math.max(0, (ms(action.at) - start) / 1000) : null,
        nextRace,
        nextRaceSeconds: nextRace ? Math.max(0, (ms(nextRace.at) - start) / 1000) : null,
        nextAir,
        nextAirSeconds: nextAir ? Math.max(0, (ms(nextAir.at) - start) / 1000) : null,
        nextStakeB: nextStake,
        nextStakeRatio: ratio(nextStake, currentStake),
        officialExit,
        officialExits,
        officialExitCount: officialExits.length,
        officialExitSeconds: officialExit ? Math.max(0, (ms(officialExit.at) - start) / 1000) : null,
        officialReturn,
        officialReturns,
        officialAwaySeconds,
        opportunityBand: opportunityBand(result),
      };
    });
  }

  function intentJourneys(events, intents) {
    const list = arr(events).slice().sort((left, right) => ms(left.at) - ms(right.at));
    return Object.entries(intents || {}).map(([day, intent]) => {
      const start = ms(intent.recordedAt);
      const sameDay = list.filter((event) => event.day === day && ms(event.at) >= start);
      const firstRace = sameDay.find((event) => event.type === "race_view");
      const firstAir = sameDay.find((event) => event.type === "air_bet");
      const raceViewsBeforeAir = sameDay.filter((event) => event.type === "race_view"
        && (!firstAir || ms(event.at) <= ms(firstAir.at))).length;
      return {
        day,
        value: intent.value,
        recordedAt: intent.recordedAt,
        firstRaceSeconds: firstRace ? (ms(firstRace.at) - start) / 1000 : null,
        firstAirSeconds: firstAir ? (ms(firstAir.at) - start) / 1000 : null,
        firstRace,
        firstAir,
        raceViewsBeforeAir,
      };
    });
  }

  function outcomeSummary(episodes, outcome) {
    const selected = episodes.filter((episode) => episode.outcome === outcome);
    const officialEpisodeCount = selected.filter((episode) => episode.officialExitCount > 0).length;
    return {
      count: selected.length,
      nextRaceCount: selected.filter((episode) => Number.isFinite(episode.nextRaceSeconds)).length,
      nextRaceMedian: median(selected.map((episode) => episode.nextRaceSeconds)),
      nextAirCount: selected.filter((episode) => Number.isFinite(episode.nextAirSeconds)).length,
      nextAirMedian: median(selected.map((episode) => episode.nextAirSeconds)),
      nextStakeRatioMedian: median(selected.map((episode) => episode.nextStakeRatio)),
      officialCount: selected.reduce((sum, episode) => sum + (episode.officialExitCount || 0), 0),
      officialEpisodeCount,
      officialRate: selected.length ? officialEpisodeCount / selected.length * 100 : null,
      officialAwayMedian: median(selected.map((episode) => episode.officialAwaySeconds)),
      bands: [...new Set(selected.map((episode) => episode.opportunityBand).filter((band) => band !== "unknown"))],
    };
  }

  function intentSummary(journeys, value) {
    const selected = journeys.filter((journey) => journey.value === value);
    const airDays = selected.filter((journey) => journey.firstAir).length;
    return {
      value,
      count: selected.length,
      firstRaceCount: selected.filter((journey) => journey.firstRace).length,
      firstRaceMedian: median(selected.map((journey) => journey.firstRaceSeconds)),
      firstAirCount: airDays,
      firstAirMedian: median(selected.map((journey) => journey.firstAirSeconds)),
      raceViewsBeforeAirMedian: median(selected.filter((journey) => journey.firstAir).map((journey) => journey.raceViewsBeforeAir)),
      airRate: selected.length ? airDays / selected.length * 100 : null,
    };
  }

  function buildModel(input = {}) {
    const app = input.app || read(APP_KEY, {}) || {};
    const currentStore = input.store || store();
    const events = arr(input.events || currentStore.events);
    const records = arr(input.records || app.records);
    const intents = input.intents || currentStore.intents || {};
    const episodes = buildEpisodes(events, records, intents);
    const journeys = intentJourneys(events, intents);
    const hit = outcomeSummary(episodes, "hit");
    const miss = outcomeSummary(episodes, "miss");
    const commonBands = hit.bands.filter((band) => miss.bands.includes(band));
    const comparableEpisodes = commonBands.length
      ? episodes.filter((episode) => commonBands.includes(episode.opportunityBand))
      : episodes;
    const comparisonHit = outcomeSummary(comparableEpisodes, "hit");
    const comparisonMiss = outcomeSummary(comparableEpisodes, "miss");
    const actionBaseline = median(episodes.map((episode) => episode.actionSeconds));
    const bandBaselines = Object.fromEntries(["under10", "under30", "over30"].map((band) => {
      const values = episodes.filter((episode) => episode.opportunityBand === band).map((episode) => episode.actionSeconds);
      return [band, values.filter(Number.isFinite).length >= 3 ? median(values) : null];
    }));
    const missTwoFactor = episodes.filter((episode) => {
      const baseline = bandBaselines[episode.opportunityBand] ?? actionBaseline;
      return episode.outcome === "miss"
        && Number.isFinite(baseline)
        && Number.isFinite(episode.actionSeconds)
        && episode.actionSeconds < baseline
        && Number.isFinite(episode.nextStakeRatio)
        && episode.nextStakeRatio > 1;
    });
    const hitOfficial = episodes.filter((episode) => episode.outcome === "hit" && episode.officialExit);
    const noPlanThenAir = journeys.filter((journey) => journey.value === "none" && journey.firstAir);
    const undecidedThenAir = journeys.filter((journey) => journey.value === "undecided" && journey.firstAir);
    const comparableOpportunity = hit.bands.some((band) => miss.bands.includes(band));
    const latest = episodes[episodes.length - 1] || null;
    return {
      version: 1,
      events,
      records,
      intents,
      episodes,
      journeys,
      latest,
      hit,
      miss,
      plan: {
        planned: intentSummary(journeys, "planned"),
        undecided: intentSummary(journeys, "undecided"),
        none: intentSummary(journeys, "none"),
      },
      comparableOpportunity,
      comparison: {
        controlled: commonBands.length > 0,
        bands: commonBands,
        hit: comparisonHit,
        miss: comparisonMiss,
      },
      metrics: {
        resultAnchors: episodes.length,
        nextRaceMedian: median(episodes.map((episode) => episode.nextRaceSeconds)),
        nextAirMedian: median(episodes.map((episode) => episode.nextAirSeconds)),
        officialReturns: episodes.filter((episode) => episode.officialReturn).length,
        planDays: journeys.length,
        noPlanThenAir: noPlanThenAir.length,
        undecidedThenAir: undecidedThenAir.length,
      },
      signals: {
        missTwoFactor,
        hitOfficial,
        noPlanThenAir,
      },
      sampleLevel: comparisonHit.count >= 5 && comparisonMiss.count >= 5 ? "repeated" : episodes.length >= 3 ? "provisional" : "facts",
    };
  }

  function barHeight(value, left, right) {
    if (!Number.isFinite(value)) return 5;
    const maximum = Math.max(left || 0, right || 0, 1);
    return Math.max(8, Math.round(value / maximum * 100));
  }

  function compareVisual(title, note, hitValue, missValue, formatter = duration, hitN = 0, missN = 0) {
    const hitHeight = barHeight(hitValue, hitValue, missValue);
    const missHeight = barHeight(missValue, hitValue, missValue);
    return `<article class="bs-compare">
      <header><div><small>RESULT CONDITION</small><h3>${esc(title)}</h3></div><span>${esc(note)}</span></header>
      <div class="bs-bars" role="img" aria-label="${esc(title)}。的中後${esc(formatter(hitValue))}、不的中後${esc(formatter(missValue))}">
        <div><b>${esc(formatter(hitValue))}</b><i style="--height:${hitHeight}%"></i><span>的中後・n=${hitN}</span></div>
        <div><b>${esc(formatter(missValue))}</b><i style="--height:${missHeight}%"></i><span>不的中後・n=${missN}</span></div>
      </div>
      <p>${Number.isFinite(hitValue) && Number.isFinite(missValue) ? "同じ人の結果条件別の記述値です。各n=5までは傾向と呼びません。" : "両方の結果条件が揃うと比較を開始します。"}</p>
    </article>`;
  }

  function planVisual(model) {
    const rows = [model.plan.planned, model.plan.undecided, model.plan.none];
    const maximum = Math.max(1, ...rows.flatMap((item) => [item.firstRaceMedian || 0, item.firstAirMedian || 0]));
    const width = (value) => Number.isFinite(value) ? Math.max(4, Math.round(value / maximum * 100)) : 0;
    const views = (value) => Number.isFinite(value) ? `${value.toFixed(value % 1 ? 1 : 0)}レース` : "—";
    return `<section class="bs-plan-report"><header><div><small>PLAN → ACTION</small><h3>朝の予定から、実際の行動まで</h3></div><p>回答した時刻を0として比較</p></header>
      <div class="bs-plan-legend"><span class="view">最初の閲覧</span><span class="air">最初のAIR BET</span></div>
      <div class="bs-plan-rows">${rows.map((item) => `<article><div class="bs-plan-label"><b>${esc(INTENT_LABELS[item.value])}</b><span>${item.count}日</span></div><div class="bs-plan-tracks"><div><i class="view" style="--width:${width(item.firstRaceMedian)}%"></i><span>${esc(duration(item.firstRaceMedian))}</span></div><div><i class="air" style="--width:${width(item.firstAirMedian)}%"></i><span>${esc(duration(item.firstAirMedian))}</span></div></div><small>AIR実行 ${item.firstAirCount}/${item.count}日・AIR前に閲覧 ${esc(views(item.raceViewsBeforeAirMedian))}</small></article>`).join("")}</div>
      <footer>「ある」がすぐ動くか、「まだわからない／ない」が長く見てから動くかを、質問ではなく時間と順番で確認します。</footer></section>`;
  }

  function timeline(model) {
    const episode = model.latest;
    if (!episode) {
      return `<article class="bs-timeline empty"><small>LATEST SEQUENCE</small><h3>結果確認から、計測が始まります。</h3><div class="bs-flow"><span>結果</span><i>→</i><span>次の閲覧</span><i>→</i><span>AIR / 公式</span></div><p>感情を入力する必要はありません。操作の順番と時間だけを残します。</p></article>`;
    }
    const events = [
      { at: ms(episode.result.at), label: `結果：${outcomeLabel(episode.outcome)}`, sub: bfmt(episode.stakeB) },
      episode.nextRace ? { at: ms(episode.nextRace.at), label: `${episode.nextRace.venueCode || ""} ${episode.nextRace.raceNo || ""}Rを閲覧`, sub: duration(episode.nextRaceSeconds) } : null,
      episode.officialExit ? { at: ms(episode.officialExit.at), label: "公式投票導線へ", sub: duration(episode.officialExitSeconds) } : null,
      episode.officialReturn ? { at: ms(episode.officialReturn.at), label: "MAMOへ戻る", sub: `滞在 ${duration(episode.officialAwaySeconds)}` } : null,
      episode.nextAir ? { at: ms(episode.nextAir.at), label: `次のAIR ${bfmt(episode.nextStakeB)}`, sub: duration(episode.nextAirSeconds) } : null,
    ].filter(Boolean).sort((left, right) => left.at - right.at);
    return `<article class="bs-timeline"><small>LATEST SEQUENCE / ${esc(episode.result.raceDate || "")}</small><h3>直近1件の「結果のあと」</h3><div class="bs-flow detailed">${events.map((event, index) => `${index ? "<i>→</i>" : ""}<span><b>${esc(event.label)}</b><small>${esc(event.sub)}</small></span>`).join("")}</div><p>順番と経過時間の事実です。気持ちの原因までは断定しません。</p></article>`;
  }

  function signalCard(label, count, detail, tone) {
    return `<div class="bs-signal ${tone}"><small>観測材料</small><strong>${count ? `${count}回` : "蓄積中"}</strong><b>${esc(label)}</b><p>${esc(detail)}</p></div>`;
  }

  function renderMetrics(model) {
    const host = document.getElementById("analysisCards");
    if (!host) return;
    host.className = "stat-grid bs-metrics";
    host.dataset.insightVersion = "behavior-science-1";
    const metrics = [
      ["結果起点", model.metrics.resultAnchors ? `${model.metrics.resultAnchors}件` : "記録待ち", "結果表示から同じ行動列にする"],
      ["次レースまで", duration(model.metrics.nextRaceMedian), "本人の中央値"],
      ["次のAIRまで", duration(model.metrics.nextAirMedian), "本人の中央値"],
      ["公式投票導線", model.hit.officialCount + model.miss.officialCount ? `${model.hit.officialCount + model.miss.officialCount}回` : "記録待ち", "購入回数ではありません"],
    ];
    host.innerHTML = metrics.map(([label, value, note]) => `<div class="stat-card bs-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`).join("");
  }

  function renderAnalysis(force = false) {
    const host = document.getElementById("analysisList");
    if (!host) return;
    const model = buildModel();
    const compared = model.comparison;
    const hit = compared.hit;
    const miss = compared.miss;
    const signature = `${model.events.length}:${model.records.length}:${Object.keys(model.intents).length}:${document.body?.dataset?.mamoPlan || "free"}`;
    if (!force && signature === analysisSignature && host.dataset.owner === "behavior-science") return;
    analysisSignature = signature;
    renderMetrics(model);
    host.dataset.owner = "behavior-science";
    host.dataset.insightVersion = "behavior-science-1";
    host.className = "analysis-list bs-report";
    const sampleText = model.sampleLevel === "repeated"
      ? `条件別比較を開始・的中 ${model.hit.count}件 / 不的中 ${model.miss.count}件`
      : model.sampleLevel === "provisional"
        ? `記述値のみ・的中 ${model.hit.count}件 / 不的中 ${model.miss.count}件`
        : `事実を蓄積中・的中 ${model.hit.count}件 / 不的中 ${model.miss.count}件`;
    const opportunityNote = compared.controlled
      ? "結果確認時の次締切が同じ時間帯の回だけで比較"
      : "同じ締切条件が揃うまでは未調整の参考値";
    const ratioFormatter = (value) => Number.isFinite(value) ? `${value.toFixed(2)}倍` : "—";
    host.innerHTML = `<section class="bs-intro">
      <div><small>MAMO BEHAVIOR LAB / PASSIVE</small><h3>聞かずに、行動の流れで見る。</h3><p>予定、結果、次の閲覧、次のAIR BET、公式サイトから戻るまでを一つの行動列として比較します。</p><b>${esc(sampleText)}・本人の過去との比較</b></div>
      <div class="bs-method-mark" aria-hidden="true"><span>予定</span><i>→</i><span>結果</span><i>→</i><span>次</span></div>
    </section>
    ${planVisual(model)}
    ${timeline(model)}
    <div class="bs-compare-grid">
      ${compareVisual("次のレースを見るまで", opportunityNote, hit.nextRaceMedian, miss.nextRaceMedian, duration, hit.nextRaceCount, miss.nextRaceCount)}
      ${compareVisual("次のAIR BETまで", opportunityNote, hit.nextAirMedian, miss.nextAirMedian, duration, hit.nextAirCount, miss.nextAirCount)}
      ${compareVisual("次のAIR BET額の倍率", "前のAIR BET額を1.00とした中央値", hit.nextStakeRatioMedian, miss.nextStakeRatioMedian, ratioFormatter, hit.nextAirCount, miss.nextAirCount)}
      ${compareVisual("公式投票導線を開いた割合", "開いた＝購入ではありません", hit.officialRate, miss.officialRate, (value) => Number.isFinite(value) ? `${Math.round(value)}%` : "—", hit.count, miss.count)}
      ${compareVisual("公式導線から戻るまで", "計測できた往復の中央値", hit.officialAwayMedian, miss.officialAwayMedian, duration, hit.officialEpisodeCount, miss.officialEpisodeCount)}
    </div>
    <section class="bs-signal-section"><header><small>MULTI-SIGNAL CHECK</small><h3>直接聞かずに見る3つの材料</h3><p>単独では意味を決めません。同じ組合せが繰り返すかを確認します。1回は「起きた事実」で、傾向ではありません。</p></header>
      <div class="bs-signal-grid">
        ${signalCard("不的中後の加速＋増額", model.signals.missTwoFactor.length, "本人の通常中央値より早く次へ進み、次のAIR BET額も増えた回。", "red")}
        ${signalCard("的中後の公式移動", model.signals.hitOfficial.length, "的中確認後に公式投票導線を開いた回。購入したとは扱いません。", "gold")}
        ${signalCard("『ない』から予定変更", model.signals.noPlanThenAir.length, "朝の予定が『ない』だった日に、その後AIR BETした回。", "blue")}
      </div>
    </section>
    <details class="bs-details"><summary><span>分析方法と限界</span><b>＋</b></summary><div>
      <h4>この画面が測るもの</h4><p>結果表示を時刻0として、次のレース閲覧、次のAIR BET、公式投票導線、アプリへ戻るまでの秒数と順番を測ります。</p>
      <h4>比較の仕方</h4><p>他人との順位ではなく、本人の中央値と、的中後・不的中後の差を見ます。締切までの残り時間と、その時点で選べたレース数も一緒に保存します。</p>
      <h4>表示しないもの</h4><p>「悔しい」「取り返したい」「依存度」を1回の操作から断定しません。ここに出るのは診断ではなく、詳しく確認するための行動材料です。</p>
    </div></details>
    <footer class="bs-foot">PILOT：3人テストでは固定の危険閾値を置かず、各テスターの基準を先に作ります。</footer>`;
    window.MAMO_BEHAVIOR_SCIENCE_PROFILE = Object.freeze({
      generatedAt: new Date().toISOString(),
      episodeCount: model.episodes.length,
      sampleLevel: model.sampleLevel,
    });
  }

  function renderIntent(force = false) {
    const home = document.getElementById("home");
    const command = home?.querySelector(".home-command");
    const app = read(APP_KEY, {}) || {};
    if (!home || !command || app.accepted !== true) return;
    let panel = document.getElementById("mamoDailyIntent");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "mamoDailyIntent";
      panel.className = "bs-intent";
      command.insertAdjacentElement("afterend", panel);
    }
    const current = store();
    const today = dayKey();
    const intent = current.intents[today] || null;
    const signature = `${today}:${intent?.value || "none"}:${intentEditing}`;
    if (!force && signature === intentSignature) return;
    intentSignature = signature;
    if (intent && !intentEditing) {
      panel.innerHTML = `<div><small>TODAY'S PLAN / 1日1回</small><b>今日の予定：${esc(INTENT_LABELS[intent.value] || intent.value)}</b><p>ここから先は、操作の順番と時間を自動で記録します。</p></div><button type="button" data-intent-change>変更</button>`;
      return;
    }
    panel.innerHTML = `<div class="bs-intent-copy"><small>TODAY'S PLAN / 予定だけ</small><h2>今日、勝負すると決めているレースはありますか？</h2><p>気持ちではなく、今の予定だけを1回記録します。</p></div><div class="bs-intent-options" role="group" aria-label="今日決めているレース"><button type="button" data-intent-value="planned">ある</button><button type="button" data-intent-value="undecided">まだわからない</button><button type="button" data-intent-value="none">ない</button></div>`;
  }

  function setIntent(value) {
    if (!Object.prototype.hasOwnProperty.call(INTENT_LABELS, value)) return;
    const current = store();
    const today = dayKey();
    const previous = current.intents[today]?.value || null;
    const opportunity = scheduleOpportunity(Date.now());
    current.intents[today] = { value, recordedAt: new Date().toISOString(), previous, opportunity };
    write(STORE_KEY, current);
    addEvent(previous ? "daily_intent_changed" : "daily_intent", { raceDate: today }, { value, previous, ...opportunity });
    intentEditing = false;
    intentSignature = "";
    renderIntent(true);
  }

  function styles() {
    if (document.getElementById("mamoBehaviorScienceStyle")) return;
    const style = document.createElement("style");
    style.id = "mamoBehaviorScienceStyle";
    style.textContent = `
      #analysis.active>#analysisList.bs-report{order:23}#analysis.active>.section-head:has(+ #analysisList){order:22}
      .bs-intent{margin:12px 0;padding:14px;border:1px solid #d3dee4;border-left:6px solid #c51e2d;border-radius:16px;background:linear-gradient(120deg,#fff,#f6fafc);box-shadow:0 5px 14px rgba(8,35,61,.06)}.bs-intent>div:first-child small,.bs-intent-copy small{display:block;color:#b51b29;font-size:8px;font-weight:1000;letter-spacing:.13em}.bs-intent h2{margin:4px 0;color:#08233d;font-size:19px;line-height:1.35}.bs-intent p{margin:4px 0 0;color:#62747d;font-size:10px;font-weight:700;line-height:1.55}.bs-intent-options{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:11px}.bs-intent-options button{min-height:46px;border:1px solid #cad7dd;border-radius:11px;background:#fff;color:#0a3858;font-size:11px;font-weight:1000}.bs-intent>button[data-intent-change]{float:right;margin-top:-34px;border:0;background:transparent;color:#0a638e;font-size:9px;font-weight:1000}
      #analysisCards.bs-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.bs-metric{min-width:0;padding:12px!important;border-top-color:#08233d!important}.bs-metric span,.bs-metric small{display:block}.bs-metric small{margin-top:4px;color:#71828a;font-size:8px}.bs-metric strong{overflow-wrap:anywhere}
      #analysisList.bs-report{display:grid;gap:12px}.bs-intro{display:grid;grid-template-columns:minmax(0,1fr) 108px;gap:12px;align-items:center;padding:15px;border:1px solid #d8e0e3;border-top:6px solid #c91e2d;border-radius:18px;background:linear-gradient(125deg,#fff,#f4f9fb);box-shadow:0 7px 17px rgba(8,35,61,.07)}.bs-intro small,.bs-signal-section header small{color:#b51b29;font-size:8px;font-weight:1000;letter-spacing:.14em}.bs-intro h3{margin:4px 0;color:#08233d;font-size:22px;line-height:1.3}.bs-intro p{margin:0;color:#5d7079;font-size:10px;line-height:1.6}.bs-intro>div>b{display:block;margin-top:7px;color:#087f7a;font-size:9px}.bs-method-mark{display:grid;grid-template-columns:1fr;gap:4px}.bs-method-mark span{padding:7px;border-radius:8px;background:#082f50;color:#fff;font-size:9px;font-weight:1000;text-align:center}.bs-method-mark i{color:#c91e2d;font-style:normal;font-weight:1000;text-align:center;transform:rotate(90deg)}
      .bs-plan-report{padding:15px;border:1px solid #d8e2e7;border-radius:18px;background:#fff;box-shadow:0 6px 15px rgba(8,35,61,.055)}.bs-plan-report>header{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.bs-plan-report>header small{color:#b51b29;font-size:8px;font-weight:1000;letter-spacing:.13em}.bs-plan-report>header h3{margin:4px 0;color:#08233d;font-size:20px}.bs-plan-report>header p{max-width:105px;margin:0;color:#71828a;font-size:8px;text-align:right;line-height:1.45}.bs-plan-legend{display:flex;justify-content:flex-end;gap:12px;margin:5px 0 8px}.bs-plan-legend span{color:#60737c;font-size:8px;font-weight:900}.bs-plan-legend span:before{content:"";display:inline-block;width:9px;height:9px;margin-right:4px;border-radius:3px;background:#21809b;vertical-align:-1px}.bs-plan-legend .air:before{background:#c91e2d}.bs-plan-rows{display:grid;gap:8px}.bs-plan-rows article{display:grid;grid-template-columns:76px minmax(0,1fr);gap:4px 8px;align-items:center;padding:9px;border-radius:12px;background:#f3f7f9}.bs-plan-label b,.bs-plan-label span{display:block}.bs-plan-label b{color:#08233d;font-size:12px}.bs-plan-label span{color:#71828a;font-size:8px}.bs-plan-tracks{display:grid;gap:4px}.bs-plan-tracks>div{position:relative;height:16px;border-radius:99px;background:#e2e9ed;overflow:hidden}.bs-plan-tracks i{display:block;width:var(--width);height:100%;border-radius:99px;background:linear-gradient(90deg,#1a6a8b,#61b7bd)}.bs-plan-tracks i.air{background:linear-gradient(90deg,#b61d2b,#ed5260)}.bs-plan-tracks span{position:absolute;inset:0 6px;display:grid;place-items:center end;color:#08233d;font-size:8px;font-weight:1000}.bs-plan-rows article>small{grid-column:2;color:#61757e;font-size:8px;font-weight:800}.bs-plan-report>footer{margin-top:9px;color:#61747d;font-size:9px;line-height:1.55}
      .bs-timeline{padding:15px;border:1px solid #dbe3e7;border-radius:18px;background:#fff;box-shadow:0 6px 15px rgba(8,35,61,.055)}.bs-timeline>small{color:#b51b29;font-size:8px;font-weight:1000;letter-spacing:.12em}.bs-timeline h3{margin:4px 0 12px;color:#08233d;font-size:20px}.bs-timeline>p{margin:10px 0 0;color:#697a82;font-size:9px;line-height:1.55}.bs-flow{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;align-items:center;gap:5px;padding:12px;border-radius:13px;background:#eef4f7}.bs-flow span{min-width:0;color:#153a53;font-size:9px;font-weight:1000;text-align:center}.bs-flow i{color:#d21e2c;font-style:normal;font-weight:1000}.bs-flow.detailed{display:flex;overflow-x:auto;justify-content:flex-start;scroll-snap-type:x proximity}.bs-flow.detailed span{flex:0 0 118px;padding:10px 7px;border-radius:10px;background:#fff;scroll-snap-align:start}.bs-flow.detailed span b,.bs-flow.detailed span small{display:block}.bs-flow.detailed span small{margin-top:4px;color:#72838b;font-size:8px}
      .bs-compare-grid{display:grid;gap:12px}.bs-compare{padding:14px;border:1px solid #dce5ea;border-radius:18px;background:#fff}.bs-compare header{display:flex;justify-content:space-between;gap:10px}.bs-compare header small{color:#b51b29;font-size:8px;font-weight:1000;letter-spacing:.1em}.bs-compare header h3{margin:3px 0;color:#08233d;font-size:18px}.bs-compare header>span{max-width:125px;color:#71828a;font-size:8px;font-weight:800;text-align:right;line-height:1.4}.bs-bars{display:grid;grid-template-columns:repeat(2,1fr);gap:28px;height:168px;margin:5px 12px 0;padding:10px 9px 8px;border-bottom:2px solid #b9c8d1}.bs-bars>div{display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:6px;justify-items:center}.bs-bars b{color:#08233d;font-size:24px}.bs-bars i{align-self:end;width:65%;min-width:36px;height:var(--height);min-height:7px;border-radius:8px 8px 2px 2px;background:linear-gradient(#1e699f,#0a3659)}.bs-bars>div:last-child i{background:linear-gradient(#ef3b49,#bd1524)}.bs-bars span{color:#455f6d;font-size:9px;font-weight:1000}.bs-compare>p{margin:9px 0 0;color:#687a83;font-size:9px;text-align:center}
      .bs-signal-section{padding:15px;border:1px solid #dbe3e6;border-radius:18px;background:linear-gradient(135deg,#f7fafb,#fff)}.bs-signal-section header h3{margin:4px 0;color:#08233d;font-size:20px}.bs-signal-section header p{margin:0;color:#677982;font-size:10px;line-height:1.55}.bs-signal-grid{display:grid;gap:8px;margin-top:11px}.bs-signal{padding:11px;border-left:5px solid #3177aa;border-radius:11px;background:#fff;box-shadow:0 3px 9px rgba(8,35,61,.05)}.bs-signal.red{border-left-color:#d31d2c}.bs-signal.gold{border-left-color:#d19c28}.bs-signal small{display:block;color:#71828a;font-size:7px;font-weight:1000}.bs-signal strong{float:right;color:#08233d;font-size:19px}.bs-signal b{display:block;margin-top:2px;color:#08233d;font-size:13px}.bs-signal p{margin:4px 0 0;color:#60737c;font-size:9px;line-height:1.5}
      .bs-details{border:1px solid #d7e1e5;border-radius:15px;background:#fff}.bs-details summary{display:flex;justify-content:space-between;align-items:center;min-height:50px;padding:10px 13px;color:#08233d;font-size:11px;font-weight:1000;list-style:none}.bs-details summary::-webkit-details-marker{display:none}.bs-details[open] summary b{transform:rotate(45deg)}.bs-details>div{padding:0 13px 13px}.bs-details h4{margin:10px 0 3px;color:#b51b29;font-size:10px}.bs-details p{margin:0;color:#506873;font-size:10px;line-height:1.65}.bs-foot{padding:4px;color:#75848a;font-size:8px;line-height:1.55}
      @media(min-width:680px){.bs-compare-grid{grid-template-columns:repeat(3,1fr)}.bs-signal-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:390px){.bs-intro{grid-template-columns:minmax(0,1fr) 82px}.bs-intro h3{font-size:20px}.bs-intent-options{grid-template-columns:1fr}.bs-intent-options button{min-height:42px}.bs-bars{gap:18px;margin-inline:4px}.bs-bars b{font-size:21px}}
    `;
    document.head.appendChild(style);
  }

  function handleClick(event) {
    const intent = event.target?.closest?.("[data-intent-value]");
    if (intent) return setIntent(String(intent.dataset.intentValue || ""));
    if (event.target?.closest?.("[data-intent-change]")) {
      intentEditing = true;
      intentSignature = "";
      renderIntent(true);
      return;
    }
    const link = event.target?.closest?.("a[href]");
    if (link) recordOfficialExit(link);
  }

  function boot() {
    styles();
    loadSchedule().then(() => {
      scanRaceView();
      renderAnalysis(true);
    });
    renderIntent(true);
    scanRecords();
    scanRaceView();
    const active = window.MAMO_RECORD?.activeRecord?.();
    if (active) recordResultSeen(active, "active_result_sheet");
    document.addEventListener("click", handleClick, true);
    window.addEventListener("mamo:result-observed", (event) => {
      if (event.detail?.record) recordResultSeen(event.detail.record, event.detail.source, event.detail.at);
    });
    window.addEventListener("mamo:analysis-rendered", () => renderAnalysis(true));
    window.addEventListener("mamo:decision-journey-updated", () => renderAnalysis(true));
    window.addEventListener("pageshow", () => {
      finishOfficialReturn("pageshow");
      renderIntent(true);
      renderAnalysis(true);
    });
    window.addEventListener("focus", () => finishOfficialReturn("focus"));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) markOfficialHidden();
      else finishOfficialReturn("visible");
    });
    window.addEventListener("storage", (event) => {
      if ([APP_KEY, RECORD_KEY, STORE_KEY].includes(event.key)) {
        renderIntent(true);
        renderAnalysis(true);
      }
    });
    setInterval(() => {
      scanRecords();
      scanRaceView();
      renderIntent();
      if (document.body?.dataset?.screen === "analysis"
        && document.getElementById("analysisList")?.dataset?.owner !== "behavior-science") {
        renderAnalysis(true);
      }
    }, 1000);
  }

  window.MAMO_BEHAVIOR_SCIENCE = Object.freeze({
    version: 1,
    build: buildModel,
    state: store,
    recordResultSeen,
    render: renderAnalysis,
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
