/* MAMO BOAT — MAMO RECORD Phase 1
 * Minimal two-tap psychology record after a newly detected AIR BET.
 * Rewards reflection completion, never stake size, wins, or repeated betting.
 */
(() => {
  "use strict";
  if (window.__MAMO_RECORD_PHASE1__) return;
  window.__MAMO_RECORD_PHASE1__ = true;

  const APP_KEY = "mamoboat_v40_personal";
  const RECORD_KEY = "mamoboat_record_v1";
  const DAILY_CAP = 50;
  const COMPLETE_REWARD = 10;
  const scanSeen = new Set();
  let scanReady = false;
  let activeRecord = null;
  let answers = { conviction: null, cashUrge: null };

  const todayKey = () => {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
      }).format(new Date());
    } catch (_) {
      return new Date().toISOString().slice(0, 10);
    }
  };

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; }
    catch (_) { return fallback; }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  }

  function appState() { return readJson(APP_KEY, {}); }

  function freshRecordState() {
    return {
      version: 1,
      balance: 0,
      ledger: [],
      reflections: {},
      seenRecordIds: [],
      createdAt: new Date().toISOString(),
    };
  }

  function recordState() {
    const raw = readJson(RECORD_KEY, null);
    const s = raw && typeof raw === "object" ? raw : freshRecordState();
    s.balance = Math.max(0, Number(s.balance) || 0);
    s.ledger = Array.isArray(s.ledger) ? s.ledger.slice(-1000) : [];
    s.reflections = s.reflections && typeof s.reflections === "object" ? s.reflections : {};
    s.seenRecordIds = Array.isArray(s.seenRecordIds) ? s.seenRecordIds.slice(-3000) : [];
    return s;
  }

  function saveRecordState(s) { writeJson(RECORD_KEY, s); }

  function stableId(record) {
    if (record?.id) return String(record.id);
    return [record?.time, record?.raceDate, record?.venueCode || record?.venue, record?.raceNo, record?.stake]
      .filter((v) => v != null && v !== "").join(":");
  }

  function dayEarned(s, day = todayKey()) {
    return s.ledger
      .filter((x) => x?.day === day && Number(x?.amount) > 0)
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);
  }

  function awardReflection(s, recordId) {
    if (s.ledger.some((x) => x?.recordId === recordId && x?.type === "reflection_complete")) {
      return { amount: 0, reason: "already" };
    }
    const day = todayKey();
    const earned = dayEarned(s, day);
    const amount = Math.max(0, Math.min(COMPLETE_REWARD, DAILY_CAP - earned));
    if (amount > 0) {
      s.balance += amount;
      s.ledger.push({
        id: `record-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: "reflection_complete",
        recordId,
        amount,
        day,
        at: new Date().toISOString(),
        balanceAfter: s.balance,
      });
    }
    return { amount, reason: amount > 0 ? "awarded" : "daily_cap" };
  }

  function installStyle() {
    if (document.getElementById("mamoRecordPhase1Style")) return;
    const style = document.createElement("style");
    style.id = "mamoRecordPhase1Style";
    style.textContent = `
      #mamoRecordSummary{margin:10px 0 4px;padding:13px 14px;border:1px solid #dce4e5;border-left:5px solid #d2a23b;border-radius:13px;background:#fffdf8;box-shadow:0 4px 12px rgba(8,35,61,.05);display:flex;align-items:center;justify-content:space-between;gap:12px}
      #mamoRecordSummary small{display:block;color:#8b6a1d;font-size:8px;font-weight:1000;letter-spacing:.12em}#mamoRecordSummary b{display:block;margin-top:2px;color:#08233d;font-size:15px}#mamoRecordSummary strong{white-space:nowrap;color:#a77709;font-size:25px;line-height:1}
      .mr-bg{position:fixed;inset:0;z-index:9999;background:rgba(4,20,31,.42);display:none;align-items:flex-end;justify-content:center;padding:0}.mr-bg.show{display:flex}.mr-sheet{width:min(100%,560px);max-height:86vh;overflow:auto;background:#fff;border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -14px 40px rgba(4,20,31,.2)}
      .mr-top{display:flex;align-items:start;justify-content:space-between;gap:10px}.mr-top small{color:#9a7419;font-size:8px;font-weight:1000;letter-spacing:.14em}.mr-top h2{margin:3px 0 3px;color:#08233d;font-size:23px;letter-spacing:-.03em}.mr-top p{margin:0;color:#718188;font-size:10px;line-height:1.55}.mr-close{border:0;background:#f1f4f4;color:#62747b;border-radius:50%;width:34px;height:34px;font-size:18px}
      .mr-q{margin-top:17px;padding:13px;border:1px solid #e1e7e8;border-radius:13px;background:#fafcfc}.mr-q>span{display:block;color:#17384a;font-size:13px;font-weight:900;margin-bottom:9px}.mr-scale{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}.mr-scale button{min-height:44px;border:1px solid #d7e0e1;border-radius:10px;background:#fff;color:#294a59;font-weight:1000;font-size:14px}.mr-scale button.sel{background:#08233d;color:#fff;border-color:#08233d;box-shadow:0 3px 0 #d2a23b}.mr-scale-label{display:flex;justify-content:space-between;margin-top:6px;color:#829097;font-size:8px}.mr-foot{margin-top:13px;color:#73838a;font-size:9px;line-height:1.55;text-align:center}.mr-earned{text-align:center;padding:22px 10px 12px}.mr-earned small{color:#997319;font-size:9px;font-weight:1000;letter-spacing:.12em}.mr-earned strong{display:block;margin:5px 0;color:#a77709;font-size:42px;line-height:1}.mr-earned h3{margin:8px 0 4px;color:#08233d;font-size:20px}.mr-earned p{margin:0;color:#718188;font-size:10px;line-height:1.6}
    `;
    document.head.appendChild(style);
  }

  function ensureSheet() {
    let bg = document.getElementById("mamoRecordSheetBg");
    if (bg) return bg;
    bg = document.createElement("div");
    bg.id = "mamoRecordSheetBg";
    bg.className = "mr-bg";
    bg.innerHTML = `<div class="mr-sheet" role="dialog" aria-modal="true" aria-label="MAMO RECORD">
      <div id="mamoRecordSheetBody"></div>
    </div>`;
    bg.addEventListener("click", (e) => { if (e.target === bg) closeSheet(); });
    document.body.appendChild(bg);
    return bg;
  }

  function closeSheet() {
    document.getElementById("mamoRecordSheetBg")?.classList.remove("show");
    activeRecord = null;
    answers = { conviction: null, cashUrge: null };
  }

  function questionHtml(record) {
    const venue = String(record?.venue || record?.venueName || "");
    const race = Number(record?.raceNo) || "";
    return `<div class="mr-top"><div><small>MAMO RECORD / 2 TAPS</small><h2>今の気持ちだけ、残す。</h2><p>${venue ? `${venue} ` : ""}${race ? `${race}R / ` : ""}分析はMAMOがあとでやります。</p></div><button class="mr-close" type="button" data-mr-close aria-label="あとで">×</button></div>
      <div class="mr-q"><span>この勝負、どれくらい納得してる？</span><div class="mr-scale" data-mr-group="conviction">${[1,2,3,4,5].map(n=>`<button type="button" data-mr-answer="${n}">${n}</button>`).join("")}</div><div class="mr-scale-label"><i>なんとなく</i><i>かなり納得</i></div></div>
      <div class="mr-q"><span>現金で買いたい気持ちは？</span><div class="mr-scale" data-mr-group="cashUrge">${[1,2,3,4,5].map(n=>`<button type="button" data-mr-answer="${n}">${n}</button>`).join("")}</div><div class="mr-scale-label"><i>ほぼない</i><i>かなり強い</i></div></div>
      <div class="mr-foot">2つ選ぶと自動で記録完了。賭け金・的中・回数ではRECORDは増えません。</div>`;
  }

  function showFor(record) {
    activeRecord = record;
    answers = { conviction: null, cashUrge: null };
    const bg = ensureSheet();
    document.getElementById("mamoRecordSheetBody").innerHTML = questionHtml(record);
    bg.classList.add("show");
  }

  function telemetry(eventName, payload, record) {
    const api = window.MAMO_DECISION_EVENTS;
    if (!api?.track && !api?.send) return;
    const context = {
      screen: document.body?.dataset?.screen || "race",
      raceDate: record?.raceDate || null,
      venueCode: record?.venueCode || null,
      raceNo: record?.raceNo || null,
    };
    try { (api.track || api.send)(eventName, payload, context); } catch (_) {}
  }

  function completeReflection() {
    if (!activeRecord || answers.conviction == null || answers.cashUrge == null) return;
    const id = stableId(activeRecord);
    if (!id) return closeSheet();
    const s = recordState();
    const now = new Date().toISOString();
    s.reflections[id] = {
      recordId: id,
      type: "air_bet_after",
      conviction: Number(answers.conviction),
      cashUrge: Number(answers.cashUrge),
      recordedAt: now,
      raceDate: activeRecord.raceDate || null,
      venueCode: activeRecord.venueCode || null,
      venue: activeRecord.venue || null,
      raceNo: activeRecord.raceNo || null,
      stakeB: Number(activeRecord.stake) || 0,
    };
    const award = awardReflection(s, id);
    saveRecordState(s);
    telemetry("mamo_record_reflection_completed", {
      record_id: id,
      conviction: Number(answers.conviction),
      cash_urge: Number(answers.cashUrge),
      record_awarded: award.amount,
      daily_record_cap: DAILY_CAP,
      reward_basis: "reflection_completion_only",
    }, activeRecord);
    renderSummary();

    const body = document.getElementById("mamoRecordSheetBody");
    if (body) body.innerHTML = `<div class="mr-earned"><small>RECORD COMPLETE</small><strong>${award.amount > 0 ? `+${award.amount}R` : "記録済み"}</strong><h3>${award.reason === "daily_cap" ? "今日のRECORD上限に到達" : "あとはMAMOがまとめます。"}</h3><p>入力した気持ちは、今後の朝刊・週間分析につなげていきます。</p></div>`;
    setTimeout(closeSheet, 1350);
  }

  function handleSheetClick(e) {
    if (e.target.closest?.("[data-mr-close]")) return closeSheet();
    const btn = e.target.closest?.("[data-mr-answer]");
    if (!btn) return;
    const group = btn.closest?.("[data-mr-group]")?.dataset?.mrGroup;
    if (!group || !(group in answers)) return;
    answers[group] = Number(btn.dataset.mrAnswer);
    btn.parentElement?.querySelectorAll("button").forEach((x) => x.classList.toggle("sel", x === btn));
    if (answers.conviction != null && answers.cashUrge != null) setTimeout(completeReflection, 180);
  }

  function renderSummary() {
    const home = document.getElementById("home");
    const stats = home?.querySelector(".three-stats");
    if (!home || !stats) return;
    let panel = document.getElementById("mamoRecordSummary");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "mamoRecordSummary";
      stats.insertAdjacentElement("afterend", panel);
    }
    const s = recordState();
    const today = dayEarned(s);
    panel.innerHTML = `<div><small>MAMO RECORD</small><b>気持ちを残すほど、分析の材料が増える。</b><span style="display:block;margin-top:3px;color:#7c8a90;font-size:8px">今日 ${today}/${DAILY_CAP}R</span></div><strong>${s.balance.toLocaleString("ja-JP")}R</strong>`;
  }

  function scanNewAirBets() {
    const state = appState();
    const records = Array.isArray(state.records) ? state.records : [];
    const rs = recordState();
    const persistedSeen = new Set(rs.seenRecordIds || []);

    if (!scanReady) {
      records.forEach((r) => {
        const id = stableId(r); if (id) { scanSeen.add(id); persistedSeen.add(id); }
      });
      rs.seenRecordIds = [...persistedSeen].slice(-3000);
      saveRecordState(rs);
      scanReady = true;
      return;
    }

    for (const record of records) {
      const id = stableId(record);
      if (!id || scanSeen.has(id) || persistedSeen.has(id)) continue;
      scanSeen.add(id);
      persistedSeen.add(id);
      rs.seenRecordIds = [...persistedSeen].slice(-3000);
      saveRecordState(rs);
      if (!rs.reflections[id]) {
        setTimeout(() => { if (!activeRecord) showFor(record); }, 300);
      }
      break;
    }
  }

  function boot() {
    installStyle();
    ensureSheet();
    document.getElementById("mamoRecordSheetBg")?.addEventListener("click", handleSheetClick, false);
    renderSummary();
    scanNewAirBets();
    setInterval(scanNewAirBets, 1000);
    window.addEventListener("pageshow", () => { renderSummary(); scanNewAirBets(); });
    document.addEventListener("click", () => setTimeout(renderSummary, 120), false);
    window.MAMO_RECORD = Object.freeze({
      version: 1,
      balance: () => recordState().balance,
      state: () => recordState(),
      dailyCap: DAILY_CAP,
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
