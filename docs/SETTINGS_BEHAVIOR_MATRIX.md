# Settings Behavior Matrix

**作成: 2026-05-14 (v1.0.4)**

This document records how visible settings are consumed by runtime behavior.

| Setting | Consumer | Expected behavior |
|---|---|---|
| `autonomousMovementEnabled` | `useWander` | `false` stops wander timers/animation immediately. Manual drag remains enabled. |
| `movementFrequency` | `useWander` | Controls random wait range for autonomous movement. |
| `autonomousSpeechEnabled` | `useCompanionState`, `useObservationReactions` | `false` prevents autonomous speech timers/reactions from speaking. Manual click/voice/text can still respond. |
| `autonomousSpeechIntervalPreset` | `useCompanionState` | Main autonomous speech pacing control: rare/calm/normal/lively. |
| `maxAutonomousReactionsPerHour` | `SpeechPolicy`, `selectReaction` | Legacy safety cap only. It no longer acts as the main pacing model. |
| `quietMode` | Speech policy / reactions / autonomous cry | Suppresses autonomous speech and autonomous cry. Manual responses remain. |
| `focusMode` | Speech policy / reactions | Reduces idle/observation speech. |
| `doNotDisturb` | Speech policy / reactions / autonomous cry | Suppresses non-manual speech. |
| `cryEnabled` | `cryEngine`, click/voice/autonomous cry | Master cry/sfx toggle. |
| `playCryOnAutonomousSpeech` | `useCompanionState` | Adds a small cry when autonomous speech is displayed. TTS is not used. |
| `voiceInputEnabled` | App push-to-talk handlers | Enables long-press voice input only. No always-on mic. |
| `debugModeEnabled` | DebugOverlay / VoicePage / DebugPage | Shows layout/debug details and trace details. |

## Notes

- compact `200x280` companion window remains the fixed baseline.
- speech display does not resize the window.
- trace/settings snapshots are volatile QA data and are not exported.
