export const COMPANION_WINDOW_W = 200;
export const COMPANION_COMPACT_H = 280;
export const COMPANION_BUBBLE_H = 130;
export const CHARACTER_BOTTOM_PAD = 24;

export const CONTEXT_MENU_W = 150;
export const CONTEXT_MENU_H = 112;

export const MIN_SIZE_SCALE = 0.75;
export const MAX_SIZE_SCALE = 1.5;

export function normalizeCompanionScale(value: number | null | undefined): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 1;
  return Math.min(MAX_SIZE_SCALE, Math.max(MIN_SIZE_SCALE, n));
}
