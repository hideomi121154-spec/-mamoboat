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

/* v4.0.1 cast refresh — visual-only patch. AIR BET / wallet / result logic is untouched. */
(() => {
  const ART = "cast-atlas.webp?v=2";

  const applyCastRefresh = () => {
    const analysis = document.getElementById("analysis");
    if (!analysis) return;

    const heading = analysis.querySelector(".section-head h2");
    if (heading && heading.textContent.includes("編集部の3人")) {
      heading.textContent = "MAMO BOAT PRESSの3人";
    }

    const cards = analysis.querySelectorAll(".newsroom-cast .cast-card");
    if (cards.length >= 3) {
      const setCard = (card, role, name, body, cls) => {
        card.className = `cast-card cast-refresh ${cls}`;
        card.innerHTML = `<span class="cast-avatar cast-avatar-refresh" aria-hidden="true"></span><div><small>${role}</small><h3>${name}</h3><p>${body}</p></div>`;
      };
      setCard(cards[0], "競艇担当記者・編集部デスク", "加音 守", "勝敗を予想せず、あなたが勝負を選んだ過程を取材する。", "mamoru-refresh");
      setCard(cards[1], "読者担当・新人記者", "木月 美留", "気づき、見る。読者と同じ目線で疑問を拾い、記録を読み解く。", "miru-refresh");
      setCard(cards[2], "守の幼なじみ・トップレーサー", "一曲 瞬", "1マークを瞬時に切るトップレーサー。準備と自己管理を体現する。", "shun-refresh");
    }

    /* Old blue-eyed placeholder artwork is replaced everywhere it was reused. */
    document.querySelectorAll("img[src='mamoru-hero.webp']").forEach((img) => {
      img.src = ART;
      img.classList.add("cast-atlas-hero");
      if (img.closest("#analysis")) img.alt = "加音 守、木月 美留、一曲 瞬";
      else img.alt = "MAMO BOAT PRESSのキャラクター";
    });

    const onboardTag = document.querySelector(".onboard-racer-tag span");
    if (onboardTag) onboardTag.textContent = "一曲 瞬 / 加音 守の幼なじみ";

    if (!document.getElementById("castRefreshStyle")) {
      const style = document.createElement("style");
      style.id = "castRefreshStyle";
      style.textContent = `
        .newsroom-cast{grid-template-columns:1.15fr .95fr 1.05fr;gap:10px}
        .cast-card.cast-refresh{min-height:118px;align-items:center;overflow:hidden}
        .cast-card.cast-refresh h3{font-size:16px;margin:3px 0 5px}
        .cast-card.cast-refresh p{font-size:9px;line-height:1.55}
        .cast-avatar-refresh{width:72px;height:86px;flex:0 0 72px;border-radius:8px;background-image:url('${ART}');background-repeat:no-repeat;background-size:300% 100%;box-shadow:0 2px 7px rgba(5,35,62,.18);color:transparent}
        .mamoru-refresh{border-top-color:#04b7c5}.mamoru-refresh .cast-avatar-refresh{background-position:0 0}
        .miru-refresh{border-top-color:#d9a94c}.miru-refresh .cast-avatar-refresh{background-position:50% 0}
        .shun-refresh{border-top-color:#f26b65}.shun-refresh .cast-avatar-refresh{background-position:100% 0}
        .cast-atlas-hero{visibility:visible!important;display:block!important;mix-blend-mode:normal!important;filter:none!important;object-fit:cover!important;object-position:center 42%!important;transform:none!important}
        .analysis-intro .cast-atlas-hero,.record-intro .cast-atlas-hero,.compact-intro .cast-atlas-hero{width:54%!important;height:150%!important;right:-2%!important;bottom:-30%!important;object-position:center!important}
        .home-masthead .cast-atlas-hero{width:100%!important;height:100%!important;object-position:center!important}
        .onboard-panel[data-onboard='0'] .cast-atlas-hero{width:64%!important;height:70%!important;right:-2%!important;bottom:28px!important;object-fit:cover!important}
        @media(max-width:620px){.newsroom-cast{grid-template-columns:1fr}.cast-avatar-refresh{width:82px;height:98px;flex-basis:82px}}
      `;
      document.head.appendChild(style);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyCastRefresh, { once: true });
  } else {
    applyCastRefresh();
  }
})();
