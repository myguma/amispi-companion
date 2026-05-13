# Progress Tracker — AmitySpirit Companion

> 各領域の進捗を数値で追う。開発判断の基準として使う。
> セッション完了後に必ず更新すること。

**最終更新: 2026-05-13 (v0.1.49)**

---

## 全体進捗

| 領域 | 進捗 | 備考 |
|------|------|------|
| 土台・アーキテクチャ | 100% | Phase 0–2 完了 |
| 観測システム (Rust) | 91% | camelCase serde・Raw Foreground Debug表示改善。実機取得は継続確認 |
| 活動推定 (inferActivity) | 83% | communication / self カテゴリ処理追加 |
| AI コンテキスト構築 | 90% | trigger別ヒント・直近発話context・時刻偏重修正 |
| AI プロバイダー (Ollama) | 93% | 127.0.0.1修正・temperature 0.5・QualityFilter強化 |
| fallback / RuleProvider | 82% | fallbackReason 詳細化 (model_not_found等) |
| 記憶システム | 72% | DailySummary・MemoryViewer・削除機能実装済み |
| 自律発話 (autonomous speech) | 85% | AI-first + 返答単調化修正 (trigger hint・直近発話) |
| 音声入力 (Voice) | 42% | 実録音OK・STT未完成。VoicePage UI改善済み |
| キャラクター表現 | 88% | v0.1.48実機確認で idle / speech / drag / speech中drag の描画消失が解決 |
| 設定 UI | 96% | TabErrorBoundary、アップデート/デバッグタブ、First-run Onboarding追加 |
| 透明性 UI | 95% | raw JSON preview・snake/camel両対応・3秒後キャプチャ説明改善 |
| ウィンドウ hit test | 97% | 通常時は吹き出し+キャラ楕円+表示中UpdateBadge、ContextMenu中のみ全域interactive |
| リリース品質 (docs) | 84% | v0.1.49 docs更新、v0.1.48実機QA結果を反映 |
| Windows installer / CI | 75% | v0.1.27で成功確認済み |
| **総合** | **~82%** | v0.1.48でキャラ描画は実用上解決。v0.1.49でFirst-run Onboarding追加 |

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
| v0.1.39 | Hotfix: 240px character layout・楕円hit target・Foreground Debug serde/raw JSON表示改善 |
| v0.1.40 | Hotfix: 280px character layout・sizeScale/window bounds同期・work area clamp・ContextMenu上方向clamp |
| v0.1.41 | Hotfix: Character実描画サイズをsizeScaleへ同期・visual bottom anchor修正・React/Rust hit bbox整合 |
| v0.1.42 | Hotfix: speech resize bottom anchor・root viewport基準化・resize拡大順序修正・drag中speech resize抑制 |
| v0.1.43 | Hotfix: speech bubbleをwindow top基準からcharacter-stage上基準へ変更・bubble hit test整合 |
| v0.1.44 | Hotfix: 設定画面更新導線・UpdateBadge hit test・debugModeEnabled / layout overlay追加 |
| v0.1.45 | Diagnostic: Character内部のimg/currentSrc/natural size/alpha bbox/CSS animation診断追加 |
| v0.1.46 | Hotfix: sprite実表示をbackground surfaceへ変更・renderMode debug追加 |
| v0.1.47 | Hotfix: companion windowを常時expanded height化・SPEECH_VISIBLE明示hit test・DebugOverlay/ContextMenu重なり修正 |
| v0.1.48 | Hotfix: v0.1.47常時410pxを撤回・常時compact 280px内speech layout・bubble 3行省略 |
| v0.1.49 | First-run Onboarding追加・onboardingCompleted/onboardingVersion・v0.1.48 Field QA docs反映 |

---

## 開発ルール

1. **完成判定基準が最優先** — docs/PRODUCT_COMPLETION_ROADMAP.md を参照する
2. **音声は凍結中** — WhisperCli Rust sidecar は Milestone A 完了後に再開
3. **絶対原則を守る** — クラウド送信・常時監視・自動実行は実装しない
4. **キャラクター名をコードに埋め込まない**
5. **npm run build + cargo build が通ること**
6. **docs/RESPONSE_QUALITY_GUIDE.md を確認してから返答を変更する**

---

## 次の目標: v0.1.50 候補

優先候補A: **v0.1.49 実機確認 → 残QA修正** ← **推奨**
- First-run Onboardingの初回表示・完了保存・再表示導線を確認
- 既存設定、UpdatePage、DebugPage、TransparencyPageの回帰確認
- v0.1.48のcompact 200x280 character layout維持を確認

優先候補B: **Memory Retention Policy**
- `memoryRetentionDays` 設定 (デフォルト30日)
- 起動時に古い speech_shown / state_changed を自動削除
- MemoryPage に設定UI追加

優先候補C: **Emotion Sprite Set**
- 感情別スプライト (shy / concerned / happy)
- CryEngine sound + sprite 連動

| 作業 | 優先度 |
|------|--------|
| v0.1.49 onboarding QA / 残QA修正 | 高 |
| Memory retention / export | 中 |
| Emotion sprite set | 中 |
| RuleProvider daily summary活用強化 | 中 |
| Whisper Rust sidecar (Phase 6b-real-2) | 低 |
