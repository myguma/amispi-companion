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
NEXT_SESSION="docs/NEXT_SESSION.md"
CHANGELOG="CHANGELOG.md"
TARGET_VERSION="1.6.0"
TARGET_TAG="v${TARGET_VERSION}"
TARGET_VERSION_PATTERN="${TARGET_VERSION//./\\.}"

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

field_day_has_pattern() {
  local day="$1"
  local pattern="$2"
  awk -v day="$day" -v pattern="$pattern" '
    $0 == "### v1.6.0 Daily-use QA Day " day { in_section=1; next }
    /^### / && in_section { exit }
    in_section && $0 ~ pattern { found=1 }
    END { exit found ? 0 : 1 }
  ' "$FIELD_NOTES"
}

check_file_contains() {
  local label="$1"
  local file="$2"
  local pattern="$3"
  if [[ ! -f "$file" ]]; then
    blocker "$label missing: $file"
  elif rg -q "$pattern" "$file"; then
    pass "$label is set for $TARGET_VERSION"
  else
    blocker "$label is not set for $TARGET_VERSION"
  fi
}

check_json_version() {
  local label="$1"
  local file="$2"
  if [[ ! -f "$file" ]]; then
    blocker "$label missing: $file"
  elif ! command_exists node; then
    blocker "$label cannot be checked because node is unavailable"
  else
    local actual
    actual="$(node -e "const p=require('./${file}'); process.stdout.write(String(p.version || ''));" 2>/dev/null || true)"
    if [[ "$actual" == "$TARGET_VERSION" ]]; then
      pass "$label is $TARGET_VERSION"
    else
      blocker "$label is ${actual:-unknown}; expected $TARGET_VERSION"
    fi
  fi
}

check_package_lock_version() {
  local file="package-lock.json"
  if [[ ! -f "$file" ]]; then
    blocker "package-lock.json missing"
  elif ! command_exists node; then
    blocker "package-lock.json version cannot be checked because node is unavailable"
  else
    local actual
    actual="$(node -e "const p=require('./package-lock.json'); const root=p.packages && p.packages['']; process.stdout.write(String((p.version || '') + '/' + ((root && root.version) || '')));" 2>/dev/null || true)"
    if [[ "$actual" == "$TARGET_VERSION/$TARGET_VERSION" ]]; then
      pass "package-lock.json top/root versions are $TARGET_VERSION"
    else
      blocker "package-lock.json top/root versions are ${actual:-unknown}; expected $TARGET_VERSION/$TARGET_VERSION"
    fi
  fi
}

check_cargo_lock_version() {
  local file="src-tauri/Cargo.lock"
  if [[ ! -f "$file" ]]; then
    blocker "Cargo.lock missing: $file"
  else
    local actual
    actual="$(awk '
      $0 == "name = \"amispi-companion\"" { found=1; next }
      found && /^version = / { gsub(/"/, "", $3); print $3; exit }
    ' "$file")"
    if [[ "$actual" == "$TARGET_VERSION" ]]; then
      pass "Cargo.lock package version is $TARGET_VERSION"
    else
      blocker "Cargo.lock package version is ${actual:-unknown}; expected $TARGET_VERSION"
    fi
  fi
}

check_github_release_artifacts() {
  if [[ "${latest_tag:-}" != "$TARGET_TAG" ]]; then
    blocker "release workflow not checked because latest tag is not $TARGET_TAG"
    blocker "GitHub release not checked because latest tag is not $TARGET_TAG"
    blocker "Windows installer artifact not checked because latest tag is not $TARGET_TAG"
    blocker "installer signature artifact not checked because latest tag is not $TARGET_TAG"
    blocker "latest.json updater artifact not checked because latest tag is not $TARGET_TAG"
    return
  fi

  if ! command_exists gh; then
    blocker "gh is unavailable; cannot verify $TARGET_TAG release workflow or artifacts"
    return
  fi

  if ! command_exists node; then
    blocker "node is unavailable; cannot parse GitHub release metadata"
    return
  fi

  local run_file
  local release_file
  run_file="$(mktemp)"
  release_file="$(mktemp)"

  if gh run list --limit 50 --json headBranch,workflowName,status,conclusion > "$run_file" 2>/dev/null; then
    local run_match
    run_match="$(node -e "
const fs = require('fs');
const tag = process.argv[1];
const runs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const run = runs.find((r) => r.headBranch === tag && /Release/.test(r.workflowName || ''));
if (run) process.stdout.write([run.status, run.conclusion].join(' '));
" "$TARGET_TAG" "$run_file" 2>/dev/null || true)"
    if [[ "$run_match" == "completed success" ]]; then
      pass "release workflow succeeded for $TARGET_TAG"
    else
      blocker "release workflow success not found for $TARGET_TAG"
    fi
  else
    blocker "failed to query GitHub Actions runs for $TARGET_TAG"
  fi

  if gh release view "$TARGET_TAG" --json assets,isDraft,isPrerelease,tagName > "$release_file" 2>/dev/null; then
    local release_tag
    release_tag="$(node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); process.stdout.write(data.tagName || '');" "$release_file" 2>/dev/null || true)"
    if [[ "$release_tag" == "$TARGET_TAG" ]]; then
      pass "GitHub release exists for $TARGET_TAG"
    else
      blocker "GitHub release tag mismatch for $TARGET_TAG"
    fi

    local setup_name
    setup_name="amispi-companion_${TARGET_VERSION}_x64-setup.exe"
    for asset in "$setup_name" "$setup_name.sig" "latest.json"; do
      local has_asset
      has_asset="$(node -e "
const fs = require('fs');
const name = process.argv[1];
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
process.stdout.write((data.assets || []).some((asset) => asset.name === name) ? 'yes' : 'no');
" "$asset" "$release_file" 2>/dev/null || true)"
      if [[ "$has_asset" == "yes" ]]; then
        pass "release artifact exists: $asset"
      else
        blocker "release artifact missing: $asset"
      fi
    done
  else
    blocker "GitHub release not found for $TARGET_TAG"
  fi

  rm -f "$run_file" "$release_file"
}

printf '=== AmitySpirit Companion v1.6.0 Field QA Status ===\n\n'

for file in "$CHECKLIST" "$FIELD_NOTES" "$KNOWN_ISSUES" "$NEXT_SESSION" "$CHANGELOG"; do
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

printf '\n%s\n' '--- Release target version ---'

check_json_version "package.json version" "package.json"
check_package_lock_version
check_file_contains "Cargo.toml package version" "src-tauri/Cargo.toml" "^version = \"${TARGET_VERSION}\""
check_cargo_lock_version
check_file_contains "tauri.conf.json version" "src-tauri/tauri.conf.json" "\"version\": \"${TARGET_VERSION}\""

if command_exists git; then
  latest_tag="$(git tag --sort=-creatordate | head -1 2>/dev/null || true)"
  if [[ "$latest_tag" == "$TARGET_TAG" ]]; then
    pass "latest tag is $TARGET_TAG"
    tag_type="$(git cat-file -t "$TARGET_TAG" 2>/dev/null || true)"
    if [[ "$tag_type" == "tag" ]]; then
      pass "$TARGET_TAG is an annotated tag"
    else
      blocker "$TARGET_TAG is not an annotated tag"
    fi
  elif [[ -z "$latest_tag" ]]; then
    blocker "latest tag unavailable; expected $TARGET_TAG"
    blocker "$TARGET_TAG annotated tag is unavailable"
  else
    blocker "latest tag is $latest_tag; expected $TARGET_TAG"
    blocker "$TARGET_TAG annotated tag is unavailable"
  fi
fi

printf '\n%s\n' '--- Release docs ---'

check_file_contains "CHANGELOG entry" "$CHANGELOG" "^## \\[${TARGET_VERSION_PATTERN}\\]"
check_file_contains "NEXT_SESSION current version" "$NEXT_SESSION" "^\\*\\*バージョン:\\*\\* v${TARGET_VERSION_PATTERN}$"
check_file_contains "NEXT_SESSION phase" "$NEXT_SESSION" "v${TARGET_VERSION_PATTERN} Daily-use Beta"

printf '\n%s\n' '--- Release workflow and artifacts ---'

check_github_release_artifacts

printf '\n%s\n' '--- Automated checks ---'
for check in \
  "\`npm run build\`" \
  "\`cd src-tauri && cargo build && cd ..\`" \
  "\`cd src-tauri && cargo test observation::tests -- --nocapture && cd ..\`" \
  "\`git diff --check\`"
do
  status="$(table_status "$CHECKLIST" "$check")"
  check_status "Automated check" "$check" "$status"
done

printf '\n%s\n' '--- 7-day residency QA ---'
for day in 1 2 3 4 5 6 7; do
  status="$(table_status "$CHECKLIST" "Day $day")"
  check_status "7-day residency QA" "Day $day" "$status"
done

for day in 1 2 3 4 5 6 7; do
  if ! field_day_has_pattern "$day" "^- 日付:[[:space:]]*[^[:space:]]"; then
    blocker "FIELD_QA_NOTES Day ${day} dated section evidence not found"
  fi

  if field_day_has_pattern "$day" "^- 実行時間:[[:space:]]*(([2-9][[:space:]]*h)|([2-9]時間)|([1-9][0-9]{2,}分))"; then
    pass "FIELD_QA_NOTES Day ${day} execution time is recorded as 2h+"
  else
    blocker "FIELD_QA_NOTES Day ${day} 2h+ execution time evidence not found"
  fi

  if field_day_has_pattern "$day" "^- Day ${day}判定:[[:space:]]*passed"; then
    pass "FIELD_QA_NOTES Day ${day}判定 is passed"
  elif field_day_has_pattern "$day" "^- Day ${day}判定:[[:space:]]*pending"; then
    blocker "FIELD_QA_NOTES Day ${day}判定 is still pending"
  elif field_day_has_pattern "$day" "^- Day ${day}判定:[[:space:]]*failed"; then
    blocker "FIELD_QA_NOTES Day ${day}判定 is failed"
  else
    blocker "FIELD_QA_NOTES Day ${day}判定 evidence not found"
  fi
done

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
for day in 1 2 3 4 5 6 7; do
  day_status="$(table_status "$KNOWN_ISSUES" "v1.6.0 Day $day")"
  check_status "Known issue" "v1.6.0 Day $day" "$day_status"
done

critical_status="$(table_status "$KNOWN_ISSUES" "Critical issueなし")"
check_status "Known issue" "Critical issueなし" "$critical_status"

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
