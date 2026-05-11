# Roadmap — AmitySpirit Companion

> 作成: 2026-05-11

---

## Phase 0: Research and Foundation ✅ IN PROGRESS

**Goal:** Establish the project, make technical decisions, create documents.

- [x] Repository created
- [x] Technical decision documented (TECHNICAL_DECISION.md)
- [x] Product vision documented (PRODUCT_VISION.md)
- [x] Architecture documented (ARCHITECTURE.md)
- [x] Roadmap documented (this file)
- [ ] Initial implementation complete
- [ ] Build verified

---

## Phase 1: Desktop Presence ← CURRENT TARGET

**Goal:** A working transparent window with a visible character.

- [ ] Tauri v2 project scaffold (package.json, Cargo.toml, tauri.conf.json)
- [ ] Transparent, frameless, always-on-top window
- [ ] SVG fallback character (spirit orb)
- [ ] Character visible in corner of screen
- [ ] Basic idle animation (CSS)
- [ ] Window dragging
- [ ] App runs and doesn't crash

**Done when:** App window appears on desktop, shows floating character, can be dragged.

---

## Phase 2: State and Animation

**Goal:** The character responds to interaction.

- [ ] Companion state machine (idle / touched / sleep / waking / speaking)
- [ ] Click reaction (touched state)
- [ ] Sleep timeout
- [ ] Wake on click
- [ ] State-specific CSS animations
- [ ] Speech bubble component
- [ ] Placeholder dialogue on click
- [ ] Asset system (load PNG if present, SVG fallback)
- [ ] Dev debug overlay

**Done when:** Character reacts to clicks, goes to sleep, can be woken, shows speech bubbles.

---

## Phase 3: Local Memory

**Goal:** The companion remembers things between sessions.

- [ ] Memory event log (localStorage)
- [ ] Log: app start, click, state change, speech shown
- [ ] Memory viewer (debug overlay or console command)
- [ ] Session count tracking
- [ ] "Haven't seen you in a while" awareness (basic)
- [ ] Event log export (future UI, architecture ready)

**Done when:** Events are logged and persist after app restart.

---

## Phase 4: AI Conversation

**Goal:** The companion can generate short contextual utterances.

- [ ] AI provider interface defined
- [ ] Mock provider working (Phase 1 already has this)
- [ ] OpenAI-compatible provider (optional, API key in config)
- [ ] Ollama provider (local LLM, optional)
- [ ] Context fed to AI: recent events, current state, time of day
- [ ] AI response shown in speech bubble
- [ ] Response length capped (< 60 chars)
- [ ] Graceful fallback if AI unavailable

**Done when:** Companion can occasionally generate a contextual short utterance using real AI.

---

## Phase 5: Proactive Suggestions

**Goal:** The companion speaks without being asked.

- [ ] Idle timer triggers random dialogue or AI prompt
- [ ] Time-of-day awareness (morning greeting, etc.)
- [ ] Session duration tracking ("you've been at this a while")
- [ ] Mood/energy state from external triggers (deferred to Phase 6)
- [ ] Do-not-disturb mode (user silences companion)

**Done when:** Companion occasionally speaks on its own with relevant short lines.

---

## Phase 6: Work-Context Awareness

**Goal:** The companion is aware of what the user is working on.

All items in this phase are **opt-in** and **user-permissioned**.

- [ ] Config system for enabling integrations
- [ ] Obsidian vault watcher (optional)
- [ ] Git repository event watcher (optional)
- [ ] Calendar integration via ICS (optional)
- [ ] Music production session detection via Bitwig OSC (optional)
- [ ] Active window title polling (optional, explicit toggle)

**Done when:** At least one integration works, with clear on/off UI.

---

## Phase 7: Amispi IP Integration

**Goal:** Replace placeholder with final AmitySpirit character identity.

- [ ] Character sprite assets finalized
- [ ] Dialogue data written in Amispi voice
- [ ] Character config (name, display name, lore)
- [ ] Lore-consistent memory references
- [ ] Final visual design
- [ ] Sound effects (optional)
- [ ] Character-specific behaviors

**Done when:** The running app feels like it has the Amispi character identity.

---

## Deferred / Future (No Timeline)

- Voice input (STT)
- Voice output (TTS) 
- Multiple character support
- Mobile companion (different product)
- Cross-device memory sync
- Discord Rich Presence
- Browser extension companion
- Multi-monitor awareness
- Sprite sheet animation (vs. CSS)
- Lottie animation support
- Character marketplace

---

## Explicitly Out of Scope (Forever)

- Surveillance or monitoring of user content without consent
- Automatic reading of emails or messages
- Any form of cloud storage of user memory without explicit opt-in
- Facial recognition or camera access
- Screen content reading without explicit permission
- Hard-coded personality that cannot be changed
