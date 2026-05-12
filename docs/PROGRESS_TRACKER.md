# Progress Tracker — AmitySpirit Companion

> 各領域の進捗を数値で追う。開発判断の基準として使う。
> セッション完了後に必ず更新すること。

**最終更新: 2026-05-12 (v0.1.35)**

---

## 全体進捗

| 領域 | 進捗 | 備考 |
|------|------|------|
| 土台・アーキテクチャ | 100% | Phase 0–2 完了 |
| 観測システム (Rust) | 90% | classify_app 大幅拡充。Spotify/Bitwig/Discord/self 対応済み |
| 活動推定 (inferActivity) | 83% | communication / self カテゴリ処理追加 |
| AI コンテキスト構築 | 82% | CompanionContext・PromptBuilder改善済み |
| AI プロバイダー (Ollama) | 85% | キャッシュバグ修正・デバッグUI追加・timeout改善 |
| fallback / RuleProvider | 80% | source/fallbackReason 可視化追加 |
| 記憶システム | 72% | DailySummary・MemoryViewer・削除機能実装済み |
| 自律発話 (autonomous speech) | 75% | InferredActivity遷移・抑制精度向上済み |
| 音声入力 (Voice) | 42% | 実録音OK・STT未完成。VoicePage UI改善済み |
| キャラクター表現 | 68% | 状態別CSS アニメーション実装。感情スプライト追加は将来 |
| 設定 UI | 88% | AIPage にテスト発話・接続テスト・デバッグパネル追加 |
| 透明性 UI | 92% | processName表示・自動更新・unknownReason表示追加 |
| リリース品質 (docs) | 68% | FIELD_QA_NOTES.md 追加 |
| Windows installer / CI | 75% | v0.1.27で成功確認済み |
| **総合** | **~68%** | v0.1.35 Field QA Fixes 完了 |

---

## バージョン履歴

| バージョン | 完了内容 |
|-----------|---------|
| v0.1.27 | Windows installer ビルド成功 |
| v0.1.28 | Phase 6a: Voice Input Foundation |
| v0.1.29 | Phase 6a.5: Context Wiring |
| v0.1.30 | Phase 6b-real-1: 実録音 + STTAdapter + WhisperCli skeleton |
| v0.1.31 | Milestone A 第1段階: ActivityInsight・DailySummary・PromptBuilder・TransparencyUI |
| v0.1.32 | Milestone A 第2段階: RuleProvider文脈強化・autonomous speech精度向上・発話制御UI |
| v0.1.33 | Milestone B 第1段階: Memory Viewer UI・記憶削除機能・memoryStore拡張 |
| v0.1.34 | Milestone B 第2段階: Character State Expression・状態別CSS アニメーション・VoiceUIState統合 |
| v0.1.35 | Field QA Fixes: OllamaProvider キャッシュバグ修正・デバッグUI・observe拡充・当たり判定改善 |

---

## 開発ルール

1. **完成判定基準が最優先** — docs/PRODUCT_COMPLETION_ROADMAP.md を参照する
2. **音声は凍結中** — WhisperCli Rust sidecar は Milestone A 完了後に再開
3. **絶対原則を守る** — クラウド送信・常時監視・自動実行は実装しない
4. **キャラクター名をコードに埋め込まない**
5. **npm run build + cargo build が通ること**
6. **docs/RESPONSE_QUALITY_GUIDE.md を確認してから返答を変更する**

---

## 次の目標: v0.1.36 候補

優先候補A: **First-run Onboarding** ← **推奨**
- 初回起動時に権限・Ollama・Voice・記憶の説明ウィザードを表示
- localStorage `hasCompletedOnboarding` フラグで制御

優先候補B: **Memory Retention Policy**
- `memoryRetentionDays` 設定 (デフォルト30日)
- 起動時に古い speech_shown / state_changed を自動削除
- MemoryPage に設定UI追加

優先候補C: **Emotion Sprite Set**
- 感情別スプライト (shy / concerned / happy)
- CryEngine sound + sprite 連動

| 作業 | 優先度 |
|------|--------|
| First-run onboarding | 高 |
| Memory retention / export | 中 |
| Emotion sprite set | 中 |
| RuleProvider daily summary活用強化 | 中 |
| Whisper Rust sidecar (Phase 6b-real-2) | 低 |
