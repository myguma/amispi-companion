# Memory and Data Control — 無明のローカル記憶

> このドキュメントは無明がローカルに保存するデータの種類・保存先・削除方法を説明する。
> ユーザー向けの透明性のために存在し、エンジニアとユーザーの両方が参照できる。

**最終更新: 2026-05-12 (v0.1.33)**

---

## 目的

無明がローカルに記録・要約している情報をユーザーが確認し、必要なら削除・リセットできるようにする。

---

## 保存されるもの

### MemoryEvent (localStorage: `amispi_companion_events`)

| イベントタイプ | 内容 | 保存データ |
|---|---|---|
| `app_start` | アプリ起動 | timestamp |
| `character_clicked` | キャラクタータップ | fromState |
| `speech_shown` | 発話テキスト表示 | text (発話内容) |
| `state_changed` | 内部状態変化 | from, to |
| `note_saved` | メモ保存 (将来) | content |

- 最大 500件まで保存 (超過時は古いものから削除)
- ローカル `localStorage` のみ
- 外部送信: なし

### DailySummary (MemoryEvent から毎回計算)

DailySummary は localStorage に直接保存しない。
MemoryEvent から `buildDailySummary()` でオンデマンドに計算する。
そのため、MemoryEvent を削除すれば DailySummary も自動的にリセットされる。

---

## 保存されないもの (常に OFF)

| 情報 | 状態 |
|---|---|
| 生録音・音声データ | 保存しない (STT処理後即破棄) |
| スクリーンショット・画面キャプチャ | 取得しない |
| OCR全文・ファイル内容 | 取得しない |
| キーボード入力内容 | 取得しない |
| クリップボード内容 | 取得しない |
| ブラウザ閲覧履歴・URL | 取得しない |
| メール・メッセージ本文 | 取得しない |
| クラウド送信データ | 送信しない |
| 個人情報・パスワード | 取得しない |

---

## 削除できるもの

設定画面の「記憶」タブから:

| 操作 | 内容 |
|---|---|
| 発話ログのみ削除 | `speech_shown` イベントのみ削除 |
| すべての記憶を削除 | 全 MemoryEvent を削除 |

削除はすべて確認ダイアログあり。削除後は元に戻せない。

---

## アーキテクチャ

```
src/systems/memory/memoryStore.ts
  └─ logEvent()           — イベント記録
  └─ getRecentEvents()    — 最新N件取得
  └─ getAllEvents()        — 全件取得
  └─ getEventsByType()    — タイプ別取得
  └─ clearEvents()        — 全削除
  └─ clearEventsByType()  — タイプ別削除
  └─ getMemoryStats()     — 統計集計

src/companion/memory/buildMemorySummary.ts
  └─ buildMemorySummary() — CompanionContext 用サマリー生成
  └─ 空配列でも安全に動作 (削除後も壊れない)

src/companion/memory/dailySummary.ts
  └─ buildDailySummary()  — 今日の活動サマリー (MemoryEvent から毎回計算)
  └─ 空配列でも安全に動作

src/settings/pages/MemoryPage.tsx
  └─ Memory Viewer UI
```

---

## 削除後の安全性

MemoryEvent を削除した後も以下は壊れない:

- `buildMemorySummary([])` → 空の summary を返す (ゼロ値)
- `buildDailySummary([])` → sessionCountToday=0、naturalSummary="" を返す
- `PromptBuilder` → `shortNaturalSummary` が空なら何も追加しない
- `RuleProvider` → todayClickCount=0 などの値で正常動作
- `TransparencyPage` → MemorySummaryPanel が空状態を表示

---

## 将来の計画

- `tauri-plugin-store` または SQLite への移行
- per-type retention policy (例: 発話ログは7日で自動削除)
- メモリのエクスポート (JSON)
- 日単位での削除

---

## ユーザー向け説明 (設定画面「記憶」タブ)

```
無明の記憶はこのPC内にのみ保存されます。
外部には送信されません。
ここから確認・削除できます。
```
