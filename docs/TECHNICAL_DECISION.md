# Technical Decision — AmitySpirit Companion Desktop App

> 作成: 2026-05-11  
> 目的: 技術スタックの選定根拠を将来のセッションでも参照できるよう永続化する

---

## 1. Recommended Stack

**Tauri v2 + React + TypeScript + Rust**

Final choice: **Tauri v2** as the desktop shell, **React 18** as the UI framework, **TypeScript** for all frontend code, **Rust** for the Tauri backend layer.

---

## 2. Comparison of Options Evaluated

### 2.1 Tauri v2 + React + TypeScript + Rust ✅ SELECTED

| Criterion | Assessment |
|-----------|------------|
| Transparent window | ✅ Full support via `decorations: false` + `transparent: true` |
| Frameless window | ✅ Native support |
| Always-on-top | ✅ `always_on_top(true)` |
| Click-through transparent areas | ✅ `set_ignore_cursor_events()` API |
| Drag behavior | ✅ `data-tauri-drag-region` or JS-based drag via `startDragging()` |
| System tray | ✅ `tauri-plugin-tray` |
| Auto-start on Windows | ✅ `tauri-plugin-autostart` |
| Packaging / installer | ✅ NSIS/WiX installer, .msi, .exe |
| Local storage | ✅ `tauri-plugin-store`, `tauri-plugin-fs`, SQLite via rusqlite |
| LLM API integration | ✅ Fetch from frontend or `reqwest` in Rust |
| Local LLM / Ollama | ✅ HTTP call from Rust or frontend |
| Memory usage | ✅ ~30-80MB RAM (no bundled Node.js runtime) |
| Security model | ✅ Capability-based permissions system |
| Long-term maintainability | ✅ Active development, Tauri 2.x stable |
| AI agent ease of implementation | ✅ Clear file structure, TypeScript frontend |
| Risk of becoming generic chatbot UI | LOW — window is frameless and compact |

**Strengths:**
- Extremely low binary size (~5MB base) and RAM usage vs Electron (~200MB+)
- Rust backend can directly call OS APIs for future work-context awareness
- Native Windows transparency support without hacks
- `set_ignore_cursor_events()` is exactly what desktop companions need for click-through
- Security capability system prevents accidental privilege creep

**Weaknesses / Risks:**
- Building for Windows from WSL2 requires either cross-compilation or running build commands from Windows PowerShell
- Transparent window hit-testing requires careful JS<->Rust coordination
- Rust learning curve for complex backend features

---

### 2.2 Electron + React + TypeScript ❌ Rejected

| Criterion | Assessment |
|-----------|------------|
| Memory usage | ❌ ~200-400MB RAM (full Chromium + Node.js) |
| Transparent window | ✅ Supported but historically buggy on Windows |
| Click-through | ✅ `setIgnoreMouseEvents()` available |
| Bundle size | ❌ 80-150MB installer |
| Security model | ⚠️ Node.js in renderer is a risk if not sandboxed |
| Maintenance | ⚠️ Chromium version updates cause breaking changes |

**Rejected because:**
- Memory footprint is unacceptable for a persistent desktop companion
- A companion that uses 300MB RAM will feel hostile
- Tauri achieves the same result with 10-20x less RAM

---

### 2.3 Pure Win32 / C++ Desktop ❌ Rejected

- Extreme implementation complexity
- No AI agent can reliably maintain this codebase
- No web-based UI flexibility for character rendering

---

### 2.4 Python + PyQt / PySide ❌ Rejected

- Python runtime overhead
- PyQt licensing concerns
- Weak Windows installer story
- AI agents produce inconsistent Python GUI code quality

---

### 2.5 Existing Desktop Pet / Mascot Projects Inspected

| Project | Notes |
|---------|-------|
| **Shimeji-ee** | Java, image-based mascot. Good for animation reference. Not suitable as a base — Java overhead, no LLM integration path. |
| **waifu2x-caffe** | Image upscaling tool. Irrelevant. |
| **Desktop Goose** | Windows, C#. Novelty pet with forced interactions. Too opinionated for our flexible foundation. |
| **Tauri-based desktop pet examples** | Several exist on GitHub. Confirmed that transparent window + drag works in Tauri. Used as architecture reference. |
| **Open WebUI / LM Studio** | Too heavy, SaaS-dashboard feel. Not suitable. |

---

## 3. Key Technical Risks

### R1: Transparent Window Click-Through on Windows
- **Risk:** Transparent window areas may still intercept mouse clicks, blocking desktop interaction.
- **Mitigation:** Use Tauri's `set_ignore_cursor_events(true)` and toggle to `false` only when mouse enters interactive elements. Implement via `mousemove` listener in JS + debounced Tauri command.

### R2: Building from WSL2 for Windows
- **Risk:** `cargo tauri dev` in WSL targets Linux. Windows desktop behavior differs.
- **Mitigation:** Run dev/build commands from Windows PowerShell (with Rust + Node installed on Windows), or use cross-compilation target `x86_64-pc-windows-msvc`. Document this prominently.

### R3: State Machine Timer Conflicts
- **Risk:** Multiple timers (sleep timeout, speech timeout, state transition) can fire simultaneously and produce invalid states.
- **Mitigation:** Centralize all timers in a single `useCompanionState` hook. Use `useRef` for timer IDs. Clear all timers on state exit.

### R4: Character Asset Flexibility vs. Hardcoded Design
- **Risk:** Early visual design choices leak into the codebase and become hard to change.
- **Mitigation:** Character identity is purely data-driven via `public/characters/<name>/`. The app never references specific character names in code.

### R5: Memory Scope Creep
- **Risk:** Memory system grows to capture too much user data without consent.
- **Mitigation:** v0 memory is localStorage only, non-synced, explicit events only. User control (view/delete) must be feasible by architecture even if UI is deferred.

---

## 4. Proposed Architecture

```
┌─────────────────────────────────────────┐
│  Tauri v2 Shell (Rust)                  │
│  - Window management (transparent,      │
│    always-on-top, frameless)            │
│  - click-through toggle                 │
│  - system tray                          │
│  - autostart                            │
│  - fs access for memory persistence     │
├─────────────────────────────────────────┤
│  React Frontend (TypeScript)            │
│  - Character rendering (sprite/SVG)     │
│  - State machine (useCompanionState)    │
│  - Drag behavior (useDrag)              │
│  - Speech bubble                        │
│  - Dialogue system                      │
│  - Memory event log                     │
│  - AI provider abstraction              │
└─────────────────────────────────────────┘
```

---

## 5. First Implementation Milestone

**Goal:** A working transparent desktop window with:
- Floating spirit character (SVG fallback, no image files required)
- Idle / touched / sleep / waking / speaking states
- Click interaction
- Draggable window
- Speech bubble with placeholder dialogue
- Basic localStorage event log
- Mock AI provider returning canned responses

**Not in scope for milestone:**
- Real LLM integration
- Work-context awareness
- System tray
- Autostart
- Windows-specific builds (document the process)
- Obsidian / Bitwig / browser integration

---

## 6. What Should NOT Be Built Yet

- No real-time browser/app monitoring
- No file system scanning
- No external API calls (except optional AI toggle)
- No cloud sync of any kind
- No complex animation rigs (sprite sheets OK, skeletal animation deferred)
- No voice input/output
- No multi-character support
- No user account system
- No SaaS features

---

## 7. Open Questions

1. **Icon format:** What are the final icon assets for the installer? (Placeholder icons for now.)
2. **Sprite animation:** Should we use CSS animation, sprite sheets, or Lottie? (CSS for v0, evaluate Lottie later.)
3. **Memory backend:** localStorage for v0 acceptable? Migrate to `tauri-plugin-store` or SQLite later?
4. **Windows build CI:** Should we set up GitHub Actions to build Windows releases from Linux?
5. **Character config format:** JSON config file per character, or TOML? (JSON for simplicity.)

---

## 8. Final Decision

**Stack: Tauri v2 + React 18 + TypeScript 5 + Rust**

- Frontend dev server: Vite 6
- CSS: Tailwind CSS v3 (consistent with other project tooling)
- State: React hooks (no external state library for v0)
- Persistence: localStorage (v0), migrate to tauri-plugin-store later
- AI: Mock provider (v0), OpenAI/Ollama-compatible interface ready

This decision is final for the repository. Future sessions should not re-evaluate the stack without a compelling technical reason documented in this file.
