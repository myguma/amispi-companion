import type { CompanionSettings } from "./types";
import { DEFAULT_PERMISSIONS } from "../privacy/permissions";

export const DEFAULT_SETTINGS: CompanionSettings = {
  quietMode: false,
  focusMode: false,
  doNotDisturb: false,

  suppressWhenFullscreen: true,
  suppressWhenMediaLikely: true,
  suppressWhenGamingLikely: true,

  cryEnabled: true,
  volume: 0.15,

  autonomousMovementEnabled: true,
  movementFrequency: "low",
  alwaysOnTop: true,
  sizeScale: 1.0,

  autonomousSpeechEnabled: false,
  speechFrequency: "rare",
  autonomousSpeechIntervalPreset: "calm",
  maxAutonomousReactionsPerHour: 2,
  playCryOnAutonomousSpeech: true,
  autonomousSpeechSafetyCapEnabled: false,

  permissions: DEFAULT_PERMISSIONS,

  showOnStartup: true,
  debugModeEnabled: false,
  onboardingCompleted: false,
  onboardingVersion: 1,
  memoryRetentionDays: 30,

  aiEngine: "none",
  ollamaBaseUrl: "http://127.0.0.1:11434",
  ollamaModel: "llama3.2:3b",
  ollamaTimeoutMs: 20_000,

  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
  openaiBaseUrl: "https://api.openai.com/v1",
  openaiTimeoutMs: 20_000,
  openaiSendObservationSignals: true,
  openaiSendMemoryNotes: false,

  voiceInputEnabled: false,
  voiceInputMode: "off",
  maxRecordingMs: 15_000,

  sttEngine: "mock",
  whisperExecutablePath: "",
  whisperModelPath: "",
  ffmpegExecutablePath: "",
  whisperTimeoutMs: 30_000,
  whisperLanguage: "ja",
  whisperCustomLanguage: "",
  sleepSpeechEnabled: true,
  sleepSpeechIntervalPreset: "veryRare",
  filenameSignalsEnabled: true,
  observationLevel: "balanced",
  memoryMode: "timeline_summary",

  mediaAwarenessEnabled: false,
  screenUnderstandingEnabled: false,
  ttsEnabled: false,
};
