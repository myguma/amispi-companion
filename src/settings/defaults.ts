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
  maxAutonomousReactionsPerHour: 2,

  permissions: DEFAULT_PERMISSIONS,

  showOnStartup: true,

  aiEngine: "none",
  ollamaBaseUrl: "http://localhost:11434",
  ollamaModel: "llama3.2:3b",
  ollamaTimeoutMs: 8_000,

  mediaAwarenessEnabled: false,
  screenUnderstandingEnabled: false,
  voiceInputEnabled: false,
  ttsEnabled: false,
};
