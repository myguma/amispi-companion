// WhisperCliSTTAdapter — whisper.cpp CLI ラッパー
//
// v0.3.0:
//   - Blob → 一時音声ファイルに書き出し (Tauri コマンド経由)
//   - whisper CLI を std::process::Command で呼ぶ (shell injection なし)
//   - 処理後に一時ファイルを必ず削除
//   - transcript テキストのみ返す

import { invoke } from "@tauri-apps/api/core";
import type { STTAdapter, STTInput, STTAdapterOutput, STTError } from "./STTAdapter";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function errorKind(message: string): STTError {
  const lower = message.toLowerCase();
  if (lower.includes("timeout") || lower.includes("timed out")) return "timeout";
  if (lower.includes("empty") || lower.includes("no speech")) return "no_speech";
  if (lower.includes("path is empty") || lower.includes("not found") || lower.includes("failed to start")) return "unavailable";
  return "error";
}

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
  // Phase 6b-real-2 で whisper CLI タイムアウト設定に使用
  readonly timeoutMs: number;

  constructor(executablePath: string, modelPath: string, timeoutMs = 30_000) {
    this.executablePath = executablePath;
    this.modelPath = modelPath;
    this.timeoutMs = timeoutMs;
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

      const text = await invoke<string>("transcribe_with_whisper", {
        executablePath: this.executablePath,
        modelPath: this.modelPath,
        audioBytes: bytes,
        mimeType,
        timeoutMs: this.timeoutMs,
      });

      const trimmed = text.trim().slice(0, 200);
      if (!trimmed) return { ok: false, error: "no_speech" };

      return {
        ok: true,
        result: {
          text: trimmed,
          durationMs: Math.round(performance.now() - started),
          engine: this.name,
        },
      };
    } catch (err) {
      return { ok: false, error: errorKind(String(err)) };
    }
  }
}
