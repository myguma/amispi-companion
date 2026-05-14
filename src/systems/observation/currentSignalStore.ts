// currentSignalStore.ts — 現在のObservationSignalを揮発的に保持・同期する
// コンパニオンWindowで計算 → BroadcastChannel → 設定Windowで受信・表示

import type { ObservationSignal } from "./observationSignals";

let currentSignals: ObservationSignal[] = [];
const subscribers = new Set<() => void>();

const channel = typeof BroadcastChannel !== "undefined"
  ? new BroadcastChannel("amispi_current_signals")
  : null;

channel?.addEventListener("message", (msg) => {
  const data = msg.data as ObservationSignal[] | undefined;
  if (!Array.isArray(data)) return;
  currentSignals = data;
  subscribers.forEach((fn) => fn());
});

export function setCurrentSignals(signals: ObservationSignal[]): void {
  currentSignals = signals;
  channel?.postMessage(signals);
  subscribers.forEach((fn) => fn());
}

export function getCurrentSignals(): ObservationSignal[] {
  return currentSignals;
}

export function subscribeCurrentSignals(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}
