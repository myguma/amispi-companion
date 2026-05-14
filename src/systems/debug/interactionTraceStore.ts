import type { CompanionSettings } from "../../settings/types";

export type InteractionTraceTrigger =
  | "voice"
  | "text"
  | "click"
  | "autonomous"
  | "drag"
  | "system"
  | "update";

export type InteractionTraceEntry = {
  eventId: string;
  timestamp: number;
  trigger: InteractionTraceTrigger;
  source?: string;
  voiceSessionId?: number;
  rawTranscriptPreview?: string;
  normalizedTranscriptPreview?: string;
  textInputPreview?: string;
  intent?: string;
  observationSummary?: string;
  activeAppCategory?: string;
  activeProcessName?: string;
  classificationReason?: string;
  selectedResponse?: string;
  responseSource?: string;
  fallbackReason?: string;
  speechPriority?: number;
  overwritten?: boolean;
  dropped?: boolean;
  suppressed?: boolean;
  note?: string;
  settingsSnapshot?: Pick<
    CompanionSettings,
    | "autonomousSpeechEnabled"
    | "autonomousMovementEnabled"
    | "quietMode"
    | "focusMode"
    | "doNotDisturb"
    | "speechFrequency"
    | "autonomousSpeechIntervalPreset"
    | "autonomousSpeechSafetyCapEnabled"
  >;
};

const MAX_TRACE = 20;

let entries: InteractionTraceEntry[] = [];
const subscribers = new Set<() => void>();
const channel = typeof BroadcastChannel !== "undefined"
  ? new BroadcastChannel("amispi_interaction_trace")
  : null;

function notify(): void {
  subscribers.forEach((fn) => fn());
}

function broadcast(): void {
  channel?.postMessage(entries);
}

channel?.addEventListener("message", (event) => {
  const next = event.data as InteractionTraceEntry[] | undefined;
  if (!Array.isArray(next)) return;
  entries = next.slice(-MAX_TRACE);
  notify();
});

export function previewTraceText(value: string | null | undefined, max = 80): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

export function addInteractionTrace(entry: Omit<InteractionTraceEntry, "eventId" | "timestamp"> & { eventId?: string; timestamp?: number }): InteractionTraceEntry {
  const full: InteractionTraceEntry = {
    eventId: entry.eventId ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: entry.timestamp ?? Date.now(),
    ...entry,
  };
  entries = [...entries, full].slice(-MAX_TRACE);
  broadcast();
  notify();
  return full;
}

export function getInteractionTraces(): InteractionTraceEntry[] {
  return entries;
}

export function subscribeInteractionTrace(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}
