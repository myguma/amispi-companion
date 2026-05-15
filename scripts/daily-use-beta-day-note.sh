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
