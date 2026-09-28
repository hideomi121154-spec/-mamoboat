(() => {
  "use strict";

  const ENDPOINT = "https://mihicuoijitluvrufsoj.supabase.co/functions/v1/master-room-stats";
  const FINANCE_ENDPOINT = "https://mihicuoijitluvrufsoj.supabase.co/functions/v1/master-room-finance";
  const KEY_SESSION = "mamoboat_master_key_session_v1";
  const $ = id => document.getElementById(id);
  const state = { data: null, finance: null, financeError: null, key: sessionStorage.getItem(KEY_SESSION) || "", days: 14, selectedParticipant: null };

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
    press_feedback_recorded: "新聞フィードバック",
    deep_interview_theme_selected: "深掘りテーマ選択",
    pilot_settings_saved: "初期設定",
    onboarding_completed: "初回完了",
    wallet_ledger_posted: "B残高更新",
    defense_stamp_earned: "防衛スタンプ",
    official_data_refresh: "公式データ更新",
  };
  const eventLabel = name => eventLabels[name] || (String(name || "").startsWith("behavior_") ? `行動分析 / ${String(name).slice(9)}` : name) || "イベント";

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

  async function fetchJson(url, key) {
    const res = await fetch(url, {
      method: "GET",
      headers: { "x-master-key": key },
      cache: "no-store",
    });
    if (res.status === 401) throw new Error("管理キーが違います。");
    if (!res.ok) throw new Error(`MASTER ROOM API ${res.status}`);
    return res.json();
  }

  async function loadData(key = state.key) {
    if (!key) throw new Error("管理キーを入力してください。");
    setBusy(true);
    try {
      const statsPromise = fetchJson(`${ENDPOINT}?days=${state.days}`, key);
      const financePromise = fetchJson(`${FINANCE_ENDPOINT}?days=${state.days}`, key)
        .then(data => ({ data, error: null }))
        .catch(error => ({ data: null, error }));
      const [data, financeResult] = await Promise.all([statsPromise, financePromise]);
      state.key = key;
      state.data = data;
      state.finance = financeResult.data;
      state.financeError = financeResult.error;
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

  function editorialCard(number, title, value, note) {
    return `<article class="editorial-card"><small>${esc(number)}</small><h3>${esc(title)}</h3><strong>${esc(value)}</strong><p>${esc(note)}</p><span class="owner-badge">OWNER ONLY</span></article>`;
  }

  const RESULT_BASIS_LABELS = Object.freeze({
    racer: "選手",
    motor: "モーター",
    exhibition: "展示",
    odds: "オッズ",
    start: "スタート",
    intuition: "直感",
    other: "その他",
  });

  function rankText(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? `${number}位` : "—";
  }

  function factText(rank, value, suffix = "") {
    const rankLabel = rankText(rank);
    const number = Number(value);
    if (!Number.isFinite(number)) return rankLabel;
    const digits = Math.abs(number) < 1 ? 2 : 2;
    const valueLabel = Number(number.toFixed(digits)).toString();
    return `${rankLabel} / ${valueLabel}${suffix}`;
  }

  function boatList(value) {
    const rows = Array.isArray(value) ? value : [];
    return rows.length ? rows.map((boat) => `${Number(boat)}号艇`).join("・") : "—";
  }

  function matchText(value) {
    return value === true ? "一致" : "不一致";
  }

  function resultReviewCard(event) {
    const review = event?.payload?.result_review;
    if (!review || Number(review.version) !== 1) return "";
    const resultCombo = String(review.result_combo || "—");
    const basis = RESULT_BASIS_LABELS[review.self_basis] || String(review.self_basis || "未選択");
    const focusBoat = Number(review.self_focus_boat);
    const lines = Array.isArray(review.lines) ? review.lines : [];
    const facts = Array.isArray(review.finish_facts) ? review.finish_facts : [];
    const positionMatches = Array.isArray(review.position_matches) ? review.position_matches : [];
    const exactHits = Number(review.exact_hit_count) || 0;
    const top3Coverage = Math.max(0, Math.min(3, Number(review.top3_coverage) || 0));

    const factsRows = facts.map((item) => `<tr>
      <td><b>${esc(`${Number(item.position) || "—"}着 / ${Number(item.boat_number) || "—"}号艇`)}</b></td>
      <td>${esc(factText(item.motor_rank, item.motor_value, "%"))}</td>
      <td>${esc(factText(item.exhibition_rank, item.exhibition_value))}</td>
      <td>${esc(factText(item.start_rank, item.start_value))}</td>
      <td>${esc(factText(item.racer_rank, item.racer_value))}</td>
    </tr>`).join("");

    const lineRows = lines.map((item) => {
      const matches = Array.isArray(item.position_matches) ? item.position_matches : [];
      return `<div class="result-review-line"><b>${esc(item.combo || "—")}</b><span class="${item.exact ? "hit" : ""}">${item.exact ? "完全一致" : "不的中"}</span><span>1着 ${matches[0] ? "○" : "×"} / 2着 ${matches[1] ? "○" : "×"} / 3着 ${matches[2] ? "○" : "×"}</span></div>`;
    }).join("");

    let basisSentence = `SELF CHECKの主な根拠：${basis}。`;
    if (review.basis_metric_label && review.winner_basis_rank) {
      basisSentence += ` 1着艇の${review.basis_metric_label}は6艇中${rankText(review.winner_basis_rank)}でした。`;
    } else {
      basisSentence += " 今回はこの根拠を順位化できる公式指標がないため、事実データだけ保存しています。";
    }
    if (Number.isInteger(focusBoat) && focusBoat >= 1 && focusBoat <= 6) {
      basisSentence += ` 特に評価した${focusBoat}号艇`;
      if (review.focus_basis_rank) basisSentence += `は${review.basis_metric_label || "該当指標"}で${rankText(review.focus_basis_rank)}`;
      if (review.focus_result_position) basisSentence += `、結果は${review.focus_result_position}着`;
      basisSentence += "でした。";
    }

    return `<article class="result-review-card">
      <div class="result-review-head"><div><small>${esc(dateTime(event.occurredAt))} / ${esc(event.displayId || "—")} / ${esc(event.venueCode || "—")}${event.raceNo ? ` ${esc(event.raceNo)}R` : ""}</small><h3>複数買い目の答え合わせ</h3></div><b>結果 ${esc(resultCombo)}</b></div>
      <div class="result-review-body">
        <div class="result-review-summary">
          <div><span>購入点数</span><b>${fmt(review.line_count)}点</b></div>
          <div><span>BET総額</span><b>${fmt(event.payload?.stake_b)}B</b></div>
          <div class="${Number(event.payload?.payout_b) > 0 ? "good" : ""}"><span>払戻</span><b>${fmt(event.payload?.payout_b)}B</b></div>
          <div class="${positionMatches[0] ? "good" : ""}"><span>1着候補</span><b>${esc(matchText(positionMatches[0]))}</b></div>
          <div class="${positionMatches[1] ? "good" : ""}"><span>2着候補</span><b>${esc(matchText(positionMatches[1]))}</b></div>
          <div class="${positionMatches[2] ? "good" : ""}"><span>3着候補</span><b>${esc(matchText(positionMatches[2]))}</b></div>
          <div class="${exactHits ? "good" : ""}"><span>完全一致</span><b>${fmt(exactHits)}点</b></div>
        </div>
        <div class="result-review-candidates">
          <div><span>1着軸・候補</span><b>${esc(boatList(review.first_candidates))}</b></div>
          <div><span>2着候補</span><b>${esc(boatList(review.second_candidates))}</b></div>
          <div><span>3着候補</span><b>${esc(boatList(review.third_candidates))}</b></div>
        </div>
        <div class="result-review-basis"><b>判断と事実の比較</b><br>${esc(basisSentence)}<br>1〜3着に入った艇のカバー：${top3Coverage}/3。</div>
        <div class="result-review-facts"><table><thead><tr><th>実着順</th><th>モーター2連率</th><th>展示タイム</th><th>平均ST</th><th>全国勝率</th></tr></thead><tbody>${factsRows || '<tr><td colspan="5">事実スナップショットなし</td></tr>'}</tbody></table></div>
        <details class="result-review-lines"><summary>買い目ごとの答え合わせ（${fmt(lines.length)}点）</summary>${lineRows || '<div class="empty">買い目詳細なし</div>'}</details>
      </div>
    </article>`;
  }

  function renderEditorialResultReviews(data) {
    const host = $("editorialResultReviews");
    if (!host) return;
    const rows = (Array.isArray(data?.recentEvents) ? data.recentEvents : [])
      .filter((event) => event?.eventName === "result_settled" && Number(event?.payload?.result_review?.version) === 1)
      .slice(0, 8);
    host.innerHTML = rows.length
      ? rows.map(resultReviewCard).join("")
      : '<div class="panel empty">まだ新しいレース答え合わせデータはありません。機能反映後の3連単AIR BETが確定すると、ここへ自動で追加されます。</div>';
  }

  function renderEditorialLab(data) {
    const archive = $("editorialArchive");
    const behaviorHost = $("editorialBehavior");
    const planHost = $("editorialPlanArchive");
    if (!archive || !behaviorHost || !planHost) return;

    const overview = data.overview || {};
    const recentEvents = Array.isArray(data.recentEvents) ? data.recentEvents : [];
    const plans = Array.isArray(data.plans) ? data.plans : [];
    const editorialNames = new Set([
      "press_feedback_recorded",
      "press_preferences_saved",
      "deep_interview_theme_selected",
      "pilot_plan_selected",
    ]);
    const behaviorEvents = recentEvents.filter(event => String(event?.eventName || "").startsWith("behavior_"));
    const editorialEvents = recentEvents.filter(event => {
      const name = String(event?.eventName || "");
      return name.startsWith("behavior_") || editorialNames.has(name);
    }).slice(0, 12);
    const feedbackCount = recentEvents.filter(event => event?.eventName === "press_feedback_recorded").length;
    const planTotal = plans.reduce((sum, item) => sum + (Number(item?.count) || 0), 0);
    const days = Number(data.windowDays || state.days) || state.days;

    archive.innerHTML = [
      editorialCard("01 / MAMO VALUE", "仮想置換額", yen(overview.intendedYen), `${fmt(overview.stakeB)}Bで置換 / 直近${days}日`),
      editorialCard("02 / CURRENT RECORD", "現在の記録", `${fmt(overview.virtualBets)}回`, `AIR BET / テスター ${fmt(overview.participants)} ID`),
      editorialCard("03 / BEHAVIOR", "行動パターン", `${fmt(behaviorEvents.length)}件`, "直近ログ内の行動分析イベント。総件数ではありません。"),
      editorialCard("04 / PRESS", "あなた専用の新聞", `${fmt(feedbackCount)}件`, "直近ログ内の反応。旧設計は「事実 → 傾向 → 問い」。"),
      editorialCard("05 / PLAN", "旧購読プラン", `${fmt(planTotal)}件`, "FREE / BRONZE / SILVER / GOLD の選択集計。PILOT時の設計保管。"),
      editorialCard("06 / CAST", "編集部とAI分析担当", "4役", "加音 守 / 新人記者 / トップレーサー / マモカモ。ユーザー表示は停止中。"),
    ].join("");

    behaviorHost.innerHTML = editorialEvents.length
      ? editorialEvents.map(event => `<div class="editorial-log-row"><time>${esc(dateTime(event.occurredAt))}</time><span>${esc(event.displayId || "—")}</span><b>${esc(eventLabel(event.eventName))}</b></div>`).join("")
      : '<div class="empty">編集部・行動分析に関連する直近イベントはありません。</div>';

    const labels = { free: "FREE", bronze: "BRONZE", silver: "SILVER", gold: "GOLD", ume: "BRONZE", take: "SILVER", matsu: "GOLD" };
    const max = Math.max(1, ...plans.map(item => Number(item?.count) || 0));
    planHost.innerHTML = plans.length
      ? plans.map(item => `<div class="mini-row"><span>${esc(labels[item.plan] || String(item.plan || "").toUpperCase())}</span><div class="mini-track"><div class="mini-bar" style="width:${(Number(item.count) || 0) / max * 100}%"></div></div><b>${fmt(item.count)}</b></div>`).join("")
      : '<div class="empty">旧プラン選択データはまだありません。</div>';
    renderEditorialResultReviews(data);
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

  function financeFor(participantId) {
    return (state.finance?.participants || []).find(x => x.participantId === participantId) || null;
  }

  function financeDetailHtml(participantId) {
    const f = financeFor(participantId);
    if (!f) {
      if (state.financeError) return `<div style="margin-top:12px;padding:10px;border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#d7e2e8;font-size:9px">資金分析を取得できませんでした。</div>`; // finance unavailable
      return `<div style="margin-top:12px;padding:10px;border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#d7e2e8;font-size:9px">この期間のAIR BET資金データはまだありません。</div>`;
    }
    const balance = f.currentBalanceB == null ? "—" : `${fmt(f.currentBalanceB)}B`;
    const hitRate = Number(f.settledRecords) > 0 ? pct(f.hitRate) : "—";
    const returnRate = Number(f.stakeB) > 0 ? pct(f.returnRate) : "—";
    const net = Number(f.netB) || 0;
    const netText = `${net > 0 ? "+" : ""}${fmt(net)}B`;
    return `<div style="margin-top:14px"><small style="color:#e5bb58">AIR BET FINANCE</small><div class="pd-grid" style="margin-top:7px"><div><span>現在B残高</span><b>${esc(balance)}</b></div><div><span>総投資</span><b>${fmt(f.stakeB)}B</b></div><div><span>総払戻</span><b>${fmt(f.payoutB)}B</b></div><div><span>返還</span><b>${fmt(f.refundB)}B</b></div><div><span>収支</span><b>${esc(netText)}</b></div><div><span>判定済み</span><b>${fmt(f.settledRecords)}件</b></div><div><span>的中</span><b>${fmt(f.hitRecords)}件</b></div><div><span>的中率</span><b>${esc(hitRate)}</b></div><div><span>回収率</span><b>${esc(returnRate)}</b></div></div></div>`;
  }

  function showParticipant(participantId) {
    const p = (state.data?.participants || []).find(x => x.participantId === participantId);
    if (!p) return;
    state.selectedParticipant = participantId;
    const related = (state.data?.recentEvents || []).filter(e => e.participantId === participantId).slice(0, 12);
    const detail = $("participantDetail");
    detail.innerHTML = `<button class="close-detail" id="closeParticipant" type="button">閉じる</button><small>TESTER DETAIL</small><h3>${esc(p.displayId)}</h3><div class="pd-grid"><div><span>初回</span><b>${esc(dateTime(p.firstSeen))}</b></div><div><span>最終</span><b>${esc(dateTime(p.lastSeen))}</b></div><div><span>セッション</span><b>${fmt(p.sessions)}</b></div><div><span>AIR BET</span><b>${fmt(p.bets)}回</b></div><div><span>予定現金</span><b>${yen(p.intendedYen)}</b></div><div><span>平均衝動</span><b>${p.avgUrge == null ? "—" : esc(`${p.avgUrge}/10`)}</b></div><div><span>レビュー</span><b>${fmt(p.reviews)}</b></div><div><span>最新画面</span><b>${esc(p.latestScreen || "—")}</b></div><div><span>最新プラン</span><b>${esc(p.latestPlan || "—")}</b></div></div>${financeDetailHtml(participantId)}${related.length ? `<div style="margin-top:11px;font-size:9px;color:#a9bac4">直近：${related.map(e => `${esc(dateTime(e.occurredAt))} ${esc(eventLabel(e.eventName))}`).join(" / ")}</div>` : ""}`;
    detail.classList.remove("hidden");
    $("closeParticipant").onclick = () => { detail.classList.add("hidden"); state.selectedParticipant = null; };
  }

  function safePayload(payload) {
    if (!payload || typeof payload !== "object") return "";
    const useful = {};
    const keys = ["plan", "source", "stake_b", "intended_yen", "urge_before", "urge_after", "reason", "confidence", "result_status", "result_combo", "line_count", "bet_types", "display_mode", "result_review"];
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
    renderEditorialLab(data);
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
    state.finance = null;
    state.financeError = null;
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
