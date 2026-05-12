# Next Session Handoff — AmitySpirit Companion

> このファイルは次のAIコーディングセッションへの引継ぎ書。
> チャット履歴に頼らず、ここだけ読めば現状を把握できるようにする。
> 作業完了後は必ず更新すること。

**最終更新: 2026-05-12 (v0.1.34)**

---

## 現在のステータス

**バージョン:** v0.1.34
**フェーズ:** Milestone B 第2段階完了
**全体進捗:** 約 66%
**ロードマップ:** docs/PRODUCT_COMPLETION_ROADMAP.md 参照
**進捗管理:** docs/PROGRESS_TRACKER.md 参照
**発話品質:** docs/RESPONSE_QUALITY_GUIDE.md 参照
**記憶設計:** docs/MEMORY_AND_DATA_CONTROL.md 参照

---

## ビルド状態

```
✅ npm run build → ✓ built (v0.1.34)
✅ cargo build  → Finished dev profile (v0.1.34)
✅ GitHub Actions / Windows Installer → v0.1.27 成功済み (v0.1.28〜v0.1.34 は push 直後)
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
| Milestone B 第2段階 | Character State Expression・状態別CSSアニメーション・VoiceUIState統合 | ✅ v0.1.34 |

---

## Milestone B 第2段階 実装詳細 (v0.1.34)

### 変更ファイル

- `src/types/companion.ts`
  - `VoiceUIState` 型を追加 (useCompanionState.ts から移動)

- `src/hooks/useCompanionState.ts`
  - `VoiceUIState` を companion.ts からインポートし、後方互換のため再エクスポート

- `src/components/Character.tsx`
  - `voiceUIState?: VoiceUIState` prop を追加
  - 内部ラッパー `character-anim` div を追加 (scaleX flip と transform animation の競合を分離)
  - `character-anim--sprite` クラス: スプライト使用時のみ状態アニメーションを適用
  - `voice-dot` overlay: voiceListening/Transcribing/Responding 時に colored dot を表示

- `src/styles/index.css`
  - `.character-anim--sprite[data-state]` アニメーション追加:
    - `thinking`: 上下フロート + 紫グロー (1.8s)
    - `speaking`: 上下ボブ + スケール (0.8s)
    - `sleep`: 縮小ドリフト + dim (5s)
    - `waking`: スケールアップ + 明度フラッシュ (1.5s ease-out)
    - `touched`: バウンス (0.35s)
  - `.voice-dot` スタイル追加: listening(赤)/transcribing(橙)/responding(緑) colored dot

- `src/App.tsx`
  - 旧来の voice dot 表示 div を削除
  - `Character` に `voiceUIState` prop を渡す

---

## 次のフェーズ候補 (v0.1.35)

### 優先候補 A: First-run Onboarding ← **推奨**

**目的:** 初回起動時の権限・機能・記憶・安全性の説明。

**実装すべき内容:**
1. localStorage に `hasCompletedOnboarding` フラグ
2. 初回のみ表示されるオンボーディング画面 (メインウィンドウに overlay or 別ウィンドウ)
3. 主な項目: ローカル動作・観測内容・Ollama設定方法・記憶について
4. 「設定を開く」ボタンで設定画面に誘導

**完了条件:**
- 初回起動時に表示される
- 2回目以降は表示されない
- 「設定を開く」が機能する
- build が通る

### 優先候補 B: Memory Retention Policy

**目的:** 古いイベントを自動的に整理する仕組み。

**実装すべき内容:**
1. 設定: `memoryRetentionDays` (デフォルト30日)
2. 起動時に古い speech_shown / state_changed を削除
3. MemoryPage に設定UI追加

### 優先候補 C: Emotion Sprite Set

**目的:** CompanionEmotion (shy/concerned/happy) の専用スプライト。

**実装すべき内容:**
1. `public/characters/default/` に shy.png / concerned.png を追加
2. `emotionToSpriteState()` マッピングを更新
3. CryEngine sound との連動

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
