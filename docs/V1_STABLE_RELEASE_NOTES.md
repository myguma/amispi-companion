# v1.0.0 Stable Release Notes

**最終更新: 2026-05-13 (v1.0.0)**

AmitySpirit Companion v1.0.0 is the first stable-tagged release of the local-first desktop companion.

Important: this stable tag is based on automated build/release checks and accumulated field QA from earlier milestones. Full field QA was not performed specifically for v1.0.0 before tagging.

## Included

- Compact `200x280` companion window
- Stable compact speech bubble layout
- Click / drag / voice long press interaction
- Ollama local LLM response path with RuleProvider fallback
- Active App observation and Transparency UI
- First-run Onboarding
- Settings updater page and UpdateBadge
- DebugMode overlay
- Local MemoryEvent viewer, deletion, retention policy, and JSON export
- Minimal emotion sprite fallback
- Local Whisper CLI Push-to-Talk MVP

## Automated Checks

- `npm run build`: passed locally before tag
- `cargo build`: passed locally before tag
- Release workflow: required after tag

## Field QA Status

Field QA was not performed specifically for v1.0.0.

Previously field-QA-passed baseline:

- v0.1.48 compact `200x280` speech layout
- v0.1.49 First-run Onboarding and major desktop interactions
- v0.1.50 Memory Retention Policy

Still pending:

- v1.0.0 installed-app update path
- v1.0.0 long-running desktop behavior
- Whisper binary/model/path/MIME type/microphone permission/temp-file deletion
- Memory export file save on real Windows
- Ollama model-specific behavior

## Non-goals

- Cloud AI / cloud STT
- Always-on microphone / wake word
- Screen Capture / OCR
- Automatic file operations or command execution
- Web search / external API integrations
- Long-term RAG / vector DB
- TTS

## Hotfix Policy

v1.0.1+ should be limited to field-QA regressions, installer/update issues, voice environment hardening, and documentation corrections.
