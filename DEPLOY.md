# v2.6 GitHub Pages 更新

リポジトリのルートへZIP内のファイル/フォルダをそのまま配置してください。特に次が必要です。

- index.html
- core.js
- sw.js
- manifest.webmanifest
- icon.svg
- data/
- scripts/
- requirements.txt
- .github/workflows/sync-official-data.yml

配置後、GitHubの **Actions → Sync BOAT RACE data → Run workflow** を実行します。
成功すると `data/today.json` と日付別JSONが更新されます。Pagesはmain/root設定のままで構いません。

PWAを以前ホーム画面へ追加済みの場合、更新後にSafariで一度ページを開き直してください。v2.6はservice workerのキャッシュ名を変更してあります。
