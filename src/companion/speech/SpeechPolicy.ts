// 発話可否を判定する純粋モジュール
// LLM 呼び出し前にここで弾くことで無駄な推論を防ぐ

import type { ObservationSnapshot } from "../../observation/types";
import type { CompanionSettings } from "../../settings/types";

export type SpeechTriggerKind =
  | "manual"      // クリック・音声入力
  | "wake"        // sleep からの復帰
  | "system"      // 更新通知等
  | "observation" // 観測トリガー
  | "idle";       // ランダム独り言

export type CanSpeakResult = {
  allowed: boolean;
  reason?:
    | "dnd"
    | "quiet"
    | "focus"
    | "fullscreen"
    | "rateLimit"
    | "recentlySpoke";
};

const MANUAL_TRIGGERS: SpeechTriggerKind[] = ["manual", "wake", "system"];
const MIN_SPEECH_INTERVAL_MS = 8_000; // 同種トリガーで 8秒以内の連続発話を防ぐ

export function canSpeak(
  trigger: SpeechTriggerKind,
  settings: CompanionSettings,
  snapshot: ObservationSnapshot,
  lastSpeechAt: number | null,
  reactionCountInLastHour: number
): CanSpeakResult {
  const isManual = MANUAL_TRIGGERS.includes(trigger);

  if (settings.doNotDisturb && !isManual) return { allowed: false, reason: "dnd" };

  if (settings.quietMode && !isManual) return { allowed: false, reason: "quiet" };

  if (settings.focusMode && (trigger === "idle" || trigger === "observation")) {
    return { allowed: false, reason: "focus" };
  }

  if (
    settings.suppressWhenFullscreen &&
    snapshot.fullscreenLikely &&
    !isManual
  ) {
    return { allowed: false, reason: "fullscreen" };
  }

  if (
    !isManual &&
    reactionCountInLastHour >= settings.maxAutonomousReactionsPerHour
  ) {
    return { allowed: false, reason: "rateLimit" };
  }

  if (
    !isManual &&
    lastSpeechAt !== null &&
    Date.now() - lastSpeechAt < MIN_SPEECH_INTERVAL_MS
  ) {
    return { allowed: false, reason: "recentlySpoke" };
  }

  return { allowed: true };
}
