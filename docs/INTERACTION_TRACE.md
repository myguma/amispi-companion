# Interaction Trace

**作成: 2026-05-14 (v1.0.4) / 更新: 2026-05-14 (v1.0.5)**

Interaction trace is a volatile QA view for understanding why the companion spoke.

It is not memory, not an export format, and not persisted.

## What It Shows

- eventId / timestamp
- trigger: voice / text / click / autonomous / drag / system / update
- source: ollama / rule / fallback / mock / none
- voiceSessionId
- raw transcript preview
- normalized transcript preview
- text input preview
- intent
- observation summary
- active app category / processName when available
- selected response
- fallback reason
- speech priority
- dropped / suppressed status
- settings snapshot:
  - autonomousSpeechEnabled
  - autonomousMovementEnabled
  - quietMode
  - focusMode
  - doNotDisturb
  - speech interval preset

## Privacy

- Trace entries are held in memory and sent between windows with `BroadcastChannel`.
- They are not stored in localStorage.
- They are not MemoryEvent entries.
- They are not included in Memory export JSON.
- Transcript and text input previews are clipped for debugging.

## v1.0.5 additions

- `settingsSnapshot` now includes `autonomousSpeechSafetyCapEnabled`
- Autonomous speech suppression now writes a trace entry with `dropped: true` and the suppression reason

## Autonomous Speech Debug (DebugPage)

`autonomousSpeechDebugStore.ts` provides a separate volatile view:

- `lastAutonomousSpeechAt` — time of last autonomous speech
- `nextAutonomousSpeechAt` — next scheduled slot
- `autonomousSpeechDelayMs` — current delay value
- `suppressionReason` — why autonomous speech did not fire
- `reactionCountInLastHour` — total reaction count (proxy for cap)
- `safetyCapEnabled` — whether legacy safety cap is active

This is displayed in DebugPage > "自律発話スケジューリング状態".

## Field QA Use

Use this when:

- A voice answer seems to reuse a previous transcript.
- A setting appears enabled/disabled in the UI but behavior differs.
- A speech bubble was unexpectedly overwritten or suppressed.
- The app answered an observation question in a confusing way.
- Autonomous speech is ON but the companion is not speaking (check suppressionReason).
