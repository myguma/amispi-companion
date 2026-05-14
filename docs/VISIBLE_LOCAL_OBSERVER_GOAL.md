# AmitySpirit Companion Goal

AmitySpirit Companion を Visible Local Observer Companion として完成させる。

この文書はプロジェクト全体の北極星・憲法・完成判定基準である。
一度にすべて実装してはいけない。
実際の作業は必ず小さな version 単位に分割し、各 version ごとに調査・実装・検証・docs更新・release確認を行うこと。

## 最終完成形

AmitySpirit Companion は、デスクトップ上にいる小さな常駐コンパニオンである。

ユーザーが明示的に許可した範囲の作業の気配をローカルで観察し、短く、文脈のある、押しつけがましくない反応を返す。

普段はかわいい存在として振る舞うが、設定・診断・デバッグを開けば、以下がすべて確認できる。

- 何を見ているか
- 何を見ていないか
- 何を保存しているか
- 何を保存していないか
- どの AI provider が返したか
- どの model が返したか
- なぜ喋ったか
- なぜ喋らなかったか
- なぜ fallback したか
- OpenAI / Ollama / RuleProvider のどれが有効だったか
- 外部AIへ何を送ったか
- 外部AIへ何を送っていないか

このアプリの価値は、単にAIが喋ることではない。
「かわいい表面」と「透明な内部」が両立していることにある。

## 完成判定

以下をすべて満たす状態を完成とする。

1. 何を見ているかがUI上で分かる
2. 何を保存しているかがUI上で分かる
3. どのAI provider/modelが返したか分かる
4. なぜ喋ったか分かる
5. なぜ喋らないか分かる
6. なぜfallbackしたか分かる
7. 発話が単調でない
8. 発話が説教臭くない
9. 発話が過剰に長すぎない
10. 発話が短すぎて意味不明にならない
11. OpenAIなしでも最低限かわいい
12. OpenAIありなら自然で賢い
13. Ollama fallbackでも破綻しない
14. RuleProvider fallbackでも最低限成立する
15. ユーザーが保存した記憶を一覧・編集・削除・exportできる
16. 観察・記憶・AI送信範囲がすべてUIで確認できる
17. 1週間常駐しても壊れない
18. updater / installer / release workflow が安定している
19. 変な監視アプリに見えない
20. ユーザーが安心して「ここにいてもいい」と感じられる

## 設計原則

- local-first
- visible by default
- opt-in for sensitive features
- no hidden monitoring
- no irreversible automation
- small releases
- every release must be testable
- cute surface, transparent internals
- user-approved memory only for durable personal memory
- external AI is optional, never mandatory
- fallback must be explicit and visible
- debug visibility is part of product quality
- privacy boundaries must be UI-visible, not just documented

## 絶対禁止

以下は勝手に実装しないこと。

- 常時マイク監視
- wake word
- Screen Capture
- OCR
- keylogger
- clipboard監視
- browser session scraping
- ChatGPT cookie/session auth
- unofficial ChatGPT login/session reuse
- file contentの自動読み取り
- raw filenameのデフォルト永続保存
- raw window title本文のデフォルト永続保存
- transcript履歴のデフォルト永続保存
- text input履歴のデフォルト永続保存
- OpenAI API key全文のログ表示
- OpenAI API key全文のmemory/export保存
- 外部AIへのraw filename送信
- 外部AIへのraw window title本文送信
- 外部AIへのfile content送信
- 外部AIへのtranscript履歴送信
- ユーザーに見えない外部送信
- release workflow成功の推測報告
- build失敗状態でのcommit/tag/release
- git reset --hard / git clean -fd の無断使用

## 開発ルール

- 1 version = 1主題
- 1 version で複数の大きな主題を混ぜない
- 大きな完成形を意識しつつ、実装は小さく分割する
- 各versionで最初に repo 状態を確認する
- 各versionで必ず docs/NEXT_SESSION.md を読む
- 未コミット差分がある場合は、まず差分の意味を報告する
- 差分が大きくなったら作業を止め、人間確認を挟む
- 新機能追加より regression 防止を優先する
- UI変更は実機QA観点を docs に残す
- provider / model / fallback / suppression reason は必ず見えるようにする
- release workflow は実際の success を確認してから報告する

## 各versionの必須検証

各versionの完了前に必ず実行する。

```bash
npm run build
cd src-tauri && cargo build && cd ..
git diff --check
```

version release を行う場合は以下を揃える。

- package.json
- package-lock.json がある場合は package-lock.json
- src-tauri/Cargo.toml
- src-tauri/Cargo.lock
- src-tauri/tauri.conf.json
- CHANGELOG.md
- docs/NEXT_SESSION.md
- docs/KNOWN_ISSUES.md

release する場合は以下を確認する。

- main push 成功
- annotated tag push 成功
- Release workflow success 確認
- Windows Installer artifact 確認
- latest.json / updater artifact が必要なら確認

## 現在の到達点

現在 v1.5.4 までrelease済み。
v1.6.0 Daily-use Beta は Day 0 / preflight まで進み、Day 1 実機QA待ちである。

v1.1.4 の到達点:

- OpenAI HTTP 429 を分類可能
- OpenAI failed / Ollama fallback の状態をUIで見える化
- effectiveProvider / effectiveModel / fallbackFrom / fallbackTo / safeReason / httpStatus を Debug / Diagnostics で表示
- OpenAI API key方式のみ対応
- ChatGPT login/session auth / cookie auth / browser session scraping は非目標としてdocsに明記
- speech bubble内スクロールバーを廃止
- 長文は短いプレビュー + 全文パネルで読む仕様
- Debug provider badge は維持
- Release workflow success 済み

v1.1.4 は「OpenAIまわりの混乱を解消し、吹き出し体験を壊さない」ためのhotfixとして成立している。

v1.2.0 の到達点:

- ReactionIntent system を追加
- autonomous / observation / manual / voice/text の発話に reactionIntent を付与
- Debug / Diagnostics / AIPage で intent/provider/model/status/fallback reason を表示
- speech_shown metadata に reactionIntent を保存
- 低品質fallback文を削除または強cooldown文へ置換
- OpenAI / Ollama / RuleProvider のいずれでも intent trace を追える状態にした
- Release workflow success 済み
- Windows installer / signature / latest.json artifact 確認済み

v1.3.0 の到達点:

- AppCategory を AI / chat / file_manager / installer / music 系まで拡張
- classificationReason / classificationSource を active app snapshot と debug に追加
- unknown app を process名と分類未登録 reason 付きで確認可能
- ユーザー定義分類 `customAppClassifications: Record<string, AppCategory>` を追加
- Observation Page から process名単位の分類保存・削除が可能
- raw window title / raw filename / file content は custom classification に保存しない
- Release workflow success 済み
- Windows installer / signature / latest.json artifact 確認済み

v1.4.0 の到達点:

- user-approved memory noteに category / pinned / includeInPrompt を追加
- 保存メモの一覧・編集・削除・固定・カテゴリ変更・発話利用ON/OFFが可能
- PromptBuilder / RuleProviderがincludeInPrompt=trueの保存メモだけを発話文脈に反映
- Debug / Diagnosticsでprompt投入対象memoryが見える
- Memory export JSONから保存メモだけをimport可能。発話ログ・観測ログはimportしない
- OpenAI送信はAI設定の「保存メモを送る」が別許可。OFFなら保存メモをOpenAI promptから除外
- Release workflow success 済み
- Windows installer / signature / latest.json artifact 確認済み

v1.5.0 の到達点:

- raw filename samplesはデフォルトOFF
- Watchful Modeでも自動ONにしない
- Desktop / Downloads直下のみ、最大10件まで揮発表示
- file contentは読まない
- MemoryEvent / Observation Timeline / Memory exportには保存しない
- OpenAI payload previewでは可視件数と別許可状態を表示するが、raw filenameは送信しない
- Debug / Diagnostics / Transparencyで現在見えているsamplesと境界を確認可能
- Release workflow success 済み
- Windows installer / signature / latest.json artifact 確認済み

v1.5.1 の到達点:

- v1.6.0 Daily-use Betaを即時完了扱いにせず、field QA gateをprepとして分離
- 1週間常駐QA / updater / installer / OpenAIなし / Ollama fallback / RuleProvider fallback / Memory v2 / Observation visibility / filename samples / Diagnostics の通過条件をdocsへ固定
- `docs/FIELD_QA_NOTES.md` へ日次記録フォーマットを追加
- critical issueなしを実機で確認するまではv1.6.0へ進まない方針を明記
- Release workflow success 済み
- Windows installer / signature / latest.json artifact 確認済み

v1.5.2 の到達点:

- `docs/DAILY_USE_BETA_CHECKLIST.md` をv1.6.0 Daily-use Beta向けに刷新
- preflight / automated checks / 7日間常駐QA / product gates / privacy boundary regression checks / release criteria を1つのrunbookへ整理
- 古いv0.2.0 checklistを現在のOpenAI / Ollama / RuleProvider / Memory v2 / filename samples / Diagnostics基準へ更新
- 実機QA未実施項目はpendingのまま維持
- Release workflow success 済み
- Windows installer / signature / latest.json artifact 確認済み

v1.5.3 の到達点:

- `scripts/daily-use-beta-preflight.sh` を追加
- `npm run qa:preflight` でbranch / working tree / version files / latest tag / Release workflow / release assets / known issuesをread-only確認可能
- `docs/DAILY_USE_BETA_CHECKLIST.md` のPreflightへ実行手順を追加
- preflightはfield QA通過判定ではなく、v1.6.0 QA開始前の入口確認に限定
- Release workflow success 済み
- Windows installer / signature / latest.json artifact 確認済み

v1.5.4 の到達点:

- `npm run qa:preflight` のGitHub照会をretry付きに変更
- Release workflow / release assets確認をJSONベースへ変更
- GitHub APIの一時的な接続揺れでpreflightが誤warningを出しにくい状態にした
- Release workflow success 済み
- Windows installer / signature / latest.json artifact 確認済み
- release後の `npm run qa:preflight` は failures 0 / warnings 0 確認済み

v1.6.0 Daily-use Beta Day 0 の到達点:

- `npm run qa:preflight` をnetwork access runで実行し、failures 0 / warnings 0 を確認
- `docs/V1_6_FIELD_QA_AUDIT.md` を追加し、完成判定20項目とv1.6.0 release criteriaの未達証拠を明示
- `docs/FIELD_QA_NOTES.md` にDay 1 worksheetを追加
- 7日間常駐QA、installer/updater実機経路、OpenAI/Ollama/RuleProvider、Memory v2、Observation/Diagnostics、filename samples、UI comfortは未通過のまま維持

## 直近の次の一手

まず v1.6.0 Daily-use Beta Day 1 の実機QA結果を踏まえる。

問題があれば v1.5.x hotfix として最小修正する。
問題がなければ Day 2 以降のfield QAへ進む。

v1.1.4 QA観点:

- OpenAI test で 429 safeReason が分かりやすく出るか
- OpenAI failed → Ollama fallback が明確に読めるか
- Debug / Diagnostics で effectiveProvider / effectiveModel が見えるか
- 吹き出し内スクロールバーが消えているか
- 長文時に全文パネルで読めるか
- provider/model badge が Debug Mode時だけ出るか
- Memory export の speech_shown に aiProvider / aiModel / aiStatus が入るか
- 低品質fallback文が出た時に provider/source を追えるか
- OpenAI APIが使えない状態でもアプリ全体が破綻しないか

## Phase 1: v1.1.x 安定化

目的:
見える・壊れない・切り分けられる状態を完成させる。

対象:

- OpenAI fallback表示
- provider/model trace
- speech_shown metadata
- speech bubble全文パネル
- memory export確認
- diagnostics/debug整備
- QA checklist整備

完了条件:

- v1.1.4または必要ならv1.1.5で、OpenAI失敗時・Ollama fallback時・RuleProvider fallback時の区別がUI上で明確
- speech bubble長文表示が不快でない
- v1.1.xのknown issuesがdocsに整理されている

## Phase 2: v1.2.0 発話人格改善

目的:
発話の単調さを本質的に改善する。

必須実装:

- ReactionIntent system
- 発話意図の明示的選択
- ObservationSignal / topSignal の利用
- app category の利用
- saved memory notes の利用
- recent speech history による重複防止
- low quality fallback文の削除または強cooldown
- autonomous / manual click / observation reaction の発話品質改善
- Debugに intent / provider / model / fallback reason を表示

ReactionIntent候補:

```ts
type ReactionIntent =
  | "quiet_presence"
  | "observation"
  | "suggestion"
  | "question"
  | "memory_reflection"
  | "creative_prompt"
  | "technical_prompt"
  | "cleanup_prompt"
  | "focus_support"
  | "playful"
  | "careful_warning";
```

禁止または強cooldown対象:

- 昼も静かだ。続きを。
- 静かだね
- 作業中？
- そこにいるよ
- ここにいる。
- ...
- ん
- 呼んだ？
- 何かしているのか
- 何か動かしているのか

完了条件:

- 30分常駐しても同じ文が短時間で連発しない
- autonomous発話で必ず intent がtraceされる
- OpenAI/Ollama/RuleProviderのいずれでも intent/provider/model/status が追跡できる
- npm run build 成功
- cargo build 成功
- git diff --check 成功
- CHANGELOG/NEXT_SESSION/KNOWN_ISSUES 更新
- v1.2.0 release workflow success

## Phase 3: v1.3.0 App Classification

目的:
unknown appを減らし、ユーザー定義分類を可能にする。

必須分類候補:

- ChatGPT.exe
- Claude.exe
- Perplexity
- Copilot
- Cursor
- Windsurf
- Zed
- Obsidian
- Logseq
- Figma
- Photoshop
- Illustrator
- Blender
- 7zip
- WinRAR
- Bandizip
- Bitwig
- Ableton
- Reaper
- VSCode
- terminal系
- browser系
- chat系
- notes系
- design系
- archive_tool系
- document系
- ai_chat系
- ai_assistant系
- ai_search系

追加したい型:

```ts
type AppCategory =
  | "browser"
  | "terminal"
  | "ide"
  | "daw"
  | "music"
  | "media"
  | "game"
  | "chat"
  | "design"
  | "file_manager"
  | "archive_tool"
  | "installer"
  | "document"
  | "notes"
  | "system"
  | "self"
  | "ai_chat"
  | "ai_assistant"
  | "ai_search"
  | "unknown";
```

user custom classification:

```ts
customAppClassifications: Record<string, AppCategory>
```

完了条件:

- unknownがDebugでprocess名付きで見える
- 分類理由がDebug/Diagnosticsで見える
- ユーザー定義分類の保存設計がある
- 可能なら最小UIも実装
- classification tableのテストまたは簡易検証がある

## Phase 4: v1.4.0 Memory v2

目的:
明示保存された記憶を本当に使えるものにする。

必須:

- user-approved memory一覧
- edit
- delete
- pin
- category
- prompt inclusion policy
- memory privacy UI
- memory export/import整理

memory categories候補:

- preference
- project
- creative_direction
- technical_context
- personal_note
- avoid
- style_preference

完了条件:

- ユーザーが保存した記憶を編集・削除できる
- promptに入ったmemoryがDebugで確認できる
- memoryが発話に自然に反映される
- transcript/text input/raw filenameが勝手にlong-term memory化されない

## Phase 5: v1.5.0 Optional Filename Samples

目的:
ユーザーが明示ONした場合のみ、最近のファイル名サンプルを一時的に見られるようにする。

条件:

- デフォルトOFF
- Watchful Modeでも自動ONにしない
- Downloads/Desktopなど許可フォルダのみ
- 最大5〜10件
- file contentは読まない
- memory/exportに保存しない
- Observation Timelineにraw filenameを保存しない
- OpenAI送信は別許可
- Debug/Diagnosticsで現在見えているサンプルを確認できる
- 外部AI送信前にpayload previewで確認できる

設定候補:

```ts
filenameSamplesEnabled: boolean
filenameSamplesMaxCount: number
filenameSamplesSendToAI: boolean
```

完了条件:

- raw filename samples が明示ON時だけ揮発表示される
- exportに入らない
- OpenAI送信は別ON
- UIで危険性と範囲が明記されている

## Phase 6: v1.6.0 Daily-use Beta

目的:
普段使いできる安定性を確認する。

必須:

- 1週間常駐QA
- updater確認
- installer確認
- crashなし
- memory export/import安定
- OpenAIなしでも動く
- OpenAIありでも境界が見える
- fallback時も破綻しない
- diagnostics/debugで原因切り分け可能

完了条件:

- 1週間QA checklistがdocsにある
- known issuesが整理されている
- critical issueなし
- daily-use betaとしてtag/release可能

## Phase 7: v2以降の候補

v2以降でのみ検討する。
勝手に実装しない。

- one-shot screen inspection
- OCR
- richer voice
- TTS
- plugin system
- multiple characters
- external tool integration
- project mode
- Obsidian integration
- Bitwig integration
- local RAG
- custom personality packs

## /goal 運用ルール

この巨大goalは北極星として保持する。
実装作業は必ず次の形式で進める。

1. 現在の repo 状態確認
2. docs/NEXT_SESSION.md を読む
3. 現在のversionと最新tag確認
4. 未コミット差分確認
5. 次に着手する最小versionを提案
6. 必要なら人間確認
7. 実装
8. build/cargo/diff check
9. docs更新
10. commit
11. push
12. tag
13. release workflow確認
14. 実機QA項目を提示

## 最初に必ず実行すること

この goal を設定した直後は、まず以下を行う。

```bash
git status
git branch --show-current
git log --oneline --decorate --graph -20
git tag --sort=-creatordate | head -10
git diff --stat
cat package.json | grep version
grep '^version' src-tauri/Cargo.toml
grep '"version"' src-tauri/tauri.conf.json
```

その後、以下を読む。

```bash
sed -n '1,220p' docs/NEXT_SESSION.md
sed -n '1,220p' docs/KNOWN_ISSUES.md
sed -n '1,180p' CHANGELOG.md
```

## 最初の判断

現在のrepo状態とdocsを確認したうえで、次に着手すべき最小versionを判断してよい。

判断基準:

- v1.1.4 QA由来の明確な不具合が残っている場合は v1.1.5 hotfix を優先する
- v1.1.4 が安定している場合は v1.2.0 ReactionIntent system に進む
- どちらに進む場合も、必ず 1 version = 1主題 を守る
- 大きすぎる差分になりそうなら、prep version に分割する

## 最初の報告で必ず出すこと

実装前に以下を報告する。

1. 現在のbranch
2. working treeがcleanか
3. 最新version
4. 最新tag
5. mainとorigin/mainの差分
6. docs/NEXT_SESSION.md上の次タスク
7. 現在のknown issues
8. 次に着手すべき最小version案
9. そのversionで触る予定ファイル
10. 実装前に人間確認が必要か

ただし、明確な次versionが判断でき、作業範囲が小さく、上記の禁止事項に触れない場合は、そのまま実装に進んでよい。
不確実性が高い場合、差分が大きくなる場合、設計判断が必要な場合は、実装前に止まって報告すること。

## 重要

この巨大goalを一度で完了させようとしない。
各versionの完了条件を満たしながら、最終完成判定20項目をすべて満たす状態に到達したときに、この goal を完了とする。

今すぐ行うことは、現在のrepo状態とdocsを確認し、v1.1.5 hotfixが必要か、v1.2.0 ReactionIntent systemへ進むべきかを判断し、可能なら次の最小versionを実装・検証・releaseすることである。
