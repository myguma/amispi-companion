# Settings Behavior Matrix

**作成: 2026-05-14 (v1.0.4) / 更新: 2026-05-14 (v1.0.5)**

This document records how visible settings are consumed by runtime behavior.

| Setting | Consumer | Expected behavior |
|---|---|---|
| `autonomousMovementEnabled` | `useWander` | `false` stops wander timers/animation immediately. Manual drag remains enabled. |
| `movementFrequency` | `useWander` | Controls random wait range for autonomous movement. |
| `autonomousSpeechEnabled` | `useCompanionState`, `useObservationReactions` | `false` prevents autonomous speech timers/reactions from speaking. Manual click/voice/text can still respond. |
| `autonomousSpeechIntervalPreset` | `useCompanionState` | Main autonomous speech pacing control: rare/calm/normal/lively. |
| `autonomousSpeechSafetyCapEnabled` | `SpeechPolicy`, `selectReaction` | When `false` (default), legacy safety cap is disabled entirely. Main pacing is `autonomousSpeechIntervalPreset`. |
| `maxAutonomousReactionsPerHour` | `SpeechPolicy`, `selectReaction` | Legacy safety cap value. Only active when `autonomousSpeechSafetyCapEnabled=true`. |
| `quietMode` | Speech policy / reactions / autonomous cry | Suppresses autonomous speech and autonomous cry. Manual responses remain. |
| `focusMode` | Speech policy / reactions | Reduces idle/observation speech. |
| `doNotDisturb` | Speech policy / reactions / autonomous cry | Suppresses non-manual speech. |
| `cryEnabled` | `cryEngine`, click/voice/autonomous cry | Master cry/sfx toggle. |
| `playCryOnAutonomousSpeech` | `useCompanionState` | Adds a small cry when autonomous speech is displayed. TTS is not used. |
| `voiceInputEnabled` | App push-to-talk handlers | Enables long-press voice input only. No always-on mic. |
| `debugModeEnabled` | DebugOverlay / VoicePage / DebugPage | Shows layout/debug details and trace details. |
| `whisperLanguage` | `WhisperCliSTTAdapter`, `STTAdapterManager` | Passes `-l <lang>` to whisper-cli. `auto` passes nothing. Default: `ja`. |
| `whisperCustomLanguage` | `WhisperCliSTTAdapter` | Used when `whisperLanguage === "custom"`. |
| `sleepSpeechEnabled` | `useCompanionState` (scheduleSleepSpeech) | Enables low-frequency murmur speech in sleep state. Default: true. |
| `sleepSpeechIntervalPreset` | `useCompanionState` (scheduleSleepSpeech) | Pacing for sleep speech: veryRare(15-30min) / rare(8-15min) / off. |
| `filenameSignalsEnabled` | `voiceIntent.ts` local router | Whether filename-derived signals are used in local responses. Raw filenames are never exposed. |

## Notes

- compact `200x280` companion window remains the fixed baseline.
- speech display does not resize the window.
- trace/settings snapshots are volatile QA data and are not exported.
- voice/text trigger時は `recentSpeech` 本文と `memorySummary` をLLMプロンプトに含めない（v1.0.5 contamination fix）。
- `hearing_test` / `greeting` / observation質問はlocal routerで処理し、Ollamaに流さない（v1.0.5）。
