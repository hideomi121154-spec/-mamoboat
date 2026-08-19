# MAMO BOAT 意思決定イベントログ v1

## 目的

MAMO BOATの中央集計を、単なるAIR BET履歴ではなく「人が迷い、見送り、判断を変えた過程」を後から再構成できるデータへ拡張する。

既存の `public.pilot_events` / `ingest_pilot_events` をそのまま利用し、新しい個人情報は追加しない。

## 原則

- 観測した事実とAIの推定を混ぜない。
- 「危険」「依存症」などの診断ラベルをイベントに保存しない。
- 氏名、メール、決済情報、広告ID、自由記述本文を中央送信しない。
- 既存の編集部描画・プラン変更処理には触れない。
- イベント名は `decision-event-schema.js` を正とする。

## 既存イベント（そのまま活用）

### `bet_review_opened`
AIR BET確定前の確認画面を開いた。

主な値:
- `line_count`
- `stake_b`

### `virtual_bet_placed`
AIR BETを確定した。

主な値:
- `record_id`
- `line_count`
- `bet_types`
- `bet_mode`
- `stake_b`
- `intended_yen`
- `confidence`
- `urge_before`
- `reason`
- `seconds_to_close`
- `odds_lines_available`

### `post_race_urge_recorded`
レース後の気持ちを記録した。

主な値:
- `record_id`
- `urge_before`
- `urge_after`
- `chase_urge_after`
- `cash_would_have_won_urge`
- `result_status`

## v1で追加するイベント

### `decision_skip_recorded`
「参加したかったが見送った」を明示的に記録する。

payload:
- `reason_code`
- `urge_level` (任意)
- `planned` (任意)
- `previous_decision` (任意)
- `seconds_to_close` (任意)

### `decision_real_intent_opened`
REAL投票導線を開いた事実を記録する。

payload:
- `source`
- `record_id` (AIR BET後なら任意)
- `stake_b_reference` (任意)
- `urge_reference` (任意)

注意: 実際に現金投票したとは推定しない。

### `decision_changed`
同一セッション・同一レース内で判断が変化したことを記録する。

payload:
- `from`
- `to`
- `trigger`
- `elapsed_seconds`
- `record_id` (任意)

候補: `air_bet`, `real_intent`, `skip`, `leave`

### `decision_intervention_shown`
MAMOが行動変化を示す情報を表示した事実を記録する。

payload:
- `intervention_id`
- `intervention_type`
- `basis_keys`
- `baseline_window`

### `decision_intervention_result`
介入後に観測できた次の行動を記録する。

payload:
- `intervention_id`
- `result`
- `elapsed_seconds`
- `record_id` (任意)

result候補: `air_bet`, `skip`, `real_intent`, `dismissed`, `unknown`

## v1で分析可能になること

1. AIR BET前後で欲求がどう変わるか。
2. 不的中後に次の意思決定までの時間が短くなるか。
3. BET額増加と欲求増加が同時に起きるか。
4. 見送りやすい条件は何か。
5. REAL導線へ移動する直前にどんな行動があるか。
6. MAMOの表示後にAIR BET・見送り・REAL意図のどれへ移るか。

## 実装順

1. イベント名の共通定義をロードする。
2. REAL投票導線のクリック箇所へ `decision_real_intent_opened` を追加。
3. 既存UIを壊さない小さな「今回は見送る」記録導線を追加。
4. 同一レース内の直前意思決定を端末内だけで保持し、変化時に `decision_changed` を記録。
5. MAMOの介入表示にIDを付与し、表示とその後の行動を結ぶ。
6. Supabase側は既存 `pilot_events` の event_name/payload で受ける。新テーブルは作らない。

## 成功条件

- AIR BETの既存操作に回帰がない。
- iPhone Safari / PWAで編集部の位置安定化に影響を与えない。
- 同意OFFでは中央送信されない。
- REAL導線を開いたことと実購入を混同しない。
- 見送り理由はワンタップ中心で、毎回回答を強制しない。
