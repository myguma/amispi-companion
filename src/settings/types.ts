// 設定型定義

import type { PermissionSettings } from "../privacy/permissions";

export type MovementFrequency = "low" | "normal" | "high";
export type SpeechFrequency = "rare" | "low" | "normal";

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
};
