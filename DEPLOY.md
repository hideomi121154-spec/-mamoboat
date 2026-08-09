# v2.7 GitHub Pages 更新

ZIP内のファイルとフォルダを、GitHub Pages用リポジトリのルートへそのまま配置してください。

主な配置物:

- `index.html` / `app.js` / `core.js`
- `sw.js` / `manifest.webmanifest` / `icon.svg`
- `data/`
- `scripts/sync_official_data.py`
- `requirements.txt`
- `.github/workflows/sync-official-data.yml`
- `tests/`

配置後の手順:

1. GitHubのActionsを開く
2. `Sync BOAT RACE data` → `Run workflow` を1回実行
3. ログ末尾で開催場数・レース数・出走数・警告数を確認
4. `data/today.json` の更新コミットを確認
5. GitHub Pagesを開く
6. 設定画面で番組表・成績の同期件数を確認

Pagesはmainブランチ/root公開のままで動作します。Actionsからpushできない場合は、リポジトリのSettings → Actions → General → Workflow permissionsで書き込みを許可してください。

以前のPWAをホーム画面へ追加済みの場合は、更新後にSafariで一度ページを開き直してください。v2.7ではService Workerのキャッシュ名を更新し、`app.js`も更新対象へ追加しています。
