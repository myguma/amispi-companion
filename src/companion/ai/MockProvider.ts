import type { AIProvider, AIProviderOutput, CompanionContext } from "./types";

const LINES = ["小さく起きた", "少しだけ聞いてる", "呼ばれた気がした", "どうしたの", "見えてる範囲で答える"];

export class MockProvider implements AIProvider {
  readonly name = "mock";
  readonly kind = "mock" as const;

  async isAvailable(): Promise<boolean> { return true; }

  async respond(ctx: CompanionContext): Promise<AIProviderOutput> {
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 300));
    return {
      text: LINES[Math.floor(Math.random() * LINES.length)],
      shouldSpeak: true,
      emotion: "aware",
      intent: ctx.reactionIntent,
    };
  }
}
