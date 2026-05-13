# v1.0.0-rc.1 Release Candidate Checklist

**最終更新: 2026-05-13 (v1.0.0-rc.1)**

v1.0.0-rc.1 は新機能追加ではなく、daily-use beta から stable 候補へ進むための整理版。
automated checks は実施するが、実機依存項目は field QA pending として扱う。

## Automated Checks

| 項目 | 状態 |
|---|---|
| `npm run build` | passed locally before tag |
| `cargo build` | passed locally before tag |
| Release workflow | required after tag |
| Version files | `1.0.0-rc.1` |
| Docs / changelog | updated |
| Prerelease tag support | workflow updated for `v1.0.0-rc.1` |

## Stable Baseline

| 項目 | 状態 | 備考 |
|---|---|---|
| compact `200x280` fixed window | field QA passed in v0.1.48 | 410px expandedは不採用 |
| speech表示時もwindow heightを変えない | field QA passed in v0.1.48 | dynamic resize復活禁止 |
| idle / speech / drag / speech中drag | field QA passed in v0.1.48 | RCでは変更なし |
| click-through / right click | field QA passed in v0.1.49 | RCでは変更なし |
| First-run Onboarding | field QA passed in v0.1.49 | RCでは変更なし |
| Memory Retention Policy | field QA passed in v0.1.50 | RCでは変更なし |
| Settings Update / Debug / Transparency | automated checks passed | 実インストール更新は継続QA |

## RC Scope

- ローカルファーストな観察型コンパニオン
- Ollama / RuleProvider / fallbackによる短い反応
- Active App分類とTransparency UI
- ローカルMemoryEventの表示 / 削除 / retention / JSON export
- Push-to-Talk Whisper CLI MVP
- 設定画面アップデート導線
- DebugMode / Known Issues / field QA tracking

## Non-goals Confirmed

- クラウドAI / クラウドSTTなし
- 常時マイク監視 / wake wordなし
- Screen Capture / OCRなし
- 自動ファイル操作 / コマンド実行なし
- Web検索 / 外部API連携なし
- 長期RAG / ベクトルDBなし
- TTSなし
- 410px expanded window復活なし

## Field QA Pending

1. Windows実機でのv1.0.0-rc.1全体確認
2. 30分以上の常駐
3. 実インストール環境のupdate
4. Ollama未起動 / model missing案内
5. Whisper binary/model/path/MIME type/マイク権限/一時ファイル削除
6. Memory export JSONの実ファイル保存
7. Emotion sprite fallbackの見た目
