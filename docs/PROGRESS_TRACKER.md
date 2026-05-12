# Progress Tracker — AmitySpirit Companion

> 各領域の進捗を数値で追う。開発判断の基準として使う。
> セッション完了後に必ず更新すること。

**最終更新: 2026-05-13 (v0.1.38)**

---

## 全体進捗

| 領域 | 進捗 | 備考 |
|------|------|------|
| 土台・アーキテクチャ | 100% | Phase 0–2 完了 |
| 観測システム (Rust) | 90% | 3秒遅延キャプチャ・hwndRaw・SetLastError(0) 追加 |
| 活動推定 (inferActivity) | 83% | communication / self カテゴリ処理追加 |
| AI コンテキスト構築 | 90% | trigger別ヒント・直近発話context・時刻偏重修正 |
| AI プロバイダー (Ollama) | 93% | 127.0.0.1修正・temperature 0.5・QualityFilter強化 |
| fallback / RuleProvider | 82% | fallbackReason 詳細化 (model_not_found等) |
| 記憶システム | 72% | DailySummary・MemoryViewer・削除機能実装済み |
| 自律発話 (autonomous speech) | 85% | AI-first + 返答単調化修正 (trigger hint・直近発話) |
| 音声入力 (Voice) | 42% | 実録音OK・STT未完成。VoicePage UI改善済み |
| キャラクター表現 | 72% | DPI対応 220px ウィンドウ。感情スプライト追加は将来 |
| 設定 UI | 93% | TabErrorBoundary追加・TransparencyPage 防御的描画 |
| 透明性 UI | 94% | 3秒遅延キャプチャ・hwndRaw・useRef防御対応 |
| ウィンドウ hit test | 95% | DPI対応 scale_factor()・220px で clipping 根本解決 |
| リリース品質 (docs) | 72% | CHANGELOG / NEXT_SESSION / PROGRESS_TRACKER 更新 |
| Windows installer / CI | 75% | v0.1.27で成功確認済み |
| **総合** | **~76%** | v0.1.38 Hotfix 完了 (実機確認待ち) |

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
| v0.1.36 | Field QA Root Cause Fixes: Ollama CORS根本修正(Rust経由HTTP)・ActiveAppDebug・SPEECH_VISIBLE hit test |
| v0.1.37 | Companion Intelligence & Window Architecture: AI-first自律発話・PromptBuilder/QualityFilter強化・window resize hit area修正・3秒遅延キャプチャ |
| v0.1.38 | Hotfix: TabErrorBoundary設定画面保護・DPI対応resize_companion (scale_factor)・PromptBuilder時刻偏重修正・直近発話context追加 |

---

## 開発ルール

1. **完成判定基準が最優先** — docs/PRODUCT_COMPLETION_ROADMAP.md を参照する
2. **音声は凍結中** — WhisperCli Rust sidecar は Milestone A 完了後に再開
3. **絶対原則を守る** — クラウド送信・常時監視・自動実行は実装しない
4. **キャラクター名をコードに埋め込まない**
5. **npm run build + cargo build が通ること**
6. **docs/RESPONSE_QUALITY_GUIDE.md を確認してから返答を変更する**

---

## 次の目標: v0.1.37 候補

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
