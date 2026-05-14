import { EMPTY_SNAPSHOT } from "../../observation/types";
import type { ObservationSnapshot } from "../../observation/types";

let currentSnapshot: ObservationSnapshot = EMPTY_SNAPSHOT;
const subscribers = new Set<() => void>();
const channel = typeof BroadcastChannel !== "undefined"
  ? new BroadcastChannel("amispi_current_observation_snapshot")
  : null;

function notify(): void {
  subscribers.forEach((fn) => fn());
}

channel?.addEventListener("message", (event) => {
  const next = event.data as ObservationSnapshot | undefined;
  if (!next || typeof next !== "object") return;
  currentSnapshot = next;
  notify();
});

export function setCurrentSnapshot(snapshot: ObservationSnapshot): void {
  currentSnapshot = snapshot;
  channel?.postMessage(snapshot);
  notify();
}

export function getCurrentSnapshot(): ObservationSnapshot {
  return currentSnapshot;
}

export function subscribeCurrentSnapshot(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}
