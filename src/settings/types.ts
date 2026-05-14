// 設定型定義

import type { PermissionSettings } from "../privacy/permissions";

export type MovementFrequency = "low" | "normal" | "high";
export type SpeechFrequency = "rare" | "low" | "normal";
export type SpeechIntervalPreset = "rare" | "calm" | "normal" | "lively";
export type AIEngine = "none" | "mock" | "ollama";
export type VoiceInputMode = "off" | "pushToTalk";
export type STTEngine = "mock" | "whisperCli";

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

  // 将来フェーズ用
  mediaAwarenessEnabled: boolean;
  screenUnderstandingEnabled: boolean;
  ttsEnabled: boolean;
};
