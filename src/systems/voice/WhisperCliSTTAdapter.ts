// WhisperCliSTTAdapter — whisper.cpp CLI ラッパー (Phase 6b-real skeleton)
//
// この段階 (Phase 6b-real-1):
//   - executable path / model path が設定されているか確認
//   - 未設定なら isAvailable() = false → MockSTTAdapter にフォールバック
//   - 設定済みでも transcribe() は "unavailable" を返す (Rust sidecar 統合前)
//
// 次の段階 (Phase 6b-real-2):
//   - Blob → 一時 WAV ファイルに書き出し (Tauri コマンド経由)
//   - whisper CLI を std::process::Command で呼ぶ (shell injection なし)
//   - 処理後に一時ファイルを必ず削除
//   - transcript テキストのみ返す

import type { STTAdapter, STTInput, STTAdapterOutput } from "./STTAdapter";

export class WhisperCliSTTAdapter implements STTAdapter {
  readonly name = "whisperCli";

  constructor(
    private readonly executablePath: string,
    private readonly modelPath: string,
    // Phase 6b-real-2 で whisper CLI タイムアウトに使用
    private readonly timeoutMs: number = 30_000
  ) {}

  async isAvailable(): Promise<boolean> {
    // path が空なら利用不可 → STTAdapterManager が Mock/Fallback を選ぶ
    return (
      this.executablePath.trim().length > 0 &&
      this.modelPath.trim().length > 0
    );
  }

  async transcribe(_input: STTInput): Promise<STTAdapterOutput> {
    // Phase 6b-real-2 で Rust sidecar 統合後に実装する
    // 現時点では path が設定されていても unavailable を返す
    return { ok: false, error: "unavailable" as const };
  }
}
