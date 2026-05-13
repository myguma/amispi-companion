# Progress Tracker — AmitySpirit Companion

> 各領域の進捗を数値で追う。開発判断の基準として使う。
> セッション完了後に必ず更新すること。

**最終更新: 2026-05-13 (v1.0.0)**

---

## 全体進捗

| 領域 | 進捗 | 備考 |
|------|------|------|
| 土台・アーキテクチャ | 100% | Phase 0–2 完了 |
| 観測システム (Rust) | 91% | camelCase serde・Raw Foreground Debug表示改善。実機取得は継続確認 |
| 活動推定 (inferActivity) | 83% | communication / self カテゴリ処理追加 |
| AI コンテキスト構築 | 91% | trigger別ヒント・直近発話context・時刻偏重修正・記憶文脈を短く整理 |
| AI プロバイダー (Ollama) | 94% | 127.0.0.1修正・temperature 0.5・QualityFilter追加強化 |
| fallback / RuleProvider | 89% | 固定文短縮・直近固定文重複回避・管理感のある文を抑制 |
| 記憶システム | 84% | DailySummary・MemoryViewer・削除/保存期間・JSON export実装済み |
| 自律発話 (autonomous speech) | 91% | 文脈反応の短文化・quiet/focus/DND抑制を強化 |
| 音声入力 (Voice) | 66% | Whisper Push-to-Talk MVPをRust commandへ接続し、未設定/失敗時の復帰案内を強化。実機音声QAは未実施 |
| キャラクター表現 | 91% | compact描画安定を維持し、追加表情だけsprite fallbackするようQA調整 |
| 設定 UI | 97% | TabErrorBoundary、アップデート/デバッグタブ、First-run Onboarding、Memory retention UI追加 |
| 透明性 UI | 95% | raw JSON preview・snake/camel両対応・3秒後キャプチャ説明改善 |
| ウィンドウ hit test | 97% | 通常時は吹き出し+キャラ楕円+表示中UpdateBadge、ContextMenu中のみ全域interactive |
| リリース品質 (docs) | 99% | v1.0.0 stable notes / Known Issues整理 |
| Windows installer / CI | 84% | Release workflow継続成功。Node.js 20 deprecation annotationはknown issue |
| **総合** | **~94%** | v1.0.0 stable tag。automated checks required / v1.0.0 field QA not performed |

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
| v0.1.49 | First-run Onboarding追加・onboardingCompleted/onboardingVersion・v0.1.48 Field QA docs反映・実機QA通過 |
| v0.1.50 | Memory Retention Policy: memoryRetentionDays・起動時cleanup・MemoryPage保存期間UI/手動整理 |
| v0.1.51 | DailySummary context reactions: 今日のクリック/発話/起動回数を短いRuleProvider反応へ安全に反映 |
| v0.1.52 | Reaction Quality QA: 固定文短縮・fallback重複回避・QualityFilter追加強化・RESPONSE_QUALITY_GUIDE更新 |
| v0.1.53 | Quiet / Focus / DND Hardening: idle/observationの抑制経路整理・DND中の短い手動反応化 |
| v0.1.54 | Memory Export / Data Control Polish: MemoryEvent JSON export・件数/期間/タイプ表示・docs更新 |
| v0.1.55 | Release Polish: Node.js 24 opt-in・Update/Ollama失敗案内・KNOWN_ISSUES作成 |
| v0.2.0 | Daily-use Beta: v0.1.x安定化をdocs/checklist/known issuesとして整理 |
| v0.2.1 | Minimal Emotion Sprite Set: emotion prop・safe sprite fallback・DebugOverlay emo表示 |
| v0.2.2 | Expressiveness QA: operational emotionはstateを上書きせず、追加表情のみvisual override |
| v0.2.3 | Voice Implementation Plan: Push-to-Talk Whisper MVPの範囲・privacy・QA項目を固定 |
| v0.3.0 | Whisper Push-to-Talk MVP: Rust commandでローカルWhisper CLIへ接続 |
| v0.3.1 | Voice QA Hardening: Whisper未設定/録音失敗/STT失敗時の短い案内と復帰経路を整理 |
| v1.0.0-rc.1 | Release Candidate: docs / Known Issues / QA checklist / release notes draft整理 |
| v1.0.0 | Stable: v1.0.0 release notes / Known Issues / hotfix policy整理 |

---

## 開発ルール

1. **完成判定基準が最優先** — docs/PRODUCT_COMPLETION_ROADMAP.md を参照する
2. **音声はPush-to-Talk限定** — WhisperCliはlocal-only。常時監視 / wake word / クラウドSTTは禁止
3. **絶対原則を守る** — クラウド送信・常時監視・自動実行は実装しない
4. **キャラクター名をコードに埋め込まない**
5. **npm run build + cargo build が通ること**
6. **docs/RESPONSE_QUALITY_GUIDE.md を確認してから返答を変更する**

---

## 次の目標: v2 roadmap draft

優先候補A: **v2 roadmap draft** ← **推奨**
- v1.0.0後の候補をdocsだけで整理
- v2実装には進まない

| 作業 | 優先度 |
|------|--------|
| v2 roadmap draft | 高 |
| Voice実機QA | 高 |
| 残QA修正 | 中 |
