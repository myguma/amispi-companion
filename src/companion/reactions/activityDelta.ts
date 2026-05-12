// ObservationSnapshot 間の意味ある変化を検出する純粋モジュール
// React に依存しない — テスト可能な純粋関数のみ

import { deriveActivity } from "../../observation/types";
import type { ActivityKind, ObservationSnapshot } from "../../observation/types";

export type IdleBucket = "active" | "short" | "long" | "veryLong";

const LONG_IDLE_MS   = 30 * 60 * 1000;
const VERY_LONG_IDLE_MS = 2 * 60 * 60 * 1000;
const SHORT_IDLE_MS  = 5 * 60 * 1000;

export function classifyIdle(idleMs: number): IdleBucket {
  if (idleMs >= VERY_LONG_IDLE_MS) return "veryLong";
  if (idleMs >= LONG_IDLE_MS)      return "long";
  if (idleMs >= SHORT_IDLE_MS)     return "short";
  return "active";
}

export type ObservationDelta = {
  activityChanged: boolean;
  fullscreenChanged: boolean;
  activeAppCategoryChanged: boolean;
  idleBucketChanged: boolean;
  downloadsPileChanged: boolean;
  desktopPileChanged: boolean;
  prevActivity: ActivityKind;
  nextActivity: ActivityKind;
  prevIdleBucket: IdleBucket;
  nextIdleBucket: IdleBucket;
};

export function computeDelta(
  prev: ObservationSnapshot,
  next: ObservationSnapshot
): ObservationDelta {
  const prevActivity    = deriveActivity(prev);
  const nextActivity    = deriveActivity(next);
  const prevIdleBucket  = classifyIdle(prev.idle.idleMs);
  const nextIdleBucket  = classifyIdle(next.idle.idleMs);
  const prevDownloads   = prev.folders.downloads?.fileCount ?? 0;
  const nextDownloads   = next.folders.downloads?.fileCount ?? 0;
  const prevDesktop     = prev.folders.desktop?.fileCount ?? 0;
  const nextDesktop     = next.folders.desktop?.fileCount ?? 0;

  return {
    activityChanged:          prevActivity !== nextActivity,
    fullscreenChanged:        prev.fullscreenLikely !== next.fullscreenLikely,
    activeAppCategoryChanged: prev.activeApp?.category !== next.activeApp?.category,
    idleBucketChanged:        prevIdleBucket !== nextIdleBucket,
    downloadsPileChanged:     prevDownloads !== nextDownloads,
    desktopPileChanged:       prevDesktop !== nextDesktop,
    prevActivity,
    nextActivity,
    prevIdleBucket,
    nextIdleBucket,
  };
}
