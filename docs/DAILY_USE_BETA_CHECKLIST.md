# v0.2.0 Daily-use Beta Checklist

**最終更新: 2026-05-13 (v0.2.0)**

v0.2.0 は「daily-use beta」として、ローカルファーストな観察型コンパニオンを日常利用に近い形で試せる区切り。
このチェックリストは automated checks と field QA の差分を明確にするために使う。

## Automated Checks

| 項目 | 状態 |
|---|---|
| `npm run build` | passed |
| `cargo build` | passed |
| Release workflow | passed / tagごとに確認 |
| Version files | checked |
| Changelog / docs | updated |

## Core Behavior

| 項目 | 状態 | 備考 |
|---|---|---|
| compact `200x280` fixed window | field QA passed in v0.1.48 | v0.2.0では変更なし |
| speech表示時もwindow heightを変えない | field QA passed in v0.1.48 | 410px expandedは不採用 |
| idle / speech / drag / speech中drag表示 | field QA passed in v0.1.48 | v0.2.0では変更なし |
| click-through | field QA passed in v0.1.49 | v0.2.0では変更なし |
| 右クリックメニュー | field QA passed in v0.1.49 | DebugOverlay重なり修正済み |
| voice long press入口 | field QA passed for UI reaction | Whisper実接続は未完成 |

## Settings / Transparency

| 項目 | 状態 |
|---|---|
| First-run Onboarding | field QA passed in v0.1.49 |
| UpdatePage | automated checks passed / field QA pending for real installed update |
| DebugPage / DebugOverlay | field QA passed for display; v0.2.0変更なし |
| TransparencyPage / Active App | field QA passed in v0.1.39以降 |
| MemoryPage retention | field QA passed in v0.1.50 |
| Memory JSON export | automated checks passed / field QA pending |

## AI / Reactions

| 項目 | 状態 |
|---|---|
| Ollama default `http://127.0.0.1:11434` | maintained |
| `source: ollama` | maintained, field QA recommended after v0.1.52 QualityFilter hardening |
| DailySummary context reactions | automated checks passed / field QA pending |
| Reaction quality hardening | automated checks passed / field QA pending |
| quiet / focus / DND hardening | automated checks passed / field QA pending |

## Non-goals Confirmed

- クラウドAIなし
- クラウドSTTなし
- 常時マイク監視なし
- Screen Capture / OCRなし
- 自動ファイル操作なし
- Web検索 / 外部API連携なし
- 長期RAG / ベクトルDBなし
- TTSなし

## Minimum Human QA for v0.2.0

1. 30分以上起動してキャラ表示が崩れないか
2. idle / speech / drag / speech中drag が正常か
3. click-through / 右クリック / voice long press が正常か
4. Ollamaあり/なし両方で破綻しないか
5. quiet / focus / DND が意図通り静かか
6. Memory retention / export / delete が正常か
7. updaterが実インストール環境で動くか
