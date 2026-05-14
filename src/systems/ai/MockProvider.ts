// モックAIプロバイダー
// ネットワーク不要・APIキー不要でアプリが動作することを保証する

import type { AIProvider, MemoryEvent } from "../../types/companion";

const MOCK_RESPONSES = [
  "小さく起きてる",
  "静かに見てる",
  "少しだけ聞いてる",
  "ここから見てる",
  "少し間があるみたい",
];

export class MockProvider implements AIProvider {
  readonly name = "mock";

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async respond(
    _recentEvents: MemoryEvent[],
    _userInput?: string
  ): Promise<string> {
    // わずかな遅延で「考えている」感を演出
    await new Promise((resolve) =>
      setTimeout(resolve, 400 + Math.random() * 600)
    );
    return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
  }
}
