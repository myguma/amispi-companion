# v2 Roadmap Draft — AmitySpirit Companion

**作成: 2026-05-13 (after v1.0.0)**

This is a planning document only. No v2 implementation starts here.

v2 should extend the local-first desktop companion without turning it into a cloud assistant, monitoring tool, or automation agent.

## Goals

- Preserve the quiet desktop presence established in v1.0.0
- Keep user data local by default
- Make extension points explicit and permissioned
- Improve expressiveness and configuration without destabilizing the compact companion window
- Keep all high-risk capabilities opt-in, local-only, and transparent

## Candidate Areas

### Plugin Architecture

- Local-only plugin API
- Explicit permission declarations
- No plugin network access by default
- No automatic file operations
- Clear disable/uninstall path

### Richer Personality Profiles

- Small local profile presets
- Tone / frequency / reaction style tuning
- No psychological diagnosis
- No user management or productivity scoring

### Optional Local Model Management

- Local Ollama model status display
- Model recommendation docs only, not automatic downloads by default
- Safer model-missing guidance
- No cloud routing

### Advanced Memory Export / Import

- Versioned local JSON schema
- Import preview before writing
- Per-type retention policy
- Clear conflict handling
- No sync service

### Multi-character Support

- Multiple local character profiles
- Shared local privacy boundary
- No remote character marketplace by default
- Keep window size and hit test constraints explicit per character

### Optional Non-cloud Integrations

- Local-only integrations where practical
- Explicit user setup and permissions
- No browser history, keyboard input, clipboard, email, or message body collection
- No web search or external API calls

### Appearance Customization

- Theme / sprite set selection
- Safe fallback for missing assets
- No window height expansion that reintroduces transparent WebView clipping risks

### Advanced Debugging Tools

- Exportable debug snapshot with redaction
- Hit test visualization
- Voice environment diagnostics
- Updater diagnostics

## Still Non-goals In v2

- Cloud AI
- Cloud STT
- Always-on microphone
- Wake word
- Screen Capture / OCR
- Automatic file operations
- Command execution automation
- Web search
- External API integrations without explicit user setup
- Keyboard input monitoring
- Clipboard monitoring
- Browser history collection
- Email / message body collection
- User data upload without explicit consent
- Medical, psychological, or productivity diagnosis

## Design Constraints To Carry Forward

- The companion window stays compact unless a future redesign proves safe through field QA
- The v1 compact `200x280` speech layout remains the known-safe baseline
- 410px expanded transparent window and 280→410 dynamic resize remain rejected designs
- Click-through and ContextMenu hit test behavior must be protected by regression checks
- Voice remains Push-to-Talk only; always-on microphone and wake word remain rejected designs

## Suggested First v2 Planning Steps

1. Define a local plugin permission model on paper
2. Add no-code design docs for appearance packs and multi-character profiles
3. Field-QA v1.0.0 before adding v2 implementation
4. Identify automated regression checks for compact window / hit test / settings pages
