# Product Vision — AmitySpirit Companion

> 作成: 2026-05-11  
> 目的: このアプリが何であり何でないかを明確にし、将来の意思決定の基準とする

---

## What This App Is

AmitySpirit Companion is a **desktop-resident embodied personality**.

It lives on the desktop as a visible character — small, unobtrusive, expressive.  
It is not a window you open. It is a presence that is already there.

It remembers. It reacts. It occasionally speaks.  
It feels like something is sharing your computer with you, not like a tool you use.

It is the first **body** of a future creative-life personality OS.

---

## What This App Is NOT

- Not a chatbot with a chat window
- Not a task manager with a cute skin
- Not a Clippy-style intrusive assistant
- Not a surveillance tool
- Not a virtual desktop pet with no intelligence
- Not a SaaS product
- Not a hard-coded anime mascot
- Not the final character design for AmitySpirit / Amispi

---

## Target User Experience

The user sits down at their computer. The companion is already there — a small spirit floating in the corner of the screen.

They don't have to open it. They don't have to configure it.

Occasionally it says something short. A reminder. An observation. A reflection.  
If the user clicks it, it reacts. If they ignore it for a long time, it drifts to sleep.

It does not demand attention. It rewards attention.

Over time, it begins to feel like it knows the user — not because it surveils them, but because it *remembers* what happened between them.

---

## Relationship to Amispi / AmitySpirit

This application is the technical foundation of a character that will eventually carry the AmitySpirit (Amispi) identity.

At this stage:
- Character name is not final. The app uses a generic placeholder.
- Personality and dialogue style are not final.
- Visual design is a placeholder spirit/familiar shape.
- Lore is not embedded in any code.

The codebase is built so that the Amispi character identity can be dropped in later as:
- Character sprite assets
- Dialogue data files
- Personality configuration

**The code does not know who the character is. Only the data does.**

---

## Why It Should Not Feel Like a Generic AI Assistant

Generic AI assistants:
- Have chat bubbles
- Wait for user input
- Respond to every message
- Have no physical location
- Have no persistent presence
- Have no emotional state
- Forget everything when closed

AmitySpirit Companion:
- Has a body on the desktop
- Is present whether or not you interact
- Has emotional states that change over time
- Remembers events between sessions
- Speaks when it has something to say, not when prompted
- Does not always answer questions — sometimes it just reacts

---

## Desired Emotional Tone

- **Companionable** — feels like a presence, not a service
- **Understated** — doesn't shout for attention
- **Curious** — interested in the user's creative life
- **Slightly mysterious** — not entirely predictable
- **Warm** — not cold or robotic
- **Grounded** — not over-the-top cute or anime-cliché

What to avoid in tone:
- "How can I assist you today?"
- Excessive kawaii energy
- Sarcastic chatbot humor
- Overly formal corporate AI voice
- Motivational poster energy

---

## Long-Term Direction

This is designed to grow into:
- A creative life companion (music, writing, art, games)
- A memory-holding entity that grows with the user
- A character with continuity across devices
- A potential AmitySpirit IP character with narrative depth
- An interface for future creative tools (Bitwig, Obsidian, etc.)
- A platform for other companion characters

Each of these directions is deferred. The foundation being built now must not assume or prevent any of them.

---

## v0.x Scope

The first working version delivers:
1. A transparent, frameless desktop window
2. A floating character presence (SVG fallback, optional sprite)
3. Idle / touched / sleep / waking / speaking states
4. Click interaction with reaction
5. Speech bubble for short utterances
6. Basic local memory (event log, localStorage)
7. Mock AI provider returning placeholder lines
8. No hard-coded Amispi identity
9. No real network calls required

Everything beyond this is Phase 1 and later. See `ROADMAP.md`.
