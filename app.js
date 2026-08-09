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
  const BET_ORDER = [
    "trifecta", "trio", "exacta", "quinella", "wide", "win", "place",
  ];
  const PAYOUT_DISPLAY_ORDER = [
    "win", "place", "exacta", "quinella", "wide", "trifecta", "trio",
  ];
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

  function unavailableDataset(message = "公式データを取得できませんでした") {
    return {
      schemaVersion: 8,
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
  let betType = "trifecta";
  let mode = "normal";
  let normal = [null, null, null];
  let box = new Set();
  let form = [new Set(), new Set(), new Set()];
  let cart = [];

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
  if (S.coinWeek !== weekKey()) {
    S.coinWeek = weekKey();
    S.coins = 10000;
    localStorage.setItem(KEY, JSON.stringify(S));
  }

  const save = () => localStorage.setItem(KEY, JSON.stringify(S));
  const venue = (code) => DATA.venues.find((item) => item.code === code);
  const race = (code, number) => venue(code)?.races?.find(
    (item) => Number(item.number) === Number(number)
  );

  async function fetchDataset(date) {
    const path = date === C.jstDate() ? "data/today.json" : `data/${date}.json`;
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${path}`);
    const dataset = await response.json();
    if (dataset.source?.type !== "official-lzh" || !C.validateDataset(dataset)) {
      throw new Error(`構造検証エラー ${path}`);
    }
    return dataset;
  }

  async function loadOfficialData() {
    dataError = "";
    try {
      DATA = await fetchDataset(C.jstDate());
      liveLoaded = true;
      S.lastDataDate = DATA.date;
      save();
    } catch (error) {
      dataError = String(error && error.message || error);
      DATA = unavailableDataset(dataError);
      liveLoaded = false;
    }
    lastLoadAt = Date.now();
    await settleAllPending();
    renderAll();
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
        if (record.coinWeek === S.coinWeek) totalAdded += result.payoutAdded;
        if (result.hit) hitBonus += 20;
      }
    }
    if (changed) {
      S.coins += totalAdded;
      S.xp += hitBonus;
      save();
    }
  }

  function officialUrl(code, number, date = DATA.date) {
    return `https://www.boatrace.jp/owpc/pc/race/racelist?hd=${date.replaceAll("-", "")}&jcd=${code}&rno=${number}`;
  }

  function racerUrl(racerNumber) {
    return `https://www.boatrace.jp/owpc/pc/data/racersearch/profile?toban=${encodeURIComponent(racerNumber)}`;
  }

  function openModal(html) {
    $("modal").innerHTML = html;
    $("modalBg").classList.add("show");
  }

  window.closeModal = () => $("modalBg").classList.remove("show");
  window.bgClose = (event) => {
    if (event.target.id === "modalBg") window.closeModal();
  };
  window.go = (id) => {
    document.querySelectorAll(".screen").forEach(
      (item) => item.classList.toggle("active", item.id === id)
    );
    document.querySelectorAll(".nav").forEach(
      (item) => item.classList.toggle("active", item.id === `nav-${id}`)
    );
    renderCurrent(id);
    window.scrollTo(0, 0);
  };
  window.checkStart = () => {
    $("startBtn").disabled = !($("age").checked && $("value").checked);
  };
  window.startApp = () => {
    S.accepted = true;
    save();
    renderAll();
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
      return `公式LZH ${stats.scheduleVenues || 0}場・${stats.scheduleRaces || 0}R・${stats.scheduleEntries || 0}艇${results} / ${generated}更新`;
    }
    if (liveLoaded) return `公式データは ${DATA.date} 分です。今日の仮想投票は停止中です。`;
    return `公式データを利用できないため、仮想投票を停止しています。${dataError ? ` ${dataError}` : ""}`;
  }

  function vcard(item) {
    const raceCount = (item.races || []).length;
    const entryCount = (item.races || []).reduce(
      (sum, raceItem) => sum + (raceItem.entries?.length || 0),
      0
    );
    return `<div class="card venue">
      <div class="venuehead">
        <div><div class="eyebrow">${esc(item.code)}</div><div class="venuename">${esc(item.name)}</div></div>
        <span class="status ${item.active ? "on" : "off"}">${item.active ? "本日開催" : "本日なし"}</span>
      </div>
      <div class="tiny">${item.active ? `${raceCount}R / ${entryCount}艇を公式番組表から取得` : "架空レースは表示しません"}</div>
      ${item.active
        ? `<button class="btn primary full" onclick="openVenue('${item.code}')">レースを見る</button>
           <a class="link" href="${esc(item.boatcast)}" target="_blank" rel="noopener">▶ 公式映像</a>`
        : '<div class="notice">本日開催なし</div>'}
    </div>`;
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

  function renderHome() {
    $("dataStatus").className = `notice ${isFresh() ? "good" : "warn"}`;
    $("dataStatus").textContent = statusText();
    const totals = C.savedTotals(S.records);
    $("coins").textContent = `${fmt(S.coins)}C`;
    $("savedToday").textContent = `${fmt(totals.today)}円`;
    $("savedWeek").textContent = `${fmt(totals.week)}円`;
    $("savedMonth").textContent = `${fmt(totals.month)}円`;
    const active = DATA.venues.filter((item) => item.active);
    $("activeCount").textContent = `${active.length}場`;
    $("homeVenues").innerHTML = active.length
      ? active.map(vcard).join("")
      : '<div class="card muted">本日の公式開催データはありません。</div>';
    $("aiMemo").textContent = aiText();
    const upcoming = nextRaces();
    $("nextRaces").innerHTML = upcoming.length
      ? upcoming.map((item) => `<div class="card">
          <div class="venuehead"><div><b>${esc(item.venue.name)} ${item.race.number}R</b>
          <div class="tiny">${esc(item.race.name || "")}</div></div>
          <span class="status on">${timeText(item.race.closeTime)}</span></div>
          <button class="btn secondary full" style="margin-top:8px" onclick="jumpRace('${item.venue.code}',${item.race.number})">仮想で参加</button>
        </div>`).join("")
      : `<div class="card muted">${isFresh() ? "この後の締切はありません。" : "今日の実データ同期待ちです。"}</div>`;
    const unreviewed = S.records.filter(
      (record) => (record.settled || canReviewAfter(record)) && !record.cashReviewed
    ).length;
    $("settledNotice").innerHTML = unreviewed
      ? `<div class="notice good"><b>${unreviewed}件のレース後記録が未入力です。</b> 記録画面から、実際に現金で買ったかを入力できます。</div>`
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
      ? list.map(vcard).join("")
      : '<div class="card muted">該当する開催場はありません。</div>';
  }

  window.openVenue = (code) => {
    S.venue = code;
    S.raceNo = venue(code)?.races?.[0]?.number || 1;
    resetBuilder();
    save();
    window.go("race");
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
        S.raceNo = venueItem.races?.[0]?.number || 1;
      }
    }
    if (!venueItem) {
      $("raceView").innerHTML = '<div class="card notice warn">本日の公式開催データがありません。仮想投票は停止中です。</div>';
      return;
    }
    const raceItem = race(venueItem.code, S.raceNo) || venueItem.races?.[0];
    if (!raceItem) {
      $("raceView").innerHTML = '<div class="card notice warn">番組表データが完全ではないため、仮想投票を停止しています。</div>';
      return;
    }
    S.raceNo = raceItem.number;
    const now = Date.now();
    const chips = venueItem.races.map((item) => {
      const closed = !!item.closeTime && now >= new Date(item.closeTime).getTime();
      return `<button class="racechip ${closed ? "closed" : ""} ${item.number === raceItem.number ? "active" : ""}"
        title="${closed ? "締切済み・結果閲覧" : `締切 ${timeText(item.closeTime)}`}"
        onclick="selectRace(${item.number})">${item.number}R</button>`;
    }).join("");
    const entries = `<div class="boats">${raceItem.entries.map((entry) => `<a class="boat" href="${racerUrl(entry.racerNumber)}" target="_blank" rel="noopener" aria-label="${esc(entry.name)}選手の公式情報を開く">
      <div class="num b${entry.boatNumber}">${entry.boatNumber}</div>
      <div><b>${esc(entry.name)}</b><div class="tiny">${entry.racerNumber} ${esc(entry.branch || "")}${entry.age ? ` / ${entry.age}歳` : ""}${entry.weight ? ` / ${entry.weight}kg` : ""}</div></div>
      <div><b class="tiny">${esc(entry.class || "")}</b><div class="tiny">${entry.motorNumber ? `M${entry.motorNumber}` : ""}${entry.boatPart ? ` / B${entry.boatPart}` : ""}</div><div class="racerlinkhint">公式情報 ↗</div></div>
    </a>`).join("")}</div>`;
    const open = closeState(raceItem);
    $("raceView").innerHTML = `<div class="title"><h2>${esc(venueItem.name)}</h2><span>${DATA.date}</span></div>
      <div class="racechips">${chips}</div>
      <div class="card" style="margin-top:10px">
        <div class="eyebrow">公式番組表</div>
        <div class="racename">${esc(venueItem.name)} ${raceItem.number}R ${esc(raceItem.name || "")}</div>
        <div class="tiny">電話投票締切予定 ${timeText(raceItem.closeTime)}</div>
        ${entries}${resultHtml(raceItem)}
        <div class="row" style="margin-top:10px">
          <a class="link" href="${officialUrl(venueItem.code, raceItem.number)}" target="_blank" rel="noopener">公式 出走表・オッズ</a>
          <a class="link" href="${esc(venueItem.boatcast)}" target="_blank" rel="noopener">▶ LIVE / リプレイ</a>
        </div>
      </div>
      <div class="title"><h2>仮想メダルで参加</h2><span>公式7舟券種</span></div>
      <div class="card">${open
        ? builderShell()
        : isFresh()
          ? '<div class="notice warn">公式締切時刻を過ぎています。新規仮想投票はできません。</div>'
          : '<div class="notice warn">今日の検証済み公式データではないため、新規仮想投票を停止しています。</div>'}</div>`;
    if (open) renderBuilder();
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
      return '<div class="notice warn" style="margin-top:9px"><b>舟券 不成立</b><br>このレースの仮想投票額は自動返還されます。</div>';
    }
    if (!payouts.length) {
      return `<div class="notice" style="margin-top:9px"><b>実着順 ${finish || "集計中"}</b><br>公式払戻の確定待ちです。</div>`;
    }
    return `<div class="notice good" style="margin-top:9px"><b>実着順 ${finish || "確定"}</b>
      <details style="margin-top:6px"><summary><b>公式払戻（7舟券種）</b></summary>${payouts.map(
        (item) => `<br>${C.BET_TYPES[item.betType].label} ${item.combination} / ${fmt(item.payout)}円${item.popularity ? ` / ${item.popularity}番人気` : ""}`
      ).join("")}${notEstablished.length ? `<br>不成立・返還：${notEstablished.map(esc).join("・")}` : ""}</details></div>`;
  }

  function builderShell() {
    return `<div class="bettypebar">${BET_ORDER.map((type) =>
      `<button id="type-${type}" class="bettypebtn" onclick="setBetType('${type}')">${C.BET_TYPES[type].label}</button>`
    ).join("")}</div>
    <div id="betGuide" class="notice betguide"></div>
    <div id="modeTabs" class="bet-tabs"></div><div id="builder"></div>
    <div class="title" style="margin-top:14px"><h2 style="font-size:16px">買い目</h2><span id="cartCount">0点</span></div>
    <div id="cart" class="cart"></div><div id="cartSum" class="notice">買い目を作成してください。</div>
    <button class="btn teal full" style="margin-top:9px" onclick="reviewBet()">仮想投票を確認</button>`;
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
    $("betGuide").innerHTML = `<b>${spec.label}</b>：${BET_GUIDES[betType]}。1点100Cから、100C単位。`;
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
    combos.forEach((combo) => {
      const canonical = C.canonicalCombo(combo, betType).split("-").map(Number);
      const key = `${betType}:${canonical.join("-")}`;
      if (!seen.has(key)) {
        cart.push({ combo: canonical, betType, stake: 100, odds: "", mode });
        seen.add(key);
      }
    });
    renderCart();
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
    }
    renderCart();
  };
  window.removeLine = (index) => {
    cart.splice(index, 1);
    renderCart();
  };

  function renderCart() {
    if (!$("cart")) return;
    $("cart").innerHTML = cart.length
      ? cart.map((line, index) => `<div class="cartrow"><b class="tickettype">${C.BET_TYPES[C.normalizeBetType(line.betType)].label}</b>
          <b>${line.combo.join("-")}</b>
          <input value="${line.stake}" inputmode="numeric" aria-label="投票メダル" onchange="changeLine(${index},'stake',this.value)">
          <input value="${esc(line.odds)}" inputmode="decimal" aria-label="予想オッズ" placeholder="倍率" onchange="changeLine(${index},'odds',this.value)">
          <button class="xbtn" aria-label="削除" onclick="removeLine(${index})">×</button></div>`).join("")
      : '<div class="muted">買い目はまだありません。</div>';
    const total = cart.reduce((sum, line) => sum + line.stake, 0);
    $("cartCount").textContent = `${cart.length}点`;
    const estimates = cart.filter((line) => Number(line.odds) > 0)
      .map((line) => line.stake * Number(line.odds));
    $("cartSum").innerHTML = cart.length
      ? `<b>${cart.length}点 / 合計 ${fmt(total)}C</b>${estimates.length
        ? `<br>入力オッズの最低想定払戻 ${fmt(Math.min(...estimates))}C${Math.min(...estimates) < total ? " / トリガミ候補" : ""}`
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
          <b class="betcombo">${combo.join(separator)}</b><b>${fmt(line.stake)}C</b>
          ${racerNames.length === combo.length ? `<div class="betnames">${lineMode ? `${lineMode} / ` : ""}${racerNames.map(esc).join(separator)}</div>` : ""}
          ${Number(line.odds) > 0 ? `<div class="betnames">参加時の予想オッズ ${esc(line.odds)}倍</div>` : ""}</div>`;
      }).join("")}</div></details>`;
  }

  window.reviewBet = () => {
    const venueItem = venue(S.venue);
    const raceItem = race(venueItem?.code, S.raceNo);
    if (!raceItem || !closeState(raceItem)) {
      return alert("締切後または検証済み当日データではないため、仮想投票できません。");
    }
    if (!cart.length) return alert("買い目を追加してください。");
    const total = cart.reduce((sum, line) => sum + line.stake, 0);
    if (total > S.coins) return alert("仮想メダル残高が不足しています。");
    openModal(`<h2>${esc(venueItem.name)} ${raceItem.number}R</h2>
      <div class="notice"><b>${cart.length}点 / ${fmt(total)}C</b></div>
      <h3>購入内容</h3>${betReceipt(cart, raceItem.entries, mode, "購入する買い目")}
      <h3>このレースへの自信</h3>
      <input id="conf" class="slider" type="range" min="0" max="10" value="5" oninput="document.getElementById('cv').textContent=this.value"><div id="cv" class="big">5</div>
      <h3>今、現金で買いたい気持ち</h3>
      <input id="urge" class="slider" type="range" min="0" max="10" value="5" oninput="document.getElementById('uv').textContent=this.value"><div id="uv" class="big">5</div>
      <div class="field"><label>参加理由</label><select id="reason"><option>なんとなく</option><option>レースがあるから</option><option>自信がある</option><option>取り返したい</option><option>推し選手</option><option>その他</option></select></div>
      <div class="field"><label>現金ならいくら使うつもりだった？</label><input id="intended" type="number" min="0" step="100" value="${total}"></div>
      <div class="field"><label>メモ</label><textarea id="memo" maxlength="500" placeholder="なぜ買いたくなったか等"></textarea></div>
      <button class="btn teal full" onclick="placeBet()">仮想で参加する</button>`);
  };

  window.placeBet = () => {
    const venueItem = venue(S.venue);
    const raceItem = race(venueItem?.code, S.raceNo);
    if (!raceItem || !closeState(raceItem)) {
      window.closeModal();
      return alert("締切時刻を過ぎたため、仮想投票を取り消しました。");
    }
    const total = cart.reduce((sum, line) => sum + line.stake, 0);
    if (!cart.length || total > S.coins) return alert("仮想メダル残高が不足しています。");
    const intended = Math.max(0, Math.floor((Number($("intended").value) || 0) / 100) * 100);
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

  function recCard(record) {
    let result;
    if (!record.settled) {
      result = '<div class="notice">実結果待ち。公式成績の同期後に自動精算します。</div>';
    } else if (record.status === "refunded") {
      result = `<div class="notice warn"><div class="result">舟券 不成立 / 仮想メダル返還</div>${fmt(record.payoutC)}Cを返還しました。</div>`;
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
        <div class="result">実結果 ${esc(record.resultCombo || "確定")} / ${record.status === "hit" ? "仮想的中" : "外れ"}</div>
        ${payouts ? `公式払戻 ${payouts}<br>` : ""}仮想払戻 ${fmt(record.payoutC)}C${record.refundC ? `（うち不成立返還 ${fmt(record.refundC)}C）` : ""}</div>`;
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
    const entrySnapshot = record.entrySnapshot?.length
      ? record.entrySnapshot
      : currentRace?.entries || [];
    return `<div class="card rec"><div class="venuehead"><div><b>${esc(record.venue)} ${record.raceNo}R</b>
      <div class="tiny">${(record.lines || []).length}点 / ${fmt(record.stake)}C / 現金予定 ${fmt(record.intendedYen)}円</div></div>
      <span class="status ${record.saved ? "on" : "off"}">${badge}</span></div>
      ${betReceipt(record.lines, entrySnapshot, record.betMode)}${result}
      <div class="recgrid"><span>自信</span><b>${record.conf}/10</b><span>購入前衝動</span><b>${record.urge}/10</b>
      <span>理由</span><b>${esc(record.reason || "未入力")}</b><span>守った現金</span><b>${fmt(record.saved)}円</b></div>
      ${canReviewAfter(record) ? `<button class="btn secondary full" onclick="reviewAfter('${record.id}')">レース後の行動を記録</button>` : ""}
      ${record.saved ? `<div class="reward">🛟 ${fmt(record.saved)}円を現金では使わずに済みました。</div>` : ""}</div>`;
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
  }

  function aiText() {
    if (!S.records.length) {
      return "仮想参加を記録すると、低自信×高衝動、取り返したい参加、金額増加、短時間連投を分析します。";
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
    ].map(([label, value]) => `<div class="card"><div class="eyebrow">${label}</div><div class="metric">${value}</div></div>`).join("");
    const items = [
      ["取り返したい参加", `${stats.declaredChase}件`],
      ["短時間の金額増加", `${stats.escalation}件（30分以内に予定額が増加）`],
      ["外れ後の追い上げ", `${stats.postLossChase}件（30分以内・予定額増加）`],
      ["短時間連投", `${stats.rapid}件（30分以内に3レース参加）`],
      ["衝動の変化", stats.urgeDrop == null
        ? "レース後データ待ち"
        : `仮想参加後、平均 ${stats.urgeDrop >= 0 ? "−" : "＋"}${Math.abs(stats.urgeDrop).toFixed(1)}`],
      ["多い参加理由", stats.topReason ? `${stats.topReason[0]}：${stats.topReason[1]}件` : "データ待ち"],
      ["守れた場", stats.topVenue ? `${stats.topVenue[0]}：${fmt(stats.topVenue[1])}円` : "データ待ち"],
    ];
    $("analysisList").innerHTML = items.map(([label, value]) =>
      `<div class="card"><b>${esc(label)}</b><p class="muted">${esc(value)}</p></div>`
    ).join("");
    $("xpValue").textContent = `${fmt(S.xp)} XP`;
    $("xpBar").style.width = `${Math.min(100, (S.xp % 500) / 5)}%`;
    const rewards = [
      [100, "青緑の帆", "⛵"], [300, "灯台バッジ", "🗼"],
      [600, "夜航海背景", "🌙"], [1000, "金の錨", "⚓"],
    ];
    $("rewards").innerHTML = rewards.map(([xp, name, icon]) =>
      `<div class="rewarditem ${S.xp < xp ? "lock" : ""}"><div style="font-size:28px">${icon}</div><b>${name}</b><div class="tiny">${S.xp >= xp ? "解放済み" : `${xp} XPで解放`}</div></div>`
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
    const warningCount = DATA.quality?.warnings?.length || 0;
    $("syncStats").innerHTML = `<b>${esc(statusText())}</b><br>
      番組表: ${stats.scheduleVenues || 0}場 / ${stats.scheduleRaces || 0}R / ${stats.scheduleEntries || 0}艇<br>
      成績: ${stats.performanceRaces || 0}R / 実着順行 ${stats.resultRows || 0} / 3連単 ${stats.sanrenshoPayouts || 0} / 全舟券払戻 ${stats.totalPayoutEntries || stats.sanrenshoPayouts || 0}<br>
      検証警告: ${warningCount}件`;
  }

  window.reloadData = () => loadOfficialData();
  window.exportData = () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
    const anchor = document.createElement("a");
    const url = URL.createObjectURL(blob);
    anchor.href = url;
    anchor.download = `mamoboat-records-v30-${C.jstDate()}.json`;
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
    $("onboard").classList.toggle("show", !S.accepted);
    renderHome();
    renderVenues();
    renderRace();
    renderRecords();
    renderAnalysis();
    renderSettings();
  }

  renderAll();
  loadOfficialData();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && Date.now() - lastLoadAt > 5 * 60 * 1000) loadOfficialData();
  });
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();
