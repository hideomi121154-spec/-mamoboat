(() => {
  "use strict";

  const ENDPOINT = "https://mihicuoijitluvrufsoj.supabase.co/functions/v1/master-room-stats";
  const KEY_SESSION = "mamoboat_master_key_session_v1";
  const $ = id => document.getElementById(id);
  const state = { data: null, key: sessionStorage.getItem(KEY_SESSION) || "", days: 14, selectedParticipant: null };

  const fmt = n => Math.round(Number(n) || 0).toLocaleString("ja-JP");
  const yen = n => `${fmt(n)}円`;
  const pct = n => `${Number(n || 0).toFixed(1).replace(/\.0$/, "")}%`;
  const esc = value => String(value ?? "").replace(/[&<>'"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
  const dateTime = value => {
    if (!value) return "—";
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return "—";
    return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tokyo" }).format(d);
  };
  const dayLabel = value => {
    const m = /-(\d{2})-(\d{2})$/.exec(String(value || ""));
    return m ? `${Number(m[1])}/${Number(m[2])}` : String(value || "");
  };

  const eventLabels = {
    app_opened: "アプリ起動",
    screen_view: "画面閲覧",
    venue_opened: "会場を開く",
    race_opened: "レースを開く",
    virtual_bet_placed: "AIR BET",
    bet_review_opened: "事後レビューを開く",
    post_race_urge_recorded: "事後レビュー記録",
    result_settled: "結果反映",
    pilot_plan_selected: "プラン選択",
    press_preferences_saved: "編集部設定",
    pilot_settings_saved: "初期設定",
    onboarding_completed: "初回完了",
    wallet_ledger_posted: "B残高更新",
    defense_stamp_earned: "防衛スタンプ",
    official_data_refresh: "公式データ更新",
  };
  const eventLabel = name => eventLabels[name] || name || "イベント";

  function setLocked(locked) {
    $("loginView").classList.toggle("hidden", !locked);
    $("dashboard").classList.toggle("hidden", locked);
    $("toolbar").classList.toggle("hidden", locked);
    $("liveDot").classList.toggle("live", !locked);
    $("liveText").textContent = locked ? "LOCKED" : "CONNECTED";
  }

  function setBusy(busy) {
    $("loginBtn").disabled = busy;
    $("refreshBtn").disabled = busy;
    if (busy) $("liveText").textContent = "LOADING";
    else if (state.data) $("liveText").textContent = "CONNECTED";
  }

  async function loadData(key = state.key) {
    if (!key) throw new Error("管理キーを入力してください。");
    setBusy(true);
    try {
      const res = await fetch(`${ENDPOINT}?days=${state.days}`, {
        method: "GET",
        headers: { "x-master-key": key },
        cache: "no-store",
      });
      if (res.status === 401) throw new Error("管理キーが違います。");
      if (!res.ok) throw new Error(`MASTER ROOM API ${res.status}`);
      const data = await res.json();
      state.key = key;
      state.data = data;
      sessionStorage.setItem(KEY_SESSION, key);
      setLocked(false);
      render(data);
      return true;
    } finally {
      setBusy(false);
    }
  }

  function kpiCard(label, value, note = "") {
    return `<div class="kpi"><span>${esc(label)}</span><b>${esc(value)}</b>${note ? `<em>${esc(note)}</em>` : ""}</div>`;
  }

  function renderOverview(data) {
    const o = data.overview || {};
    $("kpis").innerHTML = [
      kpiCard("テスターID", `${fmt(o.participants)}件`, `今日 ${fmt(o.activeToday)} / 7日 ${fmt(o.active7d)}`),
      kpiCard("AIR BET到達", pct(o.betConversion), `${fmt(o.betParticipants)} ID`),
      kpiCard("継続利用", pct(o.repeatRate), `${fmt(o.repeatParticipants)} ID`),
      kpiCard("AIR BET", `${fmt(o.virtualBets)}回`, `レース閲覧 ${fmt(o.raceOpens)}回`),
      kpiCard("現金なら予定", yen(o.intendedYen), `${fmt(o.stakeB)}Bで置換`),
      kpiCard("衝動平均", o.avgUrge == null ? "—" : `${o.avgUrge}/10`, `事後レビュー ${fmt(o.postRaceReviews)}件`),
    ].join("");
    $("windowLabel").textContent = `直近${data.windowDays || state.days}日表示`;
  }

  function renderFunnel(data) {
    const rows = data.funnel || [];
    const max = Math.max(1, ...(rows.map(x => Number(x.value) || 0)));
    $("funnel").innerHTML = rows.length ? rows.map(x => `<div class="funnel-row"><span>${esc(x.label)}</span><div class="funnel-track"><div class="funnel-bar" style="width:${Math.max(2, (Number(x.value) || 0) / max * 100)}%"></div></div><b>${fmt(x.value)}</b></div>`).join("") : `<div class="empty">まだファネルデータがありません。</div>`;
  }

  function renderPlans(data) {
    const rows = data.plans || [];
    const label = { free: "FREE", bronze: "BRONZE", silver: "SILVER", gold: "GOLD", ume: "BRONZE", take: "SILVER", matsu: "GOLD" };
    const max = Math.max(1, ...(rows.map(x => Number(x.count) || 0)));
    $("plans").innerHTML = rows.length ? rows.map(x => `<div class="mini-row"><span>${esc(label[x.plan] || String(x.plan).toUpperCase())}</span><div class="mini-track"><div class="mini-bar" style="width:${(Number(x.count) || 0) / max * 100}%"></div></div><b>${fmt(x.count)}</b></div>`).join("") : `<div class="empty">プラン選択はまだありません。</div>`;
  }

  function renderTrend(data) {
    const rows = data.trend || [];
    const max = Math.max(1, ...rows.flatMap(x => [Number(x.active) || 0, Number(x.bets) || 0]));
    const bars = rows.map((x, i) => {
      const active = Math.max(1, (Number(x.active) || 0) / max * 100);
      const bets = Math.max(1, (Number(x.bets) || 0) / max * 100);
      const showLabel = rows.length <= 14 || i % Math.ceil(rows.length / 10) === 0 || i === rows.length - 1;
      return `<div class="trend-day" title="${esc(x.date)} / active ${fmt(x.active)} / AIR ${fmt(x.bets)}"><i style="height:${active}%"></i><i class="bet" style="height:${bets}%"></i>${showLabel ? `<label>${esc(dayLabel(x.date))}</label>` : ""}</div>`;
    }).join("");
    $("trend").querySelector(".trend-bars").innerHTML = bars;
    $("trendCaption").textContent = `${rows.length}日 / 最大 ${max}`;
  }

  function renderScreens(data) {
    const rows = data.screens || [];
    const max = Math.max(1, ...(rows.map(x => Number(x.count) || 0)));
    $("screens").innerHTML = rows.length ? rows.map(x => `<div class="mini-row"><span title="${esc(x.screen)}">${esc(x.screen || "unknown")}</span><div class="mini-track"><div class="mini-bar" style="width:${(Number(x.count) || 0) / max * 100}%"></div></div><b>${fmt(x.count)}</b></div>`).join("") : `<div class="empty">画面閲覧データがありません。</div>`;
  }

  function renderInfra(data) {
    const i = data.infrastructure || {};
    $("infra").innerHTML = `<div><span>同期状態</span><b>${fmt(i.deviceStates)}</b></div><div><span>Push購読</span><b>${fmt(i.pushSubscriptions)}</b></div><div><span>Push配信</span><b>${fmt(i.pushDeliveries)}</b></div>`;
  }

  function planTag(plan) {
    if (!plan) return "—";
    const raw = String(plan).toLowerCase();
    const canonical = raw === "matsu" ? "gold" : raw === "take" ? "silver" : raw === "ume" ? "bronze" : raw;
    return `<span class="tag ${esc(canonical)}">${esc(canonical)}</span>`;
  }

  function renderParticipants(data) {
    const rows = data.participants || [];
    $("participantsBody").innerHTML = rows.length ? rows.map(p => `<tr data-participant="${esc(p.participantId)}"><td>${esc(p.displayId)}</td><td>${esc(dateTime(p.lastSeen))}</td><td>${fmt(p.sessions)}</td><td>${fmt(p.opens)}</td><td>${fmt(p.races)}</td><td>${fmt(p.bets)}</td><td>${yen(p.intendedYen)}</td><td>${p.avgUrge == null ? "—" : esc(`${p.avgUrge}/10`)}</td><td>${fmt(p.reviews)}</td><td>${planTag(p.latestPlan)}</td></tr>`).join("") : `<tr><td colspan="10" class="empty">テスターデータがありません。</td></tr>`;
    $("participantsBody").querySelectorAll("tr[data-participant]").forEach(row => row.addEventListener("click", () => showParticipant(row.dataset.participant)));
  }

  function showParticipant(participantId) {
    const p = (state.data?.participants || []).find(x => x.participantId === participantId);
    if (!p) return;
    state.selectedParticipant = participantId;
    const related = (state.data?.recentEvents || []).filter(e => e.participantId === participantId).slice(0, 12);
    const detail = $("participantDetail");
    detail.innerHTML = `<button class="close-detail" id="closeParticipant" type="button">閉じる</button><small>TESTER DETAIL</small><h3>${esc(p.displayId)}</h3><div class="pd-grid"><div><span>初回</span><b>${esc(dateTime(p.firstSeen))}</b></div><div><span>最終</span><b>${esc(dateTime(p.lastSeen))}</b></div><div><span>セッション</span><b>${fmt(p.sessions)}</b></div><div><span>AIR BET</span><b>${fmt(p.bets)}回</b></div><div><span>予定現金</span><b>${yen(p.intendedYen)}</b></div><div><span>平均衝動</span><b>${p.avgUrge == null ? "—" : esc(`${p.avgUrge}/10`)}</b></div><div><span>レビュー</span><b>${fmt(p.reviews)}</b></div><div><span>最新画面</span><b>${esc(p.latestScreen || "—")}</b></div><div><span>最新プラン</span><b>${esc(p.latestPlan || "—")}</b></div></div>${related.length ? `<div style="margin-top:11px;font-size:9px;color:#a9bac4">直近：${related.map(e => `${esc(dateTime(e.occurredAt))} ${esc(eventLabel(e.eventName))}`).join(" / ")}</div>` : ""}`;
    detail.classList.remove("hidden");
    $("closeParticipant").onclick = () => { detail.classList.add("hidden"); state.selectedParticipant = null; };
  }

  function safePayload(payload) {
    if (!payload || typeof payload !== "object") return "";
    const useful = {};
    const keys = ["plan", "source", "stake_b", "intended_yen", "urge_before", "urge_after", "reason", "confidence", "result_status", "line_count", "bet_types", "display_mode"];
    for (const key of keys) if (payload[key] !== undefined) useful[key] = payload[key];
    const text = JSON.stringify(useful, null, 2);
    return text === "{}" ? "" : text;
  }

  function renderEvents(data) {
    const rows = data.recentEvents || [];
    $("events").innerHTML = rows.length ? rows.map(e => {
      const payload = safePayload(e.payload);
      const race = e.venueCode ? ` / ${e.venueCode}${e.raceNo ? ` ${e.raceNo}R` : ""}` : "";
      return `<div class="event"><time>${esc(dateTime(e.occurredAt))}</time><span class="who">${esc(e.displayId)}</span><b>${esc(eventLabel(e.eventName))}${esc(race)}</b>${payload ? `<pre>${esc(payload)}</pre>` : ""}</div>`;
    }).join("") : `<div class="empty">イベントはまだありません。</div>`;
  }

  function render(data) {
    renderOverview(data);
    renderFunnel(data);
    renderPlans(data);
    renderTrend(data);
    renderScreens(data);
    renderInfra(data);
    renderParticipants(data);
    renderEvents(data);
    $("generatedAt").textContent = `更新 ${dateTime(data.generatedAt)}`;
    if (state.selectedParticipant) showParticipant(state.selectedParticipant);
  }

  async function login() {
    $("loginError").textContent = "";
    const key = $("masterKey").value.trim();
    try {
      await loadData(key);
      $("masterKey").value = "";
    } catch (error) {
      sessionStorage.removeItem(KEY_SESSION);
      state.key = "";
      setLocked(true);
      $("loginError").textContent = error instanceof Error ? error.message : "接続できませんでした。";
    }
  }

  function logout() {
    sessionStorage.removeItem(KEY_SESSION);
    state.key = "";
    state.data = null;
    state.selectedParticipant = null;
    $("participantDetail").classList.add("hidden");
    setLocked(true);
    $("masterKey").focus();
  }

  function boot() {
    setLocked(true);
    $("rangeSelect").value = String(state.days);
    $("loginBtn").onclick = login;
    $("masterKey").addEventListener("keydown", e => { if (e.key === "Enter") login(); });
    $("refreshBtn").onclick = async () => { try { await loadData(); } catch (e) { alert(e instanceof Error ? e.message : "更新できませんでした。"); } };
    $("logoutBtn").onclick = logout;
    $("rangeSelect").onchange = async () => {
      state.days = Number($("rangeSelect").value) || 14;
      try { await loadData(); } catch (e) { alert(e instanceof Error ? e.message : "更新できませんでした。"); }
    };
    if (state.key) loadData().catch(() => logout());
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
