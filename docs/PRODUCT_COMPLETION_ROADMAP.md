# Product Completion Roadmap — AmitySpirit Companion

> このドキュメントは製品完成形の定義・マイルストーン・非目標を固定する。
> チャット履歴ではなくここを基準にして開発判断を行う。

**最終更新: 2026-05-14 (v1.0.4)**

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

### Milestone B — Voice MVP (現在: v1.0.3 interaction hotfix / field QA pending)
**目標:** Push-to-Talk で実際に話しかけられる。

| 作業 | 状態 |
|------|------|
| useVoiceRecorder (実録音) | ✅ v0.1.30 |
| MockSTTAdapter / WhisperCliSTTAdapter skeleton | ✅ v0.1.30 |
| Phase 6b-real-2: WhisperCli Rust sidecar 統合 | ✅ v0.3.0 MVP |
| FFmpeg WAV conversion / transcript debug | ✅ v1.0.1–v1.0.2 |
| Phase 6c: Voice UX Hardening | ✅ v1.0.3 / field QA pending |

**実装条件:** Push-to-Talkのみ、常時マイク監視なし、クラウドSTTなし、録音ファイル永続保存なし。

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
| 感情に応じたスプライト切り替え | ✅ v0.2.1 で最小fallback実装 |
| 録音中パルスアニメーション | 未着手 |
| 吹き出しの表現バリエーション | 未着手 |

### Milestone E — Release Polish (進行中)
**目標:** 配布可能な状態に仕上げる。

| 作業 | 状態 |
|------|------|
| Windows installer 動作確認・更新確認 | ✅ v0.1.44以降で更新導線整備、Release workflow継続成功 |
| 初回起動ウィザード | ✅ v0.1.49 |
| ローカル記憶の保存期間制御 | ✅ v0.1.50 |
| ローカル記憶を使った軽い文脈反応 | ✅ v0.1.51 |
| 反応品質QA / 固定文整理 | ✅ v0.1.52 |
| Quiet / Focus / DND hardening | ✅ v0.1.53 |
| Memory export / data control polish | ✅ v0.1.54 |
| エラー時のユーザー向けフィードバック | ✅ v0.1.55 でUpdate/Ollama案内を軽く改善 |
| Phase 8: Optional TTS | 未着手 |

---

## 現在地

**v1.0.4 / Stable hotfix / 全体進捗: 約 96〜97%**

```
Phase 0–6b-real-1: 完了 (土台・音声入口)
Milestone A: ほぼ完了 (ActivityInsight・DailySummary・PromptBuilder・TransparencyUI・RuleProvider・AI-first反応)
Field QA: v0.1.48でキャラ描画問題は実用上解決
Release Polish: 設定画面更新導線・DebugMode・First-run Onboarding・Memory Retention Policy・JSON export・Known Issues・daily-use beta checklistまで実装
Presence: DailySummary文脈反応、固定文品質整理、quiet/focus/DND発話抑制、最小Emotion Sprite fallbackと過剰切替抑制を追加 (field QA pending)
Voice: Whisper Push-to-Talk MVPをv0.3.0でRust commandへ接続し、v1.0.1でFFmpeg WAV変換、v1.0.2でtranscript debug、v1.0.3でvoice後click抑制、v1.0.4でsession isolation / interaction trace / text inputを追加。Voice/Text conversationはfield QA pending
Stable: v1.0.0 field QAで基本操作は通過。v1.0.1〜v1.0.3でvoice系hotfixを継続
v2 planning: docs/V2_ROADMAP_DRAFT.md に候補と非目標、optional remote LLM modeの明示opt-inメモを整理。実装には未着手
残り: v1.0.4 Voice/Text field QA、settings consistency QA、長時間常駐QA、必要ならconversation hotfix
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
