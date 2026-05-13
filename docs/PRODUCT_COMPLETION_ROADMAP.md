# Product Completion Roadmap — AmitySpirit Companion

> このドキュメントは製品完成形の定義・マイルストーン・非目標を固定する。
> チャット履歴ではなくここを基準にして開発判断を行う。

**最終更新: 2026-05-13**

---

## 最終製品の定義

AmitySpirit Companion は「ユーザーのデスクトップに静かに棲む、観察型 AI コンパニオン」である。

- ユーザーを助けようとしない。ただ傍にいる。
- ユーザーの状態を観察し、ときどき静かに一言言う。
- 声をかければ返事をする。
- ローカルで完結する。クラウドには何も送らない。

**完成の定義:** 上記が安定して動作し、ユーザーが毎日自然に起動したいと思える状態。

---

## 絶対原則 (変更不可)

| 原則 | 内容 |
|------|------|
| ローカルファースト | 生データは外部に出ない。AIもローカルLLMのみ |
| 明示許可制 | 画面・音声・メディア情報は明示許可なしに観測しない |
| 非記録 | 生スクリーンショット・OCR全文・生音声を永続保存しない |
| 非監視 | 常時マイク・キーボード入力監視を実装しない |
| 非自動化 | ファイル操作・コマンド実行を自動で行わない |
| 非診断 | 医療・精神状態の断定診断をしない |
| 非アシスタント化 | 汎用AIアシスタントとして振る舞わない |
| キャラクター分離 | キャラクター名・ロア・個性をコードに埋め込まない |

---

## 完成判定基準 (100%)

```
✅ クリックで即座に自然な返事ができる
✅ Ollama (ローカルLLM) で文脈に沿った返答ができる
✅ 現在の活動状態を推定して自律的に一言言える (autonomous speech)
✅ 音声入力 (Push-to-Talk) で話しかけられる
✅ 1日の活動パターンを記憶として保持できる
✅ ウィンドウを自由に配置でき、再起動後も復元される
✅ DND / quiet / focus モードで適切に黙る
✅ 設定UIで主要機能を制御できる
✅ 透明性UIで観測内容をユーザーが確認できる
✅ Windows installer でインストール可能
✅ 自動アップデートが機能する
```

---

## 非目標 (実装しない)

- クラウド AI / クラウド STT の統合
- 常時音声監視 (wake word)
- 画面キャプチャ・OCR
- ファイル自動整理・コマンド実行
- Web 検索・外部APIアクセス
- 複数キャラクター同時表示
- モバイル対応
- チャット履歴の長期保存・RAG

---

## マイルストーン計画

### Milestone A — Contextual Companion MVP (現在: ほぼ完了)
**目標:** コア体験の完成。文脈を踏まえた返答品質。

| 作業 | 状態 |
|------|------|
| ActivityInsight 精度向上 (reading 追加・CPU・inputActive) | ✅ v0.1.31 |
| DailySummary v1 (今日の活動パターン) | ✅ v0.1.31 |
| PromptBuilder 改善 (confidence修飾・reasons活用) | ✅ v0.1.31 |
| Transparency UI 改善 (reasons表示・memory表示) | ✅ v0.1.31 |
| RuleProvider 文脈強化 | ✅ v0.1.32 |
| autonomous speech トリガー精度向上 | ✅ v0.1.32–v0.1.37 |

### Milestone B — Voice MVP (現在: Phase 6b-real-1 完了)
**目標:** Push-to-Talk で実際に話しかけられる。

| 作業 | 状態 |
|------|------|
| useVoiceRecorder (実録音) | ✅ v0.1.30 |
| MockSTTAdapter / WhisperCliSTTAdapter skeleton | ✅ v0.1.30 |
| Phase 6b-real-2: WhisperCli Rust sidecar 統合 | ⏸ 凍結中 |
| Phase 6c: Voice UX Hardening | ⏸ 凍結中 |

**凍結理由:** Milestone A (文脈品質) を先に完成させる。音声は入口だけ存在する状態で保持。

### Milestone C — Daily Presence (未着手)
**目標:** 1日を通じて自然に一緒にいられる感覚。

| 作業 | 状態 |
|------|------|
| 時間帯別 autonomous speech パターン | 未着手 |
| 長時間作業検知・声かけ (break reminder 的) | 未着手 |
| 朝/夜の起動・終了時の挨拶 | 未着手 |
| activity 履歴の蓄積と活用 | 未着手 |

### Milestone D — Expressiveness (未着手)
**目標:** キャラクター表現の最低限追加。

| 作業 | 状態 |
|------|------|
| 感情に応じたスプライト切り替え | 未着手 |
| 録音中パルスアニメーション | 未着手 |
| 吹き出しの表現バリエーション | 未着手 |

### Milestone E — Release Polish (進行中)
**目標:** 配布可能な状態に仕上げる。

| 作業 | 状態 |
|------|------|
| Windows installer 動作確認・更新確認 | ✅ v0.1.44以降で更新導線整備、Release workflow継続成功 |
| 初回起動ウィザード | ✅ v0.1.49 |
| エラー時のユーザー向けフィードバック | 未着手 |
| Phase 8: Optional TTS | 未着手 |

---

## 現在地

**v0.1.49 / First-run Onboarding 実装 / 全体進捗: 約 82%**

```
Phase 0–6b-real-1: 完了 (土台・音声入口)
Milestone A: ほぼ完了 (ActivityInsight・DailySummary・PromptBuilder・TransparencyUI・RuleProvider・AI-first反応)
Field QA: v0.1.48でキャラ描画問題は実用上解決
Release Polish: 設定画面更新導線・DebugMode・First-run Onboardingまで実装
残り: Memory retention、Emotion sprite set、Whisper実接続、Optional TTSなど
```

---

## 現在の設計制約

### Companion window

- companion window は compact `200x280` 固定を基本とする
- speech表示時も window height を広げない
- dynamic resize `280→410` は不採用
- always expanded `410px` も不採用
- transparent WebView / layered window 環境では、410px window 下部領域のsprite描画が壊れる実機結果があるため、この方向へ戻さない
- 吹き出しは compact window 内に収め、長文は省略してよい
