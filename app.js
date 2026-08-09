(() => {
  "use strict";

  const C = window.MamoCore;
  const KEY = "mamoboat_v27_personal";
  const LEGACY_KEYS = [
    "mamoboat_v26_personal",
    "mamoboat_v25_personal",
    "mamoboat_v24_live",
    "mamoboat_real_v22",
  ];
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
    return {
      accepted: false,
      coins: 10000,
      coinWeek: weekKey(),
      records: [],
      venue: "12",
      raceNo: 1,
      filter: "active",
      homeFilter: "all",
      favorites: [],
      medalAdditions: [],
      realBetExits: [],
      recFilter: "all",
      xp: 0,
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
    state.xp = Math.max(0, Number(state.xp) || 0);
    if (!["all", "selling", "grade", "night", "favorite"].includes(state.homeFilter)) {
      state.homeFilter = "all";
    }
    state.favorites = Array.isArray(state.favorites)
      ? [...new Set(state.favorites.map(String).filter((code) => VENUE_ROMAJI[code]))]
      : [];
    state.medalAdditions = Array.isArray(state.medalAdditions)
      ? state.medalAdditions.map((item) => ({
        amount: Number(item?.amount) || 0,
        at: item?.at || null,
      })).filter((item) => item.amount > 0)
      : [];
    state.realBetExits = Array.isArray(state.realBetExits)
      ? state.realBetExits.filter((item) => item && item.at).slice(-500)
      : [];
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
      const reviewed = record.cashReviewed === true
        || record.cashBought === true
        || record.cashBought === false
        || Number(record.saved || 0) > 0;
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
        intendedYen: intended,
        conf: Number(record.conf ?? 5),
        urge: Number(record.urge ?? record.before ?? 5),
        afterUrge: record.afterUrge ?? record.after ?? null,
        status,
        settled: record.settled === true || ["hit", "miss", "refunded"].includes(status),
        payoutC: Number(record.payoutC ?? record.payout ?? 0) || 0,
        refundC: Number(record.refundC || 0) || 0,
        resultPayouts: Array.isArray(record.resultPayouts) ? record.resultPayouts : [],
        cashReviewed: reviewed,
        saved: Number(record.saved || 0) || 0,
      });
    });
    delete state.sets;
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
  const venue = (code) => DATA.venues.find((item) => item.code === code);
  const race = (code, number) => venue(code)?.races?.find(
    (item) => Number(item.number) === Number(number)
  );

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
    let totalAdded = 0;
    let hitBonus = 0;
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
        totalAdded += result.payoutAdded;
        if (result.hit) hitBonus += 20;
      }
    }
    if (changed) {
      S.coins += totalAdded;
      S.xp += hitBonus;
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
    openModal(`<div class="medal-topup">
      <span class="kicker">B MEDAL BALANCE</span>
      <h2>Bメダルを追加</h2>
      <div class="topup-balance"><span>現在の残高</span><strong>${fmt(S.coins)}B</strong></div>
      <p>Bメダルは換金不能です。必要な時だけ手動で追加します。</p>
      <div class="topup-grid">
        <button type="button" onclick="addMedals(100)"><span>少しだけ</span><strong>＋100B</strong></button>
        <button type="button" onclick="addMedals(1000)"><span>標準追加</span><strong>＋1,000B</strong></button>
        <button type="button" onclick="addMedals(10000)"><span>まとめて</span><strong>＋10,000B</strong></button>
      </div>
      <div class="notice warn topup-policy"><b>自動補充はありません。</b><br>追加しなければ残高はそのままです。週替わり・日替わりで自動復活しません。</div>
      <button class="btn secondary full" type="button" onclick="closeModal()">追加しないで閉じる</button>
    </div>`);
  };

  window.addMedals = (amount) => {
    const value = Number(amount);
    if (![100, 1000, 10000].includes(value)) return;
    S.coins += value;
    S.medalAdditions.push({ amount: value, at: new Date().toISOString() });
    save();
    $("topCoins").textContent = `${fmt(S.coins)} B`;
    $("homeCoins").textContent = `${fmt(S.coins)}B`;
    $("coins").textContent = `${fmt(S.coins)} B`;
    window.closeModal();
    if (document.body.dataset.screen === "home") renderHome();
  };

  window.openRealBetConfirm = () => {
    openModal(`<div class="real-bet-confirm">
      <span class="kicker">OFFICIAL CASH BETTING</span>
      <h2>公式投票へ移動しますか？</h2>
      <div class="real-bet-warning"><b>ここから先は現金を使う公式TELEBOATです。</b><p>まもボートのBメダルとは別サービスです。20歳未満の方は利用できません。</p></div>
      <p>いま現金を使わずに済ませたい場合は、下の「Bメダル投票に戻る」を選んでください。</p>
      <div class="real-bet-actions">
        <button class="btn primary full" type="button" onclick="closeModal()">Bメダル投票に戻る</button>
        <a class="btn real-cash-link full" href="${REAL_BET_URL}" target="_blank" rel="noopener noreferrer" onclick="recordRealBetExit()">公式TELEBOATログインへ ↗</a>
      </div>
      <small>公式サイトでの登録・ログイン・投票・入出金は、まもボートには保存されません。</small>
    </div>`);
  };

  window.recordRealBetExit = () => {
    S.realBetExits.push({
      at: new Date().toISOString(),
      screen: document.body.dataset.screen || "home",
      venueCode: S.venue || null,
      raceNo: S.raceNo || null,
    });
    S.realBetExits = S.realBetExits.slice(-500);
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
      (record) => (record.settled || canReviewAfter(record)) && !record.cashReviewed
    ).length;
    $("settledNotice").innerHTML = unreviewed
      ? `<div class="notice good" style="margin-top:10px"><b>${unreviewed}件のレース後記録が未入力です。</b> 戦績画面で現金を使ったか記録できます。</div>`
      : "";
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
    save();
    window.closeModal();
    renderRace();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  window.jumpRace = (code, number) => {
    S.venue = code;
    S.raceNo = number;
    resetBuilder();
    save();
    window.go("race");
  };
  window.selectRace = (number) => {
    S.raceNo = number;
    resetBuilder();
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
    $("raceView").innerHTML = `<div class="race-path"><span>開催場</span><b>›</b><button class="race-path-venue" type="button" onclick="openVenueSwitcher()">${esc(venueItem.name)}⌄</button><b>›</b><span>${raceItem.number}R</span><b>›</b><span>出走表</span><b>›</b><span>B投票</span></div>
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
        <div class="source-note">参考オッズは締切前に低頻度で取得したスナップショットです。時刻と注意事項を確認し、最終情報は公式サイトで確認してください。</div>
      </div>
      <div class="section-head small"><div><span class="section-number">B</span><h2>Bメダルで投票</h2></div><span class="section-meta">公式7舟券種</span></div>
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
    <button class="btn teal full" style="margin-top:9px" onclick="reviewBet()">B投票を確認</button>`;
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
      ${oddsCount ? `<div class="odds-snapshot available"><div><span>参考オッズ</span><strong>${timeText(oddsSnapshot.updatedAt || oddsSnapshot.fetchedAt)} ${oddsTimeLabel}</strong></div><p>${esc(spec.label)} ${oddsCount}通りを取得済み。買い目を追加すると倍率を自動表示します。</p></div>`
        : `<div class="odds-snapshot pending"><div><span>参考オッズ</span><strong>準備中</strong></div><p>締切前に低頻度で取得します。まだ届いていない場合は公式画面で確認できます。</p></div>`}
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

  function addCombos(combos) {
    const seen = new Set(cart.map(
      (line) => `${C.normalizeBetType(line.betType)}:${C.canonicalCombo(line.combo, line.betType)}`
    ));
    let added = 0;
    const raceItem = race(S.venue, S.raceNo);
    combos.forEach((combo) => {
      const canonical = C.canonicalCombo(combo, betType).split("-").map(Number);
      const key = `${betType}:${canonical.join("-")}`;
      if (!seen.has(key)) {
        const reference = referenceOdds(raceItem, betType, canonical);
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

  window.reviewBet = () => {
    const venueItem = venue(S.venue);
    const raceItem = race(venueItem?.code, S.raceNo);
    if (!raceItem || !closeState(raceItem)) {
      return alert("締切後または検証済み当日データではないため、B投票できません。");
    }
    if (!cart.length) return alert("買い目を追加してください。");
    const total = cart.reduce((sum, line) => sum + line.stake, 0);
    if (total > S.coins) return alert("Bメダル残高が不足しています。");
    openModal(`<h2>${esc(venueItem.name)} ${raceItem.number}R</h2>
      <div class="notice"><b>${cart.length}点 / ${fmt(total)}B</b></div>
      <h3>購入内容</h3>${betReceipt(cart, raceItem.entries, mode, "購入する買い目")}
      <h3>このレースへの自信</h3>
      <input id="conf" class="slider" type="range" min="0" max="10" value="5" oninput="document.getElementById('cv').textContent=this.value"><div id="cv" class="big">5</div>
      <h3>今、現金で買いたい気持ち</h3>
      <input id="urge" class="slider" type="range" min="0" max="10" value="5" oninput="document.getElementById('uv').textContent=this.value"><div id="uv" class="big">5</div>
      <div class="field"><label>参加理由</label><select id="reason"><option>なんとなく</option><option>レースがあるから</option><option>自信がある</option><option>取り返したい</option><option>推し選手</option><option>その他</option></select></div>
      <div class="field"><label>現金ならいくら使うつもりだった？</label><input id="intended" type="number" min="0" step="100" value="${total}"></div>
      <div class="field"><label>メモ</label><textarea id="memo" maxlength="500" placeholder="なぜ買いたくなったか等"></textarea></div>
      <button class="btn teal full" onclick="placeBet()">Bメダルで投票する</button>`);
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
    const intended = Math.max(0, Math.floor((Number($("intended").value) || 0) / 100) * 100);
    const event = eventInfo(venueItem);
    S.coins -= total;
    S.records.push({
      id: window.crypto?.randomUUID ? window.crypto.randomUUID() : `r-${Date.now()}`,
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
      intendedYen: intended,
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
      cashReviewed: false,
      cashBought: null,
      afterUrge: null,
      saved: 0,
    });
    save();
    window.closeModal();
    resetBuilder();
    renderAll();
    window.go("records");
  };

  function canReviewAfter(record) {
    if (record.cashReviewed) return false;
    if (record.settled) return true;
    return !!record.closeTime && Date.now() > new Date(record.closeTime).getTime();
  }

  window.reviewAfter = (id) => {
    const record = S.records.find((item) => item.id === id);
    if (!record || !canReviewAfter(record)) return;
    openModal(`<h2>${esc(record.venue)} ${record.raceNo}R</h2>
      <h3>レース後、現金で買いたい気持ちは？</h3>
      <input id="after" class="slider" type="range" min="0" max="10" value="3" oninput="document.getElementById('av').textContent=this.value"><div id="av" class="big">3</div>
      <div class="field"><label>実際にも現金で舟券を買いましたか？</label><select id="cash"><option value="no">買っていない</option><option value="yes">買った</option><option value="x">回答しない</option></select></div>
      <button class="btn teal full" onclick="saveAfter('${record.id}')">保存する</button>`);
  };

  window.saveAfter = (id) => {
    const record = S.records.find((item) => item.id === id);
    if (!record || record.cashReviewed) return;
    record.afterUrge = Number($("after").value);
    const cash = $("cash").value;
    record.cashBought = cash === "yes" ? true : cash === "no" ? false : null;
    record.cashReviewed = true;
    record.reviewedAt = new Date().toISOString();
    if (cash === "no") {
      record.saved = Number(record.intendedYen ?? record.stake ?? 0) || 0;
      S.xp += 50;
      if (record.conf <= 4) S.xp += 15;
    }
    save();
    window.closeModal();
    renderAll();
    window.go("records");
  };

  window.refreshResultNow = async (id, button) => {
    const record = S.records.find((item) => item.id === id);
    if (!record || record.settled || !record.raceDate) return;
    if (button) {
      button.disabled = true;
      button.textContent = "最新結果を確認中…";
    }
    try {
      const dataset = await fetchDataset(record.raceDate, true);
      if (dataset.date === C.jstDate()) {
        DATA = dataset;
        liveLoaded = true;
        lastLoadAt = Date.now();
      }
      const result = C.settleRecord(record, dataset);
      if (result.changed) {
        S.coins += result.payoutAdded;
        if (result.hit) S.xp += 20;
        save();
        renderAll();
        openModal(`<div class="instant-result success"><span class="kicker">RESULT UPDATED</span><h2>結果を反映しました</h2>
          <div class="notice good"><b>${esc(record.venue)} ${record.raceNo}R　${record.status === "hit" ? "B的中" : record.status === "refunded" ? "不成立・返還" : "外れ"}</b><br>実着順 ${esc(record.resultCombo || "確定")} / B払戻 ${fmt(record.payoutC)}B</div>
          <button class="btn primary full" type="button" onclick="closeModal()">記録へ戻る</button></div>`);
        return;
      }
      const generated = dataset.generatedAt ? timeText(dataset.generatedAt) : "時刻不明";
      const official = officialResultUrl(record.venueCode, record.raceNo, record.raceDate);
      openModal(`<div class="instant-result"><span class="kicker">RESULT CHECK</span><h2>最新結果を確認しました</h2>
        <div class="notice warn">このレースの確定結果はまだ配信待ちです。最新確認：${esc(generated)}</div>
        <p>結果は約15分ごとに自動確認され、届きしだいBメダルを精算します。</p>
        <a class="btn real-cash-link full" href="${official}" target="_blank" rel="noopener noreferrer">このレースの公式結果を見る ↗</a>
        <button class="btn secondary full" type="button" onclick="closeModal();refreshResultNow('${record.id}')">もう一度更新</button>
        <button class="btn secondary full" type="button" onclick="closeModal()">閉じる</button></div>`);
    } catch (error) {
      openModal(`<div class="instant-result"><h2>再確認できませんでした</h2><div class="notice warn">通信状態を確認し、少し時間をおいてもう一度お試しください。記録はそのまま残っています。</div><button class="btn secondary full" type="button" onclick="closeModal()">閉じる</button></div>`);
    } finally {
      if (button && document.body.contains(button)) {
        button.disabled = false;
        button.textContent = "結果を今すぐ再確認";
      }
    }
  };

  function recCard(record) {
    const officialResult = record.venueCode && record.raceNo && record.raceDate
      ? officialResultUrl(record.venueCode, record.raceNo, record.raceDate)
      : "";
    let result;
    if (!record.settled) {
      result = `<div class="notice"><b>実結果待ち</b><br>確定結果が届くと自動精算します。急ぐ場合は下の更新ボタンで再確認できます。</div>
        <div class="pending-result-actions"><button class="btn primary" type="button" onclick="refreshResultNow('${record.id}',this)">結果を今すぐ再確認</button>
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
        <div class="result">実結果 ${esc(record.resultCombo || "確定")} / ${record.status === "hit" ? "B的中" : "外れ"}</div>
        ${payouts ? `公式払戻 ${payouts}<br>` : ""}B払戻 ${fmt(record.payoutC)}B${record.refundC ? `（うち不成立返還 ${fmt(record.refundC)}B）` : ""}</div>`;
    }
    const badge = record.saved
      ? "現金を守った"
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
      <div class="tiny">${eventLine ? `${esc(eventLine)}<br>` : ""}${(record.lines || []).length}点 / ${fmt(record.stake)}B / 現金予定 ${fmt(record.intendedYen)}円</div></div>
      <span class="status ${record.saved ? "on" : "off"}">${badge}</span></div>
      ${betReceipt(record.lines, entrySnapshot, record.betMode)}${result}
      ${record.settled && officialResult ? `<a class="link" href="${officialResult}" target="_blank" rel="noopener noreferrer">公式結果と払戻を照合 ↗</a>` : ""}
      <div class="recgrid"><span>自信</span><b>${record.conf}/10</b><span>購入前衝動</span><b>${record.urge}/10</b>
      <span>理由</span><b>${esc(record.reason || "未入力")}</b><span>守った現金</span><b>${fmt(record.saved)}円</b></div>
      ${canReviewAfter(record) ? `<button class="btn secondary full" onclick="reviewAfter('${record.id}')">レース後の行動を記録</button>` : ""}
      ${record.saved ? `<div class="reward"><span class="manga-label">CASH SAVED</span> ${fmt(record.saved)}円を現金では使わずに済みました。</div>` : ""}</div>`;
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
    return `低自信×高衝動 ${low}件。追い上げ傾向 ${stats.chase}件、短時間の金額増加 ${stats.escalation}件。これまで ${fmt(saved)}円を現金では使わずに済みました。`;
  }

  function renderAnalysis() {
    const stats = C.behaviorStats(S.records);
    const total = C.savedTotals(S.records).all;
    const low = S.records.filter((item) => item.conf <= 4 && item.urge >= 7).length;
    const settled = S.records.filter((item) => item.settled).length;
    $("analysisCards").innerHTML = [
      ["守った現金", `${fmt(total)}円`],
      ["低自信×高衝動", `${low}件`],
      ["追い上げ傾向", `${stats.chase}件`],
      ["実結果反映", `${settled}件`],
    ].map(([label, value]) => `<div class="stat-card"><div class="eyebrow">${label}</div><div class="metric">${value}</div></div>`).join("");
    const items = [
      ["取り返したい参加", `${stats.declaredChase}件`],
      ["短時間の金額増加", `${stats.escalation}件（30分以内に予定額が増加）`],
      ["外れ後の追い上げ", `${stats.postLossChase}件（30分以内・予定額増加）`],
      ["短時間連投", `${stats.rapid}件（30分以内に3レース参加）`],
      ["衝動の変化", stats.urgeDrop == null
        ? "レース後データ待ち"
        : `B投票後、平均 ${stats.urgeDrop >= 0 ? "−" : "＋"}${Math.abs(stats.urgeDrop).toFixed(1)}`],
      ["多い参加理由", stats.topReason ? `${stats.topReason[0]}：${stats.topReason[1]}件` : "データ待ち"],
      ["守れた場", stats.topVenue ? `${stats.topVenue[0]}：${fmt(stats.topVenue[1])}円` : "データ待ち"],
    ];
    $("analysisList").innerHTML = items.map(([label, value]) =>
      `<div class="card"><b>${esc(label)}</b><p class="muted">${esc(value)}</p></div>`
    ).join("");
    $("xpValue").textContent = `${fmt(S.xp)} XP`;
    $("xpBar").style.width = `${Math.min(100, (S.xp % 500) / 5)}%`;
    const rewards = [
      [100, "青緑の帆", "帆"], [300, "灯台バッジ", "灯"],
      [600, "夜航海背景", "夜"], [1000, "金の錨", "錨"],
    ];
    $("rewards").innerHTML = rewards.map(([xp, name, symbol]) =>
      `<div class="rewarditem ${S.xp < xp ? "lock" : ""}"><div class="reward-symbol">${symbol}</div><b>${name}</b><div class="tiny">${S.xp >= xp ? "解放済み" : `${xp} XPで解放`}</div></div>`
    ).join("");
  }

  function analysisSummary() {
    const stats = C.behaviorStats(S.records);
    return `まもボート行動分析用データ
記録数: ${S.records.length}
守った現金: ${C.savedTotals(S.records).all}円
低自信×高衝動: ${S.records.filter((item) => item.conf <= 4 && item.urge >= 7).length}件
追い上げ傾向: ${stats.chase}件
取り返したい参加: ${stats.declaredChase}件
短時間の金額増加: ${stats.escalation}件
外れ後の追い上げ: ${stats.postLossChase}件
短時間連投: ${stats.rapid}件
平均衝動変化: ${stats.urgeDrop == null ? "未集計" : stats.urgeDrop.toFixed(2)}
主な理由: ${stats.topReason ? stats.topReason.join(" / ") : "未集計"}
場別最大セーブ: ${stats.topVenue ? stats.topVenue.join(" / ") : "未集計"}

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
  }

  window.reloadData = async (button) => {
    if (button) {
      button.disabled = true;
      button.textContent = "更新しています…";
    }
    const result = await loadOfficialData(true);
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
    anchor.download = `mamoboat-records-v372-${C.jstDate()}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  window.resetData = () => {
    if (!confirm("記録を初期化しますか？この操作は取り消せません。")) return;
    const accepted = S.accepted;
    S = fresh();
    S.accepted = accepted;
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
  renderAll();
  loadOfficialData();
  setInterval(() => {
    if (!document.hidden) updateTimeDisplays();
  }, 10 * 1000);
  setInterval(() => {
    if (!document.hidden && Date.now() - lastLoadAt >= 5 * 60 * 1000) {
      loadOfficialData();
    }
  }, 60 * 1000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && Date.now() - lastLoadAt > 5 * 60 * 1000) loadOfficialData();
  });
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();
