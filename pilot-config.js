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
  rewards: Object.freeze([]),
});

const MAMO_SCRIPTS = [
  ["cast-ui.js?v=20260815-8","cast"],
  ["ai-safe.js?v=20260816-1","ai-safe"],
  ["official-link.js?v=20260816-1","official-link"],
  ["decision-intelligence.js?v=20260816-1","decision-intel"],
  ["baseline-intelligence.js?v=20260816-1","baseline-intel"],
  ["trigger-intelligence.js?v=20260816-1","trigger-intel"],
  ["press-intelligence.js?v=20260816-1","press-intel"],
];
MAMO_SCRIPTS.forEach(([src,key])=>{if(document.querySelector(`script[data-mamo-module="${key}"]`))return;const s=document.createElement("script");s.src=src;s.defer=true;s.dataset.mamoModule=key;document.head.appendChild(s)});
