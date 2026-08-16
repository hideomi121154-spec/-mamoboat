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

/* Character UI is isolated from pilot collection and betting logic. */
(() => {
  const script = document.createElement("script");
  script.src = "cast-ui.js?v=20260815-8";
  script.defer = true;
  script.addEventListener("load", () => {
    const hotfix = document.createElement("script");
    hotfix.src = "cast-hotfix.js?v=20260815-8";
    hotfix.defer = true;
    document.head.appendChild(hotfix);
  }, { once: true });
  document.head.appendChild(script);
})();

/* Safe AI behavior layer: loaded once, passive only. */
(() => {
  if (document.querySelector('script[data-mamo-ai-safe="1"]')) return;
  const script = document.createElement("script");
  script.src = "ai-safe.js?v=20260816-1";
  script.defer = true;
  script.dataset.mamoAiSafe = "1";
  document.head.appendChild(script);
})();

/* Persistent BOAT RACE official link: separate from LIVE and REAL投票. */
(() => {
  if (document.querySelector('script[data-mamo-official-link="1"]')) return;
  const script = document.createElement("script");
  script.src = "official-link.js?v=20260816-1";
  script.defer = true;
  script.dataset.mamoOfficialLink = "1";
  document.head.appendChild(script);
})();

/* Decision intelligence: skip detection + 30-minute pre-REAL action sequence. */
(() => {
  if (document.querySelector('script[data-mamo-decision-intel="1"]')) return;
  const script = document.createElement("script");
  script.src = "decision-intelligence.js?v=20260816-1";
  script.defer = true;
  script.dataset.mamoDecisionIntel = "1";
  document.head.appendChild(script);
})();

/* Personal baseline: compare today only with the user's own past behavior. */
(() => {
  if (document.querySelector('script[data-mamo-baseline-intel="1"]')) return;
  const script = document.createElement("script");
  script.src = "baseline-intelligence.js?v=20260816-1";
  script.defer = true;
  script.dataset.mamoBaselineIntel = "1";
  document.head.appendChild(script);
})();
