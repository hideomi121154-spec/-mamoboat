/*
 * まもボート パイロット設定
 *
 * GitHub Pagesでは受信サーバーを持てないため、中央集計を使う場合だけ
 * collector を設定します。Supabaseの匿名キーは公開クライアント用ですが、
 * 必ず supabase/mamoboat_pilot.sql の「INSERTのみ許可」のRLSと組み合わせてください。
 */
window.MAMOBOAT_PILOT = Object.freeze({
  studyId: "mamoboat-pilot-v1",
  collector: Object.freeze({
    enabled: false,
    endpoint: "",
    anonKey: "",
  }),
  rewards: Object.freeze([
    Object.freeze({
      id: "double-win-partner-sample",
      active: false,
      kind: "double-win",
      sponsor: "提携店舗名",
      title: "トッピング無料",
      description: "今日の防衛勝負でB的中し、アプリ内の防衛条件を達成した方への限定特典です。",
      code: "",
      url: "",
      expiresAt: "",
      terms: "1日1回・他券併用不可など、提携条件をここへ記載",
    }),
    Object.freeze({
      id: "defense-five-partner-sample",
      active: false,
      kind: "defense-5",
      sponsor: "提携店舗名",
      title: "防衛スタンプ5個特典",
      description: "外れても現金を守った行動を5回続けた方への限定特典です。",
      code: "",
      url: "",
      expiresAt: "",
      terms: "1人1回・換金不可など、提携条件をここへ記載",
    }),
  ]),
});
