# まもボート v3.6 アップロード手順

v3.5をまだアップロードしていなくても、このv3.6セットだけで更新できます。

## 1. リポジトリ直下

GitHubのリポジトリ最初の画面で `Add file` → `Upload files` を押し、次の5ファイルを上書きします。

1. `index.html`
2. `styles.css`
3. `app.js`
4. `sw.js`
5. `README.md`

## 2. 同期スクリプト

GitHubで `scripts` フォルダを開き、`Add file` → `Upload files` から `sync_official_data.py` を上書きします。

## 3. Actions設定

GitHubで `.github` → `workflows` を開き、`Add file` → `Upload files` から `sync-official-data.yml` を上書きします。

## 4. 初回実行

`Actions` → `Sync BOAT RACE data` → `Run workflow` を1回実行します。

更新後も古い画面の場合は、Safariでページを再読込してください。ホーム画面版は一度終了して開き直すとv3.6へ更新されます。

v3.6では複数買い、全点金額の一括変更、公式オッズへの即時導線、オッズ入力時刻、結果の即時再確認を追加しています。
