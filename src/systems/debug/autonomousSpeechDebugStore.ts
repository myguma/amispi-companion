// 自律発話スケジューリング状態の揮発ストア（永続保存なし・Memory exportに含まない）

export type AutonomousSuppressionReason =
  | "disabled"
  | "quiet"
  | "dnd"
  | "focus"
  | "fullscreen"
  | "recentlySpoke"
  | "safetyCap"
  | "silent_activity"
  | "not_idle"
  | "no_text"
  | "allowed"
  | null;

export type AutonomousSpeechDebugState = {
  autonomousSpeechEnabled: boolean;
  autonomousSpeechIntervalPreset: string;
  safetyCapEnabled: boolean;
  legacyMaxPerHour: number;
  lastAutonomousSpeechAt: number | null;
  nextAutonomousSpeechAt: number | null;
  autonomousSpeechDelayMs: number | null;
  suppressionReason: AutonomousSuppressionReason;
  reactionCountInLastHour: number;
  updatedAt: number;
};

const initial: AutonomousSpeechDebugState = {
  autonomousSpeechEnabled: false,
  autonomousSpeechIntervalPreset: "calm",
  safetyCapEnabled: false,
  legacyMaxPerHour: 2,
  lastAutonomousSpeechAt: null,
  nextAutonomousSpeechAt: null,
  autonomousSpeechDelayMs: null,
  suppressionReason: null,
  reactionCountInLastHour: 0,
  updatedAt: 0,
};

let state: AutonomousSpeechDebugState = { ...initial };
const subscribers = new Set<() => void>();

function notify(): void {
  subscribers.forEach((fn) => fn());
}

export function getAutonomousSpeechDebug(): AutonomousSpeechDebugState {
  return state;
}

export function updateAutonomousSpeechDebug(
  patch: Partial<Omit<AutonomousSpeechDebugState, "updatedAt">>
): void {
  state = { ...state, ...patch, updatedAt: Date.now() };
  notify();
}

export function subscribeAutonomousSpeechDebug(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}
