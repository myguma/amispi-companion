# v1.6.0 Daily-use Beta Checklist

**最終更新: 2026-05-15 (v1.6.0 field QA Day 1 ready)**

このチェックリストは、v1.6.0 Daily-use Beta を release してよいかを判断するための実機QA runbookである。
v1.5.2時点では、このチェックリストは準備完了を示すだけで、実機QA通過を意味しない。

完了判定の証拠対応は `docs/V1_6_FIELD_QA_AUDIT.md` も参照する。

## 判定ルール

- 7日間の常駐記録が揃うまで v1.6.0 を完了扱いにしない
- release workflow成功だけで daily-use beta 通過とはしない
- automated checks は入口条件であり、field QA の代替ではない
- crash、不可視の外部送信、データ消失、更新不能、監視境界の誤表示が出たら v1.5.x hotfix に戻る
- 実機QAで確認できなかった項目は `pending` として残す

## Preflight

各QA開始前に確認する。

まず read-only preflight を実行する。

```bash
npm run qa:preflight
```

このコマンドは実機QAを通過扱いにしない。branch、working tree、version整合、latest tag、Release workflow、release assets、known issuesの入口状態だけを確認する。

| 項目 | 状態 | 確認方法 |
|---|---|---|
| read-only preflight | passed | 2026-05-15: `npm run qa:preflight` が failures 0 / warnings 0 |
| branch | passed | `main` |
| working tree | passed | clean |
| version files | passed | `package.json` / `Cargo.toml` / `tauri.conf.json` が `1.5.4` で一致 |
| latest tag | passed | `v1.5.4` |
| release workflow | passed | `v1.5.4` Release workflow success |
| release assets | passed | installer / `.sig` / `latest.json` を確認 |
| known issues | passed | v1.5.4 field QA pending と 1-week residency QA pending を維持 |

## Automated Checks

v1.6.0 release候補ごとに必ず実行する。

| コマンド | 状態 | 通過条件 |
|---|---|---|
| `npm run build` | pending | TypeScript / Vite build成功 |
| `cd src-tauri && cargo build && cd ..` | pending | Tauri Rust build成功 |
| `cd src-tauri && cargo test observation::tests -- --nocapture && cd ..` | pending | observation tests成功 |
| `git diff --check` | pending | whitespace errorなし |

## 7日間常駐QA

各日、`docs/FIELD_QA_NOTES.md` に記録する。

| Day | 状態 | 最低確認時間 | 重点 |
|---|---|---:|---|
| Day 1 | pending | 2h | 起動、基本操作、Debug / Diagnostics visibility。記録欄は `docs/FIELD_QA_NOTES.md` |
| Day 2 | pending | 2h | OpenAIなし、Ollama未起動、RuleProvider fallback |
| Day 3 | pending | 2h | Memory v2 edit/delete/export/import |
| Day 4 | pending | 2h | Observation visibility、custom app classification |
| Day 5 | pending | 2h | filename samples明示ON/OFF、非保存/非送信 |
| Day 6 | pending | 2h | updater / installer実機経路 |
| Day 7 | pending | 2h | 通常作業中のcomfort、speech quality、critical issueなし |

### 日次記録テンプレート

テンプレートは以下でも表示できる。このコマンドはread-onlyで、docsを編集せず、QAをpassed扱いにしない。

```bash
npm run qa:day-note -- 1
```

```md
### v1.6.0 Daily-use QA Day N

- 日付:
- 実行時間:
- 起動経路: installer / updater / dev build
- QA対象: release artifact / main dev build
- AI provider構成: OpenAI / Ollama / RuleProvider
- 主要作業:
- crash / freeze:
- updater / installer:
- memory export/import:
- observation / diagnostics:
- filename samples:
- 気になった発話:
- critical issue:
- Day N判定: pending / passed / failed
- 次の対応:
```

### Field QA status gate

現在のQA通過状態は以下で確認できる。このコマンドはread-onlyで、v1.6.0 version files/tag、release docs、Release workflow/artifacts、Automated Checks、Day 1〜7、日次記録の `Day N判定` と2時間以上の実行時間、Product Gates、Privacy Boundary Regression Checks、Known Issues の pending を検出する。
実機QAが揃うまでは非ゼロ終了するのが正しい挙動であり、QAをpassed扱いにしない。

```bash
npm run qa:field-status
```

## Product Gates

| Gate | 状態 | 通過条件 |
|---|---|---|
| 起動安定性 | pending | 7日間でcrash / freeze / 操作不能がない |
| installer | pending | v1.6.0 installerで新規/上書きインストールができる |
| updater | pending | 既存installからupdateでき、`latest.json` と署名検証で失敗しない |
| OpenAIなし | pending | API key未設定またはquota不足でもアプリ全体が破綻しない |
| OpenAIあり | pending | provider/model/statusと外部送信範囲がDebug / Diagnosticsで見える |
| Ollama fallback | pending | Ollama未起動 / model missing / timeout時に原因とfallback先が見える |
| RuleProvider fallback | pending | 外部AIなしでも短く自然な発話になり、sourceを追える |
| ReactionIntent | pending | autonomous / manual / observation reactionのintentが追跡できる |
| 発話品質 | pending | 短時間で同じ低品質文が連発しない |
| Memory v2 | pending | 保存メモの一覧・編集・削除・pin・category・export/importが動く |
| Memory privacy | pending | transcript / text input / raw filename が勝手にlong-term memory化されない |
| Observation visibility | pending | 何を見ているか、見ていないかがUIで確認できる |
| Storage visibility | pending | 何を保存しているか、保存していないかがUIで確認できる |
| Filename samples | pending | 明示ON時だけ揮発表示され、export / Timeline / OpenAI payloadにraw filenameが入らない |
| Diagnostics | pending | provider/model/intent/fallback/suppression reasonが主要経路で追跡できる |
| UI comfort | pending | 変な監視アプリに見えず、常駐して邪魔になりすぎない |

## Privacy Boundary Regression Checks

以下が1つでも崩れたら v1.6.0 へ進まない。

実機確認の補助として、source上の明白な禁止API参照は以下でread-only確認できる。このコマンドはfield QAをpassed扱いにしない。

```bash
npm run qa:privacy
```

| 境界 | 状態 | 通過条件 |
|---|---|---|
| 常時マイク監視なし | pending | Push-to-Talk以外で録音しない |
| Screen Capture / OCRなし | pending | 実装・UI・docsで非目標として維持 |
| raw filename external sendなし | pending | OpenAI payload previewで `rawFilenamesSent=false` |
| file content readなし | pending | folder scan / filename samplesでfile contentを読まない |
| transcript履歴保存なし | pending | Memory export / localStorageにtranscript履歴が入らない |
| API key全文表示なし | pending | UI / logs / exportにAPI key全文が出ない |
| hidden external sendなし | pending | 外部AI送信範囲がAIPage / Debug / Diagnosticsで見える |

## Release Criteria for v1.6.0

v1.6.0 release候補は以下をすべて満たすこと。

1. 7日間常駐QAの日次記録がある
2. Product Gates がすべて `passed` または明示的に許容済みである
3. Privacy Boundary Regression Checks がすべて `passed`
4. `docs/KNOWN_ISSUES.md` にcritical issueが残っていない
5. `npm run build` 成功
6. `cargo build` 成功
7. `git diff --check` 成功
8. main push成功
9. annotated tag push成功
10. Release workflow success確認
11. Windows Installer artifact確認
12. `latest.json` / updater artifact確認
