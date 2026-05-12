// 設定型定義

import type { PermissionSettings } from "../privacy/permissions";

export type MovementFrequency = "low" | "normal" | "high";
export type SpeechFrequency = "rare" | "low" | "normal";
export type AIEngine = "none" | "mock" | "ollama";

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
  maxAutonomousReactionsPerHour: number;

  permissions: PermissionSettings;

  showOnStartup: boolean;

  // AI エンジン設定
  aiEngine: AIEngine;
  ollamaBaseUrl: string;
  ollamaModel: string;
  ollamaTimeoutMs: number;

  // 将来フェーズ用 (フラグだけ先行追加)
  mediaAwarenessEnabled: boolean;
  screenUnderstandingEnabled: boolean;
  voiceInputEnabled: boolean;
  ttsEnabled: boolean;
};
