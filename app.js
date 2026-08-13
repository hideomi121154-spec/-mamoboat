(() => {
  "use strict";

  const C = window.MamoCore;
  const APP_VERSION = "3.9.1";
  const WALLET_VERSION = 3;
  const LEGACY_BONUS_TYPES = new Set(["login_bonus", "defense_bonus"]);
  const KEY = "mamoboat_v39_personal";
  const LEGACY_KEYS = [
    "mamoboat_v38_personal",
    "mamoboat_v27_personal",
    "mamoboat_v26_personal",
    "mamoboat_v25_personal",
    "mamoboat_v24_live",
    "mamoboat_real_v22",
  ];
  const PILOT_CONFIG = window.MAMOBOAT_PILOT || {};
  const COLLECTOR = PILOT_CONFIG.collector || {};
  const SESSION_ID = window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const VENUES = [
    ["01", "桐生"], ["02", "戸田"], ["03", "江戸川"], ["04", "平和島"],
    ["05", "多摩川"], ["06", "浜名湖"], ["07", "蒲郡"], ["08", "常滑"],
    ["09", "津"], ["10", "三国"], ["11", "びわこ"], ["12", "住之江"],
    ["13", "尼崎"], ["14", "鳴門"], ["15", "丸亀"], ["16", "児島"],
    ["17", "宮島"], ["18", "徳山"], ["19", "下関"], ["20", "若松"],
    ["21", "芦屋"], ["22", "福岡"], ["23", "唐津"], ["24", "大村"],
  ];
  const VENUE_ROMAJI = {
    "01": "KIRYU", "02": "TODA", "03": "EDOGAWA", "04": "HEIWAJIMA",
    "05": "TAMAGAWA", "06": "HAMANAKO", "07": "GAMAGORI", "08": "TOKONAME",
    "09": "TSU", "10": "MIKUNI", "11": "BIWAKO", "12": "SUMINOE",
    "13": "AMAGASAKI", "14": "NARUTO", "15": "MARUGAME", "16": "KOJIMA",
    "17": "MIYAJIMA", "18": "TOKUYAMA", "19": "SHIMONOSEKI", "20": "WAKAMATSU",
    "21": "ASHIYA", "22": "FUKUOKA", "23": "KARATSU", "24": "OMURA",
  };
  const BET_ORDER = [
    "trifecta", "trio", "exacta", "quinella", "wide", "win", "place",
  ];
  const PAYOUT_DISPLAY_ORDER = [
    "win", "place", "exacta", "quinella", "wide", "trifecta", "trio",
  ];
  const REAL_BET_URL = "https://www.boatrace.jp/owsp/sp/login";
  const MODE_LABELS = {
    normal: "通常",
    box: "BOX",
    form: "フォーメーション",
  };
  const BET_GUIDES = {
    trifecta: "1〜3着を着順どおり当てる",
    trio: "1〜3着の3艇を順不同で当てる",
    exacta: "1・2着を着順どおり当てる",
    quinella: "1・2着の2艇を順不同で当てる",
    wide: "選んだ2艇が両方とも3着以内なら的中",
    win: "1着の艇を当てる",
    place: "選んだ艇が2着以内なら的中",
  };

  const $ = (id) => document.getElementById(id);
  const fmt = (value) => Number(value || 0).toLocaleString("ja-JP");
  const esc = (value) => String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
  const timeText = (value) => value
    ? new Date(value).toLocaleTimeString("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
    })
    : "—";
  const oddsNumber = (value) => {
    const match = String(value ?? "").trim().match(/^([0-9]+(?:\.[0-9]+)?)/);
    return match ? Number(match[1]) : 0;
  };

  function uniqueId(prefix = "id") {
    return window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
        const random = Math.floor(Math.random() * 16);
        return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
      });
  }

  function participantCode() {
    return `P-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  function raceOddsType(raceItem, type = betType) {
    return raceItem?.odds?.types?.[C.normalizeBetType(type)] || null;
  }

  function referenceOdds(raceItem, type, combo) {
    const normalizedType = C.normalizeBetType(type);
    const snapshot = raceOddsType(raceItem, normalizedType);
    if (!snapshot?.values) return null;
    const key = C.canonicalCombo(combo, normalizedType);
    const value = snapshot.values[key];
    if (value == null || value === "") return null;
    return {
      value: String(value),
      updatedAt: snapshot.updatedAt || snapshot.fetchedAt || null,
      timeSource: snapshot.timeSource || "official",
    };
  }

  const dateShort = (value) => {
    if (!value) return "";
    const parts = String(value).split("-").map(Number);
    return parts.length === 3 && parts.every(Number.isFinite)
      ? `${parts[1]}/${parts[2]}`
      : String(value);
  };

  function eventInfo(venueItem) {
    const event = venueItem?.event || {};
    return {
      title: event.title || venueItem?.races?.[0]?.name || "開催情報",
      grade: event.grade || "GENERAL",
      gradeLabel: event.gradeLabel || "一般",
      dayLabel: event.dayLabel || "開催中",
      startDate: event.startDate || null,
      endDate: event.endDate || null,
      timeZone: event.timeZone || null,
      officialUrl: event.officialUrl || null,
    };
  }

  function gradeClass(grade) {
    return String(grade || "GENERAL").toLowerCase();
  }

  function gradeBadge(venueItem) {
    const event = eventInfo(venueItem);
    return `<span class="grade ${gradeClass(event.grade)}">${esc(event.gradeLabel)}</span>`;
  }

  function eventPeriod(event) {
    if (event.startDate && event.endDate) {
      return `${dateShort(event.startDate)}–${dateShort(event.endDate)}`;
    }
    if (event.startDate) return `${dateShort(event.startDate)} START`;
    return dateShort(DATA.date);
  }

  function venueIsNight(venueItem) {
    const event = eventInfo(venueItem);
    if (["night", "midnight"].includes(event.timeZone)) return true;
    const firstClose = venueItem?.races?.[0]?.closeTime;
    if (!firstClose) return false;
    const hour = Number(new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      hour12: false,
    }).format(new Date(firstClose)));
    return hour >= 14;
  }

  function venueProgress(venueItem) {
    const races = venueItem?.races || [];
    const now = Date.now();
    const next = races.find(
      (item) => item.closeTime && new Date(item.closeTime).getTime() > now
    );
    const resultCount = races.filter((item) => item.result).length;
    return { next, resultCount, finished: !!races.length && !next };
  }

  function preferredRaceNumber(venueItem) {
    const races = venueItem?.races || [];
    const progress = venueProgress(venueItem);
    if (progress.next) return progress.next.number;
    const latestResult = [...races].reverse().find((item) => item.result);
    return latestResult?.number || races[0]?.number || 1;
  }

  function unavailableDataset(message = "公式データを取得できませんでした") {
    return {
      schemaVersion: 10,
      date: C.jstDate(),
      generatedAt: null,
      source: { type: "unavailable" },
      quality: { warnings: [message], stats: {} },
      venues: VENUES.map(([code, name]) => ({
        code,
        name,
        active: false,
        races: [],
        boatcast: `https://race.boatcast.jp/?jo=${code}`,
      })),
    };
  }

  let DATA = unavailableDataset("読み込み前");
  let liveLoaded = false;
  let dataError = "";
  let lastLoadAt = 0;
  let dataLoadPromise = null;
  let lastRenderedRaceOpen = null;
  let betType = "trifecta";
  let mode = "normal";
  let normal = [null, null, null];
  let box = new Set();
  let form = [new Set(), new Set(), new Set()];
  let cart = [];
  let onboardStep = 0;
  let resultIndexRequested = false;

  function weekKey(value = new Date()) {
    const today = C.jstDate(value);
    const [year, month, day] = today.split("-").map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    return new Date(Date.UTC(year, month - 1, day - ((weekday + 6) % 7)))
      .toISOString()
      .slice(0, 10);
  }

  function fresh() {
    const createdAt = new Date().toISOString();
    return {
      accepted: false,
      coins: 100000,
      coinWeek: weekKey(),
      walletVersion: WALLET_VERSION,
      walletCreatedAt: createdAt,
      ledger: [{
        id: "initial-grant",
        uniqueKey: "initial-grant",
        type: "initial_grant",
        amount: 100000,
        balanceAfter: 100000,
        at: createdAt,
        label: "初回B付与",
      }],
      records: [],
      venue: "12",
      raceNo: 1,
      filter: "active",
      homeFilter: "all",
      favorites: [],
      realBetExits: [],
      recFilter: "all",
      rewardClaims: [],
      pilot: {
        participantId: participantCode(),
        consent: false,
        events: [],
        sentCount: 0,
        lastSyncAt: null,
        lastError: "",
      },
      lastDataDate: null,
    };
  }

  function normalizeState(source) {
    const state = Object.assign(fresh(), source || {});
    const raw = Array.isArray(state.records)
      ? state.records
      : Array.isArray(state.sets)
        ? state.sets
        : [];
    state.coins = Math.max(0, Number(state.coins) || 0);
    state.ledger = Array.isArray(source?.ledger)
      ? source.ledger.filter((item) => item && item.id && Number.isFinite(Number(item.amount)))
      : [{
        id: "legacy-opening-balance",
        uniqueKey: "legacy-opening-balance",
        type: "opening_balance",
        amount: raw.length ? state.coins : 100000,
        balanceAfter: raw.length ? state.coins : 100000,
        at: source?.walletCreatedAt || new Date().toISOString(),
        label: "v3.9開始残高",
      }];
    if (!source?.ledger && !raw.length) state.coins = 100000;
    const removedBonusTotal = state.ledger
      .filter((item) => LEGACY_BONUS_TYPES.has(item.type))
      .reduce((sum, item) => sum + Math.max(0, Number(item.amount) || 0), 0);
    if (removedBonusTotal > 0) {
      let removedSoFar = 0;
      state.ledger = state.ledger.flatMap((item) => {
        if (LEGACY_BONUS_TYPES.has(item.type)) {
          removedSoFar += Math.max(0, Number(item.amount) || 0);
          return [];
        }
        const balanceAfter = Number(item.balanceAfter);
        return [{
          ...item,
          balanceAfter: Number.isFinite(balanceAfter)
            ? Math.max(0, balanceAfter - removedSoFar)
            : item.balanceAfter,
        }];
      });
      state.coins = Math.max(0, state.coins - removedBonusTotal);
    }
    state.walletVersion = WALLET_VERSION;
    state.walletCreatedAt ||= state.ledger[0]?.at || new Date().toISOString();
    delete state.lastLoginBonusDate;
    if (!["all", "selling", "grade", "night", "favorite"].includes(state.homeFilter)) {
      state.homeFilter = "all";
    }
    state.favorites = Array.isArray(state.favorites)
      ? [...new Set(state.favorites.map(String).filter((code) => VENUE_ROMAJI[code]))]
      : [];
    state.realBetExits = Array.isArray(state.realBetExits)
      ? state.realBetExits.filter((item) => item && item.at).slice(-500)
      : [];
    state.rewardClaims = Array.isArray(state.rewardClaims)
      ? state.rewardClaims.filter((item) => item && item.id).slice(-500)
      : [];
    const pilot = Object.assign(fresh().pilot, state.pilot || {});
    pilot.participantId = String(pilot.participantId || participantCode())
      .replace(/[^A-Za-z0-9_-]/g, "-")
      .slice(0, 40) || participantCode();
    pilot.consent = pilot.consent === true;
    pilot.events = Array.isArray(pilot.events)
      ? pilot.events.filter((item) => item && item.event_id && item.event_name).slice(-5000)
      : [];
    pilot.sentCount = Math.max(0, Number(pilot.sentCount) || 0);
    pilot.lastSyncAt = pilot.lastSyncAt || null;
    pilot.lastError = String(pilot.lastError || "").slice(0, 300);
    state.pilot = pilot;
    state.records = raw.map((record, index) => {
      const stake = Number(record.stake ?? record.total ?? 0) || 0;
      const intended = Number(
        record.intendedYen ?? record.saved ?? record.total ?? record.stake ?? 0
      ) || 0;
      const lines = Array.isArray(record.lines)
        ? record.lines.map((line) => ({
          combo: Array.isArray(line.combo) ? line.combo.map(Number) : [],
          betType: C.normalizeBetType(line.betType),
          stake: Number(line.stake) || 100,
          odds: line.odds ?? "",
          oddsCapturedAt: line.oddsCapturedAt || null,
          oddsSource: line.oddsSource || null,
          oddsTimeSource: line.oddsTimeSource || null,
          mode: ["normal", "box", "form"].includes(line.mode) ? line.mode : null,
        }))
        : Array.isArray(record.combo)
          ? [{ combo: record.combo.map(Number), stake: stake || 100, odds: "" }]
          : [];
      const status = ["pending", "hit", "miss", "refunded"].includes(record.status)
        ? record.status
        : "pending";
      const raceDate = record.raceDate
        || record.date
        || (record.time ? C.jstDate(record.time) : null);
      return Object.assign({}, record, {
        id: record.id || `legacy-${index}-${Date.now()}`,
        raceDate,
        coinWeek: record.coinWeek || (record.time ? weekKey(record.time) : weekKey()),
        lines,
        betMode: ["normal", "box", "form"].includes(record.betMode)
          ? record.betMode
          : null,
        entrySnapshot: Array.isArray(record.entrySnapshot)
          ? record.entrySnapshot.map((entry) => ({
            boatNumber: Number(entry.boatNumber),
            racerNumber: String(entry.racerNumber || ""),
            name: String(entry.name || ""),
          }))
          : [],
        stake: stake || lines.reduce((sum, line) => sum + line.stake, 0),
        intendedYen: stake || intended,
        conf: Number(record.conf ?? 5),
        urge: Number(record.urge ?? record.before ?? 5),
        afterUrge: record.afterUrge ?? record.after ?? null,
        status,
        settled: record.settled === true || ["hit", "miss", "refunded"].includes(status),
        payoutC: Number(record.payoutC ?? record.payout ?? 0) || 0,
        refundC: Number(record.refundC || 0) || 0,
        resultPayouts: Array.isArray(record.resultPayouts) ? record.resultPayouts : [],
        behaviorReviewed: record.behaviorReviewed === true || record.cashReviewed === true,
        saved: stake || Number(record.saved || 0) || 0,
        rewardChallenge: record.rewardChallenge === true,
        rewardOutcome: record.rewardChallenge === true && (record.settled === true || ["hit", "miss", "refunded"].includes(status))
          ? C.rewardOutcome({ ...record, settled: true, status, rewardChallenge: true })
          : null,
        rewardEvaluatedAt: record.rewardEvaluatedAt || null,
      });
    });
    delete state.sets;
    delete state.xp;
    delete state.medalAdditions;
    return state;
  }

  function load() {
    try {
      const current = localStorage.getItem(KEY);
      if (current) return normalizeState(JSON.parse(current));
      for (const key of LEGACY_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const migrated = normalizeState(JSON.parse(raw));
          localStorage.setItem(KEY, JSON.stringify(migrated));
          return migrated;
        }
      }
    } catch (error) {
      console.warn("記録データの読み込みに失敗しました", error);
    }
    return fresh();
  }

  let S = load();

  const save = () => localStorage.setItem(KEY, JSON.stringify(S));

  function postLedger(type, amount, uniqueKey, details = {}) {
    const value = Math.round(Number(amount) || 0);
    if (!value || !uniqueKey) return false;
    if (S.ledger.some((item) => item.uniqueKey === uniqueKey)) return false;
    if (value < 0 && S.coins + value < 0) return false;
    S.coins += value;
    S.ledger.push({
      id: uniqueId("ledger"),
      uniqueKey,
      type,
      amount: value,
      balanceAfter: S.coins,
      at: new Date().toISOString(),
      ...details,
    });
    S.ledger = S.ledger.slice(-5000);
    trackEvent("wallet_ledger_posted", {
      ledger_type: type,
      amount_b: value,
      balance_b: S.coins,
      unique_key: uniqueKey,
      record_id: details.recordId || null,
      label: details.label || "",
    }, {
      raceDate: details.day || null,
      venueCode: details.venueCode || null,
      raceNo: details.raceNo || null,
    });
    return true;
  }

  const venue = (code) => DATA.venues.find((item) => item.code === code);
  const race = (code, number) => venue(code)?.races?.find(
    (item) => Number(item.number) === Number(number)
  );

  let pilotFlushPromise = null;
  let pilotFlushTimer = null;

  function safePayload(value, depth = 0) {
    if (depth > 4 || value == null) return value == null ? null : String(value).slice(0, 160);
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") return value.slice(0, 300);
    if (Array.isArray(value)) return value.slice(0, 30).map((item) => safePayload(item, depth + 1));
    if (typeof value === "object") {
      return Object.fromEntries(Object.entries(value).slice(0, 40).map(
        ([key, item]) => [String(key).slice(0, 60), safePayload(item, depth + 1)]
      ));
    }
    return String(value).slice(0, 160);
  }

  function collectorReady() {
    return COLLECTOR.enabled === true && /^https:\/\//.test(String(COLLECTOR.endpoint || ""));
  }

  function schedulePilotFlush() {
    if (!S.pilot.consent || !collectorReady()) return;
    clearTimeout(pilotFlushTimer);
    pilotFlushTimer = setTimeout(() => flushPilotEvents(), 1200);
  }

  function trackEvent(eventName, payload = {}, context = {}) {
    if (!S?.pilot || !eventName) return;
    const event = {
      event_id: uniqueId("event"),
      study_id: String(PILOT_CONFIG.studyId || "mamoboat-pilot-v1").slice(0, 80),
      participant_id: S.pilot.participantId,
      session_id: SESSION_ID,
      occurred_at: new Date().toISOString(),
      event_name: String(eventName).slice(0, 80),
      app_version: APP_VERSION,
      screen: context.screen || document.body.dataset.screen || "home",
      race_date: context.raceDate || null,
      venue_code: context.venueCode || null,
      race_no: context.raceNo == null ? null : Number(context.raceNo),
      payload: safePayload(payload),
      sent_at: null,
    };
    S.pilot.events.push(event);
    S.pilot.events = S.pilot.events.slice(-5000);
    save();
    schedulePilotFlush();
  }

  async function flushPilotEvents() {
    if (pilotFlushPromise) return pilotFlushPromise;
    if (!S.pilot.consent) return { ok: false, reason: "consent" };
    if (!collectorReady()) return { ok: false, reason: "collector" };
    const pending = S.pilot.events.filter((item) => !item.sent_at).slice(0, 100);
    if (!pending.length) return { ok: true, sent: 0 };
    pilotFlushPromise = (async () => {
      let timeoutId = null;
      try {
        const headers = { "Content-Type": "application/json", Prefer: "return=minimal" };
        let endpoint = String(COLLECTOR.endpoint || "");
        if (COLLECTOR.anonKey) {
          headers.apikey = COLLECTOR.anonKey;
          headers.Authorization = `Bearer ${COLLECTOR.anonKey}`;
          headers.Prefer = "resolution=ignore-duplicates,return=minimal";
          const url = new URL(endpoint);
          if (!url.searchParams.has("on_conflict")) {
            url.searchParams.set("on_conflict", "event_id");
          }
          endpoint = url.toString();
        }
        const rows = pending.map(({ sent_at, ...row }) => row);
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(rows),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const sentAt = new Date().toISOString();
        const ids = new Set(pending.map((item) => item.event_id));
        S.pilot.events.forEach((item) => {
          if (ids.has(item.event_id)) item.sent_at = sentAt;
        });
        S.pilot.sentCount += pending.length;
        S.pilot.lastSyncAt = sentAt;
        S.pilot.lastError = "";
        save();
        if (S.pilot.events.some((item) => !item.sent_at)) schedulePilotFlush();
        return { ok: true, sent: pending.length };
      } catch (error) {
        S.pilot.lastError = error?.name === "AbortError"
          ? "送信が15秒でタイムアウトしました"
          : String(error?.message || error).slice(0, 300);
        save();
        return { ok: false, reason: "network", error: S.pilot.lastError };
      } finally {
        clearTimeout(timeoutId);
        pilotFlushPromise = null;
        renderPilotSettings();
      }
    })();
    return pilotFlushPromise;
  }

  function activeCampaign(kind) {
    return (PILOT_CONFIG.rewards || []).find(
      (item) => item?.active === true && item.kind === kind && item.id && item.title
    ) || null;
  }

  function ensureRewardClaim(kind, sourceId, earnedAt = new Date().toISOString()) {
    const existing = S.rewardClaims.find(
      (item) => item.kind === kind && item.sourceId === sourceId
    );
    if (existing) return existing;
    const campaign = activeCampaign(kind);
    if (!campaign) return null;
    const claim = {
      id: uniqueId("claim"),
      sourceId,
      kind,
      campaignId: campaign.id,
      sponsor: campaign.sponsor,
      title: campaign.title,
      description: campaign.description || "",
      code: campaign.code || "",
      url: campaign.url || "",
      expiresAt: campaign.expiresAt || "",
      terms: campaign.terms || "",
      earnedAt,
      openedAt: null,
      redeemedAt: null,
    };
    S.rewardClaims.push(claim);
    S.rewardClaims = S.rewardClaims.slice(-500);
    trackEvent("partner_reward_issued", {
      reward_kind: kind,
      campaign_id: campaign.id,
    });
    return claim;
  }

  function syncDefenseMilestoneClaims() {
    const metrics = C.rewardMetrics(S.records);
    for (let cycle = 1; cycle <= metrics.defenseMilestones; cycle += 1) {
      ensureRewardClaim("defense-5", `defense-cycle-${cycle}`);
    }
  }

  function rewardEventPayload(record) {
    return {
      record_id: record.id,
      status: record.status,
      saved_yen: Number(record.saved) || 0,
      intended_yen: Number(record.intendedYen) || 0,
      stake_b: Number(record.stake) || 0,
      payout_b: Number(record.payoutC) || 0,
      line_count: (record.lines || []).length,
      bet_types: [...new Set((record.lines || []).map(
        (line) => C.normalizeBetType(line.betType)
      ))],
      confidence: Number(record.conf) || 0,
      urge_before: Number(record.urge) || 0,
      urge_after: record.afterUrge == null ? null : Number(record.afterUrge),
      reason: record.reason || "未入力",
    };
  }

  function evaluateReward(record) {
    if (!record || record.rewardEvaluatedAt) return record?.rewardOutcome || null;
    const outcome = C.rewardOutcome(record);
    if (["pending", "not-selected"].includes(outcome)) return null;
    record.rewardEvaluatedAt = new Date().toISOString();
    record.rewardOutcome = outcome;
    if (outcome === "double-win") {
      ensureRewardClaim("double-win", record.id, record.rewardEvaluatedAt);
      trackEvent("double_win_earned", rewardEventPayload(record), {
        raceDate: record.raceDate,
        venueCode: record.venueCode,
        raceNo: record.raceNo,
      });
    } else if (outcome === "defense-stamp") {
      trackEvent("defense_stamp_earned", rewardEventPayload(record), {
        raceDate: record.raceDate,
        venueCode: record.venueCode,
        raceNo: record.raceNo,
      });
      syncDefenseMilestoneClaims();
    } else {
      trackEvent("reward_not_eligible", { record_id: record.id }, {
        raceDate: record.raceDate, venueCode: record.venueCode, raceNo: record.raceNo,
      });
    }
    save();
    return outcome;
  }

  function settlementPayload(record, source) {
    return Object.assign(rewardEventPayload(record), {
      settlement_source: source,
      result_combo: record.resultCombo || null,
      refund_b: Number(record.refundC) || 0,
    });
  }

  function recordSettlement(record, source) {
    if (record.resultEventAt) return;
    if (record.payoutC > 0) {
      postLedger(record.status === "refunded" ? "refund" : "official_payout", record.payoutC, `settlement:${record.id}`, {
        label: record.status === "refunded"
          ? `${record.venue} ${record.raceNo}R 返還`
          : `${record.venue} ${record.raceNo}R 公式払戻`,
        recordId: record.id,
        venueCode: record.venueCode,
        raceNo: record.raceNo,
      });
    }
    record.resultEventAt = new Date().toISOString();
    trackEvent("result_settled", settlementPayload(record, source), {
      raceDate: record.raceDate,
      venueCode: record.venueCode,
      raceNo: record.raceNo,
    });
    evaluateReward(record);
  }

  async function fetchDataset(date, force = false) {
    const basePath = date === C.jstDate() ? "data/today.json" : `data/${date}.json`;
    const path = force ? `${basePath}?refresh=${Date.now()}` : basePath;
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${path}`);
    const dataset = await response.json();
    if (dataset.source?.type !== "official-lzh" || !C.validateDataset(dataset)) {
      throw new Error(`構造検証エラー ${path}`);
    }
    return dataset;
  }

  async function loadOfficialData(force = false) {
    if (dataLoadPromise) return dataLoadPromise;
    dataLoadPromise = (async () => {
      dataError = "";
      const previousData = DATA;
      const hadValidData = liveLoaded && previousData?.source?.type === "official-lzh";
      try {
        DATA = await fetchDataset(C.jstDate(), force);
        liveLoaded = true;
        S.lastDataDate = DATA.date;
        save();
      } catch (error) {
        dataError = String(error && error.message || error);
        if (hadValidData) {
          DATA = previousData;
          liveLoaded = true;
        } else {
          DATA = unavailableDataset(dataError);
          liveLoaded = false;
        }
      }
      lastLoadAt = Date.now();
      await settleAllPending();
      renderAll();
      return { ok: !dataError, error: dataError };
    })();
    try {
      return await dataLoadPromise;
    } finally {
      dataLoadPromise = null;
    }
  }

  async function settleAllPending() {
    const dates = [...new Set(
      S.records.filter((record) => !record.settled).map((record) => record.raceDate).filter(Boolean)
    )];
    let changed = false;
    const cache = liveLoaded ? { [DATA.date]: DATA } : {};
    for (const date of dates) {
      let dataset = cache[date];
      if (!dataset) {
        try {
          dataset = await fetchDataset(date);
          cache[date] = dataset;
        } catch (error) {
          continue;
        }
      }
      for (const record of S.records.filter(
        (item) => !item.settled && item.raceDate === date
      )) {
        const result = C.settleRecord(record, dataset);
        if (!result.changed) continue;
        changed = true;
        recordSettlement(record, "automatic");
      }
    }
    if (changed) {
      save();
    }
  }

  function officialRaceUrl(page, code, number, date = DATA.date) {
    const raceDate = String(date || C.jstDate()).replaceAll("-", "");
    const venueCode = String(code || "").padStart(2, "0");
    return `https://www.boatrace.jp/owpc/pc/race/${page}?hd=${encodeURIComponent(raceDate)}&jcd=${encodeURIComponent(venueCode)}&rno=${encodeURIComponent(number)}`;
  }

  function officialUrl(code, number, date = DATA.date) {
    return officialRaceUrl("racelist", code, number, date);
  }

  function officialResultUrl(code, number, date = DATA.date) {
    return officialRaceUrl("raceresult", code, number, date);
  }

  function officialResultListUrl(code, date = DATA.date) {
    const raceDate = String(date || C.jstDate()).replaceAll("-", "");
    const venueCode = String(code || "").padStart(2, "0");
    return `https://www.boatrace.jp/owpc/pc/race/resultlist?hd=${encodeURIComponent(raceDate)}&jcd=${encodeURIComponent(venueCode)}`;
  }

  function officialOddsUrl(code, number, type = betType, date = DATA.date) {
    const pages = {
      trifecta: "odds3t",
      trio: "odds3f",
      exacta: "odds2tf",
      quinella: "odds2tf",
      wide: "oddsk",
      win: "oddstf",
      place: "oddstf",
    };
    return officialRaceUrl(pages[C.normalizeBetType(type)] || "odds3t", code, number, date);
  }

  function officialOddsLabel(type = betType) {
    const normalizedType = C.normalizeBetType(type);
    if (["exacta", "quinella"].includes(normalizedType)) return "2連単・2連複";
    if (["win", "place"].includes(normalizedType)) return "単勝・複勝";
    return C.BET_TYPES[normalizedType].label;
  }

  function durationText(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}時間${minutes}分`;
    }
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const rest = seconds % 60;
      return `${minutes}分${String(rest).padStart(2, "0")}秒`;
    }
    return `${seconds}秒`;
  }

  function raceStatusInfo(raceItem) {
    if (raceItem?.result) {
      return { key: "confirmed", label: "結果確定", detail: "公式成績反映済み" };
    }
    if (!raceItem?.closeTime) {
      return { key: "waiting", label: "時刻未取得", detail: "番組表を確認中" };
    }
    const remaining = new Date(raceItem.closeTime).getTime() - Date.now();
    if (isFresh() && remaining > 0) {
      return { key: "selling", label: "発売中", detail: `締切まで ${durationText(remaining)}` };
    }
    return { key: "closed", label: "締切済", detail: "公式結果の反映待ち" };
  }

  function raceStatusHtml(raceItem) {
    const status = raceStatusInfo(raceItem);
    return `<span>${status.label}</span><b>${status.detail}</b>`;
  }

  function racerUrl(racerNumber) {
    return `https://www.boatrace.jp/owpc/pc/data/racersearch/profile?toban=${encodeURIComponent(racerNumber)}`;
  }

  function openModal(html) {
    $("modal").innerHTML = html;
    $("modalBg").classList.add("show");
  }

  window.openMedalTopup = () => {
    const rows = [...S.ledger].reverse().slice(0, 12).map((item) => `<div class="ledger-row">
      <span>${esc(item.label || item.type)}<small>${timeText(item.at)}</small></span>
      <b class="${item.amount > 0 ? "plus" : "minus"}">${item.amount > 0 ? "+" : ""}${fmt(item.amount)}B</b>
    </div>`).join("");
    openModal(`<div class="medal-topup">
      <span class="kicker">B MEDAL BALANCE</span>
      <h2>Bメダル残高</h2>
      <div class="topup-balance"><span>現在の残高</span><strong>${fmt(S.coins)}B</strong></div>
      <p>Bは購入・換金・任意追加できません。AIR BETで減り、的中時は公式確定払戻と同額のBが加算されます。返還時は対象Bだけ戻り、外れた場合は戻りません。</p>
      <div class="notice warn topup-policy"><b>自動復活はありません。</b><br>日替わり・週替わり・再読み込みで残高はリセットされません。</div>
      <h3>最近のB履歴</h3><div class="wallet-ledger">${rows || '<p class="muted">履歴はまだありません。</p>'}</div>
      <button class="btn secondary full" type="button" onclick="closeModal()">閉じる</button>
    </div>`);
  };

  window.openRealBetConfirm = () => {
    trackEvent("official_bet_prompt_opened", {}, {
      raceDate: DATA.date,
      venueCode: S.venue,
      raceNo: S.raceNo,
    });
    openModal(`<div class="real-bet-confirm">
      <span class="kicker">OFFICIAL CASH BETTING</span>
      <h2>公式投票へ移動しますか？</h2>
      <div class="real-bet-warning"><b>ここから先は現金を使う公式TELEBOATです。</b><p>まもボートのBメダルとは別サービスです。20歳未満の方は利用できません。</p></div>
      <p>いま現金を使わずに済ませたい場合は、下の「AIR BETに戻る」を選んでください。</p>
      <div class="real-bet-actions">
        <button class="btn primary full" type="button" onclick="recordRealBetAvoided()">AIR BETに戻る</button>
        <a class="btn real-cash-link full" href="${REAL_BET_URL}" target="_blank" rel="noopener noreferrer" onclick="recordRealBetExit()">公式TELEBOATログインへ ↗</a>
      </div>
      <small>公式サイトでの登録・ログイン・投票・入出金は、まもボートには保存されません。</small>
    </div>`);
  };

  window.recordRealBetAvoided = () => {
    trackEvent("official_bet_prompt_cancelled", {}, {
      raceDate: DATA.date,
      venueCode: S.venue,
      raceNo: S.raceNo,
    });
    window.closeModal();
  };

  window.recordRealBetExit = () => {
    S.realBetExits.push({
      at: new Date().toISOString(),
      screen: document.body.dataset.screen || "home",
      venueCode: S.venue || null,
      raceNo: S.raceNo || null,
    });
    S.realBetExits = S.realBetExits.slice(-500);
    trackEvent("official_bet_exit", {}, {
      raceDate: DATA.date,
      venueCode: S.venue,
      raceNo: S.raceNo,
    });
    save();
    window.closeModal();
  };

  function initRealBetFloat() {
    const float = $("realBetFloat");
    const button = $("realBetFloatButton");
    if (!float || !button) return;

    const positionKey = "mamoboat_real_bet_float_v1";
    let drag = null;
    let suppressClick = false;
    let current = { x: null, y: null };

    const bounds = () => {
      const width = float.offsetWidth || 46;
      const height = float.offsetHeight || 116;
      const shellRect = document.querySelector(".app-shell")?.getBoundingClientRect();
      const minX = Math.max(6, (shellRect?.left || 0) + 6);
      const minY = 74;
      return {
        minX,
        minY,
        maxX: Math.max(minX, Math.min(
          window.innerWidth - width - 6,
          (shellRect?.right || window.innerWidth) - width - 6
        )),
        maxY: Math.max(minY, window.innerHeight - height - 86),
      };
    };

    const setPosition = (x, y) => {
      const limit = bounds();
      current = {
        x: Math.min(limit.maxX, Math.max(limit.minX, Number(x) || 0)),
        y: Math.min(limit.maxY, Math.max(limit.minY, Number(y) || 0)),
      };
      float.style.left = `${Math.round(current.x)}px`;
      float.style.top = `${Math.round(current.y)}px`;
      float.style.right = "auto";
    };

    const savePosition = () => {
      const limit = bounds();
      const xRange = Math.max(1, limit.maxX - limit.minX);
      const yRange = Math.max(1, limit.maxY - limit.minY);
      try {
        localStorage.setItem(positionKey, JSON.stringify({
          xRatio: (current.x - limit.minX) / xRange,
          yRatio: (current.y - limit.minY) / yRange,
        }));
      } catch (error) {
        // 保存できない環境でも、その場での移動は継続する。
      }
    };

    const restorePosition = () => {
      const limit = bounds();
      try {
        const stored = JSON.parse(localStorage.getItem(positionKey) || "null");
        if (Number.isFinite(stored?.xRatio) && Number.isFinite(stored?.yRatio)) {
          setPosition(
            limit.minX + Math.min(1, Math.max(0, stored.xRatio)) * (limit.maxX - limit.minX),
            limit.minY + Math.min(1, Math.max(0, stored.yRatio)) * (limit.maxY - limit.minY)
          );
          return;
        }
      } catch (error) {
        // 壊れた保存値は使わず、右中央の初期位置へ戻す。
      }
      setPosition(limit.maxX, limit.minY + (limit.maxY - limit.minY) * .46);
    };

    button.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const rect = float.getBoundingClientRect();
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: rect.left,
        originY: rect.top,
        moved: false,
      };
      suppressClick = false;
      float.classList.add("dragging");
      button.setPointerCapture?.(event.pointerId);
    });

    button.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      setPosition(drag.originX + dx, drag.originY + dy);
      event.preventDefault();
    });

    const finishDrag = (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      suppressClick = drag.moved;
      if (drag.moved) savePosition();
      float.classList.remove("dragging");
      try {
        if (button.hasPointerCapture?.(event.pointerId)) {
          button.releasePointerCapture(event.pointerId);
        }
      } catch (error) {
        // iOSが操作終了時に自動解放していても、そのまま終了する。
      }
      drag = null;
      if (suppressClick) setTimeout(() => { suppressClick = false; }, 100);
    };

    button.addEventListener("pointerup", finishDrag);
    button.addEventListener("pointercancel", finishDrag);
    button.addEventListener("click", (event) => {
      if (suppressClick) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      window.openRealBetConfirm();
    });
    window.addEventListener("resize", () => requestAnimationFrame(restorePosition));
    requestAnimationFrame(restorePosition);
  }

  window.closeModal = () => $("modalBg").classList.remove("show");
  window.bgClose = (event) => {
    if (event.target.id === "modalBg") window.closeModal();
  };
  window.go = (id) => {
    document.body.dataset.screen = id;
    document.querySelectorAll(".screen").forEach(
      (item) => item.classList.toggle("active", item.id === id)
    );
    document.querySelectorAll(".nav").forEach(
      (item) => item.classList.toggle("active", item.id === `nav-${id}`)
    );
    renderCurrent(id);
    trackEvent("screen_view", { destination: id }, {
      venueCode: S.venue,
      raceNo: id === "race" ? S.raceNo : null,
      raceDate: id === "race" ? DATA.date : null,
    });
    window.scrollTo(0, 0);
  };
  function renderOnboard() {
    document.querySelectorAll("[data-onboard]").forEach((panel) => {
      panel.classList.toggle("active", Number(panel.dataset.onboard) === onboardStep);
    });
    document.querySelectorAll(".onboard-dots i").forEach((dot, index) => {
      dot.classList.toggle("active", index === onboardStep);
    });
  }
  window.onboardNext = () => {
    onboardStep = Math.min(2, onboardStep + 1);
    renderOnboard();
  };
  window.onboardBack = () => {
    onboardStep = Math.max(0, onboardStep - 1);
    renderOnboard();
  };
  window.checkStart = () => {
    $("startBtn").disabled = !($("age").checked && $("value").checked);
  };
  window.startApp = () => {
    S.accepted = true;
    trackEvent("onboarding_completed", { age_confirmed: true, b_medal_terms_confirmed: true });
    save();
    renderAll();
    window.scrollTo(0, 0);
  };

  function renderCurrent(id) {
    if (id === "home") renderHome();
    if (id === "venues") renderVenues();
    if (id === "race") renderRace();
    if (id === "records") renderRecords();
    if (id === "analysis") renderAnalysis();
    if (id === "settings") renderSettings();
  }

  function isFresh() {
    return liveLoaded && DATA.date === C.jstDate();
  }

  function statusText() {
    const stats = DATA.quality?.stats || {};
    if (isFresh()) {
      const generated = DATA.generatedAt
        ? new Date(DATA.generatedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
        : "時刻不明";
      const results = stats.completedResultRaces
        ? ` / 結果 ${stats.completedResultRaces}R`
        : " / 結果待ち";
      return `公式公開データ ${stats.scheduleVenues || 0}場・${stats.scheduleRaces || 0}R・${stats.scheduleEntries || 0}艇${results} / ${generated}更新`;
    }
    if (liveLoaded) return `公式データは ${DATA.date} 分です。今日のB投票は停止中です。`;
    return `公式データを利用できないため、B投票を停止しています。${dataError ? ` ${dataError}` : ""}`;
  }

  function vcard(item, compact = false) {
    const event = eventInfo(item);
    const progress = venueProgress(item);
    const night = venueIsNight(item);
    const stateClass = !item.active ? "inactive" : progress.finished ? "closed" : "active-card";
    let statusLabel = "本日開催なし";
    let statusValue = "—";
    if (item.active && progress.next) {
      statusLabel = `NEXT ${progress.next.number}R`;
      statusValue = timeText(progress.next.closeTime);
    } else if (item.active && progress.resultCount) {
      statusLabel = "結果反映";
      statusValue = `${progress.resultCount}/12R`;
    } else if (item.active) {
      statusLabel = "発売終了";
      statusValue = "結果待ち";
    }
    const officialEvent = event.officialUrl
      || `https://www.boatrace.jp/owpc/pc/race/raceindex?hd=${String(DATA.date || "").replaceAll("-", "")}&jcd=${item.code}`;
    const favorite = S.favorites.includes(item.code);
    if (compact) {
      const isGeneral = event.grade === "GENERAL";
      const topMarker = item.active && !isGeneral
        ? gradeBadge(item)
        : `<span class="venue-time-icon ${night && item.active ? "night" : progress.finished ? "finished" : item.active ? "day" : "off"}">${night && item.active ? "☾" : progress.finished ? "✓" : item.active ? "☀" : "◌"}</span>`;
      const compactStatus = item.active && progress.next
        ? `<span>次 <b>${progress.next.number}R</b></span><strong>締切 ${timeText(progress.next.closeTime)}</strong><i>›</i>`
        : item.active && progress.resultCount
          ? `<span></span><strong>結果確定</strong><i>✓</i>`
          : item.active
            ? `<span></span><strong>発売終了</strong><i>×</i>`
            : `<span></span><strong>次回 —</strong><i></i>`;
      return `<article class="venue-card compact ${stateClass} grade-${gradeClass(event.grade)} ${night ? "is-night" : ""}">
        <button class="venue-card-main" ${item.active ? `onclick="openVenue('${item.code}')"` : "disabled"} aria-label="${esc(item.name)}${item.active ? "のレース一覧へ" : "は本日開催なし"}">
          <div class="venue-compact-marker">${topMarker}</div>
          <div class="venue-compact-name"><strong>${esc(item.name)}</strong><small>${esc(VENUE_ROMAJI[item.code] || "")}</small></div>
          <div class="venue-dayline">${item.active && isGeneral ? gradeBadge(item) : ""}<b>${item.active ? esc(event.dayLabel) : ""}</b></div>
          <div class="event-title">${item.active ? esc(event.title) : "開催予定なし"}</div>
          <div class="event-meta"><span>${item.active ? esc(eventPeriod(event)) : "—　—　—"}</span></div>
          <div class="venue-next">${compactStatus}</div>
        </button>
        <button class="favorite-star ${favorite ? "selected" : ""}" type="button" onclick="toggleFavorite('${item.code}',event)" aria-label="${esc(item.name)}をお気に入り${favorite ? "から外す" : "に追加"}">${favorite ? "★" : "☆"}</button>
      </article>`;
    }
    return `<article class="venue-card ${stateClass}">
      <button class="venue-card-main" ${item.active ? `onclick="openVenue('${item.code}')"` : "disabled"}>
        <div class="venue-top"><div><span class="venue-code">VENUE ${esc(item.code)}</span><strong class="venue-name">${esc(item.name)}</strong></div>${item.active ? gradeBadge(item) : '<span class="grade general">—</span>'}</div>
        <div class="event-title">${item.active ? esc(event.title) : "本日の公式開催なし"}</div>
        <div class="event-meta"><span>${item.active ? esc(event.dayLabel) : "NO RACE"}</span><span>${item.active ? esc(eventPeriod(event)) : ""}</span>${night && item.active ? '<span class="night-tag">NIGHT</span>' : ""}</div>
        <div class="venue-next"><span>${esc(statusLabel)}</span><strong>${esc(statusValue)}</strong></div>
      </button>
      ${item.active ? `<div class="venue-links"><a href="${esc(officialEvent)}" target="_blank" rel="noopener noreferrer">公式開催詳細 ↗</a><a href="${esc(item.boatcast)}" target="_blank" rel="noopener noreferrer">映像 ↗</a></div>` : ""}
    </article>`;
  }

  function nextRaces() {
    if (!isFresh()) return [];
    const now = Date.now();
    return DATA.venues.flatMap((venueItem) => (venueItem.races || []).map(
      (raceItem) => ({
        venue: venueItem,
        race: raceItem,
        close: raceItem.closeTime ? new Date(raceItem.closeTime).getTime() : Infinity,
      })
    )).filter((item) => item.close > now).sort((a, b) => a.close - b.close).slice(0, 5);
  }

  function homeDateText(value) {
    if (!value) return "—";
    const [year, month, day] = String(value).split("-").map(Number);
    if (![year, month, day].every(Number.isFinite)) return String(value);
    const weekday = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][
      new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    ];
    return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")} ${weekday}`;
  }

  function homeVenueSort(left, right) {
    const gradeRank = { SG: 6, PG1: 5, G1: 4, G2: 3, G3: 2, GENERAL: 1 };
    const gradeDifference = (gradeRank[eventInfo(right).grade] || 0)
      - (gradeRank[eventInfo(left).grade] || 0);
    if (gradeDifference) return gradeDifference;
    const leftNext = venueProgress(left).next;
    const rightNext = venueProgress(right).next;
    if (!!leftNext !== !!rightNext) return leftNext ? -1 : 1;
    const leftClose = leftNext?.closeTime ? new Date(leftNext.closeTime).getTime() : Infinity;
    const rightClose = rightNext?.closeTime ? new Date(rightNext.closeTime).getTime() : Infinity;
    if (leftClose !== rightClose) return leftClose - rightClose;
    return String(left.code).localeCompare(String(right.code));
  }

  window.toggleFavorite = (code, event) => {
    event?.preventDefault();
    event?.stopPropagation();
    const current = new Set(S.favorites);
    if (current.has(code)) current.delete(code);
    else current.add(code);
    S.favorites = [...current];
    save();
    renderHome();
  };

  window.showVenueCommand = () => {
    S.homeFilter = "all";
    save();
    renderHome();
  };

  window.showFavorites = () => {
    S.homeFilter = "favorite";
    save();
    renderHome();
  };

  window.scrollToDeadlines = () => {
    document.querySelectorAll("[data-home-command]").forEach((button) => {
      button.classList.toggle("active", button.dataset.homeCommand === "deadline");
    });
    $("deadlineSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  window.setHomeFilter = (filter) => {
    if (!["all", "selling", "grade", "night", "favorite"].includes(filter)) return;
    S.homeFilter = filter;
    save();
    renderHome();
  };

  function renderHome() {
    $("dataStatus").className = `sync-strip ${isFresh() ? "good" : "warn"}`;
    $("dataStatus").textContent = statusText();
    $("homeDateText").textContent = homeDateText(DATA.date);
    $("homeSyncLabel").textContent = isFresh()
      ? "✓ 公式公開データ更新済み"
      : liveLoaded
        ? `△ ${DATA.date}分の公式データ`
        : "△ 公式公開データを確認中";
    const totals = C.savedTotals(S.records);
    $("coins").textContent = `${fmt(S.coins)} B`;
    $("topCoins").textContent = `${fmt(S.coins)} B`;
    $("homeCoins").textContent = `${fmt(S.coins)}B`;
    $("savedToday").textContent = `${fmt(totals.today)}円`;
    $("savedWeek").textContent = `${fmt(totals.week)}円`;
    $("savedMonth").textContent = `${fmt(totals.month)}円`;
    const active = DATA.venues.filter((item) => item.active).sort(homeVenueSort);
    $("activeCount").textContent = `${active.length}場 / ${active.reduce((sum, item) => sum + (item.races?.length || 0), 0)}R`;
    document.querySelectorAll("[data-home-filter]").forEach((button) => {
      button.classList.toggle("active", button.dataset.homeFilter === S.homeFilter);
    });
    document.querySelectorAll("[data-home-command]").forEach((button) => {
      const command = S.homeFilter === "favorite" ? "favorite" : "venues";
      button.classList.toggle("active", button.dataset.homeCommand === command);
    });
    let visible = [...active, ...DATA.venues.filter((item) => !item.active)];
    if (S.homeFilter === "selling") visible = active.filter((item) => !!venueProgress(item).next);
    if (S.homeFilter === "grade") visible = active.filter((item) => eventInfo(item).grade !== "GENERAL");
    if (S.homeFilter === "night") visible = active.filter(venueIsNight);
    if (S.homeFilter === "favorite") visible = DATA.venues.filter((item) => S.favorites.includes(item.code));
    $("homeVenues").innerHTML = visible.length
      ? visible.map((item) => vcard(item, true)).join("")
      : `<div class="card muted empty-home">${S.homeFilter === "favorite" ? "☆を押すと、お気に入りの開催場をここに表示します。" : "該当する公式開催データはありません。"}</div>`;
    $("aiMemo").textContent = aiText();
    const upcoming = nextRaces();
    $("nextRaces").innerHTML = upcoming.length
      ? upcoming.map((item) => `<article class="deadline-card">
          <div class="deadline-top"><h3>${esc(item.venue.name)} ${item.race.number}R</h3><span class="deadline-time">${timeText(item.race.closeTime)}</span></div>
          <p>${esc(eventInfo(item.venue).title)} / ${esc(item.race.name || "")}</p>
          <div class="deadline-count" data-countdown="${item.close}">締切まで ${durationText(item.close - Date.now())}</div>
          <button class="btn secondary full" style="margin-top:8px" onclick="jumpRace('${item.venue.code}',${item.race.number})">${item.race.number}Rへ進む →</button>
        </article>`).join("")
      : `<div class="card muted">${isFresh() ? "この後の締切はありません。" : "今日の実データ同期待ちです。"}</div>`;
    const unreviewed = S.records.filter(
      (record) => (record.settled || canReviewAfter(record)) && !record.behaviorReviewed
    ).length;
    const unseenReward = [...S.records].reverse().find(
      (record) => record.rewardOutcome && !record.rewardCelebratedAt
    );
    const notices = [];
    if (unreviewed) {
      notices.push(`<div class="notice good" style="margin-top:10px"><b>${unreviewed}件のレース後振り返りがあります。</b> 任意で衝動の変化を記録できます。</div>`);
    }
    if (unseenReward) {
      notices.push(`<div class="notice reward-arrived" style="margin-top:10px"><b>${unseenReward.rewardOutcome === "double-win" ? "DOUBLE WIN達成！" : "防衛スタンプを獲得！"}</b><br>${esc(unseenReward.venue)} ${unseenReward.raceNo}Rの成果を確認できます。<button class="btn coral-btn full" type="button" onclick="openRewardCelebration('${unseenReward.id}')">成果を見る</button></div>`);
    }
    $("settledNotice").innerHTML = notices.join("");
  }

  window.setFilter = (filter) => {
    S.filter = filter;
    save();
    renderVenues();
  };

  function renderVenues() {
    $("dataDate").textContent = DATA.date;
    document.querySelectorAll(".filter[data-filter]").forEach(
      (button) => button.classList.toggle("active", button.dataset.filter === S.filter)
    );
    const list = S.filter === "active"
      ? DATA.venues.filter((item) => item.active)
      : S.filter === "off"
        ? DATA.venues.filter((item) => !item.active)
        : DATA.venues;
    $("venueList").innerHTML = list.length
      ? list.map((item) => vcard(item, true)).join("")
      : '<div class="card muted">該当する開催場はありません。</div>';
  }

  window.openVenue = (code) => {
    S.venue = code;
    S.raceNo = preferredRaceNumber(venue(code));
    resetBuilder();
    trackEvent("venue_opened", { source: "venue-list" }, {
      raceDate: DATA.date,
      venueCode: code,
      raceNo: S.raceNo,
    });
    save();
    window.go("race");
  };
  window.openVenueSwitcher = () => {
    const activeVenues = DATA.venues.filter((item) => item.active);
    openModal(`<div class="venue-switcher"><span class="kicker">VENUE SELECT</span><h2>開催場を切り替える</h2>
      <p>場を選ぶと、発売中の次レース（終了後は最新結果）へ移動します。</p>
      <div class="venue-switch-grid">${activeVenues.map((item) => {
        const event = eventInfo(item);
        const progress = venueProgress(item);
        const status = progress.next
          ? `${progress.next.number}R　締切 ${timeText(progress.next.closeTime)}`
          : `本日終了　結果 ${progress.resultCount}/${item.races.length}R`;
        return `<button type="button" class="venue-switch-card ${item.code === S.venue ? "current" : ""}" onclick="switchVenueFromRace('${item.code}')">
          <span>${esc(item.code)} / ${esc(VENUE_ROMAJI[item.code] || "")}</span>
          <strong>${esc(item.name)} ${item.code === S.venue ? "✓" : ""}</strong>
          <small>${esc(event.gradeLabel)}・${esc(status)}</small>
        </button>`;
      }).join("")}</div>
      <button class="btn secondary full" type="button" onclick="closeModal();go('venues')">全国24場の一覧を見る</button>
      <button class="btn ghost full" type="button" onclick="closeModal()">閉じる</button></div>`);
  };
  window.switchVenueFromRace = (code) => {
    const selected = venue(code);
    if (!selected?.active) return;
    S.venue = code;
    S.raceNo = preferredRaceNumber(selected);
    resetBuilder();
    trackEvent("venue_opened", { source: "venue-switcher" }, {
      raceDate: DATA.date,
      venueCode: code,
      raceNo: S.raceNo,
    });
    save();
    window.closeModal();
    renderRace();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  window.jumpRace = (code, number) => {
    S.venue = code;
    S.raceNo = number;
    resetBuilder();
    trackEvent("race_opened", { source: "deadline" }, {
      raceDate: DATA.date,
      venueCode: code,
      raceNo: number,
    });
    save();
    window.go("race");
  };
  window.selectRace = (number) => {
    S.raceNo = number;
    resetBuilder();
    trackEvent("race_opened", { source: "race-tabs" }, {
      raceDate: DATA.date,
      venueCode: S.venue,
      raceNo: number,
    });
    save();
    renderRace();
  };

  function closeState(raceItem) {
    return isFresh()
      && !!raceItem.closeTime
      && raceItem.entries?.length === 6
      && Date.now() < new Date(raceItem.closeTime).getTime();
  }

  function renderRace() {
    let venueItem = venue(S.venue);
    if (!venueItem?.active) {
      venueItem = DATA.venues.find((item) => item.active);
      if (venueItem) {
        S.venue = venueItem.code;
        S.raceNo = preferredRaceNumber(venueItem);
      }
    }
    if (!venueItem) {
      $("raceView").innerHTML = '<div class="card notice warn">本日の公式開催データがありません。B投票は停止中です。</div>';
      return;
    }
    const raceItem = race(venueItem.code, S.raceNo) || venueItem.races?.[0];
    if (!raceItem) {
      $("raceView").innerHTML = '<div class="card notice warn">番組表データが完全ではないため、B投票を停止しています。</div>';
      return;
    }
    S.raceNo = raceItem.number;
    const now = Date.now();
    const chips = venueItem.races.map((item) => {
      const closed = !!item.closeTime && now >= new Date(item.closeTime).getTime();
      const confirmed = !!item.result;
      return `<button class="racechip ${closed ? "closed" : ""} ${confirmed ? "confirmed" : ""} ${item.number === raceItem.number ? "active" : ""}"
        data-race-chip="${item.number}" data-close="${item.closeTime ? new Date(item.closeTime).getTime() : ""}"
        title="${closed ? "締切済み・結果閲覧" : `締切 ${timeText(item.closeTime)}`}"
        onclick="selectRace(${item.number})">${item.number}R</button>`;
    }).join("");
    const entries = `<div class="boats">${raceItem.entries.map((entry) => `<a class="boat" href="${racerUrl(entry.racerNumber)}" target="_blank" rel="noopener" aria-label="${esc(entry.name)}選手の公式情報を開く">
      <div class="num b${entry.boatNumber}">${entry.boatNumber}</div>
      <div><b>${esc(entry.name)}</b><div class="tiny">${entry.racerNumber} ${esc(entry.branch || "")}${entry.age ? ` / ${entry.age}歳` : ""}${entry.weight ? ` / ${entry.weight}kg` : ""}</div></div>
      <div><b class="tiny">${esc(entry.class || "")}</b><div class="tiny">${entry.motorNumber ? `M${entry.motorNumber}` : ""}${entry.boatPart ? ` / B${entry.boatPart}` : ""}</div><div class="racerlinkhint">公式情報 ↗</div></div>
    </a>`).join("")}</div>`;
    const open = closeState(raceItem);
    lastRenderedRaceOpen = open;
    const raceStatus = raceStatusInfo(raceItem);
    const event = eventInfo(venueItem);
    const officialEvent = event.officialUrl
      || `https://www.boatrace.jp/owpc/pc/race/raceindex?hd=${String(DATA.date || "").replaceAll("-", "")}&jcd=${venueItem.code}`;
    $("raceView").innerHTML = `<div class="race-path"><span>開催場</span><b>›</b><button class="race-path-venue" type="button" onclick="openVenueSwitcher()">${esc(venueItem.name)}⌄</button><b>›</b><span>${raceItem.number}R</span><b>›</b><span>出走表</span><b>›</b><span>AIR BET</span></div>
      <div class="event-banner">
        ${gradeBadge(venueItem)}
        <h1>${esc(event.title)}</h1>
        <p><button class="event-venue-switch" type="button" onclick="openVenueSwitcher()">${esc(venueItem.name)}⌄</button> / ${esc(event.dayLabel)} / ${esc(eventPeriod(event))}${venueIsNight(venueItem) ? " / NIGHT" : ""}</p>
        <a href="${esc(officialEvent)}" target="_blank" rel="noopener noreferrer">公式開催詳細 ↗</a>
      </div>
      <div class="racechips">${chips}</div>
      <div class="panel raceboard">
        <div class="raceheadline"><div><div class="eyebrow">公式公開番組表を反映</div>
        <div class="racename"><button class="race-venue-button" type="button" onclick="openVenueSwitcher()">${esc(venueItem.name)}⌄</button> <strong>${raceItem.number}R</strong> <span>${esc(raceItem.name || "")}</span></div>
        <div class="tiny">電話投票締切予定 ${timeText(raceItem.closeTime)} ※変更される場合があります</div></div>
        <div id="raceStatusPanel" class="raceclock ${raceStatus.key}">${raceStatusHtml(raceItem)}</div></div>
        ${entries}${resultHtml(raceItem)}
        <div class="officialmenu" style="margin-top:10px">
          <a class="officiallink" href="${officialUrl(venueItem.code, raceItem.number)}" target="_blank" rel="noopener noreferrer"><span>出走表</span><b>公式で確認 ↗</b></a>
          <a id="officialOddsMain" class="officiallink" href="${officialOddsUrl(venueItem.code, raceItem.number)}" target="_blank" rel="noopener noreferrer"><span>オッズ</span><b id="officialOddsMainLabel">公式3連単 ↗</b></a>
          <a class="officiallink" href="${officialResultUrl(venueItem.code, raceItem.number)}" target="_blank" rel="noopener noreferrer"><span>レース結果</span><b>公式で確認 ↗</b></a>
          <a class="officiallink" href="${esc(venueItem.boatcast)}" target="_blank" rel="noopener noreferrer"><span>映像</span><b>LIVE・リプレイ ↗</b></a>
        </div>
        <div class="source-note">参考オッズは締切45分前から約15分周期で取得するスナップショットです。時刻を確認し、最終情報は公式サイトで確認してください。</div>
      </div>
      <div class="section-head small"><div><span class="section-number">B</span><h2>AIR BET</h2><small>Bメダル仮想投票</small></div><span class="section-meta">公式7舟券種</span></div>
      <div class="panel betdesk">${open
        ? builderShell()
        : isFresh()
          ? '<div class="notice warn">公式締切時刻を過ぎています。新規B投票はできません。</div>'
          : '<div class="notice warn">今日の検証済み公式データではないため、新規B投票を停止しています。</div>'}</div>`;
    if (open) renderBuilder();
  }

  function updateTimeDisplays() {
    document.querySelectorAll("[data-countdown]").forEach((element) => {
      const remaining = Number(element.dataset.countdown) - Date.now();
      element.textContent = remaining > 0
        ? `締切まで ${durationText(remaining)}`
        : "締切済";
    });
    document.querySelectorAll("[data-race-chip][data-close]").forEach((button) => {
      const close = Number(button.dataset.close);
      if (close) button.classList.toggle("closed", Date.now() >= close);
    });

    const venueItem = venue(S.venue);
    const raceItem = race(venueItem?.code, S.raceNo);
    if (!raceItem) return;
    const currentlyOpen = closeState(raceItem);
    if (lastRenderedRaceOpen === true && !currentlyOpen) {
      renderRace();
      return;
    }
    const panel = $("raceStatusPanel");
    if (panel) {
      const status = raceStatusInfo(raceItem);
      panel.className = `raceclock ${status.key}`;
      panel.innerHTML = raceStatusHtml(raceItem);
    }
  }

  function resultHtml(raceItem) {
    if (!raceItem.result) return "";
    const finish = (raceItem.result.finish || []).slice(0, 3)
      .map((item) => item.boatNumber).join("-");
    const payouts = PAYOUT_DISPLAY_ORDER.flatMap((type) =>
      C.payoutList(raceItem.result, type)
    );
    const notEstablished = (raceItem.result.notEstablishedTypes || []).map(
      (type) => C.BET_TYPES[C.normalizeBetType(type)].label
    );
    if (raceItem.result.payoutStatus === "notEstablished" && !payouts.length) {
      return '<div class="notice warn" style="margin-top:9px"><b>舟券 不成立</b><br>このレースのB投票額は、公式競走成績の反映後に自動返還されます。</div>';
    }
    if (!payouts.length) {
      return `<div class="notice" style="margin-top:9px"><b>実着順 ${finish || "集計中"}</b><br>公式払戻の確定待ちです。</div>`;
    }
    return `<div class="notice good resultboard" style="margin-top:9px"><b>実着順 ${finish || "確定"}</b><span class="data-source">公式確定結果</span>
      <details style="margin-top:6px"><summary><b>確定払戻（7舟券種）</b></summary>${payouts.map(
        (item) => `<br>${C.BET_TYPES[item.betType].label} ${item.combination} / ${fmt(item.payout)}円${item.popularity ? ` / ${item.popularity}番人気` : ""}`
      ).join("")}${notEstablished.length ? `<br>不成立・返還：${notEstablished.map(esc).join("・")}` : ""}</details></div>`;
  }

  function builderShell() {
    return `<div class="bettypebar">${BET_ORDER.map((type) =>
      `<button id="type-${type}" class="bettypebtn" onclick="setBetType('${type}')">${C.BET_TYPES[type].label}</button>`
    ).join("")}</div>
    <div id="betGuide" class="notice betguide"></div>
    <div id="modeTabs" class="bet-tabs"></div><div id="builder"></div>
    <div id="addedNotice" class="added-notice" aria-live="polite"></div>
    <div class="title cart-title" style="margin-top:14px"><div><h2 style="font-size:16px">購入する買い目</h2><small>別の組み合わせ・舟券種も続けて追加できます</small></div><span id="cartCount">0点</span></div>
    <div id="cart" class="cart"></div><div id="cartTools" class="cart-tools"></div><div id="cartSum" class="notice">買い目を作成してください。</div>
    <button class="btn teal full" style="margin-top:9px" onclick="reviewBet()">AIR BETを確認</button>`;
  }

  function allowedModes(type = betType) {
    if (C.BET_TYPES[type].picks === 1) return ["normal"];
    if (type === "wide") return ["normal", "box"];
    return ["normal", "box", "form"];
  }

  function resetSelections() {
    const picks = C.BET_TYPES[betType].picks;
    normal = Array(picks).fill(null);
    box = new Set();
    form = Array.from({ length: picks }, () => new Set());
  }

  function resetBuilder() {
    betType = "trifecta";
    mode = "normal";
    resetSelections();
    cart = [];
  }

  window.setBetType = (nextType) => {
    if (!C.BET_TYPES[nextType]) return;
    betType = nextType;
    mode = "normal";
    resetSelections();
    renderBuilder();
  };

  window.setMode = (nextMode) => {
    if (!allowedModes().includes(nextMode)) return;
    mode = nextMode;
    resetSelections();
    renderBuilder();
  };

  function positionLabel(index, spec) {
    if (spec.picks === 1) return betType === "place" ? "2着以内" : "1着";
    return spec.ordered ? `${index + 1}着` : `${index + 1}艇目（順不同）`;
  }

  function renderBuilder() {
    if (!$("builder")) return;
    const spec = C.BET_TYPES[betType];
    BET_ORDER.forEach(
      (type) => $(`type-${type}`)?.classList.toggle("active", type === betType)
    );
    const venueItem = venue(S.venue);
    const raceItem = race(venueItem?.code, S.raceNo);
    const oddsUrl = officialOddsUrl(venueItem?.code, raceItem?.number, betType);
    const oddsSnapshot = raceOddsType(raceItem, betType);
    const oddsCount = Object.keys(oddsSnapshot?.values || {}).length;
    const oddsTimeLabel = oddsSnapshot?.timeSource === "fetched" ? "取得" : "更新";
    $("betGuide").innerHTML = `<div><b>${spec.label}</b>：${BET_GUIDES[betType]}。1点100Bから、100B単位。</div>
      ${oddsCount ? `<div class="odds-snapshot available"><div><span>参考オッズ</span><strong>${timeText(oddsSnapshot.updatedAt || oddsSnapshot.fetchedAt)} ${oddsTimeLabel}</strong></div><p>${esc(spec.label)} ${oddsCount}通りを取得済み。締切45分前から約15分周期で更新します。</p></div>`
        : `<div class="odds-snapshot pending"><div><span>参考オッズ</span><strong>準備中</strong></div><p>締切45分前から約15分周期で取得します。まだ届いていない場合は公式画面で確認できます。</p></div>`}
      <div class="odds-caution">表示倍率はリアルタイム・確定値ではありません。更新後に変動する場合があります。</div>
      <a class="inline-official odds-now" href="${oddsUrl}" target="_blank" rel="noopener noreferrer">公式${officialOddsLabel(betType)}オッズで最終確認 ↗</a>`;
    const oddsMain = $("officialOddsMain");
    if (oddsMain) oddsMain.href = oddsUrl;
    const oddsMainLabel = $("officialOddsMainLabel");
    if (oddsMainLabel) oddsMainLabel.textContent = `公式${officialOddsLabel(betType)} ↗`;
    const modes = allowedModes();
    $("modeTabs").style.gridTemplateColumns = `repeat(${modes.length},1fr)`;
    $("modeTabs").innerHTML = modes.map((item) =>
      `<button id="bt-${item}" class="bet-tab ${item === mode ? "active" : ""}" onclick="setMode('${item}')">${MODE_LABELS[item]}</button>`
    ).join("");
    let html = "";
    if (mode === "normal") {
      html = Array.from({ length: spec.picks }, (_, index) => `<div class="rank"><h3>${positionLabel(index, spec)}</h3><div class="betgrid">${[1, 2, 3, 4, 5, 6].map(
        (boat) => `<button id="n-${index}-${boat}" class="pick b${boat}" onclick="pickNormal(${index},${boat})">${boat}</button>`
      ).join("")}</div></div>`).join("")
        + '<button class="btn secondary full" onclick="addNormal()">買い目を追加</button>';
    } else if (mode === "box") {
      html = `<div class="rank"><h3>BOX（${spec.picks}艇以上）</h3><div class="betgrid">${[1, 2, 3, 4, 5, 6].map(
        (boat) => `<button id="b-${boat}" class="pick b${boat}" onclick="pickBox(${boat})">${boat}</button>`
      ).join("")}</div></div><button class="btn secondary full" onclick="addBox()">BOXを追加</button>`;
    } else {
      html = Array.from({ length: spec.picks }, (_, index) => `<div class="rank"><h3>${spec.ordered ? `${index + 1}着候補` : `${index + 1}艇目候補`}</h3><div class="betgrid">${[1, 2, 3, 4, 5, 6].map(
        (boat) => `<button id="f-${index}-${boat}" class="pick b${boat}" onclick="pickForm(${index},${boat})">${boat}</button>`
      ).join("")}</div></div>`).join("")
        + '<button class="btn secondary full" onclick="addForm()">フォーメーションを追加</button>';
    }
    $("builder").innerHTML = html;
    refreshBuilder();
  }

  window.pickNormal = (index, boat) => {
    normal.forEach((value, other) => {
      if (other !== index && value === boat) normal[other] = null;
    });
    normal[index] = boat;
    refreshBuilder();
  };
  window.pickBox = (boat) => {
    if (box.has(boat)) box.delete(boat);
    else box.add(boat);
    refreshBuilder();
  };
  window.pickForm = (index, boat) => {
    if (form[index].has(boat)) form[index].delete(boat);
    else form[index].add(boat);
    refreshBuilder();
  };
 async function addCombos(combos) {
    const seen = new Set(cart.map(
      (line) => `${C.normalizeBetType(line.betType)}:${C.canonicalCombo(line.combo, line.betType)}`
    ));
    let added = 0;
    const raceItem = race(S.venue, S.raceNo);
       let liveOdds = null;

    try {
      const oddsResponse = await fetch(
        "https://mihicuoijitluvrufsoj.supabase.co/functions/v1/boatrace-odds",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: DATA.date,
            venueCode: S.venue,
            raceNo: S.raceNo,
            betType,
          }),
        }
      );

      if (oddsResponse.ok) {
        const oddsPayload = await oddsResponse.json();

        if (
          oddsPayload?.ok &&
          oddsPayload.status === "available" &&
          oddsPayload.odds?.values
        ) {
          liveOdds = oddsPayload.odds;
        }
      }
    } catch (error) {
      console.warn("リアルタイム倍率の取得に失敗しました", error);
    }
    combos.forEach((combo) => {
      const canonical = C.canonicalCombo(combo, betType).split("-").map(Number);
      const key = `${betType}:${canonical.join("-")}`;
      if (!seen.has(key)) {
        const liveKey = canonical.join("-");
const liveValue = liveOdds?.values?.[liveKey];
const reference = liveValue != null
  ? {
      value: String(liveValue),
      updatedAt: liveOdds.updatedAt || liveOdds.fetchedAt || new Date().toISOString(),
      timeSource: "fetched",
    }
  : referenceOdds(raceItem, betType, canonical);
        cart.push({
          combo: canonical,
          betType,
          stake: 100,
          odds: reference?.value || "",
          oddsCapturedAt: reference?.updatedAt || null,
          oddsSource: reference ? "official-snapshot" : null,
          oddsTimeSource: reference?.timeSource || null,
          mode,
        });
        seen.add(key);
        added += 1;
      }
    });
    if (added) {
      resetSelections();
      refreshBuilder();
    } else {
      renderCart();
    }
    const notice = $("addedNotice");
    if (notice) {
      notice.className = `added-notice ${added ? "show" : "duplicate"}`;
      notice.textContent = added
        ? `${added}点を追加しました。続けて別の買い目を選べます。`
        : "同じ買い目はすでに追加されています。";
    }
  }

  window.addNormal = () => {
    if (!normal.every(Boolean)) return alert(`${C.BET_TYPES[betType].picks}艇を選択してください。`);
    addCombos([[...normal]]);
  };

  function selections(items, count, ordered) {
    const output = [];
    const walk = (selected, remaining) => {
      if (selected.length === count) {
        output.push(selected);
        return;
      }
      remaining.forEach((boat, index) => {
        walk([...selected, boat], ordered
          ? remaining.filter((item) => item !== boat)
          : remaining.slice(index + 1));
      });
    };
    walk([], items);
    return output;
  }

  window.addBox = () => {
    const spec = C.BET_TYPES[betType];
    const boats = [...box];
    if (boats.length < spec.picks) return alert(`${spec.picks}艇以上選択してください。`);
    addCombos(selections(boats, spec.picks, spec.ordered));
  };
  window.addForm = () => {
    if (form.some((items) => !items.size)) return alert("各候補を選択してください。");
    const combos = [];
    const walk = (index, selected) => {
      if (index === form.length) {
        combos.push(selected);
        return;
      }
      form[index].forEach((boat) => {
        if (!selected.includes(boat)) walk(index + 1, [...selected, boat]);
      });
    };
    walk(0, []);
    addCombos(combos);
  };

  function refreshBuilder() {
    for (let index = 0; index < C.BET_TYPES[betType].picks; index += 1) {
      for (let boat = 1; boat <= 6; boat += 1) {
        const normalButton = $(`n-${index}-${boat}`);
        if (normalButton) {
          normalButton.classList.toggle("sel", normal[index] === boat);
          normalButton.classList.toggle("dim", normal.includes(boat) && normal[index] !== boat);
        }
        $(`f-${index}-${boat}`)?.classList.toggle("sel", form[index].has(boat));
      }
    }
    for (let boat = 1; boat <= 6; boat += 1) {
      $(`b-${boat}`)?.classList.toggle("sel", box.has(boat));
    }
    renderCart();
  }

  window.changeLine = (index, key, value) => {
    if (key === "stake") {
      cart[index].stake = Math.max(100, Math.floor((Number(value) || 100) / 100) * 100);
    } else {
      cart[index].odds = value;
      cart[index].oddsCapturedAt = oddsNumber(value) > 0 ? new Date().toISOString() : null;
      cart[index].oddsSource = oddsNumber(value) > 0 ? "manual" : null;
      cart[index].oddsTimeSource = null;
    }
    renderCart();
  };
  window.removeLine = (index) => {
    cart.splice(index, 1);
    renderCart();
  };

  window.setAllStakes = (amount) => {
    const value = Math.max(100, Math.floor((Number(amount) || 100) / 100) * 100);
    cart.forEach((line) => { line.stake = value; });
    renderCart();
  };

  window.clearCart = () => {
    if (!cart.length || !confirm("追加した買い目をすべて削除しますか？")) return;
    cart = [];
    renderCart();
  };

  function renderCart() {
    if (!$("cart")) return;
    $("cart").innerHTML = cart.length
      ? cart.map((line, index) => `<div class="cartrow"><b class="tickettype">${C.BET_TYPES[C.normalizeBetType(line.betType)].label}</b>
          <b>${line.combo.join("-")}</b>
          <input value="${line.stake}" inputmode="numeric" aria-label="投票メダル" onchange="changeLine(${index},'stake',this.value)">
          ${line.oddsSource === "official-snapshot"
            ? `<div class="cart-odds" aria-label="参考オッズ ${esc(line.odds)}倍"><b>${esc(line.odds)}倍</b><small>${timeText(line.oddsCapturedAt)} ${line.oddsTimeSource === "fetched" ? "取得" : "更新"}</small></div>`
            : `<label class="odds-input"><input value="${esc(line.odds)}" inputmode="decimal" aria-label="参考オッズ" placeholder="倍率" onchange="changeLine(${index},'odds',this.value)">${line.oddsCapturedAt ? `<small>${timeText(line.oddsCapturedAt)} 入力</small>` : `<small>未取得</small>`}</label>`}
          <button class="xbtn" aria-label="削除" onclick="removeLine(${index})">×</button></div>`).join("")
      : '<div class="muted">買い目はまだありません。</div>';
    const total = cart.reduce((sum, line) => sum + line.stake, 0);
    $("cartCount").textContent = `${cart.length}点`;
    $("cartTools").innerHTML = cart.length
      ? `<span>全点のBメダル</span><button type="button" onclick="setAllStakes(100)">100B</button><button type="button" onclick="setAllStakes(200)">200B</button><button type="button" onclick="setAllStakes(500)">500B</button><button type="button" onclick="setAllStakes(1000)">1,000B</button><button class="clear" type="button" onclick="clearCart()">全削除</button>`
      : "";
    const estimates = cart.filter((line) => oddsNumber(line.odds) > 0)
      .map((line) => line.stake * oddsNumber(line.odds));
    $("cartSum").innerHTML = cart.length
      ? `<b>${cart.length}点 / 合計 ${fmt(total)}B</b>${estimates.length
        ? `<br>入力オッズの最低想定払戻 ${fmt(Math.min(...estimates))}B${Math.min(...estimates) < total ? " / トリガミ候補" : ""}`
        : ""}<br>最終精算は公式の確定払戻で行います。`
      : "買い目を作成してください。";
  }

  function betReceipt(lines, entries, betMode, title = "購入した買い目") {
    const validLines = (lines || []).filter(
      (line) => {
        const type = C.normalizeBetType(line.betType);
        return Array.isArray(line.combo) && line.combo.length === C.BET_TYPES[type].picks;
      }
    );
    if (!validLines.length) {
      return '<div class="notice warn">この記録には買い目データがありません。</div>';
    }
    const names = new Map((entries || []).map(
      (entry) => [Number(entry.boatNumber), String(entry.name || "")]
    ));
    const labels = [...new Set(validLines.map(
      (line) => C.BET_TYPES[C.normalizeBetType(line.betType)].label
    ))];
    const meta = [labels.join("・"), `${validLines.length}点`].filter(Boolean).join(" / ");
    return `<details class="betreceipt" open><summary>${esc(title)}<span>${esc(meta)}</span></summary>
      <div class="betlines">${validLines.map((line) => {
        const type = C.normalizeBetType(line.betType);
        const ordered = C.BET_TYPES[type].ordered;
        const separator = ordered ? " → " : " - ";
        const combo = line.combo.map(Number);
        const racerNames = combo.map(
          (boat) => names.get(boat) ? `${boat}号艇 ${names.get(boat)}` : ""
        ).filter(Boolean);
        const lineMode = MODE_LABELS[line.mode || betMode] || "";
        return `<div class="betline"><span class="bettype">${C.BET_TYPES[type].label}</span>
          <b class="betcombo">${combo.join(separator)}</b><b>${fmt(line.stake)}B</b>
          ${racerNames.length === combo.length ? `<div class="betnames">${lineMode ? `${lineMode} / ` : ""}${racerNames.map(esc).join(separator)}</div>` : ""}
          ${oddsNumber(line.odds) > 0 ? `<div class="betnames">参加時参考オッズ ${esc(line.odds)}倍${line.oddsCapturedAt ? ` / ${timeText(line.oddsCapturedAt)}${line.oddsTimeSource === "fetched" ? "取得" : line.oddsSource === "official-snapshot" ? "更新" : "入力"}` : ""}</div>` : ""}</div>`;
      }).join("")}</div></details>`;
  }

  function dailyChallengeRecord(date = DATA.date) {
    return S.records.find(
      (record) => record.raceDate === date && record.rewardChallenge === true
    ) || null;
  }

  window.reviewBet = () => {
    const venueItem = venue(S.venue);
    const raceItem = race(venueItem?.code, S.raceNo);
    if (!raceItem || !closeState(raceItem)) {
      return alert("締切後または検証済み当日データではないため、B投票できません。");
    }
    if (!cart.length) return alert("買い目を追加してください。");
    const total = cart.reduce((sum, line) => sum + line.stake, 0);
    if (total > S.coins) return alert("Bメダル残高が不足しています。");
    const challenge = dailyChallengeRecord(DATA.date);
    const challengePanel = challenge
      ? `<div class="notice challenge-taken"><b>今日の防衛勝負は選択済み</b><br>${esc(challenge.venue)} ${challenge.raceNo}Rが、ダブルWIN・防衛スタンプの対象です。この投票は通常のB投票として記録されます。</div>`
      : `<label class="challenge-select"><input id="rewardChallenge" type="checkbox" checked><span><b>このレースを「今日の防衛勝負」にする</b><small>1日1レース限定。結果とアプリ内行動から自動判定します。</small></span></label>`;
    trackEvent("bet_review_opened", {
      line_count: cart.length,
      stake_b: total,
      challenge_available: !challenge,
    }, {
      raceDate: DATA.date,
      venueCode: venueItem.code,
      raceNo: raceItem.number,
    });
    openModal(`<h2>${esc(venueItem.name)} ${raceItem.number}R</h2>
      <div class="notice"><b>${cart.length}点 / ${fmt(total)}B</b></div>
      <h3>購入内容</h3>${betReceipt(cart, raceItem.entries, mode, "購入する買い目")}
      ${challengePanel}
      <h3>このレースへの自信</h3>
      <input id="conf" class="slider" type="range" min="0" max="10" value="5" oninput="document.getElementById('cv').textContent=this.value"><div id="cv" class="big">5</div>
      <h3>今、現金で買いたい気持ち</h3>
      <input id="urge" class="slider" type="range" min="0" max="10" value="5" oninput="document.getElementById('uv').textContent=this.value"><div id="uv" class="big">5</div>
      <div class="field"><label>参加理由</label><select id="reason"><option>なんとなく</option><option>レースがあるから</option><option>自信がある</option><option>取り返したい</option><option>推し選手</option><option>その他</option></select></div>
      <div class="field"><label>メモ</label><textarea id="memo" maxlength="500" placeholder="なぜ買いたくなったか等"></textarea></div>
      <button class="btn teal full" onclick="placeBet()">AIR BETを確定する</button>`);
  };

  window.placeBet = () => {
    const venueItem = venue(S.venue);
    const raceItem = race(venueItem?.code, S.raceNo);
    if (!raceItem || !closeState(raceItem)) {
      window.closeModal();
      return alert("締切時刻を過ぎたため、B投票を取り消しました。");
    }
    const total = cart.reduce((sum, line) => sum + line.stake, 0);
    if (!cart.length || total > S.coins) return alert("Bメダル残高が不足しています。");
    const event = eventInfo(venueItem);
    const challenge = dailyChallengeRecord(DATA.date);
    const rewardChallenge = !challenge && $("rewardChallenge")?.checked === true;
    const recordId = window.crypto?.randomUUID ? window.crypto.randomUUID() : `r-${Date.now()}`;
    if (!postLedger("virtual_bet", -total, `bet:${recordId}`, {
      label: `${venueItem.name} ${raceItem.number}R 仮想投票`,
      recordId,
      venueCode: venueItem.code,
      raceNo: raceItem.number,
    })) return alert("Bメダル残高が不足しています。");
    const record = {
      id: recordId,
      walletVersionAtBet: WALLET_VERSION,
      raceDate: DATA.date,
      coinWeek: S.coinWeek,
      time: new Date().toISOString(),
      closeTime: raceItem.closeTime,
      venueCode: venueItem.code,
      venue: venueItem.name,
      raceNo: raceItem.number,
      raceName: raceItem.name || "",
      eventTitle: event.title,
      eventGrade: event.grade,
      eventGradeLabel: event.gradeLabel,
      eventDayLabel: event.dayLabel,
      betMode: mode,
      entrySnapshot: raceItem.entries.map((entry) => ({
        boatNumber: entry.boatNumber,
        racerNumber: entry.racerNumber,
        name: entry.name,
      })),
      lines: cart.map((line) => ({
        combo: [...line.combo],
        betType: C.normalizeBetType(line.betType),
        stake: line.stake,
        odds: line.odds,
        oddsCapturedAt: line.oddsCapturedAt || null,
        oddsSource: line.oddsSource || null,
        oddsTimeSource: line.oddsTimeSource || null,
        mode: line.mode || mode,
      })),
      stake: total,
      intendedYen: total,
      conf: Number($("conf").value),
      urge: Number($("urge").value),
      reason: $("reason").value,
      memo: $("memo").value.slice(0, 500),
      status: "pending",
      settled: false,
      payoutStatus: "pending",
      payoutC: 0,
      resultCombo: null,
      resultPayout: null,
      resultPayouts: [],
      refundC: 0,
      behaviorReviewed: false,
      afterUrge: null,
      saved: total,
      rewardChallenge,
      rewardOutcome: null,
      rewardEvaluatedAt: null,
    };
    S.records.push(record);
    if (record.closeTime) {
  const closeAt = new Date(record.closeTime).getTime();

  if (Number.isFinite(closeAt)) {
    const checkAfter = new Date(
      closeAt + 2 * 60 * 1000
    ).toISOString();

    fetch(
      "https://mihicuoijitluvrufsoj.supabase.co/functions/v1/boatrace-result",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: record.raceDate,
          venueCode: record.venueCode,
          raceNo: record.raceNo,
          registerOnly: true,
          checkAfter,
        }),
      }
    ).catch((error) => {
      console.warn(
        "結果監視予約に失敗しました",
        error
      );
    });
  }
}
    trackEvent("virtual_bet_placed", {
      record_id: record.id,
      line_count: record.lines.length,
      bet_types: [...new Set(record.lines.map((line) => line.betType))],
      bet_mode: record.betMode,
      stake_b: record.stake,
      intended_yen: record.intendedYen,
      confidence: record.conf,
      urge_before: record.urge,
      reason: record.reason,
      reward_challenge: record.rewardChallenge,
      seconds_to_close: record.closeTime
        ? Math.max(0, Math.round((new Date(record.closeTime).getTime() - Date.now()) / 1000))
        : null,
      odds_lines_available: record.lines.filter((line) => oddsNumber(line.odds) > 0).length,
    }, {
      raceDate: record.raceDate,
      venueCode: record.venueCode,
      raceNo: record.raceNo,
    });
    save();
    window.closeModal();
    resetBuilder();
    renderAll();
    window.go("records");
  };

  function canReviewAfter(record) {
    if (record.behaviorReviewed) return false;
    if (record.settled) return true;
    return !!record.closeTime && Date.now() > new Date(record.closeTime).getTime();
  }

  window.reviewAfter = (id) => {
    const record = S.records.find((item) => item.id === id);
    if (!record || !canReviewAfter(record)) return;
    openModal(`<h2>${esc(record.venue)} ${record.raceNo}R</h2>
      <h3>レース後、現金で買いたい気持ちは？</h3>
      <input id="after" class="slider" type="range" min="0" max="10" value="3" oninput="document.getElementById('av').textContent=this.value"><div id="av" class="big">3</div>
      <h3>取り返すため、次も買いたい気持ちは？</h3>
      <input id="chaseAfter" class="slider" type="range" min="0" max="10" value="2" oninput="document.getElementById('cav').textContent=this.value"><div id="cav" class="big">2</div>
      <p class="muted">現金購入の自己申告は不要です。この入力は衝動変化の分析だけに使用します。</p>
      <button class="btn teal full" onclick="saveAfter('${record.id}')">振り返りを保存する</button>`);
  };

  window.saveAfter = (id) => {
    const record = S.records.find((item) => item.id === id);
    if (!record || record.behaviorReviewed) return;
    record.afterUrge = Number($("after").value);
    record.chaseUrge = Number($("chaseAfter").value);
    record.behaviorReviewed = true;
    record.reviewedAt = new Date().toISOString();
    trackEvent("post_race_urge_recorded", {
      record_id: record.id,
      replaced_yen: Number(record.saved) || 0,
      urge_before: Number(record.urge) || 0,
      urge_after: record.afterUrge,
      chase_urge_after: record.chaseUrge,
      confidence: Number(record.conf) || 0,
      reason: record.reason || "未入力",
      result_status: record.settled ? record.status : "pending",
      reward_challenge: record.rewardChallenge === true,
    }, {
      raceDate: record.raceDate,
      venueCode: record.venueCode,
      raceNo: record.raceNo,
    });
    save();
    window.closeModal();
    renderAll();
    window.go("records");
  };

  function findDatasetRace(dataset, venueCode, raceNo) {
    return dataset?.venues
      ?.find((item) => String(item.code) === String(venueCode))
      ?.races?.find((item) => Number(item.number) === Number(raceNo)) || null;
  }

  function resultCheckForRecord(record) {
    const liveRace = record.raceDate === DATA.date
      ? race(record.venueCode, record.raceNo)
      : null;
    return liveRace?.resultCheck || record.resultCheck || null;
  }

  function pendingResultMessage(record) {
    const check = resultCheckForRecord(record);
    if (check?.state === "waiting") {
      return {
        title: "公式結果ページ確認済み・精算データ待ち",
        detail: "MAMO BOATは公式結果ページを確認済みです。アプリで精算できる確定払戻データを取得できしだい、自動でB精算します。",
        tone: "warn",
      };
    }
    if (check?.state === "error") {
      return {
        title: "公式結果の確認を再試行中",
        detail: "一時的に公式結果ページを取得できませんでした。次回の自動確認で再試行します。",
        tone: "warn",
      };
    }
    return {
      title: "公式結果を確認中",
   detail: "締切後の未精算レースは自動で公式結果を確認します。公式払戻が確定しだいB精算へ反映します。",
      tone: "",
    };
  }
  let autoResultCheckRunning = false;
  const autoResultCheckedAt = new Map();

  async function autoRefreshPendingResults() {
    if (document.hidden || autoResultCheckRunning) return;

    const now = Date.now();
    const grouped = new Map();

    S.records.forEach((record) => {
      if (
        record.settled ||
        !record.raceDate ||
        !record.closeTime
      ) return;

      const closeAt = new Date(record.closeTime).getTime();

      // 締切2分後から自動確認開始
      if (
        !Number.isFinite(closeAt) ||
        now < closeAt + 2 * 60 * 1000
      ) return;

      const key =
        `${record.raceDate}:${record.venueCode}:${record.raceNo}`;

      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(record);
    });

    // 同じレースは1回だけ確認。1周期最大3レース。
    const targets = [...grouped.entries()]
      .filter(
        ([key]) =>
          now - (autoResultCheckedAt.get(key) || 0) >= 60 * 1000
      )
      .slice(0, 3);

    if (!targets.length) return;

    autoResultCheckRunning = true;
    let needsSave = false;
    let settlementChanged = false;

    try {
      for (const [key, records] of targets) {
        autoResultCheckedAt.set(key, Date.now());

        const sample = records[0];

        try {
          const edgeResponse = await fetch(
            "https://mihicuoijitluvrufsoj.supabase.co/functions/v1/boatrace-result",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                date: sample.raceDate,
                venueCode: sample.venueCode,
                raceNo: sample.raceNo,
              }),
            }
          );

          if (!edgeResponse.ok) {
            throw new Error(
              `result edge ${edgeResponse.status}`
            );
          }

          const edgePayload = await edgeResponse.json();

          if (
            edgePayload?.ok &&
            edgePayload.status === "settled" &&
            edgePayload.result
          ) {
            const dataset =
              sample.raceDate === DATA.date
                ? DATA
                : await fetchDataset(sample.raceDate, true);

            const checkedRace = findDatasetRace(
              dataset,
              sample.venueCode,
              sample.raceNo
            );

            if (!checkedRace) continue;

            checkedRace.result = edgePayload.result;
            checkedRace.resultCheck = {
              state: "confirmed",
              checkedAt:
                edgePayload.checkedAt ||
                new Date().toISOString(),
              source: "supabase-edge-auto",
            };

            records.forEach((record) => {
              record.resultCheck = {
                ...checkedRace.resultCheck,
              };

              const result = C.settleRecord(record, dataset);

              if (result.changed) {
                recordSettlement(
                  record,
                  "auto-edge-refresh"
                );
                settlementChanged = true;
              }
            });

            needsSave = true;
          } else if (
            edgePayload?.ok &&
            edgePayload.status === "pending"
          ) {
            records.forEach((record) => {
              record.resultCheck = {
                state: "waiting",
                checkedAt:
                  edgePayload.checkedAt ||
                  new Date().toISOString(),
                source: "supabase-edge-auto",
              };
            });

            needsSave = true;
          }
        } catch (error) {
          console.warn(
            "自動結果確認に失敗しました",
            error
          );

          records.forEach((record) => {
            record.resultCheck = {
              state: "error",
              checkedAt: new Date().toISOString(),
              source: "supabase-edge-auto",
            };
          });

          needsSave = true;
        }
      }
    } finally {
      autoResultCheckRunning = false;
    }

    if (needsSave) save();

    // 実際に精算が起きた時だけ画面を更新
    if (settlementChanged) {
      renderAll();
    }
  }

  window.refreshResultNow = async (id, button) => {
    const record = S.records.find((item) => item.id === id);
    if (!record || record.settled || !record.raceDate) return;
    if (button) {
      button.disabled = true;
      button.textContent = "最新結果を確認中…";
    }
    try {
      const dataset = await fetchDataset(record.raceDate, true);      
      try {
        const edgeResponse = await fetch(
          "https://mihicuoijitluvrufsoj.supabase.co/functions/v1/boatrace-result",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: record.raceDate,
              venueCode: record.venueCode,
              raceNo: record.raceNo,
            }),
          }
        );

        if (edgeResponse.ok) {
          const edgePayload = await edgeResponse.json();

          if (
            edgePayload?.ok &&
            edgePayload.status === "settled" &&
            edgePayload.result
          ) {
            const checkedRace = findDatasetRace(
              dataset,
              record.venueCode,
              record.raceNo
            );

            if (checkedRace) {
              checkedRace.result = edgePayload.result;
              checkedRace.resultCheck = {
                state: "confirmed",
                checkedAt: edgePayload.checkedAt || new Date().toISOString(),
                source: "supabase-edge",
              };
            }
          } else if (edgePayload?.ok && edgePayload.status === "pending") {
            record.resultCheck = {
              state: "waiting",
              checkedAt: edgePayload.checkedAt || new Date().toISOString(),
              source: "supabase-edge",
            };
          }
        }
      } catch (edgeError) {
        console.warn("Supabase結果確認に失敗しました", edgeError);
      }
      if (dataset.date === C.jstDate()) {
        DATA = dataset;
        liveLoaded = true;
        lastLoadAt = Date.now();
      }
      const result = C.settleRecord(record, dataset);
      if (result.changed) {
        recordSettlement(record, "manual-refresh");
        save();
        renderAll();
        const rewardOutcome = record.rewardOutcome;
        openModal(`<div class="instant-result success"><span class="kicker">RESULT UPDATED</span><h2>結果を反映しました</h2>
          <div class="notice good"><b>${esc(record.venue)} ${record.raceNo}R　${record.status === "hit" ? "B的中" : record.status === "refunded" ? "不成立・返還" : "不的中"}</b><br>実着順 ${esc(record.resultCombo || "確定")} / ${record.status === "hit" ? `払戻 ＋${fmt(record.payoutC)}B` : record.status === "refunded" ? `返還 ＋${fmt(record.payoutC)}B` : `投票 −${fmt(record.stake)}B`}</div>
          ${rewardOutcome === "double-win" ? '<div class="double-win-mini"><b>DOUBLE WIN達成！</b><span>今日の防衛勝負でB的中しました。</span></div>' : rewardOutcome === "defense-stamp" ? '<div class="defense-mini"><b>防衛スタンプ獲得</b><span>仮想投票でレースを完了しました。</span></div>' : ""}
          ${rewardOutcome ? `<button class="btn coral-btn full" type="button" onclick="openRewardCelebration('${record.id}')">ご褒美結果を見る</button>` : ""}
          <button class="btn primary full" type="button" onclick="closeModal()">記録へ戻る</button></div>`);
        return;
      }
      const generated = dataset.generatedAt ? timeText(dataset.generatedAt) : "時刻不明";
      const official = officialResultUrl(record.venueCode, record.raceNo, record.raceDate);
      const checkedRace = findDatasetRace(dataset, record.venueCode, record.raceNo);
      if (checkedRace?.resultCheck) {
        record.resultCheck = { ...checkedRace.resultCheck };
        save();
      }
      const pending = pendingResultMessage(record);
      openModal(`<div class="instant-result"><span class="kicker">RESULT CHECK</span><h2>最新データを確認しました</h2>
        <div class="notice ${pending.tone}"><b>${esc(pending.title)}</b><br>${esc(pending.detail)}<br><span class="tiny">MAMO BOATデータ時刻：${esc(generated)}</span></div>
        <p class="tiny">このボタンはGitHub Pages上の最新データを読み直します。GitHub ActionsやBOAT RACE公式サイトへの取得処理を、その場で起動するボタンではありません。</p>
        <a class="btn real-cash-link full" href="${official}" target="_blank" rel="noopener noreferrer">このレースの公式結果を見る ↗</a>
        <button class="btn secondary full" type="button" onclick="closeModal();refreshResultNow('${record.id}')">もう一度更新</button>
        <button class="btn secondary full" type="button" onclick="closeModal()">閉じる</button></div>`);
    } catch (error) {
      openModal(`<div class="instant-result"><h2>再確認できませんでした</h2><div class="notice warn">通信状態を確認し、少し時間をおいてもう一度お試しください。記録はそのまま残っています。</div><button class="btn secondary full" type="button" onclick="closeModal()">閉じる</button></div>`);
    } finally {
      if (button && document.body.contains(button)) {
        button.disabled = false;
        button.textContent = "今すぐ公式結果を確認";
      }
    }
  };

  function rewardClaimForRecord(record) {
    return S.rewardClaims.find(
      (claim) => claim.kind === "double-win" && claim.sourceId === record.id
    ) || null;
  }

  function claimHtml(claim) {
    if (!claim) return "";
    const state = claim.redeemedAt ? "使用済みとして記録" : claim.openedAt ? "確認済み" : "未確認";
    return `<div class="partner-reward-card">
      <span class="partner-label">MAMOBOAT PARTNER REWARD</span>
      <small>${esc(claim.sponsor || "協賛店舗")}</small>
      <h3>${esc(claim.title)}</h3>
      ${claim.description ? `<p>${esc(claim.description)}</p>` : ""}
      ${claim.code ? `<div class="reward-code"><span>提示コード</span><strong>${esc(claim.code)}</strong></div>` : ""}
      ${claim.expiresAt ? `<div class="tiny">期限：${esc(claim.expiresAt)}</div>` : ""}
      ${claim.terms ? `<details><summary>利用条件</summary><p>${esc(claim.terms)}</p></details>` : ""}
      <div class="reward-claim-actions">
        ${claim.url ? `<a class="btn coral-btn full" href="${esc(claim.url)}" target="_blank" rel="noopener noreferrer" onclick="openRewardClaim('${claim.id}')">特典を利用する ↗</a>` : ""}
        ${!claim.redeemedAt ? `<button class="btn secondary full" type="button" onclick="markRewardUsed('${claim.id}')">使用済みにする</button>` : ""}
      </div><div class="tiny">状態：${esc(state)}／換金・譲渡不可</div>
    </div>`;
  }

  function rewardRecordHtml(record) {
    if (!record.rewardChallenge) return "";
    if (!record.rewardOutcome) {
      return `<div class="challenge-record pending"><span>今日の防衛勝負</span><b>実結果待ち</b></div>`;
    }
    if (record.rewardOutcome === "double-win") {
      const claim = rewardClaimForRecord(record);
      return `<div class="challenge-record double"><span>DOUBLE WIN</span><b>防衛勝負でB的中</b><small>${claim ? esc(claim.title) : "限定特典の提携準備中・達成記録は保存済み"}</small>
        <button class="btn coral-btn full" type="button" onclick="openRewardCelebration('${record.id}')">ご褒美結果を見る</button></div>`;
    }
    if (record.rewardOutcome === "defense-stamp") {
      return `<div class="challenge-record defended"><span>DEFENSE SUCCESS</span><b>防衛スタンプを1個獲得</b><small>仮想投票でレースを完了しました。</small>
        <button class="btn secondary full" type="button" onclick="openRewardCelebration('${record.id}')">防衛結果を見る</button></div>`;
    }
    return "";
  }

  window.openRewardCelebration = (id) => {
    const record = S.records.find((item) => item.id === id);
    if (!record?.rewardOutcome) return;
    record.rewardCelebratedAt ||= new Date().toISOString();
    trackEvent("reward_celebration_opened", {
      record_id: record.id,
      reward_outcome: record.rewardOutcome,
      saved_yen: Number(record.saved) || 0,
    }, {
      raceDate: record.raceDate,
      venueCode: record.venueCode,
      raceNo: record.raceNo,
    });
    const metrics = C.rewardMetrics(S.records);
    if (record.rewardOutcome === "double-win") {
      const claim = ensureRewardClaim("double-win", record.id, record.rewardEvaluatedAt);
      openModal(`<div class="reward-celebration double-win-celebration">
        <span class="kicker">DOUBLE WIN</span><div class="celebration-mark">W</div>
        <h2>今日の防衛勝負でB的中！</h2>
        <p>${esc(record.venue)} ${record.raceNo}Rで、公式払戻に連動して${fmt(record.payoutC)}Bを獲得しました。</p>
        ${claim ? claimHtml(claim) : '<div class="notice partner-wait"><b>限定特典の提携準備中</b><br>ダブルWIN達成記録は保存しました。現在は実店舗で使えるクーポンを発行していません。</div>'}
        <button class="btn primary full" type="button" onclick="closeModal()">記録へ戻る</button></div>`);
    } else if (record.rewardOutcome === "defense-stamp") {
      const cycle = Math.floor(metrics.defenseStamps / 5);
      const modalProgress = metrics.defenseStamps > 0 && metrics.stampProgress === 0
        ? 5
        : metrics.stampProgress;
      const milestoneClaim = cycle
        ? S.rewardClaims.find((claim) => claim.kind === "defense-5" && claim.sourceId === `defense-cycle-${cycle}`)
        : null;
      openModal(`<div class="reward-celebration defense-celebration">
        <span class="kicker">DEFENSE SUCCESS</span><div class="celebration-mark shield">守</div>
        <h2>防衛スタンプを獲得</h2>
        <p>${esc(record.venue)} ${record.raceNo}Rを仮想投票で完了しました。</p>
        <div class="modal-stamps">${Array.from({ length: 5 }, (_, index) => `<i class="${index < modalProgress ? "on" : ""}">${index + 1}</i>`).join("")}</div>
        <div class="notice good"><b>防衛スタンプ ${metrics.defenseStamps}個</b><br>${modalProgress === 5 ? "5個達成しました。" : `次の特典まであと${5 - modalProgress}個です。`}</div>
        ${milestoneClaim ? claimHtml(milestoneClaim) : metrics.stampProgress === 0 && metrics.defenseStamps ? '<div class="notice partner-wait"><b>限定特典の提携準備中</b><br>5個達成記録は保存されています。</div>' : ""}
        <button class="btn primary full" type="button" onclick="closeModal()">記録へ戻る</button></div>`);
    }
    save();
  };

  window.openRewardClaim = (id) => {
    const claim = S.rewardClaims.find((item) => item.id === id);
    if (!claim) return;
    claim.openedAt ||= new Date().toISOString();
    trackEvent("partner_reward_opened", {
      claim_id: claim.id,
      reward_kind: claim.kind,
      campaign_id: claim.campaignId,
    });
    save();
  };

  window.markRewardUsed = (id) => {
    const claim = S.rewardClaims.find((item) => item.id === id);
    if (!claim || claim.redeemedAt) return;
    claim.redeemedAt = new Date().toISOString();
    trackEvent("partner_reward_marked_used", {
      claim_id: claim.id,
      reward_kind: claim.kind,
      campaign_id: claim.campaignId,
    });
    save();
    window.closeModal();
    renderAll();
  };

  function recCard(record) {
    const officialResult = record.venueCode && record.raceNo && record.raceDate
      ? officialResultUrl(record.venueCode, record.raceNo, record.raceDate)
      : "";
    let result;
    if (!record.settled) {
      const pending = pendingResultMessage(record);
      result = `<div class="notice ${pending.tone}"><b>${esc(pending.title)}</b><br>${esc(pending.detail)}</div>
        <div class="pending-result-actions"><button class="btn primary" type="button" onclick="refreshResultNow('${record.id}',this)">今すぐ公式結果を確認</button>
        ${officialResult ? `<a class="btn secondary" href="${officialResult}" target="_blank" rel="noopener noreferrer">公式結果を見る ↗</a>` : ""}</div>`;
    } else if (record.status === "refunded") {
      result = `<div class="notice warn"><div class="result">舟券 不成立 / Bメダル返還</div>${fmt(record.payoutC)}Bを返還しました。</div>`;
    } else {
      const payouts = record.resultPayouts?.length
        ? record.resultPayouts.map((item) => {
          const type = C.normalizeBetType(item.betType);
          return `${C.BET_TYPES[type].label} ${esc(item.combo)} ${fmt(item.payout)}円`;
        }).join(" / ")
        : record.resultPayout
          ? `3連単 ${esc(record.resultCombo)} ${fmt(record.resultPayout)}円`
          : "";
      result = `<div class="notice ${record.status === "hit" ? "good" : ""}">
        <div class="result">実結果 ${esc(record.resultCombo || "確定")} / ${record.status === "hit" ? "的中！" : "今回の買い目は不的中"}</div>
        ${payouts ? `公式払戻 ${payouts}<br>` : ""}${record.status === "hit" ? `払戻 ＋${fmt(record.payoutC)}B` : `投票 −${fmt(record.stake)}B`}${record.refundC ? `（一部返還 ＋${fmt(record.refundC)}B）` : ""}</div>`;
    }
    const badge = record.rewardOutcome === "double-win"
      ? "ダブルWIN"
      : record.rewardOutcome === "defense-stamp"
        ? "防衛スタンプ"
        : record.saved
      ? "仮想投票へ置換"
      : record.status === "refunded"
        ? "不成立・返還"
        : record.settled
          ? "結果反映済"
          : "結果待ち";
    const currentRace = record.raceDate === DATA.date
      ? race(record.venueCode, record.raceNo)
      : null;
    const currentVenue = record.raceDate === DATA.date ? venue(record.venueCode) : null;
    const currentEvent = currentVenue ? eventInfo(currentVenue) : null;
    const eventLine = [
      record.eventGradeLabel || currentEvent?.gradeLabel,
      record.eventTitle || currentEvent?.title,
      record.eventDayLabel || currentEvent?.dayLabel,
    ].filter(Boolean).join(" / ");
    const entrySnapshot = record.entrySnapshot?.length
      ? record.entrySnapshot
      : currentRace?.entries || [];
    return `<div class="card rec"><div class="venuehead"><div><b>${esc(record.venue)} ${record.raceNo}R</b>
      <div class="tiny">${eventLine ? `${esc(eventLine)}<br>` : ""}${(record.lines || []).length}点 / ${fmt(record.stake)}B / 置換 ${fmt(record.saved)}円</div></div>
      <span class="status ${record.saved ? "on" : "off"}">${badge}</span></div>
      ${betReceipt(record.lines, entrySnapshot, record.betMode)}${result}
      ${record.settled && officialResult ? `<a class="link" href="${officialResult}" target="_blank" rel="noopener noreferrer">公式結果と払戻を照合 ↗</a>` : ""}
      <div class="recgrid"><span>自信</span><b>${record.conf}/10</b><span>購入前衝動</span><b>${record.urge}/10</b>
      <span>理由</span><b>${esc(record.reason || "未入力")}</b><span>仮想投票へ置換</span><b>${fmt(record.saved)}円</b>
      ${record.behaviorReviewed ? `<span>購入後衝動</span><b>${record.afterUrge ?? "—"}/10</b><span>追い上げ衝動</span><b>${record.chaseUrge ?? "—"}/10</b>` : ""}</div>
      ${canReviewAfter(record) ? `<button class="btn secondary full" onclick="reviewAfter('${record.id}')">レース後の行動を記録</button>` : ""}
      ${rewardRecordHtml(record)}
      ${record.saved ? `<div class="reward"><span class="manga-label">VIRTUAL SHIFT</span> ${fmt(record.saved)}円分をB投票へ置き換えました。</div>` : ""}</div>`;
  }

  window.setRecFilter = (filter) => {
    S.recFilter = filter;
    save();
    renderRecords();
  };

  function renderRecords() {
    document.querySelectorAll(".filter[data-rec]").forEach(
      (button) => button.classList.toggle("active", button.dataset.rec === S.recFilter)
    );
    let records = [...S.records].reverse();
    if (S.recFilter === "pending") records = records.filter((item) => !item.settled);
    if (S.recFilter === "saved") records = records.filter((item) => item.saved > 0);
    if (S.recFilter === "hit") records = records.filter((item) => item.status === "hit");
    $("recordCount").textContent = `${records.length}件`;
    $("recordList").innerHTML = records.length
      ? records.map(recCard).join("")
      : '<div class="card muted">該当する記録はありません。</div>';
    initializeResultSearch();
  }

  function initializeResultSearch() {
    const dateInput = $("resultSearchDate");
    const venueInput = $("resultSearchVenue");
    const raceInput = $("resultSearchRace");
    if (!dateInput || !venueInput || !raceInput) return;
    if (!dateInput.value) dateInput.value = DATA.date || C.jstDate();
    if (venueInput.options.length === 1) {
      venueInput.insertAdjacentHTML("beforeend", VENUES.map(([code, name]) =>
        `<option value="${code}">${code} ${esc(name)}</option>`
      ).join(""));
    }
    if (raceInput.options.length === 1) {
      raceInput.insertAdjacentHTML("beforeend", Array.from({ length: 12 }, (_, index) =>
        `<option value="${index + 1}">${index + 1}R</option>`
      ).join(""));
    }
    loadResultDateIndex();
  }

  async function loadResultDateIndex() {
    if (resultIndexRequested || !$("resultArchiveDates")) return;
    resultIndexRequested = true;
    try {
      const response = await fetch("data/results/index.json", { cache: "no-store" });
      if (!response.ok) return;
      const index = await response.json();
      const dates = Array.isArray(index.dates) ? index.dates.slice(0, 14) : [];
      $("resultArchiveDates").innerHTML = dates.length
        ? `<span>保存済み：</span>${dates.map((item) => `<button type="button" onclick="pickResultDate('${esc(item.date)}')">${esc(dateShort(item.date))}<small>${fmt(item.races)}R</small></button>`).join("")}`
        : "";
    } catch (error) {
      // 索引がない旧版でも、日付を直接指定すれば履歴JSONを検索できる。
    }
  }

  window.pickResultDate = (date) => {
    $("resultSearchDate").value = date;
    window.searchOfficialResults();
  };

  async function fetchResultArchive(date) {
    const archivePath = `data/results/${date}.json`;
    const response = await fetch(archivePath, { cache: "no-store" });
    if (response.ok) {
      const archive = await response.json();
      if (archive.source?.type === "official-lzh-result-archive" && Array.isArray(archive.venues)) {
        return archive;
      }
      throw new Error(`構造検証エラー ${archivePath}`);
    }
    return fetchDataset(date);
  }

  function resultCard(venueItem, raceItem, date) {
    const result = raceItem.result || {};
    const event = eventInfo(venueItem);
    const finish = (result.finish || []).slice(0, 3);
    const finishHtml = finish.length
      ? finish.map((item) => `<div class="result-place place-${item.position}"><b>${item.position}着</b><i>${item.boatNumber}</i><span>${esc(item.name || `${item.boatNumber}号艇`)}</span></div>`).join("")
      : '<div class="muted">着順情報なし</div>';
    const payouts = PAYOUT_DISPLAY_ORDER.flatMap((type) =>
      (result.payouts?.[type] || []).map((item) => ({ type, ...item }))
    );
    const payoutHtml = payouts.length
      ? payouts.map((item) => `<div><span>${esc(C.BET_TYPES[item.type]?.label || item.type)} ${esc(item.combination)}</span><b>${fmt(item.payout)}円</b></div>`).join("")
      : '<p class="muted">払戻情報なし</p>';
    return `<article class="official-result-card">
      <div class="official-result-head"><div>${gradeBadge(venueItem)}<b>${esc(venueItem.name)} ${raceItem.number}R</b></div><span>${esc(raceItem.name || "")}</span></div>
      <p class="official-result-event">${esc(event.title)} / ${esc(event.dayLabel)}</p>
      <div class="result-finish">${finishHtml}</div>
      <details><summary>全払戻を見る（${payouts.length}件）</summary><div class="result-payouts">${payoutHtml}</div></details>
      <a class="link" href="${officialResultUrl(venueItem.code, raceItem.number, date)}" target="_blank" rel="noopener noreferrer">公式結果で照合 ↗</a>
    </article>`;
  }

  window.searchOfficialResults = async () => {
    initializeResultSearch();
    const date = $("resultSearchDate").value;
    const venueCode = $("resultSearchVenue").value;
    const raceNo = $("resultSearchRace").value;
    const keyword = $("resultSearchKeyword").value.trim().toLocaleLowerCase("ja-JP");
    if (!date) return;
    $("resultSearchStatus").textContent = "公式結果アーカイブを読み込み中…";
    $("resultSearchList").innerHTML = "";
    try {
      const dataset = await fetchResultArchive(date);
      const found = [];
      for (const venueItem of dataset.venues || []) {
        if (venueCode && venueItem.code !== venueCode) continue;
        for (const raceItem of venueItem.races || []) {
          if (!raceItem.result) continue;
          if (raceNo && Number(raceItem.number) !== Number(raceNo)) continue;
          const event = eventInfo(venueItem);
          const searchText = [
            venueItem.name, raceItem.name, event.title, event.gradeLabel, event.dayLabel,
            ...(raceItem.entries || []).map((item) => item.name),
            ...(raceItem.result.finish || []).map((item) => item.name),
          ].filter(Boolean).join(" ").toLocaleLowerCase("ja-JP");
          if (keyword && !searchText.includes(keyword)) continue;
          found.push([venueItem, raceItem]);
        }
      }
      const officialListLink = venueCode
        ? `<a class="result-list-link" href="${officialResultListUrl(venueCode, date)}" target="_blank" rel="noopener noreferrer">この日の公式結果一覧 ↗</a>`
        : "";
      $("resultSearchStatus").innerHTML = `${esc(date)}：${found.length}レース見つかりました。${officialListLink}`;
      $("resultSearchList").innerHTML = found.length
        ? found.map(([venueItem, raceItem]) => resultCard(venueItem, raceItem, date)).join("")
        : '<div class="notice warn">条件に合う確定結果はまだありません。公式公開後、約15分ごとの同期で反映されます。</div>';
    } catch (error) {
      $("resultSearchStatus").textContent = `${date} の保存結果を取得できませんでした。`;
      $("resultSearchList").innerHTML = '<div class="notice warn">その日付のアーカイブがまだありません。</div>';
    }
  };

  function aiText() {
    if (!S.records.length) {
      return "B投票を記録すると、低自信×高衝動、取り返したい参加、金額増加、短時間連投を分析します。";
    }
    const low = S.records.filter((item) => item.conf <= 4 && item.urge >= 7).length;
    const stats = C.behaviorStats(S.records);
    const saved = C.savedTotals(S.records).all;
    return `低自信×高衝動 ${low}件。追い上げ傾向 ${stats.chase}件、短時間の金額増加 ${stats.escalation}件。これまで ${fmt(saved)}円分を仮想投票へ置き換えました。`;
  }

  function renderAnalysis() {
    S.records.forEach((record) => evaluateReward(record));
    const stats = C.behaviorStats(S.records);
    const total = C.savedTotals(S.records).all;
    const reward = C.rewardMetrics(S.records);
    const low = S.records.filter((item) => item.conf <= 4 && item.urge >= 7).length;
    const settled = S.records.filter((item) => item.settled).length;
    $("analysisCards").innerHTML = [
      ["仮想投票へ置換", `${fmt(total)}円`],
      ["現在のB残高", `${fmt(S.coins)}B`],
      ["ダブルWIN", `${reward.doubleWins}回`],
      ["防衛スタンプ", `${reward.defenseStamps}個`],
    ].map(([label, value]) => `<div class="stat-card"><div class="eyebrow">${label}</div><div class="metric">${value}</div></div>`).join("");
    const items = [
      ["B投票と結果", `${S.records.length}件中 ${settled}件反映・B的中 ${stats.virtualHits}件`],
      ["仮想投票総額", `${fmt(stats.replacedTotal)}円相当`],
      ["低自信×高衝動", `${low}件（自信4以下・衝動7以上）`],
      ["取り返したい参加", `${stats.declaredChase}件`],
      ["短時間の金額増加", `${stats.escalation}件（30分以内に予定額が増加）`],
      ["外れ後の追い上げ", `${stats.postLossChase}件（30分以内・予定額増加）`],
      ["短時間連投", `${stats.rapid}件（30分以内に3レース参加）`],
      ["衝動の変化", stats.urgeDrop == null
        ? "レース後データ待ち"
        : `B投票後、平均 ${stats.urgeDrop >= 0 ? "−" : "＋"}${Math.abs(stats.urgeDrop).toFixed(1)}`],
      ["多い参加理由", stats.topReason ? `${stats.topReason[0]}：${stats.topReason[1]}件` : "データ待ち"],
      ["置換額が多い場", stats.topVenue ? `${stats.topVenue[0]}：${fmt(stats.topVenue[1])}円` : "データ待ち"],
      ["公式投票への移動", `${S.realBetExits.length}回`],
    ];
    $("analysisList").innerHTML = items.map(([label, value]) =>
      `<div class="card"><b>${esc(label)}</b><p class="muted">${esc(value)}</p></div>`
    ).join("");
    renderRewardRoute(reward);
  }

  function renderRewardRoute(metrics = C.rewardMetrics(S.records)) {
    S.records.filter((record) => record.rewardOutcome === "double-win").forEach(
      (record) => ensureRewardClaim("double-win", record.id, record.rewardEvaluatedAt)
    );
    syncDefenseMilestoneClaims();
    const today = metrics.todayChallenge;
    const todayState = !today
      ? "まだ選択していません"
      : today.rewardOutcome === "double-win"
        ? "ダブルWIN達成"
        : today.rewardOutcome === "defense-stamp"
          ? "防衛スタンプ獲得"
          : "実結果待ち";
    $("rewardRouteSummary").innerHTML = `<div class="today-challenge ${today ? "selected" : ""}">
      <span>TODAY'S DEFENSE RACE</span><b>${today ? `${esc(today.venue)} ${today.raceNo}R` : "今日の防衛勝負"}</b><small>${esc(todayState)}</small>
      ${today?.rewardOutcome ? `<button class="btn coral-btn full" type="button" onclick="openRewardCelebration('${today.id}')">成果を見る</button>` : ""}
    </div><div class="reward-score"><div><span>DOUBLE WIN</span><b>${metrics.doubleWins}</b><small>累計達成</small></div><div><span>DEFENSE</span><b>${metrics.defenseStamps}</b><small>スタンプ</small></div></div>`;
    const visibleProgress = metrics.defenseStamps > 0 && metrics.stampProgress === 0
      ? 5
      : metrics.stampProgress;
    $("defenseStampRail").innerHTML = `<div class="stamp-copy"><b>今日の防衛勝負をBで完了すると1個</b><span>${visibleProgress === 5 ? "5個達成" : `次の限定特典まであと${5 - visibleProgress}個`}</span></div>
      <div class="stamp-row">${Array.from({ length: 5 }, (_, index) => `<i class="${index < visibleProgress ? "on" : ""}"><span>守</span><small>${index + 1}</small></i>`).join("")}</div>`;
    const claims = [...S.rewardClaims].reverse();
    $("rewardWallet").innerHTML = claims.length
      ? `<div class="wallet-title"><b>獲得した限定特典</b><span>${claims.length}件</span></div>${claims.map(claimHtml).join("")}`
      : `<div class="notice partner-wait"><b>限定特典は提携準備中です</b><br>ダブルWINと防衛スタンプの達成記録は保存されます。実際に利用できる協賛クーポンだけを、提携開始後にここへ表示します。</div>`;
  }

  function analysisSummary() {
    const stats = C.behaviorStats(S.records);
    const reward = C.rewardMetrics(S.records);
    return `まもボート行動分析用データ
テスター番号: ${S.pilot.participantId}
記録数: ${S.records.length}
仮想投票へ置き換えた金額: ${C.savedTotals(S.records).all}円
B残高: ${S.coins}B
B的中: ${stats.virtualHits}件
ダブルWIN: ${reward.doubleWins}件
防衛スタンプ: ${reward.defenseStamps}個
低自信×高衝動: ${S.records.filter((item) => item.conf <= 4 && item.urge >= 7).length}件
追い上げ傾向: ${stats.chase}件
取り返したい参加: ${stats.declaredChase}件
短時間の金額増加: ${stats.escalation}件
外れ後の追い上げ: ${stats.postLossChase}件
短時間連投: ${stats.rapid}件
平均衝動変化: ${stats.urgeDrop == null ? "未集計" : stats.urgeDrop.toFixed(2)}
主な理由: ${stats.topReason ? stats.topReason.join(" / ") : "未集計"}
場別最大セーブ: ${stats.topVenue ? stats.topVenue.join(" / ") : "未集計"}
公式投票への移動: ${S.realBetExits.length}回
匿名イベント: ${S.pilot.events.length}件（未送信 ${S.pilot.events.filter((item) => !item.sent_at).length}件）

このデータから、衝動的に現金を使いやすい条件と、仮想投票への置換が有効だった条件を分析してください。`;
  }

  window.copyAnalysis = async () => {
    const text = analysisSummary();
    try {
      await navigator.clipboard.writeText(text);
      alert("AI分析用サマリーをコピーしました。");
    } catch (error) {
      prompt("コピーしてください", text);
    }
  };

  function renderSettings() {
    if (!$("syncStats")) return;
    const stats = DATA.quality?.stats || {};
    $("syncStats").innerHTML = `<b>${esc(statusText())}</b><br>
      本日の開催 ${stats.scheduleVenues || 0}場 / ${stats.scheduleRaces || 0}レース / ${stats.scheduleEntries || 0}艇<br>
      確定結果 ${stats.completedResultRaces || 0}レース / 払戻情報 ${stats.totalPayoutEntries || stats.sanrenshoPayouts || 0}件<br>
      参考オッズ ${stats.oddsRaces || 0}レース / 最終データ時刻 ${timeText(DATA.generatedAt)}`;
    renderPilotSettings();
  }

  function renderPilotSettings() {
    if (!$("pilotStatus")) return;
    const pending = S.pilot.events.filter((item) => !item.sent_at).length;
    $("pilotParticipantId").value = S.pilot.participantId;
    $("pilotConsent").checked = S.pilot.consent;
    const collectorState = collectorReady()
      ? S.pilot.consent
        ? '<b class="pilot-good">中央集約：接続可能</b>'
        : '<b>中央集約：同意待ち</b>'
      : '<b class="pilot-warn">中央集約：未接続（現在は端末内保存のみ）</b>';
    $("pilotStatus").innerHTML = `${collectorState}<br>
      テスター番号 ${esc(S.pilot.participantId)} / 端末内イベント ${fmt(S.pilot.events.length)}件 / 未送信 ${fmt(pending)}件 / 送信済み ${fmt(S.pilot.sentCount)}件
      ${S.pilot.lastSyncAt ? `<br>最終送信 ${new Date(S.pilot.lastSyncAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}` : ""}
      ${S.pilot.lastError ? `<br><span class="pilot-error">直近エラー：${esc(S.pilot.lastError)}</span>` : ""}`;
  }

  window.savePilotSettings = () => {
    const participantId = String($("pilotParticipantId").value || "")
      .trim()
      .replace(/[^A-Za-z0-9_-]/g, "-")
      .slice(0, 40);
    if (participantId.length < 3) {
      return alert("テスター番号は英数字・ハイフンで3文字以上にしてください。例：P01");
    }
    const previousId = S.pilot.participantId;
    S.pilot.participantId = participantId;
    S.pilot.consent = $("pilotConsent").checked;
    S.pilot.events.forEach((event) => {
      if (!event.sent_at && event.participant_id === previousId) {
        event.participant_id = participantId;
      }
    });
    trackEvent("pilot_settings_saved", {
      consent: S.pilot.consent,
      collector_configured: collectorReady(),
      participant_changed: previousId !== participantId,
    });
    save();
    renderPilotSettings();
    if (S.pilot.consent && collectorReady()) flushPilotEvents();
    alert(collectorReady()
      ? "計測設定を保存しました。未送信データを安全に送信します。"
      : "計測設定を保存しました。現在は端末内に記録されます。中央集約先の接続後にまとめて送信できます。");
  };

  window.sendPilotDataNow = async (button) => {
    if (!S.pilot.consent) return alert("先に匿名データ送信への同意を有効にしてください。");
    if (!collectorReady()) return alert("中央集約先がまだ接続されていません。データは端末内に残り、JSON・CSVで書き出せます。");
    if (button) {
      button.disabled = true;
      button.textContent = "送信中…";
    }
    const result = await flushPilotEvents();
    if (button && document.body.contains(button)) {
      button.disabled = false;
      button.textContent = "未送信データを送る";
    }
    renderPilotSettings();
    alert(result?.ok ? `${result.sent || 0}件を送信しました。` : "送信できませんでした。未送信データは端末内に残っています。");
  };

  function csvCell(value) {
    const text = String(value == null ? "" : value).replaceAll('"', '""');
    return `"${text}"`;
  }

  window.exportPilotCSV = () => {
    const header = [
      "event_id", "study_id", "participant_id", "session_id", "occurred_at",
      "event_name", "app_version", "screen", "race_date", "venue_code",
      "race_no", "payload_json", "sent_at",
    ];
    const rows = S.pilot.events.map((event) => [
      event.event_id, event.study_id, event.participant_id, event.session_id,
      event.occurred_at, event.event_name, event.app_version, event.screen,
      event.race_date, event.venue_code, event.race_no,
      JSON.stringify(event.payload || {}), event.sent_at,
    ]);
    const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const anchor = document.createElement("a");
    const url = URL.createObjectURL(blob);
    anchor.href = url;
    anchor.download = `mamoboat-pilot-${S.pilot.participantId}-${C.jstDate()}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    trackEvent("pilot_csv_exported", { event_count: S.pilot.events.length });
  };

  window.reloadData = async (button) => {
    if (button) {
      button.disabled = true;
      button.textContent = "更新しています…";
    }
    const result = await loadOfficialData(true);
    trackEvent("official_data_refresh", {
      success: result?.ok === true,
      generated_at: DATA.generatedAt || null,
      schedule_venues: Number(DATA.quality?.stats?.scheduleVenues) || 0,
      completed_results: Number(DATA.quality?.stats?.completedResultRaces) || 0,
    });
    if (button && document.body.contains(button)) {
      button.disabled = false;
      button.textContent = "最新情報に更新";
    }
    if (result?.ok) {
      const stats = DATA.quality?.stats || {};
      openModal(`<div class="instant-result success"><span class="kicker">DATA UPDATED</span><h2>最新情報に更新しました</h2>
        <div class="notice good"><b>${stats.scheduleVenues || 0}場 / ${stats.scheduleRaces || 0}レース</b><br>結果反映 ${stats.completedResultRaces || 0}R / 参考オッズ ${stats.oddsRaces || 0}R</div>
        <p>データ時刻 ${timeText(DATA.generatedAt)}。結果待ちの記録も同時に確認しました。</p>
        <button class="btn primary full" type="button" onclick="closeModal()">閉じる</button></div>`);
    } else {
      openModal(`<div class="instant-result"><h2>更新できませんでした</h2><div class="notice warn">通信状態を確認して、もう一度お試しください。直前まで表示していた情報と記録は残っています。</div><button class="btn secondary full" type="button" onclick="closeModal()">閉じる</button></div>`);
    }
  };
  window.exportData = () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
    const anchor = document.createElement("a");
    const url = URL.createObjectURL(blob);
    anchor.href = url;
    anchor.download = `mamoboat-records-v391-${C.jstDate()}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  window.resetData = () => {
    if (!confirm("投票・行動イベント・特典の記録をすべて初期化しますか？この操作は取り消せません。必要なら先にJSONを書き出してください。")) return;
    const accepted = S.accepted;
    const participantId = S.pilot.participantId;
    const consent = S.pilot.consent;
    S = fresh();
    S.accepted = accepted;
    S.pilot.participantId = participantId;
    S.pilot.consent = consent;
    save();
    renderAll();
    window.go("home");
  };

  function renderAll() {
    if (!document.body.dataset.screen) document.body.dataset.screen = "home";
    $("onboard").classList.toggle("show", !S.accepted);
    renderOnboard();
    $("topCoins").textContent = `${fmt(S.coins)} B`;
    renderHome();
    renderVenues();
    renderRace();
    renderRecords();
    renderAnalysis();
    renderSettings();
  }

  initRealBetFloat();
  trackEvent("app_opened", {
    returning_user: S.accepted === true,
    local_records: S.records.length,
    collector_configured: collectorReady(),
  });
  renderAll();
  loadOfficialData().finally(() => autoRefreshPendingResults());
  setInterval(() => {
    if (!document.hidden) {
      updateTimeDisplays();
    }
  }, 10 * 1000);
 setInterval(() => {
  if (!document.hidden) {
    autoRefreshPendingResults();
  }

  if (!document.hidden && Date.now() - lastLoadAt >= 5 * 60 * 1000) {
    loadOfficialData();
  }
}, 60 * 1000);
 document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    autoRefreshPendingResults();

    if (Date.now() - lastLoadAt > 5 * 60 * 1000) {
      loadOfficialData();
    }
  } else {
    flushPilotEvents();
  }
});

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();
