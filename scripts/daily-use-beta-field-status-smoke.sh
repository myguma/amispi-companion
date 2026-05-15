#!/usr/bin/env bash
# Smoke test for qa:field-status behavior.
# Read-only: verifies the status gate fails while documented blockers remain,
# and succeeds only when release readiness evidence is complete.

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

FAILURES=0
WARNINGS=0

pass() {
  printf '[OK] %s\n' "$1"
}

fail() {
  printf '[FAIL] %s\n' "$1"
  FAILURES=$((FAILURES + 1))
}

warn() {
  printf '[WARN] %s\n' "$1"
  WARNINGS=$((WARNINGS + 1))
}

expect_output() {
  local output_file="$1"
  local text="$2"
  if grep -Fq "$text" "$output_file"; then
    pass "field-status output contains: $text"
  else
    fail "field-status output missing: $text"
  fi
}

pending_markers=0

if rg -q "\| Day [1-7] \| pending \|" docs/DAILY_USE_BETA_CHECKLIST.md; then
  pending_markers=$((pending_markers + 1))
fi

if rg -q "\| v1\.6\.0 Day [1-7] \| pending \|" docs/KNOWN_ISSUES.md; then
  pending_markers=$((pending_markers + 1))
fi

if rg -q "\| Critical issueなし \| pending \|" docs/KNOWN_ISSUES.md; then
  pending_markers=$((pending_markers + 1))
fi

output_file="$(mktemp)"
trap 'rm -f "$output_file"' EXIT

if npm run qa:field-status > "$output_file" 2>&1; then
  status=0
else
  status=$?
fi

if [[ "$pending_markers" -gt 0 ]]; then
  if [[ "$status" -eq 0 ]]; then
    fail "qa:field-status succeeded despite pending field QA markers"
  else
    pass "qa:field-status blocks while pending field QA markers remain"
  fi
  expect_output "$output_file" "Release ready: no"
  expect_output "$output_file" "[BLOCKED]"
else
  if [[ "$status" -eq 0 ]]; then
    pass "qa:field-status succeeds with no pending field QA markers"
    expect_output "$output_file" "Release ready: yes"
  else
    fail "qa:field-status failed with no pending field QA markers"
    warn "field-status output follows"
    cat "$output_file"
  fi
fi

printf '\n=== Summary ===\n'
printf 'Failures: %s\n' "$FAILURES"
printf 'Warnings: %s\n' "$WARNINGS"

if [[ "$FAILURES" -gt 0 ]]; then
  exit 1
fi

exit 0
