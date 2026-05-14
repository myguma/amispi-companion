// 設定型定義

import type { PermissionSettings } from "../privacy/permissions";

export type MovementFrequency = "low" | "normal" | "high";
export type SpeechFrequency = "rare" | "low" | "normal";
export type SpeechIntervalPreset = "rare" | "calm" | "normal" | "lively";
export type AIEngine = "none" | "mock" | "ollama";
export type VoiceInputMode = "off" | "pushToTalk";
export type STTEngine = "mock" | "whisperCli";
export type WhisperLanguage = "ja" | "auto" | "en" | "pt" | "es" | "ko" | "zh" | "fr" | "de" | "custom";
export type SleepSpeechIntervalPreset = "veryRare" | "rare" | "off";
export type ObservationLevel = "minimal" | "balanced" | "watchful" | "custom";
export type MemoryMode = "ephemeral" | "timeline" | "timeline_summary" | "ask_before_long_term";

export type CompanionSettings = {
  quietMode: boolean;
  focusMode: boolean;
  doNotDisturb: boolean;

  suppressWhenFullscreen: boolean;
  suppressWhenMediaLikely: boolean;
  suppressWhenGamingLikely: boolean;

  cryEnabled: boolean;
  volume: number;

  autonomousMovementEnabled: boolean;
  movementFrequency: MovementFrequency;
  alwaysOnTop: boolean;
  sizeScale: number;

  autonomousSpeechEnabled: boolean;
  speechFrequency: SpeechFrequency;
  autonomousSpeechIntervalPreset: SpeechIntervalPreset;
  maxAutonomousReactionsPerHour: number;
  playCryOnAutonomousSpeech: boolean;
  autonomousSpeechSafetyCapEnabled: boolean;

  permissions: PermissionSettings;

  showOnStartup: boolean;
  debugModeEnabled: boolean;
  onboardingCompleted: boolean;
  onboardingVersion: number;
  memoryRetentionDays: number;

  // AI エンジン設定
  aiEngine: AIEngine;
  ollamaBaseUrl: string;
  ollamaModel: string;
  ollamaTimeoutMs: number;

  // Phase 6: 音声入力
  voiceInputEnabled: boolean;
  voiceInputMode: VoiceInputMode;
  maxRecordingMs: number;

  // Phase 6b: STT エンジン設定
  sttEngine: STTEngine;
  whisperExecutablePath: string;
  whisperModelPath: string;
  ffmpegExecutablePath: string;
  whisperTimeoutMs: number;
  whisperLanguage: WhisperLanguage;
  whisperCustomLanguage: string;
  sleepSpeechEnabled: boolean;
  sleepSpeechIntervalPreset: SleepSpeechIntervalPreset;
  filenameSignalsEnabled: boolean;
  observationLevel: ObservationLevel;
  memoryMode: MemoryMode;

  // 将来フェーズ用
  mediaAwarenessEnabled: boolean;
  screenUnderstandingEnabled: boolean;
  ttsEnabled: boolean;
};
