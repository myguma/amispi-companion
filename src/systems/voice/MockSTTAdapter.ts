// MockSTTAdapter — 開発用ダミー STT アダプター
// 実際の録音・STT は行わない。固定テキストを返す。

import type { STTAdapter, STTAdapterOutput } from "./STTAdapter";

const MOCK_TRANSCRIPTS = [
  "ねえ、今何してる？",
  "ちょっと疲れてきた",
  "そろそろ休憩かな",
  "今日も頑張ってるね",
];

export class MockSTTAdapter implements STTAdapter {
  readonly name = "mock";

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async transcribe(_audioBlob: Blob): Promise<STTAdapterOutput> {
    // 模擬遅延 (実際の STT を体験に近づける)
    await new Promise((r) => setTimeout(r, 300));

    const text = MOCK_TRANSCRIPTS[Math.floor(Math.random() * MOCK_TRANSCRIPTS.length)];
    return {
      ok: true,
      result: { text, confidence: 1.0, durationMs: 300 },
    };
  }
}
