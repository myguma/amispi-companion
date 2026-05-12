# Progress Tracker — AmitySpirit Companion

> 各領域の進捗を数値で追う。開発判断の基準として使う。
> セッション完了後に必ず更新すること。

**最終更新: 2026-05-12 (v0.1.31)**

---

## 全体進捗

| 領域 | 進捗 | 備考 |
|------|------|------|
| 土台・アーキテクチャ | 100% | Phase 0–2 完了 |
| 観測システム (Rust) | 85% | Media/idle/folder/CPU OK。Screen未実装 |
| 活動推定 (inferActivity) | 75% | reading追加・CPU/inputActive対応済み |
| AI コンテキスト構築 | 80% | CompanionContext・PromptBuilder改善済み |
| AI プロバイダー (Ollama) | 75% | 動作する。prompt品質は改善余地あり |
| 記憶システム | 65% | DailySummary v1追加。長期記憶は未実装 |
| 自律発話 (autonomous speech) | 55% | 動作する。トリガー精度は改善余地あり |
| 音声入力 (Voice) | 40% | 実録音OK・STT未完成 (whisper skeleton) |
| キャラクター表現 | 40% | 基本アニメのみ。感情スプライト未実装 |
| 設定 UI | 80% | 主要設定すべて実装済み |
| 透明性 UI | 80% | reasons・memory表示追加済み |
| Windows installer / CI | 75% | v0.1.27で成功確認済み |
| **総合** | **~50%** | Milestone A 第1段階完了 |

---

## バージョン履歴

| バージョン | 完了内容 |
|-----------|---------|
| v0.1.27 | Windows installer ビルド成功 |
| v0.1.28 | Phase 6a: Voice Input Foundation |
| v0.1.29 | Phase 6a.5: Context Wiring (AIProvider → CompanionContext 直接渡し) |
| v0.1.30 | Phase 6b-real-1: 実録音 + STTAdapter + WhisperCli skeleton |
| v0.1.31 | Milestone A 第1段階: ActivityInsight精度向上・DailySummary・PromptBuilder改善・TransparencyUI改善 |

---

## 開発ルール

1. **完成判定基準が最優先** — docs/PRODUCT_COMPLETION_ROADMAP.md を参照する
2. **音声は Milestone B として凍結中** — WhisperCli Rust sidecar は Milestone A 完了後に再開
3. **絶対原則を守る** — クラウド送信・常時監視・自動実行は実装しない
4. **キャラクター名をコードに埋め込まない** — データ層で管理する
5. **npm run build + cargo build が通ること** — セッション終了前に必ず確認

---

## 次の目標: Milestone A 第2段階 (v0.1.32 予定)

| 作業 | 優先度 |
|------|--------|
| RuleProvider の文脈強化 (activityInsight を活用した返答バリエーション) | 高 |
| autonomous speech トリガー精度向上 (idleチェック・activity整合) | 高 |
| 朝/夕の自動挨拶 (Milestone C 先行実装) | 中 |
| breakLikely 検知時の一言追加 | 中 |
