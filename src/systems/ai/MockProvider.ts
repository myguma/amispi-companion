// モックAIプロバイダー
// ネットワーク不要・APIキー不要でアプリが動作することを保証する

import type { AIProvider, MemoryEvent } from "../../types/companion";

const MOCK_RESPONSES = [
  "Something stirs in the quiet.",
  "I've been thinking.",
  "Time moves differently here.",
  "You've been busy.",
  "Is everything all right?",
  "I notice things you don't.",
  "The session grows long.",
  "Interesting.",
  "...",
  "Keep going.",
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
