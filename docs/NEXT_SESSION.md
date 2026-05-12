# Next Session Handoff — AmitySpirit Companion

> このファイルは次のAIコーディングセッションへの引継ぎ書。
> チャット履歴に頼らず、ここだけ読めば現状を把握できるようにする。
> 作業完了後は必ず更新すること。

**最終更新: 2026-05-12**

---

## 現在のステータス

**バージョン:** v0.1.31
**フェーズ:** Milestone A 第1段階完了
**全体進捗:** 約 50%
**ロードマップ:** docs/PRODUCT_COMPLETION_ROADMAP.md 参照
**進捗管理:** docs/PROGRESS_TRACKER.md 参照

---

## ビルド状態

```
✅ npm run build → ✓ built (v0.1.31)
✅ cargo build  → Finished dev profile (v0.1.31)
✅ GitHub Actions / Windows Installer → v0.1.27 成功済み (v0.1.28〜v0.1.31 は push 直後)
```

---

## 完了済みフェーズ

| Phase / Milestone | 内容 | 状態 |
|---|---|---|
| Phase 0 | Planning and Guardrails (docs) | ✅ 完了 |
| Phase 1 | CompanionContext / SpeechPolicy / SpeechQueue / inferActivity | ✅ 完了 |
| Phase 2 | PromptBuilder / QualityFilter / OllamaProvider / AI設定UI | ✅ 完了 |
| Phase 3 | MediaContext — バックグラウンドメディアアプリ検出 | ✅ 完了 |
| Phase 4 | Transparency UI v2 — 観測状態ライブパネル | ✅ 完了 |
| Phase 5 | ウィンドウ位置の保存・復元 | ✅ 完了 |
| Phase 6a | Voice Input Foundation / mock transcript | ✅ 完了 |
| Phase 6a.5 | Context Wiring and Input Stabilization | ✅ 完了 |
| Phase 6b-real-1 | Local STT Recording Foundation (実録音 + STTAdapter + Whisper skeleton) | ✅ 完了 |
| Milestone A 第1段階 | ActivityInsight精度向上・DailySummary・PromptBuilder改善・TransparencyUI改善 | ✅ 完了 (v0.1.31) |

---

## Milestone A 第1段階 実装詳細 (v0.1.31)

### 変更ファイル

- `src/companion/activity/inferActivity.ts`
  - "reading" 種別を追加 (browser + 30秒以上無入力 + 非全画面)
  - `inputActiveRecently` を活用 (deepFocus の confidence 向上)
  - `system.cpuLoad` を推定根拠に追加 (high_cpu → ビルド中の可能性)
  - reasons の粒度向上 (idle時間・入力状態を含む)
  - confidence を状況別に精緻化

- `src/companion/memory/buildMemorySummary.ts`
  - `buildDailySummary` を統合して `shortNaturalSummary` を改善

- `src/systems/ai/PromptBuilder.ts`
  - confidence に応じた確信度修飾語 (「おそらく」「もしかしたら」)
  - confidence < 0.7 のとき reasons を自然文に変換して追加
  - cpuLoad シグナルをプロンプトに反映

- `src/settings/pages/TransparencyPage.tsx`
  - LiveStatusPanel: reasons タグ表示・CPU表示追加
  - "今日の記憶" セクション追加 (MemorySummaryPanel)
  - "reading" 状態のカラー追加

### 新規追加ファイル

- `src/companion/memory/dailySummary.ts`
  - `DailySummary` 型: sessionStartTime / todayClickCount / activeHoursToday 等
  - `buildDailySummary(events)` → DailySummary

### 新規ドキュメント

- `docs/PRODUCT_COMPLETION_ROADMAP.md` — 製品完成形・非目標・マイルストーン
- `docs/PROGRESS_TRACKER.md` — 領域別進捗・バージョン履歴・次の目標

---

## 次のフェーズ (優先順)

### Milestone A 第2段階 ← **次**

**目的:** コア返答品質の完成。自律発話の信頼性向上。

**実装すべき内容:**
1. `RuleProvider.ts` の文脈強化
   - `activityInsight.kind` を switch して状況別の返答バリエーション
   - "reading" 種別への対応 (静かに読んでる系の一言)
   - "deepFocus" への対応 (集中中は基本黙る)
   - 時間帯を使った返答分岐
2. autonomous speech トリガー精度向上
   - idle trigger: activity が "away" のときはスキップ
   - observation trigger: 実際に何か気づいたことがある場合のみ
3. 朝/夕の自動挨拶 (Milestone C 先行)
   - 起動時刻によるグリーティング分岐

### Milestone B (Voice) — 凍結中
- Phase 6b-real-2: WhisperCli Rust sidecar 統合 → Milestone A 完了後に再開
- Phase 6c: Voice UX Hardening

### Milestone C — Daily Presence
- 時間帯別 autonomous speech パターン
- 長時間作業検知

### Milestone D — Expressiveness
- 感情スプライト切り替え

---

## 次に触るファイル (Milestone A 第2段階)

**変更:**
```
src/companion/ai/RuleProvider.ts     ← 文脈強化
src/hooks/useObservationReactions.ts ← autonomous speech 精度向上 (要確認)
docs/PROGRESS_TRACKER.md             ← 完了後に進捗更新
docs/NEXT_SESSION.md                 ← (このファイル更新)
```

---

## 既知の注意事項・リスク

1. **Voice (Phase 6b-real-2) は凍結中** — WhisperCli Rust sidecar は Milestone A 完了後。

2. **WebView MediaRecorder 対応**: Tauri v2 のパーミッション設定でマイクが許可されているか確認が必要。

3. **whisper.cpp バイナリ・モデル同梱なし**: ユーザーが自分で用意してパスを設定する。

4. **OllamaProvider の snapshot 参照**: Phase 6a.5 で修正済み。実際の `snapshotRef.current` が使われる。

---

## 壊してはいけないもの

```
✅ onCharacterClick → requestAIResponse → AI(none/mock/ollama) → triggerSpeak
✅ fireReaction → fallback when AI unavailable or policy blocks
✅ SpeechPolicy (DND/quiet/focus/fullscreen 抑制)
✅ useObservationReactions (fullscreenDetected/mediaDetected/gamingDetected/longIdle)
✅ overClicked, returnAfterBreak, returnAfterLongBreak reactions
✅ CryEngine (sleep/wake/touch sounds)
✅ ウィンドウ位置の保存・復元
✅ MediaContext (Spotify 等のバックグラウンド検出)
✅ Transparency UI v2 (ライブパネル・reasons表示・記憶パネル)
✅ cargo build が通ること
✅ npm run build が通ること
✅ voiceInputEnabled = false では録音しない
✅ STT 失敗時は fallback (固まらない)
✅ Mock STT が動くこと
```

---

## Claude Code が次セッションで迷わないための作業順 (Milestone A 第2段階)

```
1. npm run build → 通ることを確認
2. cargo build  → 通ることを確認
3. src/companion/ai/RuleProvider.ts を読む
4. RuleProvider を activityInsight 対応で強化
5. useObservationReactions.ts を読んで autonomous speech トリガーを確認・改善
6. npm run build → 通ることを確認
7. docs/PROGRESS_TRACKER.md 更新 (進捗数値)
8. docs/NEXT_SESSION.md 更新 (このファイル)
9. git add / commit / bump v0.1.32 / push
```
