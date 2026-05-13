# v1.0.0 Release Notes Draft

**最終更新: 2026-05-13 (v1.0.0-rc.1)**

This draft has been superseded by `docs/V1_STABLE_RELEASE_NOTES.md`.
v1.0.0-rc.1 remains the release candidate snapshot and was not a field-QA-certified stable build.

## What This App Is

AmitySpirit Companion is a local-first desktop companion for Windows.
It stays as a small character on the desktop, reacts briefly to clicks, local activity context, and optional Push-to-Talk voice input.

It is not a general-purpose automation assistant, monitoring tool, or cloud AI client.

## Included

- Compact `200x280` companion window with stable speech layout
- Click / drag / voice long press interaction
- Local Ollama response path with RuleProvider fallback
- Active App category observation and Transparency UI
- First-run Onboarding
- Settings updater page and UpdateBadge
- DebugMode overlay
- Local MemoryEvent viewer, delete controls, retention policy, and JSON export
- Minimal emotion sprite fallback
- Local Whisper CLI Push-to-Talk MVP

## Privacy And Safety Boundaries

- No cloud AI
- No cloud STT
- No always-on microphone
- No wake word
- No screen capture or OCR
- No automatic file operations
- No keyboard, clipboard, browser history, email, or message body monitoring
- No user data is sent externally by the app

## Known Risk Areas

- Windows transparent WebView behavior on untested GPU/driver combinations
- Auto update on real installed app environments
- Ollama local model availability and model-specific behavior
- Whisper binary/model path differences
- MediaRecorder audio format compatibility with whisper.cpp builds
- Microphone permission and audio device differences
- Long-running desktop behavior

## Release Qualification

For v1.0.0-rc.1:

- Automated build checks are required
- Release workflow success is required
- Field QA is not performed for this release candidate unless separately recorded in FIELD_QA_NOTES

For v1.0.0 stable:

- If field QA is still not performed, release notes must explicitly say so
- Known risk areas must remain visible
- v1.0.1+ hotfixes should target field QA regressions only
