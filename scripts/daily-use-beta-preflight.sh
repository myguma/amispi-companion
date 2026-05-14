#!/usr/bin/env bash
# Read-only preflight for v1.6.0 Daily-use Beta QA.
# This script does not mark field QA as passed; it only checks whether the repo
# and latest release are in a sane state before starting daily-use testing.

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

capture_with_retry() {
  local output_file="$1"
  shift
  local attempts=3
  local delay=2
  local attempt=1

  : > "$output_file"
  while [[ "$attempt" -le "$attempts" ]]; do
    if "$@" > "$output_file" 2>/dev/null; then
      return 0
    fi
    sleep "$delay"
    attempt=$((attempt + 1))
  done

  return 1
}

json_value() {
  node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); console.log(process.argv.slice(2).reduce((v,k)=>v && v[k], data) ?? '')" "$@"
}

printf '=== AmitySpirit Companion Daily-use Beta Preflight ===\n\n'

if ! command_exists git; then
  fail "git is required"
else
  BRANCH="$(git branch --show-current 2>/dev/null || true)"
  if [[ "$BRANCH" == "main" ]]; then
    pass "branch is main"
  else
    fail "branch is '$BRANCH' (expected main)"
  fi

  STATUS="$(git status --short 2>/dev/null || true)"
  if [[ -z "$STATUS" ]]; then
    pass "working tree is clean"
  else
    fail "working tree has uncommitted changes"
    printf '%s\n' "$STATUS"
  fi

  AHEAD_BEHIND="$(git rev-list --left-right --count main...origin/main 2>/dev/null || true)"
  if [[ "$AHEAD_BEHIND" == "0"$'\t'"0" || "$AHEAD_BEHIND" == "0 0" ]]; then
    pass "main and origin/main match"
  else
    warn "main...origin/main is '$AHEAD_BEHIND' (expected 0 0)"
  fi
fi

printf '\n--- Version files ---\n'

if ! command_exists node; then
  fail "node is required for JSON version checks"
  PKG_VERSION=""
else
  PKG_VERSION="$(json_value package.json version 2>/dev/null || true)"
  LOCK_VERSION="$(json_value package-lock.json version 2>/dev/null || true)"
  LOCK_ROOT_VERSION="$(json_value package-lock.json packages '' version 2>/dev/null || true)"
  TAURI_VERSION="$(json_value src-tauri/tauri.conf.json version 2>/dev/null || true)"
  CARGO_VERSION="$(awk '
    /^version = / { gsub(/"/, "", $3); print $3; exit }
  ' src-tauri/Cargo.toml)"
  CARGO_LOCK_VERSION="$(awk '
    $0 == "name = \"amispi-companion\"" { found=1; next }
    found && /^version = / { gsub(/"/, "", $3); print $3; exit }
  ' src-tauri/Cargo.lock)"

  printf 'package.json:          %s\n' "$PKG_VERSION"
  printf 'package-lock.json:     %s\n' "$LOCK_VERSION"
  printf 'package-lock root:     %s\n' "$LOCK_ROOT_VERSION"
  printf 'Cargo.toml:            %s\n' "$CARGO_VERSION"
  printf 'Cargo.lock:            %s\n' "$CARGO_LOCK_VERSION"
  printf 'tauri.conf.json:       %s\n' "$TAURI_VERSION"

  if [[ -n "$PKG_VERSION" \
      && "$PKG_VERSION" == "$LOCK_VERSION" \
      && "$PKG_VERSION" == "$LOCK_ROOT_VERSION" \
      && "$PKG_VERSION" == "$CARGO_VERSION" \
      && "$PKG_VERSION" == "$CARGO_LOCK_VERSION" \
      && "$PKG_VERSION" == "$TAURI_VERSION" ]]; then
    pass "version files match ($PKG_VERSION)"
  else
    fail "version files do not match"
  fi
fi

printf '\n--- Latest tag and release ---\n'

if command_exists git && [[ -n "${PKG_VERSION:-}" ]]; then
  EXPECTED_TAG="v$PKG_VERSION"
  LATEST_TAG="$(git tag --sort=-creatordate | head -1)"
  if [[ "$LATEST_TAG" == "$EXPECTED_TAG" ]]; then
    pass "latest tag is $EXPECTED_TAG"
  else
    warn "latest tag is '$LATEST_TAG' (expected $EXPECTED_TAG after release)"
  fi
else
  warn "skipping latest tag check"
fi

if ! command_exists gh; then
  warn "gh is not available; skipping GitHub release checks"
else
  if [[ -n "${EXPECTED_TAG:-}" ]]; then
    RUN_FILE="$(mktemp)"
    RELEASE_FILE="$(mktemp)"
    trap 'rm -f "${RUN_FILE:-}" "${RELEASE_FILE:-}"' EXIT

    if capture_with_retry "$RUN_FILE" gh run list --limit 20 --json headBranch,workflowName,status,conclusion; then
      RUN_MATCH="$(node -e "
const fs = require('fs');
const tag = process.argv[1];
const runs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const run = runs.find((r) => r.headBranch === tag && /Release/.test(r.workflowName || ''));
if (run) console.log([run.status, run.conclusion].join(' '));
" "$EXPECTED_TAG" "$RUN_FILE" 2>/dev/null || true)"
    else
      RUN_MATCH=""
    fi

    if [[ "$RUN_MATCH" == "completed success" ]]; then
      pass "release workflow succeeded for $EXPECTED_TAG"
    else
      warn "release workflow success not found for $EXPECTED_TAG"
    fi

    if ! capture_with_retry "$RELEASE_FILE" gh release view "$EXPECTED_TAG" --json assets,isDraft,isPrerelease,tagName; then
      warn "GitHub release not found for $EXPECTED_TAG"
    else
      RELEASE_TAG="$(node -e "const fs=require('fs'); console.log(JSON.parse(fs.readFileSync(process.argv[1], 'utf8')).tagName || '')" "$RELEASE_FILE" 2>/dev/null || true)"
      if [[ "$RELEASE_TAG" == "$EXPECTED_TAG" ]]; then
        pass "GitHub release exists for $EXPECTED_TAG"
      else
        warn "GitHub release tag mismatch for $EXPECTED_TAG"
      fi

      SETUP_NAME="amispi-companion_${PKG_VERSION}_x64-setup.exe"
      HAS_SETUP="$(node -e "
const fs = require('fs');
const name = process.argv[1];
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log((data.assets || []).some((asset) => asset.name === name) ? 'yes' : 'no');
" "$SETUP_NAME" "$RELEASE_FILE" 2>/dev/null || true)"
      if [[ "$HAS_SETUP" == "yes" ]]; then
        pass "installer asset exists ($SETUP_NAME)"
      else
        fail "installer asset missing ($SETUP_NAME)"
      fi

      HAS_SIG="$(node -e "
const fs = require('fs');
const name = process.argv[1];
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log((data.assets || []).some((asset) => asset.name === name) ? 'yes' : 'no');
" "$SETUP_NAME.sig" "$RELEASE_FILE" 2>/dev/null || true)"
      if [[ "$HAS_SIG" == "yes" ]]; then
        pass "installer signature asset exists"
      else
        fail "installer signature asset missing"
      fi

      HAS_LATEST="$(node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
console.log((data.assets || []).some((asset) => asset.name === 'latest.json') ? 'yes' : 'no');
" "$RELEASE_FILE" 2>/dev/null || true)"
      if [[ "$HAS_LATEST" == "yes" ]]; then
        pass "updater asset exists (latest.json)"
      else
        fail "updater asset missing (latest.json)"
      fi
    fi
  fi
fi

printf '\n--- Known issue reminders ---\n'
if [[ -f docs/KNOWN_ISSUES.md ]]; then
  if [[ -n "${EXPECTED_TAG:-}" ]] && grep -q "| $EXPECTED_TAG | pending |" docs/KNOWN_ISSUES.md; then
    pass "known issues preserve $EXPECTED_TAG field QA pending"
  else
    warn "${EXPECTED_TAG:-current version} pending row not found in docs/KNOWN_ISSUES.md"
  fi
  if grep -q "Daily-use Beta Readiness Gate" docs/KNOWN_ISSUES.md; then
    pass "1-week residency QA is still pending"
  else
    warn "daily-use readiness gate marker not found"
  fi
else
  fail "docs/KNOWN_ISSUES.md is missing"
fi

printf '\n=== Summary ===\n'
printf 'Failures: %s\n' "$FAILURES"
printf 'Warnings: %s\n' "$WARNINGS"

if [[ "$FAILURES" -gt 0 ]]; then
  exit 1
fi

exit 0
