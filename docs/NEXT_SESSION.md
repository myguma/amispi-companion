# Next Session Handoff — AmitySpirit Companion

> このファイルは次のAIコーディングセッションへの引継ぎ書。
> チャット履歴に頼らず、ここだけ読めば現状を把握できるようにする。
> 作業完了後は必ず更新すること。

**最終更新: 2026-05-12 (v0.1.34)**

---

## 現在のステータス

**バージョン:** v0.1.33
**フェーズ:** Milestone B 第1段階完了
**全体進捗:** 約 63%
**ロードマップ:** docs/PRODUCT_COMPLETION_ROADMAP.md 参照
**進捗管理:** docs/PROGRESS_TRACKER.md 参照
**発話品質:** docs/RESPONSE_QUALITY_GUIDE.md 参照
**記憶設計:** docs/MEMORY_AND_DATA_CONTROL.md 参照

---

## ビルド状態

```
✅ npm run build → ✓ built (v0.1.33)
✅ cargo build  → Finished dev profile (v0.1.33)
✅ GitHub Actions / Windows Installer → v0.1.27 成功済み (v0.1.28〜v0.1.33 は push 直後)
```

---

## 完了済みフェーズ

| Phase / Milestone | 内容 | 状態 |
|---|---|---|
| Phase 0–5 | 土台・観測・PromptBuilder・MediaContext・ウィンドウ位置 | ✅ 完了 |
| Phase 6a / 6a.5 / 6b-real-1 | Voice Foundation・実録音・STTAdapter基盤 | ✅ 完了 |
| Milestone A 第1段階 | ActivityInsight精度・DailySummary・PromptBuilder改善・TransparencyUI | ✅ v0.1.31 |
| Milestone A 第2段階 | RuleProvider文脈強化・autonomous speech精度向上・発話制御UI | ✅ v0.1.32 |
| Milestone B 第1段階 | Memory Viewer UI・記憶削除機能・memoryStore拡張 | ✅ v0.1.33 |

---

## Milestone B 第1段階 実装詳細 (v0.1.33)

### 変更ファイル

- `src/systems/memory/memoryStore.ts`
  - `getAllEvents()`: 全イベント取得 (古い順)
  - `getEventsByType(type)`: タイプ別取得
  - `clearEventsByType(type)`: タイプ別削除
  - `getMemoryStats()`: `MemoryStats` 型で統計集計

- `src/settings/SettingsApp.tsx`
  - 「記憶」タブを追加 (Tab型に `"memory"` 追加)
  - `MemoryPage` をインポート・レンダリング

- `src/settings/pages/TransparencyPage.tsx`
  - フッターに「記憶タブへの案内」を追加

### 新規追加ファイル

- `src/settings/pages/MemoryPage.tsx`
  - 説明テキスト (ローカル保存のみ・外部送信なし)
  - Memory Stats Card (総件数・今日のクリック/発話/起動)
  - DailySummary Panel (自然文・時刻・統計)
  - Event Log Panel (最新50件・タイプ別フィルタ)
  - 削除コントロール (確認付き・発話のみ/全削除)
  - 更新ボタン

- `docs/MEMORY_AND_DATA_CONTROL.md`
  - 保存内容・保存されないもの・削除方法・アーキテクチャ・安全性

---

## 次のフェーズ候補 (v0.1.34)

### 優先候補 A: Character State Expression ← **推奨**

**目的:** 状態変化 (speaking/thinking/sleeping/deepFocus) が視覚的に伝わる最小表現。

**実装すべき内容:**
1. 現在のスプライト構造を確認 (`public/characters/` など)
2. `CompanionState` (idle/touched/thinking/speaking/sleep/waking) の見た目を分ける
3. 最小限: CSS クラス切り替え or スプライトフレーム変更
4. voiceListening / voiceTranscribing / voiceResponding の状態も反映できれば理想

**完了条件:**
- thinking 中にキャラが「考えてる感」を出す
- speaking 中に明確な変化がある
- sleep 中と waking が視覚的に区別できる
- build が通る

### 優先候補 B: First-run Onboarding

**目的:** 初回起動時の権限・機能・記憶・安全性の説明。

**実装すべき内容:**
1. localStorage に `hasCompletedOnboarding` フラグ
2. 初回のみ表示されるオンボーディング画面
3. 主な項目: ローカル動作・観測内容・Ollama設定方法・記憶について
4. 「設定を開く」ボタンで設定画面に誘導

### 優先候補 C: Memory Retention Policy

**目的:** 古いイベントを自動的に整理する仕組み。

**実装すべき内容:**
1. 設定: `memoryRetentionDays` (デフォルト30日)
2. 起動時に古い speech_shown / state_changed を削除
3. BehaviorPage または MemoryPage に設定UI

---

## 今やらないこと

- Whisper実接続 (Phase 6b-real-2)
- Screen Capture / OCR
- TTS
- 長期RAG・ベクトルDB
- 大規模UI刷新
- クラウドAI追加

---

## 壊してはいけないもの

```
✅ onCharacterClick → requestAIResponse → AI(none/mock/ollama/rule) → triggerSpeak
✅ fireReaction → fallback when AI unavailable
✅ SpeechPolicy (DND/quiet/focus/fullscreen 抑制)
✅ useObservationReactions (activity遷移発火・deepFocus/gaming/watchingVideo抑制)
✅ scheduleIdleSpeech の activity-aware 抑制
✅ overClicked / returnAfterBreak / returnAfterLongBreak reactions
✅ CryEngine (sleep/wake/touch sounds)
✅ ウィンドウ位置の保存・復元
✅ MediaContext (Spotify等のバックグラウンド検出)
✅ Transparency UI (ActivityInsight・reasons・記憶・発話制御パネル)
✅ Memory Viewer UI (MemoryPage) - 削除後も表示が壊れない
✅ cargo build が通ること
✅ npm run build が通ること
✅ Voice Input 基盤 (voiceInputEnabled=false では録音しない)
✅ Mock STT が動くこと
✅ buildMemorySummary([]) / buildDailySummary([]) が安全に動くこと
```

---

## Claude Code が次セッションで迷わないための作業順

```
1. docs/NEXT_SESSION.md を読む (このファイル)
2. docs/PROGRESS_TRACKER.md で現在地を確認
3. docs/PRODUCT_COMPLETION_ROADMAP.md で方針確認
4. docs/RESPONSE_QUALITY_GUIDE.md で発話品質基準確認
5. npm run build → 通ることを確認
6. cargo build  → 通ることを確認
7. 優先候補 A / B / C のどれかを選んで実装
8. npm run build / cargo build → 通ることを確認
9. docs/PROGRESS_TRACKER.md 更新 (進捗数値)
10. docs/NEXT_SESSION.md 更新 (このファイル)
11. git add / commit / bump v0.1.34 / push
```
