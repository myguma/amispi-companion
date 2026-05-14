# Known Issues — AmitySpirit Companion

**最終更新: 2026-05-14 (v1.1.1)**

このファイルは、daily-use beta に向けて残っている実機依存・環境依存の注意点を隠さず管理するためのもの。

## Field QA pending

| 項目 | 状態 | 備考 |
|---|---|---|
| 長時間常駐 | pending | v0.1.48以降のcompact 200x280 layoutは実機で安定確認済みだが、長時間連続起動は追加確認が必要 |
| updater実機更新 | pending | 設定画面アップデート導線とRelease workflowは確認済み。実インストール環境の更新経路は継続QA |
| Ollama未起動 / model missing | pending | UI案内は追加済み。環境別のエラー文言は継続QA |
| Voice / Whisper | pending | v1.0.4でsession isolation、interaction trace、voice/text観測質問routerを追加。会話品質はfield QA pending |
| Windows transparent WebView | watch | 410px expanded windowは不採用。compact 200x280 fixedを設計制約として維持 |
| v0.2.0 daily-use beta | pending | automated checksでのbeta区切り。v0.2.0自体のfield QAは未実施 |
| v1.0.0-rc.1 release candidate | pending | 新機能追加なしのRC。field QAは未実施 |
| v1.0.0 stable | passed | 起動、compact character layout、settings、memory、update、debug、transparency、right click、click-throughはfield QA通過 |
| v1.0.1 hotfix | pending | UpdateBadge右下配置とFFmpeg変換はfield QA pending |
| v1.0.2 hotfix | passed | transcript previewによりWhisperが聞こえていることを確認。残問題はv1.0.3でhotfix |
| v1.0.3 hotfix | pending | voice返答上書き防止、`[BLANK_AUDIO]` rejection、観測質問応答、末尾「ん」抑制は継続QA |
| v1.0.4 hotfix | pending | session isolation、settings consistency、Interaction trace、text input、UpdateBadge足元配置はfield QA pending |
| v1.0.5 hotfix | pending | prompt汚染修正、hearing_test local router、autonomous speech pacing、safetyCapはfield QA pending |
| v1.0.6 | pending | Whisper言語指定(-l ja)、sleep発話、filename-derived signalsはfield QA pending |
| v1.0.7 | pending | Observation Timeline、Observation Center、observationLevelはfield QA pending |
| v1.0.8 | pending | Memory Mode、長期記憶候補、記録層の明示化はfield QA pending |
| v1.1.0 | pending | ObservationSignal層、Watchful Mode、診断ページはfield QA pending |
| v1.1.1 | pending | Watchful preset同期・sleep発話修正・Timeline同期・note一覧/削除・filename UI修正はfield QA pending |

## Non-goals

- クラウドAI / クラウドSTT
- 常時マイク監視 / wake word
- Screen Capture / OCR
- 自動ファイル操作 / コマンド実行
- Web検索 / 外部API連携
- 長期RAG / ベクトルDB

## Design Notes (v1.0.6+)

- STT言語（whisperLanguage）とAI返答言語は別概念。返答言語は日本語固定。
- filename-derived signalsはローカル内部でファイル名を見るが、raw filenameは返さず・保存せず。
- sleep発話はsleep状態中のみ。quiet/DND/autonomousSpeechEnabled=falseで停止。

## Current Safe Baseline

- `v0.1.48`: compact 200x280 speech layoutでキャラ描画問題を実用上解決
- `v0.1.49`: First-run Onboarding 実機QA通過
- `v0.1.50`: Memory Retention Policy 実機QA通過
- `v0.1.51`以降: 文脈反応・発話品質・発話抑制・memory exportは automated checks passed / field QA pending
- `v0.3.1`: Whisper Push-to-Talk failure recoveryは automated checks passed / field QA pending
- `v1.0.0-rc.1`: release candidate docs整理。field QA pendingを隠さない
- `v1.0.0`: stable tag。automated checks必須、field QA not performedを明記
