// STTAdapterManager — 設定に応じて STT アダプターを選択する
// Phase 6b-real: sttEngine 設定で Mock / WhisperCli を切替。
// WhisperCli は paths 未設定なら unavailable → フォールバック処理は呼び出し側で行う。

import type { STTAdapter } from "./STTAdapter";
import type { STTEngine } from "../../settings/types";
import { MockSTTAdapter } from "./MockSTTAdapter";
import { WhisperCliSTTAdapter } from "./WhisperCliSTTAdapter";
import { getSettings } from "../../settings/store";

export function getSTTAdapter(): STTAdapter {
  const s = getSettings();

  const engine: STTEngine = s.sttEngine ?? "mock";

  if (engine === "whisperCli") {
    const execPath  = s.whisperExecutablePath ?? "";
    const modelPath = s.whisperModelPath      ?? "";
    const timeoutMs = s.whisperTimeoutMs      ?? 30_000;
    return new WhisperCliSTTAdapter(execPath, modelPath, timeoutMs);
  }

  return new MockSTTAdapter();
}

/** 設定変更時の後方互換用 — インスタンスキャッシュは廃止済み (呼び出し不要) */
export function resetSTTAdapter(): void { /* no-op */ }
