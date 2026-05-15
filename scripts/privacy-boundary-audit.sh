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

printf '\n%s\n' '--- OpenAI API key boundary ---'

KEY_MEMORY_REFS="$(rg -n "openaiApiKey|apiKey|Authorization|Bearer" src/systems/memory src/settings/pages/MemoryPage.tsx || true)"
if [[ -n "$KEY_MEMORY_REFS" ]]; then
  printf '%s\n' "$KEY_MEMORY_REFS"
  fail "OpenAI API key reference found in memory/export implementation"
else
  pass "no OpenAI API key references found in memory/export implementation"
fi

AUTH_REFS="$(rg -n "Authorization.*Bearer|Bearer \\\$\\{" src src-tauri \
  --glob '!src-tauri/gen/**' \
  --glob '!src-tauri/target/**' \
  --glob '!src-tauri/Cargo.lock' || true)"
if [[ -z "$AUTH_REFS" ]]; then
  warn "no Authorization Bearer reference found; verify OpenAI provider transport did not move"
else
  printf '%s\n' "$AUTH_REFS"
  BAD_AUTH_REFS="$(printf '%s\n' "$AUTH_REFS" | rg -v "src/companion/ai/OpenAIProvider\.ts" || true)"
  if [[ -n "$BAD_AUTH_REFS" ]]; then
    printf '%s\n' "$BAD_AUTH_REFS"
    fail "Authorization Bearer reference outside OpenAIProvider"
  else
    pass "Authorization Bearer reference is limited to OpenAIProvider"
  fi
fi

if rg -n "console\.(log|warn|error|debug).*openaiApiKey|console\.(log|warn|error|debug).*apiKey|openaiApiKey.*console\." src \
  --glob '!src-tauri/gen/**' \
  --glob '!src-tauri/target/**'; then
  fail "possible OpenAI API key logging reference found"
else
  pass "no obvious OpenAI API key console logging references found"
fi

if rg -n "openaiApiKey" src/settings/defaults.ts src/settings/types.ts src/settings/pages/AIPage.tsx; then
  warn "OpenAI API key is still a settings/localStorage field; verify UI warning and future credential-store migration"
fi

if rg -n "API key は現在 .*localStorage に平文保存|raw ファイル名・ウィンドウタイトル・transcript 履歴は送りません" src/settings/pages/AIPage.tsx; then
  pass "OpenAI settings UI includes localStorage and raw payload boundary warning text"
else
  fail "OpenAI settings UI warning text not found"
fi

printf '\n%s\n' '--- Tauri capability permissions ---'

if rg -n "\"(fs|shell|http|clipboard|global-shortcut):" src-tauri/capabilities; then
  fail "broad or sensitive frontend capability permission found"
else
  pass "no fs/shell/http/clipboard/global-shortcut frontend permissions found"
fi

if rg -n "\"updater:default\"|\"autostart:allow-" src-tauri/capabilities; then
  warn "updater/autostart frontend permissions found; verify UI-triggered behavior during field QA"
fi

printf '\n=== Summary ===\n'
printf 'Failures: %s\n' "$FAILURES"
printf 'Warnings: %s\n' "$WARNINGS"

if [[ "$FAILURES" -gt 0 ]]; then
  exit 1
fi

exit 0
