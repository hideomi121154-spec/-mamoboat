/*
 * MAMO BOAT パイロット設定
 * GitHub Pagesでは受信サーバーを持てないため、中央集計はSupabaseへ送信します。
 */
window.MAMOBOAT_PILOT = Object.freeze({
  studyId: "mamoboat-pilot-v1",
  collector: Object.freeze({
    enabled: true,
    transport: "rpc",
    endpoint: "https://mihicuoijitluvrufsoj.supabase.co/rest/v1/rpc/ingest_pilot_events",
    publishableKey: "sb_publishable_cexgWfIKzthZ1d6tLOH3_g_sWgcunHB",
  }),
  rewards: Object.freeze([
    Object.freeze({ id: "double-win-partner-sample", active: false, kind: "double-win", sponsor: "提携店舗名", title: "トッピング無料", description: "今日の防衛勝負でB的中し、アプリ内の防衛条件を達成した方への限定特典です。", code: "", url: "", expiresAt: "", terms: "1日1回・他券併用不可など、提携条件をここへ記載" }),
    Object.freeze({ id: "defense-five-partner-sample", active: false, kind: "defense-5", sponsor: "提携店舗名", title: "防衛スタンプ5個特典", description: "外れても現金を守った行動を5回続けた方への限定特典です。", code: "", url: "", expiresAt: "", terms: "1人1回・換金不可など、提携条件をここへ記載" }),
  ]),
});

/* v4.0.1 cast refresh — names/roles are applied here so the existing app logic stays untouched. */
(() => {
  const applyCastRefresh = () => {
    const analysis = document.getElementById("analysis");
    if (!analysis) return;

    const heading = analysis.querySelector(".section-head h2");
    if (heading && heading.textContent.includes("編集部の3人")) heading.textContent = "MAMO BOAT PRESSの3人";

    const cards = analysis.querySelectorAll(".newsroom-cast .cast-card");
    if (cards.length >= 3) {
      const setCard = (card, mark, role, name, body, cls) => {
        card.classList.add("cast-refresh", cls);
        card.innerHTML = `<span class="cast-avatar cast-avatar-refresh">${mark}</span><div><small>${role}</small><h3>${name}</h3><p>${body}</p></div>`;
      };
      setCard(cards[0], "守", "競艇担当記者・編集部デスク", "加音 守", "勝敗を予想せず、あなたが勝負を選んだ過程を取材する。", "mamoru-refresh");
      setCard(cards[1], "美", "読者担当・新人記者", "木月 美留", "気づき、見る。読者と同じ目線で疑問を拾い、記録を読み解く。", "miru-refresh");
      setCard(cards[2], "瞬", "守の幼なじみ・トップレーサー", "一曲 瞬", "1マークを瞬時に切るトップレーサー。準備と自己管理を体現する。", "shun-refresh");
    }

    const intro = analysis.querySelector(".analysis-intro img");
    if (intro) {
      intro.style.display = "none";
      analysis.querySelector(".analysis-intro")?.classList.add("cast-hero-placeholder", "mamoru-hero-placeholder");
    }

    document.querySelectorAll("img[src='mamoru-hero.webp']").forEach((img) => {
      if (!img.closest("#analysis")) img.style.visibility = "hidden";
    });

    const onboardTag = document.querySelector(".onboard-racer-tag span");
    if (onboardTag) onboardTag.textContent = "一曲 瞬 / 加音 守の幼なじみ";

    if (!document.getElementById("castRefreshStyle")) {
      const style = document.createElement("style");
      style.id = "castRefreshStyle";
      style.textContent = `
        .cast-avatar-refresh{width:54px;height:54px;flex:0 0 54px;border-radius:9px;font-size:15px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.55)}
        .cast-card.cast-refresh h3{font-size:15px;margin-top:3px}.cast-card.cast-refresh p{font-size:9px;line-height:1.55}
        .mamoru-refresh{border-top-color:#04b7c5}.miru-refresh{border-top-color:#d9a94c}.shun-refresh{border-top-color:#f26b65}
        .miru-refresh .cast-avatar-refresh{background:#a17810}.shun-refresh .cast-avatar-refresh{background:#f26b65}
        .cast-hero-placeholder{min-height:195px;padding-right:42%;}
        .cast-hero-placeholder::before{content:"加音 守";position:absolute;right:4%;bottom:22px;z-index:2;font-size:34px;font-weight:1000;color:#05233e;letter-spacing:-.08em}
        .cast-hero-placeholder::after{content:"KANЕ MAMORU / BOAT RACE REPORTER";position:absolute;right:4%;bottom:8px;z-index:2;color:#008d9a;font-size:8px;font-weight:900;letter-spacing:.1em;background:none;opacity:1}
        body:not([data-screen="analysis"]) .page-intro img[style*="visibility: hidden"], .home-masthead .masthead-character[style*="visibility: hidden"]{display:none!important}
      `;
      document.head.appendChild(style);
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applyCastRefresh, { once: true });
  else applyCastRefresh();
})();
