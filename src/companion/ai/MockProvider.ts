import type { AIProvider, AIProviderOutput, CompanionContext } from "./types";

const LINES = ["ん", "...なに？", "呼んだ？", "ここにいるよ", "...", "どうしたの", "何かあった？"];

export class MockProvider implements AIProvider {
  readonly name = "mock";
  readonly kind = "mock" as const;

  async isAvailable(): Promise<boolean> { return true; }

  async respond(_ctx: CompanionContext): Promise<AIProviderOutput> {
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 300));
    return {
      text: LINES[Math.floor(Math.random() * LINES.length)],
      shouldSpeak: true,
      emotion: "aware",
    };
  }
}
