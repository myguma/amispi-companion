// CompanionContext を構築するファクトリ関数
// ObservationSnapshot + MemoryEvent[] + Settings → CompanionContext

import type { MemoryEvent } from "../../types/companion";
import type { ObservationSnapshot } from "../../observation/types";
import type { CompanionSettings } from "../../settings/types";
import type { AITrigger, CompanionContext } from "../../companion/ai/types";
import type { AIProviderInput } from "../../companion/ai/types";
import { inferActivity } from "../../companion/activity/inferActivity";
import { buildMemorySummary } from "../../companion/memory/buildMemorySummary";

export function buildCompanionContext(
  trigger: AITrigger,
  snapshot: ObservationSnapshot,
  recentEvents: MemoryEvent[],
  settings: CompanionSettings,
  voiceInput?: string
): CompanionContext {
  const activityInsight = inferActivity(snapshot);
  const memorySummary   = buildMemorySummary(recentEvents);

  return {
    trigger,
    recentEvents,
    observation: snapshot,
    activityInsight,
    memorySummary,
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

/**
 * CompanionContext から既存の AIProviderInput に変換する互換レイヤー。
 * Phase 2 で OllamaProvider が CompanionContext を直接受け取るまでのブリッジ。
 */
export function contextToProviderInput(ctx: CompanionContext): AIProviderInput {
  const { observation: obs, activityInsight, speechSettings: sp } = ctx;
  return {
    trigger: "manualCall",
    runtimeContext: {
      nowLocal: new Date().toLocaleString("ja-JP"),
      activity: activityInsight.kind,
      activeAppCategory: obs.activeApp?.category,
      idleMinutes: Math.round(obs.idle.idleMs / 60_000),
      fullscreenLikely: obs.fullscreenLikely,
      folderSignals: {
        desktopFileCount:    obs.folders.desktop?.fileCount,
        downloadsFileCount:  obs.folders.downloads?.fileCount,
        recentDownloadsCount: obs.folders.downloads?.recentFileCount,
        screenshotPileLikely: obs.folders.desktop?.screenshotPileLikely,
      },
      modes: {
        quietMode:     sp.quietMode,
        focusMode:     sp.focusMode,
        doNotDisturb:  sp.doNotDisturb,
      },
    },
    privacy: {
      destination: "local_llm" as const,
      allowedFields: ["time", "idleMs", "activeAppName"],
      redacted: false,
    },
    constraints: {
      maxLength: 80,
      language: "ja" as const,
      tone: "quiet" as const,
      oneSentence: true,
    },
  };
}
