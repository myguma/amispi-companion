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
    RUN_LINE="$(gh run list --limit 10 2>/dev/null | grep -F "Release" | grep -F "$EXPECTED_TAG" | head -1 || true)"
    if [[ "$RUN_LINE" == completed$'\t'success$'\t'* ]]; then
      pass "release workflow succeeded for $EXPECTED_TAG"
    else
      warn "release workflow success not found for $EXPECTED_TAG"
    fi

    RELEASE_JSON="$(gh release view "$EXPECTED_TAG" --json assets,isDraft,isPrerelease,tagName 2>/dev/null || true)"
    if [[ -z "$RELEASE_JSON" ]]; then
      warn "GitHub release not found for $EXPECTED_TAG"
    else
      if printf '%s' "$RELEASE_JSON" | grep -q "\"tagName\":\"$EXPECTED_TAG\""; then
        pass "GitHub release exists for $EXPECTED_TAG"
      else
        warn "GitHub release tag mismatch for $EXPECTED_TAG"
      fi

      SETUP_NAME="amispi-companion_${PKG_VERSION}_x64-setup.exe"
      if printf '%s' "$RELEASE_JSON" | grep -q "\"name\":\"$SETUP_NAME\""; then
        pass "installer asset exists ($SETUP_NAME)"
      else
        fail "installer asset missing ($SETUP_NAME)"
      fi

      if printf '%s' "$RELEASE_JSON" | grep -q "\"name\":\"$SETUP_NAME.sig\""; then
        pass "installer signature asset exists"
      else
        fail "installer signature asset missing"
      fi

      if printf '%s' "$RELEASE_JSON" | grep -q "\"name\":\"latest.json\""; then
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
