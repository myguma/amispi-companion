// observationTimelineStore.ts — Observation Timeline
// 構造化されたイベントを記録する。raw dataは保存しない。
// BroadcastChannelによりコンパニオンWindow↔設定Windowを同期する。

const STORAGE_KEY = "amispi_observation_timeline";
const MAX_EVENTS = 200;

export type ObservationEventType =
  | "active_app_changed"
  | "idle_started"
  | "user_returned"
  | "media_started"
  | "media_stopped"
  | "folder_signal_changed"
  | "companion_reacted"
  | "setting_changed"
  | "sleep_entered"
  | "update_available";

export type ObservationEvent = {
  id: string;
  timestamp: number;
  type: ObservationEventType;
  summary: string;
  source: "observation" | "system" | "settings" | "companion";
  signalKind?: string;
  strength?: number;
};

function generateId(): string {
  return `obs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function load(): ObservationEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function save(events: ObservationEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    const trimmed = events.slice(-100);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)); } catch { /* ignore */ }
  }
}

let events: ObservationEvent[] = load();
const subscribers = new Set<() => void>();

const channel = typeof BroadcastChannel !== "undefined"
  ? new BroadcastChannel("amispi_obs_timeline")
  : null;

channel?.addEventListener("message", (msg) => {
  const incoming = msg.data as { kind: string; event?: ObservationEvent } | undefined;
  if (!incoming) return;
  if (incoming.kind === "clear") {
    events = [];
    save(events);
    notify();
    return;
  }
  if (incoming.kind === "event" && incoming.event?.id) {
    if (events.some((e) => e.id === incoming.event!.id)) return;
    events = [...events.slice(-(MAX_EVENTS - 1)), incoming.event];
    save(events);
    notify();
  }
});

function notify(): void {
  subscribers.forEach((fn) => fn());
}

export function addObservationEvent(
  type: ObservationEventType,
  summary: string,
  opts?: Partial<Pick<ObservationEvent, "source" | "signalKind" | "strength">>
): void {
  const event: ObservationEvent = {
    id: generateId(),
    timestamp: Date.now(),
    type,
    summary,
    source: opts?.source ?? "observation",
    signalKind: opts?.signalKind,
    strength: opts?.strength,
  };
  events = [...events.slice(-(MAX_EVENTS - 1)), event];
  save(events);
  channel?.postMessage({ kind: "event", event });
  notify();
}

export function getObservationTimeline(): ObservationEvent[] {
  return events;
}

export function getRecentObservationEvents(limitMs = 60 * 60 * 1000): ObservationEvent[] {
  const cutoff = Date.now() - limitMs;
  return events.filter((e) => e.timestamp >= cutoff);
}

export function pruneObservationTimeline(retentionDays: number): void {
  if (retentionDays <= 0) return;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  events = events.filter((e) => e.timestamp >= cutoff);
  save(events);
}

export function subscribeObservationTimeline(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

export function clearObservationTimeline(): void {
  events = [];
  save(events);
  channel?.postMessage({ kind: "clear" });
  notify();
}

export function getObservationTimelineForExport(): ObservationEvent[] {
  return [...events];
}
