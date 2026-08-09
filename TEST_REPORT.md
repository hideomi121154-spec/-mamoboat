# TEST REPORT v2.6

- `node --check core.js`: OK
- `node --check app.js`: OK
- `node tests/logic.test.js`: OK — logic tests OK
- `python -m py_compile scripts/sync_official_data.py`: OK
- `python tests/test_sync_transform.py`: OK — sync transform tests OK
- `data/today.json`: JSON parse OK / 24場
- 通常精算: 1-3-5 / 1000C / 払戻4820円 → 48,200C をテスト
- 同着想定: 3連単払戻2組を同時に精算するケースをテスト
- 日付不一致データでは精算しないことをテスト
- 同期変換: 6艇・2種類の3連単払戻をfixtureでテスト

## 未実行
- GitHub Actions上からBOAT RACE公式LZHを実際に取得するネットワーク試験。これはユーザーのGitHubへ配置後に1回Run workflowして確認する。
- iPhone Safariでの最終実機タップ試験。