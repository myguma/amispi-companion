# Architecture — AmitySpirit Companion

> 作成: 2026-05-11  
> スタック: Tauri v2 + React 18 + TypeScript 5 + Rust

---

## Overall Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Windows Desktop                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Tauri v2 Shell (Rust process)                     │  │
│  │  - transparent, frameless, always-on-top window    │  │
│  │  - OS-level cursor event toggle (click-through)    │  │
│  │  - system tray (future)                            │  │
│  │  - autostart registration (future)                 │  │
│  │  - fs access for memory persistence                │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │  WebView (React + TypeScript)                 │  │  │
│  │  │  - Character rendering                        │  │  │
│  │  │  - State machine                              │  │  │
│  │  │  - Dialogue system                            │  │  │
│  │  │  - Memory event log                           │  │  │
│  │  │  - AI provider abstraction                    │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Component Tree

```
App
├── Character
│   ├── CharacterSprite (image if available, SVG fallback otherwise)
│   └── StateAnimationWrapper
├── SpeechBubble (conditional, z-indexed above Character)
└── DebugOverlay (dev mode only)
```

### Key Components

| Component | Responsibility |
|-----------|---------------|
| `App.tsx` | Root: positions window, initializes state, handles Tauri events |
| `Character.tsx` | Renders sprite/SVG for current state, handles click delegation |
| `SpeechBubble.tsx` | Displays short utterance with fade animation |
| `DebugOverlay.tsx` | Dev-only: shows current state, memory count, last event |

### Key Hooks

| Hook | Responsibility |
|------|---------------|
| `useCompanionState` | Central state machine: state transitions, timer management |
| `useDrag` | Window dragging via Tauri's `startDragging()` API |
| `useClickThrough` | Toggles Tauri cursor event ignore on hover (future full impl) |

---

## Desktop Shell Architecture (Tauri / Rust)

### Window Configuration

```json
{
  "decorations": false,
  "transparent": true,
  "alwaysOnTop": true,
  "skipTaskbar": true,
  "width": 200,
  "height": 300,
  "resizable": false,
  "shadow": false
}
```

### Tauri Commands (src-tauri/src/lib.rs)

| Command | Description |
|---------|-------------|
| `set_ignore_cursor_events(ignore: bool)` | Toggle click-through on transparent areas |
| `get_app_data_dir()` | Return path for memory persistence |
| `move_window(x: f64, y: f64)` | Programmatic window repositioning |

### Plugins Used

| Plugin | Purpose |
|--------|---------|
| `tauri-plugin-fs` | Read/write memory JSON (future) |
| `tauri-plugin-shell` | Open URLs in default browser (future) |
| `tauri-plugin-autostart` | Windows startup registration (future) |
| `tauri-plugin-tray` | System tray icon/menu (future) |

---

## State Model

### CompanionState (types/companion.ts)

```typescript
type CompanionState =
  | 'idle'        // default, gentle animation
  | 'touched'     // brief reaction after click
  | 'sleep'       // no interaction timeout (~5 min)
  | 'waking'      // transition from sleep to idle
  | 'thinking'    // waiting for AI response
  | 'speaking'    // displaying speech bubble
  | 'focused'     // future: user is in deep work (deferred)
  | 'low_energy'; // future: late at night / long session (deferred)
```

### State Transition Table

```
From        Event                   To          After
────────────────────────────────────────────────────────
idle        click                   touched     2s → idle
idle        timeout (SLEEP_MS)      sleep       —
touched     timeout (2s)            idle        —
sleep       click                   waking      1.5s → idle
waking      timeout (1.5s)          idle        —
idle        ai_request              thinking    —
thinking    ai_response             speaking    BUBBLE_MS → idle
speaking    timeout (BUBBLE_MS)     idle        —
```

### State Config (configurable)

```typescript
const STATE_CONFIG = {
  SLEEP_TIMEOUT_MS: 5 * 60 * 1000,  // 5 minutes
  TOUCHED_DURATION_MS: 2000,
  WAKING_DURATION_MS: 1500,
  SPEECH_BUBBLE_DURATION_MS: 6000,
};
```

---

## Character Asset System

### Directory Structure

```
public/
  characters/
    default/
      README.md       ← describes the asset format
      idle.png        ← optional
      touched.png     ← optional
      sleep.png       ← optional
      waking.png      ← optional
      thinking.png    ← optional
      speaking.png    ← optional
    [future-character-name]/
      ...
```

### Asset Resolution Logic

```
1. Look for public/characters/{activeCharacter}/{state}.png
2. If not found, look for public/characters/{activeCharacter}/idle.png
3. If not found, render SVG fallback
```

### Character Config (per character, optional)

```json
{
  "name": "spirit",
  "displayName": "Spirit",
  "width": 160,
  "height": 160,
  "anchorX": 0.5,
  "anchorY": 1.0,
  "scale": 1.0
}
```

### SVG Fallback Design

The fallback is a CSS-animated "spirit orb" — abstract, round, glowing.  
It is NOT the final Amispi character design. It is a visual placeholder only.

States are represented by CSS class variations:
- `idle`: gentle pulsing glow
- `touched`: bright flash + scale
- `sleep`: dim, slow pulse, Z particles
- `waking`: brightening animation
- `thinking`: rotating inner pattern
- `speaking`: rapid pulsing

---

## Dialogue System

### Structure

```
src/systems/dialogue/
  dialogueData.ts    ← all dialogue, keyed by state or trigger
```

### Dialogue Format

```typescript
interface DialogueEntry {
  id: string;
  trigger: DialogueTrigger;  // 'idle_greeting' | 'touch_reaction' | 'sleep_enter' | ...
  lines: string[];           // pick one randomly
  weight?: number;           // optional probability weight
}

type DialogueTrigger =
  | 'idle_greeting'
  | 'touch_reaction'
  | 'wake_reaction'
  | 'speaking_response'
  | 'random_idle';
```

### Design Principles

- No personality is hard-coded in the code. All text lives in `dialogueData.ts`.
- The file uses neutral placeholder lines only.
- Future: swap `dialogueData.ts` for Amispi-specific writing without touching components.
- Lines are short (< 60 characters) for speech bubble display.

---

## Memory System

### v0: localStorage (browser)

Simple event log, never leaves the device.

```typescript
interface MemoryEvent {
  id: string;           // uuid-like
  type: MemoryEventType;
  timestamp: number;    // Date.now()
  data?: Record<string, unknown>;
}

type MemoryEventType =
  | 'app_start'
  | 'character_clicked'
  | 'state_changed'
  | 'speech_shown'
  | 'note_saved';  // future
```

### API

```typescript
// src/systems/memory/memoryStore.ts
function logEvent(type: MemoryEventType, data?: Record<string, unknown>): void
function getRecentEvents(limit?: number): MemoryEvent[]
function clearEvents(): void
```

### Future: tauri-plugin-store

For cross-session persistence in a controlled file location, migrate to:
- `tauri-plugin-store` (JSON-based key-value store in app data dir)
- Or `rusqlite` for structured queries

---

## AI Provider Abstraction

### Interface

```typescript
// src/systems/ai/AIProvider.ts
interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  respond(
    recentEvents: MemoryEvent[],
    userInput?: string,
  ): Promise<string>;
}
```

### Providers (planned)

| Provider | Status |
|----------|--------|
| `MockProvider` | ✅ v0 — canned responses |
| `OpenAIProvider` | 🔮 future — OpenAI API |
| `OllamaProvider` | 🔮 future — local LLM via HTTP |
| `AnthropicProvider` | 🔮 future — Claude API |

### Design Principles

- App runs offline without any provider. MockProvider is always available.
- API keys are never hard-coded. They are read from environment or user config.
- AI responses are SHORT — max 60 characters for speech bubble display.
- No chat history is shown. The AI speaks, it doesn't have a conversation.

---

## Future Integration Points

These are architecture stubs — NOT implemented in v0.

| Integration | How it would work |
|-------------|------------------|
| **Obsidian** | Watch app data folder for Obsidian vault changes (opt-in) |
| **Bitwig Studio** | OSC or WebSocket connection to Bitwig controller script |
| **Browser activity** | Native messaging host (explicit user permission required) |
| **Discord** | Discord RPC / webhook integration for creative session tracking |
| **Calendar** | Local ICS file or CalDAV polling (opt-in) |
| **Git repos** | Watch repo directories for commits (opt-in) |

All future integrations must be:
- **Explicit**: user enables each individually
- **Permissioned**: capability-based, not ambient
- **Explainable**: user can see what data is accessed
- **Disableable**: per-integration on/off switch
- **Local-first**: data stays on device unless explicitly shared

---

## Security and Privacy Principles

1. **No telemetry** — the app never phones home
2. **No cloud memory** — memory stays in local storage / app data
3. **No ambient monitoring** — the app does not watch the screen, keyboard, or clipboard by default
4. **Capability-based** — Tauri capabilities file limits what the WebView can access
5. **No API keys in code** — keys come from environment variables or user config only
6. **Transparent data** — user can view and delete all stored events

---

## File Layout (src/)

```
src/
  main.tsx                    ← React entry point
  App.tsx                     ← Root component, window setup
  types/
    companion.ts              ← all shared types
  hooks/
    useCompanionState.ts      ← state machine + timers
    useDrag.ts                ← window drag handling
  components/
    Character.tsx             ← sprite + SVG fallback
    SpeechBubble.tsx          ← bubble display
    DebugOverlay.tsx          ← dev-only overlay
  systems/
    dialogue/
      dialogueData.ts         ← all dialogue text
    memory/
      memoryStore.ts          ← localStorage event log
    ai/
      AIProvider.ts           ← provider interface
      MockProvider.ts         ← canned response provider
  styles/
    index.css                 ← Tailwind + custom CSS animations
```
