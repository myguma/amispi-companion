# Next Session Handoff — AmitySpirit Companion

> このファイルは次のAIコーディングセッションへの引継ぎ書。
> チャット履歴に頼らず、ここだけ読めば現状を把握できるようにする。
> 作業完了後は必ず更新すること。

**最終更新: 2026-05-12**

---

## 現在のステータス

**バージョン:** v0.1.25
**フェーズ:** Phase 0 完了 → Phase 1 実装中

---

## ビルド確認 (Phase 0)

```
✅ npm run build → ✓ built (Phase 0 完了時点)
✅ npx tsc --noEmit → クリーン
✅ v0.1.25 リリース済み (Latest)
```

---

## 実装完了フェーズ

### Phase 0 ✅
- docs/IMPLEMENTATION_PLAN.md
- docs/SAFETY_AND_PRIVACY_BOUNDARIES.md
- docs/LOCAL_OBSERVATION_ARCHITECTURE.md
- docs/NEXT_SESSION.md

---

## 次に触るファイル (Phase 1)

**新規作成:**
```
src/companion/activity/inferActivity.ts      ← InferredActivity, ActivityInsight, inferActivity()
src/companion/memory/buildMemorySummary.ts   ← CompanionMemorySummary, buildMemorySummary()
src/companion/speech/SpeechPolicy.ts         ← canSpeak()
src/companion/speech/SpeechQueue.ts          ← 優先度・重複排除
src/systems/ai/buildCompanionContext.ts      ← CompanionContext, buildCompanionContext()
```

**変更:**
```
src/companion/ai/types.ts          ← AIEngine/AITrigger/CompanionContext/CompanionUtterance 追加
src/hooks/useCompanionState.ts     ← snapshot 受け取り・新 AI フロー接続
src/App.tsx                        ← snapshot を useCompanionState に渡す
```

---

## 既知の問題・注意事項

1. **AIProvider インターフェース二重構造**
   - `src/systems/ai/AIProvider.ts` — 旧 (MemoryEvent[] → string)、useCompanionState が呼んでいる
   - `src/companion/ai/AIProviderManager.ts` — 新 (AIProviderInput → AIProviderOutput)
   - Phase 1 で useCompanionState を新インターフェースに切り替える

2. **ActivityKind 名前衝突を避けるため `InferredActivity` として新設**
   - `observation/types.ts` の `ActivityKind` は既存コードが使用中 → 変更しない
   - 新型は `companion/activity/inferActivity.ts` に `InferredActivity` として定義

3. **snapshot を useCompanionState に渡す (4番目引数)**
   - 現在: `(config?, autonomousSpeechEnabled?, isFullscreen?)`
   - Phase 1 後: `(config?, autonomousSpeechEnabled?, isFullscreen?, snapshot?)`

---

## 絶対に壊してはいけない原則

```
✅ npm run build が通ること
✅ クリック反応が動くこと
✅ 既存の reaction system が動くこと
✅ DND/quietMode/suppressWhenFullscreen が効くこと
✅ Ollama 未起動時に fallback すること
✅ クラウドへのデータ送信がないこと
✅ ファイル書き換え・削除しないこと
```
