import type { LastAIResultDebug } from "../../companion/ai/types";

export type AIRuntimeTraceEntry = {
  eventId: string;
  timestamp: number;
  provider: LastAIResultDebug["source"];
  model?: string;
  status?: LastAIResultDebug["status"];
  latencyMs?: number;
  fallbackReason?: string;
  safeReason?: string;
  fallbackFrom?: LastAIResultDebug["fallbackFrom"];
  fallbackTo?: LastAIResultDebug["fallbackTo"];
  httpStatus?: number;
  providerErrorCode?: string;
  qualityRejectedReason?: string;
  trigger?: string;
  responsePreview?: string;
};

export type AIRuntimeTraceSnapshot = {
  lastProviderUsed: LastAIResultDebug["source"] | null;
  lastModelUsed: string | null;
  lastStatus: LastAIResultDebug["status"] | null;
  lastLatencyMs: number | null;
  lastFallbackReason: string | null;
  lastSafeReason: string | null;
  lastFallbackFrom: LastAIResultDebug["fallbackFrom"] | null;
  lastFallbackTo: LastAIResultDebug["fallbackTo"] | null;
  lastHttpStatus: number | null;
};

const MAX_TRACE = 20;

let entries: AIRuntimeTraceEntry[] = [];
let snapshot: AIRuntimeTraceSnapshot = {
  lastProviderUsed: null,
  lastModelUsed: null,
  lastStatus: null,
  lastLatencyMs: null,
  lastFallbackReason: null,
  lastSafeReason: null,
  lastFallbackFrom: null,
  lastFallbackTo: null,
  lastHttpStatus: null,
};

const subscribers = new Set<() => void>();
const channel = typeof BroadcastChannel !== "undefined"
  ? new BroadcastChannel("amispi_ai_runtime_trace")
  : null;

function notify(): void {
  subscribers.forEach((fn) => fn());
}

function broadcast(): void {
  channel?.postMessage({ entries, snapshot });
}

channel?.addEventListener("message", (event) => {
  const next = event.data as { entries?: AIRuntimeTraceEntry[]; snapshot?: AIRuntimeTraceSnapshot } | undefined;
  if (!next || !Array.isArray(next.entries) || !next.snapshot) return;
  entries = next.entries.slice(-MAX_TRACE);
  snapshot = next.snapshot;
  notify();
});

export function recordAIRuntimeTrace(result: LastAIResultDebug): void {
  const entry: AIRuntimeTraceEntry = {
    eventId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    provider: result.source,
    model: result.model,
    status: result.status,
    latencyMs: result.latencyMs,
    fallbackReason: result.fallbackReason,
    safeReason: result.safeReason,
    fallbackFrom: result.fallbackFrom,
    fallbackTo: result.fallbackTo,
    httpStatus: result.httpStatus,
    providerErrorCode: result.providerErrorCode,
    qualityRejectedReason: result.qualityRejectedReason,
    trigger: result.trigger,
    responsePreview: result.responsePreview,
  };

  entries = [...entries, entry].slice(-MAX_TRACE);
  snapshot = {
    lastProviderUsed: result.source,
    lastModelUsed: result.model ?? null,
    lastStatus: result.status ?? null,
    lastLatencyMs: result.latencyMs ?? null,
    lastFallbackReason: result.fallbackReason ?? null,
    lastSafeReason: result.safeReason ?? null,
    lastFallbackFrom: result.fallbackFrom ?? null,
    lastFallbackTo: result.fallbackTo ?? null,
    lastHttpStatus: result.httpStatus ?? null,
  };
  broadcast();
  notify();
}

export function getAIRuntimeTraces(): AIRuntimeTraceEntry[] {
  return entries;
}

export function getAIRuntimeTraceSnapshot(): AIRuntimeTraceSnapshot {
  return snapshot;
}

export function subscribeAIRuntimeTrace(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}
