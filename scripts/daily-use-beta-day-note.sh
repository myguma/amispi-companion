#!/usr/bin/env bash
# Print a field-QA note template for v1.6.0 Daily-use Beta.
# Read-only: this script does not edit docs or mark any QA item as passed.

set -uo pipefail

DAY="${1:-1}"
DATE_VALUE="${2:-$(date +%F)}"

case "$DAY" in
  1)
    cat <<EOF
### v1.6.0 Daily-use QA Day 1

- 日付: ${DATE_VALUE}
- 実行時間:
- 起動経路: installer / updater / dev build
- QA対象: v1.5.4 release artifact / main dev build
- app version:
- OS / environment:
- AI provider構成:
- 起動結果:
- 2時間常駐結果:
- crash / freeze / 操作不能:
- companion表示 / click / drag / right click:
- settings open / close:
- Debugで確認できた項目:
  - current provider / model:
  - reactionIntent:
  - fallback reason:
  - suppression reason:
  - observation snapshot / current app:
  - memory / saved notes summary:
- Diagnosticsで確認できた項目:
  - observation enabled / disabled scope:
  - storage / non-storage boundary:
  - external AI send scope:
  - provider status:
  - fallback status:
- speech bubble / full text panel:
- provider/model badge表示条件:
- UpdateBadge / hit test:
- 気になった発話:
- privacy boundary issue:
- critical issue:
- evidence links / screenshots:
- Day 1判定: pending / passed / failed
- 次の対応:
EOF
    ;;
  2)
    cat <<EOF
### v1.6.0 Daily-use QA Day 2

- 日付: ${DATE_VALUE}
- 実行時間:
- 起動経路: installer / updater / dev build
- QA対象: v1.5.4 release artifact / main dev build
- AI provider構成: OpenAIなし / Ollama未起動 / RuleProvider
- OpenAIなし結果:
- Ollama未起動 / model missing / timeout結果:
- RuleProvider fallback結果:
- provider / model / status visibility:
- fallback reason visibility:
- crash / freeze:
- critical issue:
- Day 2判定: pending / passed / failed
- 次の対応:
EOF
    ;;
  3)
    cat <<EOF
### v1.6.0 Daily-use QA Day 3

- 日付: ${DATE_VALUE}
- 実行時間:
- 起動経路: installer / updater / dev build
- QA対象: v1.5.4 release artifact / main dev build
- Memory v2 操作:
  - note add:
  - note edit:
  - note delete:
  - pin / category / includeInPrompt:
  - export:
  - import:
- prompt投入対象memory visibility:
- Memory exportに入っていたもの:
- Memory exportに入っていなかったもの:
- transcript / text input / raw filename long-term保存:
- crash / freeze:
- critical issue:
- Day 3判定: pending / passed / failed
- 次の対応:
EOF
    ;;
  4)
    cat <<EOF
### v1.6.0 Daily-use QA Day 4

- 日付: ${DATE_VALUE}
- 実行時間:
- 起動経路: installer / updater / dev build
- QA対象: v1.5.4 release artifact / main dev build
- Observation visibility:
  - 見ている範囲:
  - 見ていない範囲:
  - 保存している範囲:
  - 保存していない範囲:
- current app / process / category / reason visibility:
- unknown app visibility:
- custom app classification add/edit/delete:
- Debug / Diagnostics / Transparencyで確認できた項目:
- raw window title / raw filename保存:
- crash / freeze:
- critical issue:
- Day 4判定: pending / passed / failed
- 次の対応:
EOF
    ;;
  5)
    cat <<EOF
### v1.6.0 Daily-use QA Day 5

- 日付: ${DATE_VALUE}
- 実行時間:
- 起動経路: installer / updater / dev build
- QA対象: v1.5.4 release artifact / main dev build
- filename samples default OFF:
- Watchful Modeで自動ONにならない:
- 明示ON時の表示:
- max count / folder scope:
- Debug / Diagnostics / Transparency visibility:
- OpenAI payload preview:
  - rawFilenamesSent:
  - filenameSamplesSendToAI:
- Memory export / Observation Timeline / speech_shownにraw filename:
- file content read:
- crash / freeze:
- critical issue:
- Day 5判定: pending / passed / failed
- 次の対応:
EOF
    ;;
  6)
    cat <<EOF
### v1.6.0 Daily-use QA Day 6

- 日付: ${DATE_VALUE}
- 実行時間:
- 起動経路: installer / updater / dev build
- QA対象: v1.5.4 release artifact / main dev build
- installer新規実行:
- installer上書き実行:
- settings / memory保持:
- updater確認:
  - latest.json:
  - signature:
  - update check UI:
  - failure message:
- release artifact確認:
  - installer:
  - .sig:
  - latest.json:
- autostart permission behavior:
- crash / freeze:
- critical issue:
- Day 6判定: pending / passed / failed
- 次の対応:
EOF
    ;;
  7)
    cat <<EOF
### v1.6.0 Daily-use QA Day 7

- 日付: ${DATE_VALUE}
- 実行時間:
- 起動経路: installer / updater / dev build
- QA対象: v1.5.4 release artifact / main dev build
- 通常作業中のcomfort:
- 変な監視アプリに見えないか:
- speech quality:
  - 単調さ:
  - 説教臭さ:
  - 長すぎ / 短すぎ:
  - 低品質fallback:
- ReactionIntent / provider / model / status trace:
- suppression reason visibility:
- fallback reason visibility:
- 7日間累積のcrash / freeze / 操作不能:
- unresolved critical issue:
- known issues更新要否:
- v1.6.0 release可否:
- Day 7判定: pending / passed / failed
- 次の対応:
EOF
    ;;
  *)
    cat <<EOF
### v1.6.0 Daily-use QA Day ${DAY}

- 日付: ${DATE_VALUE}
- 実行時間:
- 起動経路: installer / updater / dev build
- QA対象: release artifact / main dev build
- AI provider構成: OpenAI / Ollama / RuleProvider
- 主要作業:
- crash / freeze:
- updater / installer:
- memory export/import:
- observation / diagnostics:
- filename samples:
- 気になった発話:
- critical issue:
- Day ${DAY}判定: pending / passed / failed
- 次の対応:
EOF
    ;;
esac
