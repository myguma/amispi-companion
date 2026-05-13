# Known Issues — AmitySpirit Companion

**最終更新: 2026-05-13 (v0.3.1)**

このファイルは、daily-use beta に向けて残っている実機依存・環境依存の注意点を隠さず管理するためのもの。

## Field QA pending

| 項目 | 状態 | 備考 |
|---|---|---|
| 長時間常駐 | pending | v0.1.48以降のcompact 200x280 layoutは実機で安定確認済みだが、長時間連続起動は追加確認が必要 |
| updater実機更新 | pending | 設定画面アップデート導線とRelease workflowは確認済み。実インストール環境の更新経路は継続QA |
| Ollama未起動 / model missing | pending | UI案内は追加済み。環境別のエラー文言は継続QA |
| Voice / Whisper | pending | v0.3.1で失敗時復帰案内を強化。Windows実機のbinary/model/MIME type/権限/一時ファイル削除はfield QA pending |
| Windows transparent WebView | watch | 410px expanded windowは不採用。compact 200x280 fixedを設計制約として維持 |
| v0.2.0 daily-use beta | pending | automated checksでのbeta区切り。v0.2.0自体のfield QAは未実施 |

## Non-goals

- クラウドAI / クラウドSTT
- 常時マイク監視 / wake word
- Screen Capture / OCR
- 自動ファイル操作 / コマンド実行
- Web検索 / 外部API連携
- 長期RAG / ベクトルDB

## Current Safe Baseline

- `v0.1.48`: compact 200x280 speech layoutでキャラ描画問題を実用上解決
- `v0.1.49`: First-run Onboarding 実機QA通過
- `v0.1.50`: Memory Retention Policy 実機QA通過
- `v0.1.51`以降: 文脈反応・発話品質・発話抑制・memory exportは automated checks passed / field QA pending
- `v0.3.1`: Whisper Push-to-Talk failure recoveryは automated checks passed / field QA pending
