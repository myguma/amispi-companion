#!/usr/bin/env bash
# Read-only source audit for v1.6.0 privacy-boundary QA.
# This script reports obvious forbidden API references in implementation files.
# It does not inspect runtime behavior and does not mark field QA as passed.

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

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

if ! command_exists rg; then
  fail "rg is required"
  printf 'Failures: %s\nWarnings: %s\n' "$FAILURES" "$WARNINGS"
  exit 1
fi

printf '=== AmitySpirit Companion Privacy Boundary Audit ===\n\n'

printf '%s\n' '--- Forbidden monitoring APIs ---'

if rg -n "navigator\.clipboard|@tauri-apps/plugin-clipboard|keylog|SetWindowsHookEx" src src-tauri \
  --glob '!src-tauri/gen/**' \
  --glob '!src-tauri/target/**' \
  --glob '!src-tauri/Cargo.lock'; then
  fail "forbidden clipboard/keylogging reference found"
else
  pass "no forbidden clipboard/keylogging references in source"
fi

if rg -n "global_shortcut|plugin-global-shortcut|globalShortcut" src src-tauri/Cargo.toml \
  --glob '!src-tauri/gen/**' \
  --glob '!src-tauri/target/**' \
  --glob '!src-tauri/Cargo.lock'; then
  warn "global shortcut reference found; verify it is limited to visible app toggle and not keylogging"
else
  pass "no global shortcut references in source"
fi

printf '\n%s\n' '--- Screen capture / OCR implementation APIs ---'

if rg -n "getDisplayMedia|screencapture|x11grab|ImageGrab|tesseract" src src-tauri \
  --glob '!src-tauri/gen/**' \
  --glob '!src-tauri/target/**' \
  --glob '!src-tauri/Cargo.lock'; then
  fail "screen capture/OCR implementation reference found"
else
  pass "no screen capture/OCR implementation references in source"
fi

if rg -n "screenUnderstandingEnabled|ocrEnabled" src src-tauri \
  --glob '!src-tauri/gen/**' \
  --glob '!src-tauri/target/**' \
  --glob '!src-tauri/Cargo.lock'; then
  warn "future screen/OCR setting flag found; verify it remains default OFF and has no capture implementation"
fi

printf '\n%s\n' '--- Voice capture boundary ---'

VOICE_REFS="$(rg -n "getUserMedia|MediaRecorder" src src-tauri \
  --glob '!src-tauri/gen/**' \
  --glob '!src-tauri/target/**' \
  --glob '!src-tauri/Cargo.lock' || true)"

if [[ -z "$VOICE_REFS" ]]; then
  warn "no getUserMedia/MediaRecorder references found; voice UI may be disabled or moved"
else
  printf '%s\n' "$VOICE_REFS"
  BAD_VOICE_REFS="$(printf '%s\n' "$VOICE_REFS" | rg -v "src/systems/voice/useVoiceRecorder\.ts|src/App\.tsx" || true)"
  if [[ -n "$BAD_VOICE_REFS" ]]; then
    printf '%s\n' "$BAD_VOICE_REFS"
    fail "voice capture references outside expected push-to-talk files"
  else
    pass "voice capture references are limited to expected push-to-talk files"
  fi
fi

printf '\n%s\n' '--- External AI raw payload boundary strings ---'

if rg -n "rawFilenamesSent: true|rawWindowTitleSent: true|rawTranscriptHistorySent: true" src src-tauri \
  --glob '!src-tauri/gen/**' \
  --glob '!src-tauri/target/**' \
  --glob '!src-tauri/Cargo.lock'; then
  fail "raw external payload send flag appears to be true"
else
  pass "no true raw external payload send flags found"
fi

printf '\n=== Summary ===\n'
printf 'Failures: %s\n' "$FAILURES"
printf 'Warnings: %s\n' "$WARNINGS"

if [[ "$FAILURES" -gt 0 ]]; then
  exit 1
fi

exit 0
