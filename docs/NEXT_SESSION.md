# Next Session Handoff — AmitySpirit Companion

> このファイルは次のAIコーディングセッションへの引継ぎ書。
> チャット履歴に頼らず、ここだけ読めば現状を把握できるようにする。
> 作業完了後は必ず更新すること。

**最終更新: 2026-05-12**

---

## 現在のステータス

**バージョン:** v0.1.32
**フェーズ:** Milestone A 第2段階完了
**全体進捗:** 約 57%
**ロードマップ:** docs/PRODUCT_COMPLETION_ROADMAP.md 参照
**進捗管理:** docs/PROGRESS_TRACKER.md 参照
**発話品質:** docs/RESPONSE_QUALITY_GUIDE.md 参照

---

## ビルド状態

```
✅ npm run build → ✓ built (v0.1.32)
✅ cargo build  → Finished dev profile (v0.1.32)
✅ GitHub Actions / Windows Installer → v0.1.27 成功済み (v0.1.28〜v0.1.32 は push 直後)
```

---

## 完了済みフェーズ

| Phase / Milestone | 内容 | 状態 |
|---|---|---|
| Phase 0–5 | 土台・観測・PromptBuilder・MediaContext・ウィンドウ位置 | ✅ 完了 |
| Phase 6a / 6a.5 / 6b-real-1 | Voice Foundation・実録音・STTAdapter基盤 | ✅ 完了 |
| Milestone A 第1段階 | ActivityInsight精度・DailySummary・PromptBuilder改善・TransparencyUI | ✅ v0.1.31 |
| Milestone A 第2段階 | RuleProvider文脈強化・autonomous speech精度向上・発話制御UI | ✅ v0.1.32 |

---

## Milestone A 第2段階 実装詳細 (v0.1.32)

### 変更ファイル

- `src/companion/ai/RuleProvider.ts` (全面刷新)
  - 12 InferredActivity × 3 trigger (click/voice/observation) のテキストプール
  - rolling history で直近2発話を避ける重複防止
  - confidence < 0.5 のとき fallback
  - deepFocus / gaming / watchingVideo 中の idle trigger 自動抑制

- `src/companion/reactions/activityDelta.ts`
  - `InferredActivity` ベースの `inferredKindChanged`, `prevInferredKind`, `nextInferredKind` 追加

- `src/companion/reactions/useObservationReactions.ts`
  - InferredActivity 遷移での発火 (composing開始・coding開始・音楽開始・離席復帰)
  - deepFocus / gaming / watchingVideo 中は全自律発話を抑制

- `src/hooks/useCompanionState.ts`
  - scheduleIdleSpeech: deepFocus / gaming / watchingVideo 中は randomIdle 抑制

- `src/companion/reactions/types.ts`
  - `activityTransition` トリガー追加

- `src/companion/reactions/reactionData.ts`
  - activity transition 反応 8 件追加 (composing_start / coding_start / music_start / return_from_away)

- `src/settings/pages/TransparencyPage.tsx`
  - `SpeechControlPanel` 追加: 自律発話状態・抑制理由・次の挙動表示

### 新規追加ファイル

- `docs/RESPONSE_QUALITY_GUIDE.md` — 禁止表現・良い例・activity別方針

---

## 次のフェーズ候補 (v0.1.33)

### 優先候補 A: Memory Viewer UI ← **推奨**

**目的:** ユーザーが「無明が何を覚えているか」を確認・削除できる最小UI。
DailySummaryとmemoryイベントが増えてきたため、透明性のために必要。

**実装すべき内容:**
1. Transparency UI か Settings に「記憶」タブを追加
2. DailySummaryの表示 (今日のクリック数・起動時間等)
3. MemoryEventのカテゴリ別サマリー表示
4. 「記憶を全削除」ボタン (clearEvents()を呼ぶ)
5. 削除前の確認ダイアログ

**完了条件:**
- ユーザーが記憶内容を確認できる
- 削除が機能する
- build が通る

### 優先候補 B: Character State Expression (最小)

**目的:** 状態変化が視覚的に伝わる最小スプライト切り替え。

**実装すべき内容:**
1. `speaking` 状態中の軽い表情変化
2. `thinking` 状態中の表現 (目を細める等)
3. 既存スプライト構造を確認してから判断

### 優先候補 C: First-run Onboarding

**目的:** 初回起動時の権限・機能説明。

---

## 今やらないこと

- Whisper実接続 (Phase 6b-real-2)
- Screen Capture / OCR
- TTS
- 長期RAG
- 大規模UI刷新
- クラウドAI追加

---

## 壊してはいけないもの

```
✅ onCharacterClick → requestAIResponse → AI(none/mock/ollama/rule) → triggerSpeak
✅ fireReaction → fallback when AI unavailable
✅ SpeechPolicy (DND/quiet/focus/fullscreen 抑制)
✅ useObservationReactions (fullscreen/media/gaming/longIdle/downloads/desktop/activityTransition)
✅ deepFocus/gaming/watchingVideo 中の自律発話抑制
✅ overClicked / returnAfterBreak / returnAfterLongBreak reactions
✅ CryEngine (sleep/wake/touch sounds)
✅ ウィンドウ位置の保存・復元
✅ MediaContext (Spotify等のバックグラウンド検出)
✅ Transparency UI (ActivityInsight・reasons・記憶・発話制御パネル)
✅ cargo build が通ること
✅ npm run build が通ること
✅ Voice Input 基盤 (voiceInputEnabled=false では録音しない)
✅ Mock STT が動くこと
✅ DailySummary / buildMemorySummary が動くこと
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
11. git add / commit / bump v0.1.33 / push
```
