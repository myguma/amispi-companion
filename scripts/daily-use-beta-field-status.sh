#!/usr/bin/env bash
# Read-only completion gate for v1.6.0 Daily-use Beta field QA.
# This script summarizes checklist status and exits non-zero while field QA
# evidence is still pending. It does not edit docs or mark QA as passed.

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

CHECKLIST="docs/DAILY_USE_BETA_CHECKLIST.md"
FIELD_NOTES="docs/FIELD_QA_NOTES.md"
KNOWN_ISSUES="docs/KNOWN_ISSUES.md"

BLOCKERS=0
WARNINGS=0

pass() {
  printf '[OK] %s\n' "$1"
}

blocker() {
  printf '[BLOCKED] %s\n' "$1"
  BLOCKERS=$((BLOCKERS + 1))
}

warn() {
  printf '[WARN] %s\n' "$1"
  WARNINGS=$((WARNINGS + 1))
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

require_file() {
  if [[ ! -f "$1" ]]; then
    blocker "required file missing: $1"
    return 1
  fi
  return 0
}

table_status() {
  local file="$1"
  local label="$2"
  awk -F'|' -v wanted="$label" '
    $0 ~ /^\|/ {
      key = $2
      value = $3
      gsub(/^[ \t]+|[ \t]+$/, "", key)
      gsub(/^[ \t]+|[ \t]+$/, "", value)
      if (key == wanted) {
        print value
        exit
      }
    }
  ' "$file"
}

check_status() {
  local group="$1"
  local label="$2"
  local status="$3"
  if [[ "$status" == "passed" || "$status" == "accepted" ]]; then
    pass "$group: $label is $status"
  elif [[ -z "$status" ]]; then
    blocker "$group: $label status not found"
  else
    blocker "$group: $label is $status"
  fi
}

printf '=== AmitySpirit Companion v1.6.0 Field QA Status ===\n\n'

for file in "$CHECKLIST" "$FIELD_NOTES" "$KNOWN_ISSUES"; do
  require_file "$file" || true
done

if [[ "$BLOCKERS" -gt 0 ]]; then
  printf '\n=== Summary ===\n'
  printf 'Release ready: no\n'
  printf 'Blockers: %s\nWarnings: %s\n' "$BLOCKERS" "$WARNINGS"
  exit 1
fi

printf '%s\n' '--- Repo state ---'

if command_exists git; then
  branch="$(git branch --show-current 2>/dev/null || true)"
  [[ -n "$branch" ]] && pass "branch: $branch" || warn "branch name unavailable"

  if [[ -n "$(git status --short 2>/dev/null || true)" ]]; then
    blocker "working tree is not clean"
  else
    pass "working tree is clean"
  fi

  ahead_behind="$(git rev-list --left-right --count main...origin/main 2>/dev/null || true)"
  if [[ -z "$ahead_behind" ]]; then
    warn "main/origin comparison unavailable"
  elif [[ "$ahead_behind" == $'0\t0' || "$ahead_behind" == "0 0" ]]; then
    pass "main and origin/main match"
  else
    blocker "main and origin/main differ: $ahead_behind"
  fi
else
  warn "git is unavailable"
fi

printf '\n%s\n' '--- 7-day residency QA ---'
for day in 1 2 3 4 5 6 7; do
  status="$(table_status "$CHECKLIST" "Day $day")"
  check_status "7-day residency QA" "Day $day" "$status"
done

if grep -q "Day 1判定: pending" "$FIELD_NOTES"; then
  blocker "FIELD_QA_NOTES Day 1判定 is still pending"
elif grep -q "Day 1判定: passed" "$FIELD_NOTES"; then
  pass "FIELD_QA_NOTES Day 1判定 is passed"
else
  warn "FIELD_QA_NOTES Day 1判定 not found"
fi

printf '\n%s\n' '--- Product gates ---'
for gate in \
  "起動安定性" \
  "installer" \
  "updater" \
  "OpenAIなし" \
  "OpenAIあり" \
  "Ollama fallback" \
  "RuleProvider fallback" \
  "ReactionIntent" \
  "発話品質" \
  "Memory v2" \
  "Memory privacy" \
  "Observation visibility" \
  "Storage visibility" \
  "Filename samples" \
  "Diagnostics" \
  "UI comfort"
do
  status="$(table_status "$CHECKLIST" "$gate")"
  check_status "Product gate" "$gate" "$status"
done

printf '\n%s\n' '--- Privacy boundary regression checks ---'
for boundary in \
  "常時マイク監視なし" \
  "Screen Capture / OCRなし" \
  "raw filename external sendなし" \
  "file content readなし" \
  "transcript履歴保存なし" \
  "API key全文表示なし" \
  "hidden external sendなし"
do
  status="$(table_status "$CHECKLIST" "$boundary")"
  check_status "Privacy boundary" "$boundary" "$status"
done

printf '\n%s\n' '--- Known issues ---'
day1_status="$(table_status "$KNOWN_ISSUES" "v1.6.0 Day 1")"
check_status "Known issue" "v1.6.0 Day 1" "$day1_status"

printf '\n=== Summary ===\n'
if [[ "$BLOCKERS" -gt 0 ]]; then
  printf 'Release ready: no\n'
else
  printf 'Release ready: yes\n'
fi
printf 'Blockers: %s\nWarnings: %s\n' "$BLOCKERS" "$WARNINGS"

if [[ "$BLOCKERS" -gt 0 ]]; then
  exit 1
fi

exit 0
