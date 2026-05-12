# Progress Tracker — AmitySpirit Companion

> 各領域の進捗を数値で追う。開発判断の基準として使う。
> セッション完了後に必ず更新すること。

**最終更新: 2026-05-12 (v0.1.32)**

---

## 全体進捗

| 領域 | 進捗 | 備考 |
|------|------|------|
| 土台・アーキテクチャ | 100% | Phase 0–2 完了 |
| 観測システム (Rust) | 85% | Media/idle/folder/CPU OK。Screen未実装 |
| 活動推定 (inferActivity) | 80% | reading・InferredActivityデルタ対応済み |
| AI コンテキスト構築 | 82% | CompanionContext・PromptBuilder改善済み |
| AI プロバイダー (Ollama) | 75% | 動作する。prompt品質は改善余地あり |
| fallback / RuleProvider | 78% | activity-aware・重複防止実装済み |
| 記憶システム | 65% | DailySummary v1追加。長期記憶は未実装 |
| 自律発話 (autonomous speech) | 75% | InferredActivity遷移・抑制精度向上済み |
| 音声入力 (Voice) | 40% | 実録音OK・STT未完成 (whisper skeleton) |
| キャラクター表現 | 40% | 基本アニメのみ。感情スプライト未実装 |
| 設定 UI | 80% | 主要設定すべて実装済み |
| 透明性 UI | 85% | 発話制御パネル (抑制理由)・記憶パネル追加済み |
| Windows installer / CI | 75% | v0.1.27で成功確認済み |
| **総合** | **~57%** | Milestone A 第2段階完了 |

---

## バージョン履歴

| バージョン | 完了内容 |
|-----------|---------|
| v0.1.27 | Windows installer ビルド成功 |
| v0.1.28 | Phase 6a: Voice Input Foundation |
| v0.1.29 | Phase 6a.5: Context Wiring (AIProvider → CompanionContext 直接渡し) |
| v0.1.30 | Phase 6b-real-1: 実録音 + STTAdapter + WhisperCli skeleton |
| v0.1.31 | Milestone A 第1段階: ActivityInsight精度向上・DailySummary・PromptBuilder改善・TransparencyUI改善 |
| v0.1.32 | Milestone A 第2段階: RuleProvider文脈強化・autonomous speech精度向上・発話制御UI・Response Quality Guide |

---

## 開発ルール

1. **完成判定基準が最優先** — docs/PRODUCT_COMPLETION_ROADMAP.md を参照する
2. **音声は Milestone B として凍結中** — WhisperCli Rust sidecar は Milestone A 完了後に再開
3. **絶対原則を守る** — クラウド送信・常時監視・自動実行は実装しない
4. **キャラクター名をコードに埋め込まない** — データ層で管理する
5. **npm run build + cargo build が通ること** — セッション終了前に必ず確認
6. **docs/RESPONSE_QUALITY_GUIDE.md を確認してから返答を変更する**

---

## 次の目標: Milestone A 第3段階 or Milestone C先行 (v0.1.33 予定)

優先候補A: **Memory viewer / delete / reset UI**
- MemoryEvent の内容をユーザーが確認・削除できる最小 UI
- DailySummaryの内容表示
- 「全削除」ボタン
- Transparency UI か Settings に新タブ

優先候補B: **Character state expression (最小)**  
- deepFocus / speaking / listening / sleeping の視覚的表現
- スプライト切り替えは既存のスプライト構造次第

優先候補C: **First-run onboarding**
- 権限・Ollama・Voice説明の初回ウィザード
- 既存設定UIへの誘導

| 作業 | 優先度 | 備考 |
|------|--------|------|
| Memory viewer UI | 高 | DailySummary実装済みのため即着手可能 |
| Character state expression | 高 | 体験上の価値が高い |
| First-run onboarding | 中 | リリース品質向上 |
| RuleProvider daily summary 活用 | 中 | 今日の活動をより使う |
| Whisper Rust sidecar (Phase 6b-real-2) | 低 | Milestone A後 |
