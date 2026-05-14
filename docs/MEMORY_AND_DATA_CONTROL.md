# Memory and Data Control — 無明のローカル記憶

> このドキュメントは無明がローカルに保存するデータの種類・保存先・削除方法を説明する。
> ユーザー向けの透明性のために存在し、エンジニアとユーザーの両方が参照できる。

**最終更新: 2026-05-15 (v1.4.0)**

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
| `note_saved` | ユーザーが明示保存したメモ | text, category, pinned, includeInPrompt, updatedAt |

- 最大 500件まで保存 (超過時は古いものから削除)
- 保存期間設定により、古い MemoryEvent を自動整理
- ローカル `localStorage` のみ
- 外部送信: なし

### User-approved Memory Notes (v1.4.0)

`note_saved` はユーザーがMemoryPageで明示保存した長期記憶だけを表す。
transcript本文、text input本文、raw filename、raw window title、file contentは自動で `note_saved` にならない。

| フィールド | 内容 |
|---|---|
| `text` | ユーザーが明示保存した短いメモ |
| `category` | preference / project / creative_direction / technical_context / personal_note / avoid / style_preference |
| `pinned` | prompt候補で優先するか |
| `includeInPrompt` | 発話文脈へ入れるか |
| `updatedAt` | 最終編集時刻 |

PromptBuilderは `includeInPrompt=true` の保存メモだけを最大5件、pinned優先で使う。
OpenAIへ送るには、さらにAI設定の「保存メモを送る」がONである必要がある。

### 保存期間ポリシー (v0.1.50)

設定画面の「記憶」タブで保存期間を選べる。

| 設定 | 内容 |
|---|---|
| 7日 | 7日より古い MemoryEvent を削除 |
| 30日 | デフォルト・推奨 |
| 90日 | 長めに保存 |
| 無期限 (`0`) | 自動削除しない |

- アプリ起動時に1回、保存期間を超えた MemoryEvent を自動整理する
- 「今すぐ整理」ボタンで手動cleanupできる
- retention は MemoryEvent 全タイプを対象にする
- timestamp が不正な既存イベントは互換性のため削除対象にしない
- 500件の件数上限は従来通り維持する

### DailySummary (MemoryEvent から毎回計算)

DailySummary は localStorage に直接保存しない。
MemoryEvent から `buildDailySummary()` でオンデマンドに計算する。
そのため、MemoryEvent を削除すれば DailySummary も自動的にリセットされる。
保存期間で古いイベントを削除した場合、過去のサマリーも保存済みイベントの範囲で再計算される。

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
| 保存期間変更 | 7日 / 30日 / 90日 / 無期限 |
| 今すぐ整理 | 現在の保存期間に基づいて古い MemoryEvent を削除 |
| 保存メモの編集 | text / category / pinned / includeInPrompt を編集 |
| 保存メモの削除 | 指定した `note_saved` だけを削除 |
| JSONを書き出す | 現在保存されている MemoryEvent をローカルJSONとして保存 |
| 保存メモだけ読み込む | export JSONから `note_saved` だけをimport |
| 発話ログのみ削除 | `speech_shown` イベントのみ削除 |
| すべての記憶を削除 | 全 MemoryEvent を削除 |

破壊的な削除は確認ダイアログあり。削除後は元に戻せない。

### JSON export (v0.1.54)

「JSONを書き出す」は、現在このPCに保存されている MemoryEvent をユーザーのローカルファイルとして保存する。
外部送信は行わない。クラウド同期やRAG登録もしない。

export JSON には以下を含める。

| フィールド | 内容 |
|---|---|
| `schemaVersion` | export形式のバージョン。現在は `1` |
| `appVersion` | 書き出し時のアプリバージョン |
| `exportedAt` | ISO形式の書き出し日時 |
| `retentionDays` | 書き出し時点の保存期間設定 |
| `eventCount` | 書き出し対象の件数 |
| `eventTypes` | タイプ別件数 |
| `range` | 最古 / 最新イベント日時 |
| `events` | MemoryEvent 本体 |

v1.4.0のimportは、export JSON内の `note_saved` だけを新しい保存メモとして取り込む。
発話ログ・起動ログ・状態変化・観測ログはimportしない。
保存期間や削除操作で MemoryEvent を削除した後は、export対象にも含まれない。

---

## アーキテクチャ

```
src/systems/memory/memoryStore.ts
  └─ logEvent()           — イベント記録
  └─ getRecentEvents()    — 最新N件取得
  └─ getAllEvents()        — 全件取得
  └─ getEventsByType()    — タイプ別取得
  └─ buildMemoryExportPayload() — JSON export用payload生成
  └─ getSavedMemoryNotes() — 保存メモ一覧
  └─ getPromptMemoryNotes() — prompt投入対象メモ
  └─ updateMemoryNote() — 保存メモ編集
  └─ importMemoryNotesFromPayload() — export JSONから保存メモだけimport
  └─ countExpiredEvents()  — 保存期間を超えたイベント数を集計
  └─ pruneExpiredEvents()  — 保存期間を超えたイベントを削除
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
  └─ Memory Viewer / retention / export UI
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
- full MemoryEvent JSON import (v1.4.0では保存メモのみimport)
- 日単位での削除

---

## ユーザー向け説明 (設定画面「記憶」タブ)

```
無明の記憶はこのPC内にのみ保存されます。
外部には送信されません。
ここから確認・削除できます。
必要ならJSONとしてこのPCに書き出せます。
```
