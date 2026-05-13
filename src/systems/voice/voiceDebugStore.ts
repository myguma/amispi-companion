// LastVoiceDebug — 音声認識の直近状態を一時表示するための揮発store。
// localStorage / MemoryEvent へ保存しない。再起動で消えてよい。

export type LastVoiceDebugStatus =
  | "idle"
  | "recording"
  | "transcribing"
  | "success"
  | "no_speech"
  | "ffmpeg_unavailable"
  | "conversion_failed"
  | "whisper_failed"
  | "timeout"
  | "error";

export type LastVoiceDebug = {
  status: LastVoiceDebugStatus;
  transcriptPreview?: string;
  transcriptLength?: number;
  inputMimeType?: string;
  inputExtension?: string;
  conversionUsed?: boolean;
  ffmpegConfigured?: boolean;
  ffmpegExitOk?: boolean;
  whisperExitOk?: boolean;
  stderrPreview?: string;
  tempCleanupDone?: boolean;
  aiSource?: string;
  aiFallbackReason?: string;
  responsePreview?: string;
  updatedAt: number;
};

const MAX_PREVIEW = 80;
const MAX_STDERR = 200;

let lastVoiceDebug: LastVoiceDebug = { status: "idle", updatedAt: 0 };
const subscribers = new Set<() => void>();

function notify(): void {
  subscribers.forEach((fn) => fn());
}

export function previewText(value: string | null | undefined, max = MAX_PREVIEW): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

export function previewStderr(value: string | null | undefined): string | undefined {
  const preview = previewText(value, MAX_STDERR);
  return preview || undefined;
}

export function getLastVoiceDebug(): LastVoiceDebug {
  return lastVoiceDebug;
}

export function setLastVoiceDebug(next: Omit<LastVoiceDebug, "updatedAt"> & { updatedAt?: number }): void {
  lastVoiceDebug = { ...next, updatedAt: next.updatedAt ?? Date.now() };
  notify();
}

export function patchLastVoiceDebug(patch: Partial<Omit<LastVoiceDebug, "updatedAt">> & { updatedAt?: number }): void {
  lastVoiceDebug = { ...lastVoiceDebug, ...patch, updatedAt: patch.updatedAt ?? Date.now() };
  notify();
}

export function subscribeLastVoiceDebug(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}
