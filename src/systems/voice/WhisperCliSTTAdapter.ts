// WhisperCliSTTAdapter — whisper.cpp CLI ラッパー
//
// v0.3.0:
//   - Blob → 一時音声ファイルに書き出し (Tauri コマンド経由)
//   - whisper CLI を std::process::Command で呼ぶ (shell injection なし)
//   - 処理後に一時ファイルを必ず削除
//   - transcript テキストのみ返す

import { invoke } from "@tauri-apps/api/core";
import type { STTAdapter, STTInput, STTAdapterOutput, STTError } from "./STTAdapter";
import type { LastVoiceDebugStatus } from "./voiceDebugStore";
import { previewStderr, previewText, setLastVoiceDebug } from "./voiceDebugStore";
import { validateVoiceTranscript } from "./normalizeTranscript";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function errorKind(message: string): STTError {
  const lower = message.toLowerCase();
  if (lower.includes("timeout") || lower.includes("timed out")) return "timeout";
  if (lower.includes("ffmpeg executable path is empty")) return "ffmpeg_unavailable";
  if (lower.includes("failed to start ffmpeg")) return "ffmpeg_unavailable";
  if (lower.includes("ffmpeg conversion failed")) return "conversion_failed";
  if (lower.includes("path is empty") || lower.includes("not found") || lower.includes("failed to start")) return "unavailable";
  if (lower.includes("empty") || lower.includes("no speech")) return "no_speech";
  return "error";
}

function statusToError(status: LastVoiceDebugStatus): STTError {
  if (status === "success") return "error";
  if (status === "no_speech") return "no_speech";
  if (status === "ffmpeg_unavailable") return "ffmpeg_unavailable";
  if (status === "conversion_failed") return "conversion_failed";
  if (status === "timeout") return "timeout";
  if (status === "whisper_failed") return "error";
  return "error";
}

function extensionFromMime(mimeType: string): string {
  const m = mimeType.toLowerCase();
  if (m.includes("wav")) return "wav";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("webm")) return "webm";
  return "audio";
}

type WhisperTranscriptionDebug = {
  status: LastVoiceDebugStatus;
  transcript?: string;
  inputMimeType?: string;
  inputExtension?: string;
  conversionUsed?: boolean;
  ffmpegConfigured?: boolean;
  ffmpegExitOk?: boolean;
  whisperExitOk?: boolean;
  stderrPreview?: string;
  tempCleanupDone?: boolean;
};

async function inputToBytes(input: STTInput): Promise<{ bytes: number[]; mimeType: string }> {
  if (input instanceof Blob) {
    const arrayBuffer = await input.arrayBuffer();
    return {
      bytes: Array.from(new Uint8Array(arrayBuffer)),
      mimeType: input.type || "application/octet-stream",
    };
  }

  return {
    bytes: Array.from(new Uint8Array(input)),
    mimeType: "application/octet-stream",
  };
}

export class WhisperCliSTTAdapter implements STTAdapter {
  readonly name = "whisperCli";

  private readonly executablePath: string;
  private readonly modelPath: string;
  private readonly ffmpegExecutablePath: string;
  // Phase 6b-real-2 で whisper CLI タイムアウト設定に使用
  readonly timeoutMs: number;
  private readonly languageCode: string;

  constructor(executablePath: string, modelPath: string, ffmpegExecutablePath: string, timeoutMs = 30_000, languageCode = "ja") {
    this.executablePath = executablePath;
    this.modelPath = modelPath;
    this.ffmpegExecutablePath = ffmpegExecutablePath;
    this.timeoutMs = timeoutMs;
    this.languageCode = languageCode;
  }

  async isAvailable(): Promise<boolean> {
    // path が空なら利用不可 → STTAdapterManager が Mock/Fallback を選ぶ
    return (
      this.executablePath.trim().length > 0 &&
      this.modelPath.trim().length > 0
    );
  }

  async transcribe(_input: STTInput): Promise<STTAdapterOutput> {
    if (!isTauri) return { ok: false, error: "unavailable" };

    try {
      const started = performance.now();
      const { bytes, mimeType } = await inputToBytes(_input);
      if (bytes.length === 0) return { ok: false, error: "no_speech" };

      setLastVoiceDebug({
        status: "transcribing",
        inputMimeType: mimeType,
        inputExtension: extensionFromMime(mimeType),
        conversionUsed: true,
        ffmpegConfigured: this.ffmpegExecutablePath.trim().length > 0,
      });

      const debug = await invoke<WhisperTranscriptionDebug>("transcribe_with_whisper", {
        executablePath: this.executablePath,
        modelPath: this.modelPath,
        ffmpegExecutablePath: this.ffmpegExecutablePath,
        audioBytes: bytes,
        mimeType,
        timeoutMs: this.timeoutMs,
        languageCode: this.languageCode,
      });

      const text = String(debug.transcript ?? "");
      setLastVoiceDebug({
        status: debug.status,
        transcriptPreview: previewText(text),
        transcriptLength: text.trim().length,
        inputMimeType: debug.inputMimeType ?? mimeType,
        inputExtension: debug.inputExtension ?? extensionFromMime(mimeType),
        conversionUsed: debug.conversionUsed ?? true,
        ffmpegConfigured: debug.ffmpegConfigured ?? this.ffmpegExecutablePath.trim().length > 0,
        ffmpegExitOk: debug.ffmpegExitOk,
        whisperExitOk: debug.whisperExitOk,
        stderrPreview: previewStderr(debug.stderrPreview),
        languageArgUsed: this.languageCode,
        tempCleanupDone: debug.tempCleanupDone,
      });

      if (debug.status !== "success") {
        return { ok: false, error: statusToError(debug.status) };
      }

      const validated = validateVoiceTranscript(text, { whisperLanguage: this.languageCode });
      if (!validated.ok) {
        setLastVoiceDebug({
          status: "no_speech",
          transcriptPreview: previewText(text),
          transcriptLength: text.trim().length,
          inputMimeType: debug.inputMimeType ?? mimeType,
          inputExtension: debug.inputExtension ?? extensionFromMime(mimeType),
          conversionUsed: debug.conversionUsed ?? true,
          ffmpegConfigured: debug.ffmpegConfigured ?? this.ffmpegExecutablePath.trim().length > 0,
          ffmpegExitOk: debug.ffmpegExitOk,
          whisperExitOk: debug.whisperExitOk,
          stderrPreview: previewStderr(debug.stderrPreview ?? validated.reason),
          languageArgUsed: this.languageCode,
          rejectedReason: validated.reason,
          tempCleanupDone: debug.tempCleanupDone,
        });
        return { ok: false, error: "no_speech" };
      }

      return {
        ok: true,
        result: {
          text: validated.text,
          durationMs: Math.round(performance.now() - started),
          engine: this.name,
        },
      };
    } catch (err) {
      const message = String(err);
      const kind = errorKind(message);
      setLastVoiceDebug({
        status: kind === "timeout" ? "timeout" : kind === "ffmpeg_unavailable" ? "ffmpeg_unavailable" : "error",
        inputMimeType: undefined,
        conversionUsed: true,
        ffmpegConfigured: this.ffmpegExecutablePath.trim().length > 0,
        stderrPreview: previewStderr(message),
      });
      return { ok: false, error: kind };
    }
  }
}
