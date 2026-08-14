# MAMO BOAT 中央集計

## 利用者側

1. 各テスターへ重複しない番号を割り当てます。例：`P01`、`P02`、`P03`、`P04`
2. 設定画面でテスター番号を入力します。
3. 本人が説明を確認したうえで「匿名の行動イベント送信に同意する」をONにします。
4. 「計測設定を保存」を押します。
5. 「中央集約：送信済み」と最終送信時刻が表示されれば送信完了です。

不同意でもAIR BET、端末内の記録、MAMO編集部は利用できます。氏名、メールアドレス、自由記述、決済情報、端末広告IDは中央送信しません。

## 管理者側

Supabase SQL Editorで次を実行すると全体状況を確認できます。

```sql
select *
from private.pilot_overview
order by study_id;
```

テスター別・日別の行動指標は次で確認できます。

```sql
select *
from private.pilot_participant_daily
order by day_jst desc, participant_id;
```

個人の元イベントが必要な場合だけ、管理者として対象番号と期間を限定して確認します。

```sql
select participant_id, occurred_at, event_name, payload
from public.pilot_events
where participant_id = 'P01'
order by occurred_at desc
limit 200;
```

## 安全境界

- Webアプリに入っているのは公開用publishable keyだけです。
- secret key、service role key、データベースパスワードはWebアプリへ保存しません。
- 公開クライアントは元テーブルと集計ビューを読めません。
- 受付関数は1回100件まで、payloadは1件8KBまでです。
- 重複したevent_idは追加せず、安全に再送できます。
- 同意をOFFにすると、その端末からの以後の送信は停止します。
