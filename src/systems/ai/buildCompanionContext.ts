// CompanionContext を構築するファクトリ関数
// ObservationSnapshot + MemoryEvent[] + Settings → CompanionContext

import type { MemoryEvent } from "../../types/companion";
import type { ObservationSnapshot } from "../../observation/types";
import type { CompanionSettings } from "../../settings/types";
import type { AITrigger, CompanionContext } from "../../companion/ai/types";
import { inferActivity } from "../../companion/activity/inferActivity";
import { buildMemorySummary } from "../../companion/memory/buildMemorySummary";
import { buildObservationSignals } from "../observation/observationSignals";

export function buildCompanionContext(
  trigger: AITrigger,
  snapshot: ObservationSnapshot,
  recentEvents: MemoryEvent[],
  settings: CompanionSettings,
  voiceInput?: string
): CompanionContext {
  const activityInsight = inferActivity(snapshot);
  const memorySummary   = buildMemorySummary(recentEvents);
  const signals         = buildObservationSignals(snapshot);

  return {
    trigger,
    recentEvents,
    observation: snapshot,
    activityInsight,
    memorySummary,
    signals,
    speechSettings: {
      autonomousSpeechEnabled:       settings.autonomousSpeechEnabled,
      quietMode:                     settings.quietMode,
      focusMode:                     settings.focusMode,
      doNotDisturb:                  settings.doNotDisturb,
      maxAutonomousReactionsPerHour: settings.maxAutonomousReactionsPerHour,
      suppressWhenFullscreen:        settings.suppressWhenFullscreen,
    },
    voiceInput,
  };
}
