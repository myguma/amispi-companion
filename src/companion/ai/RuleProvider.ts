import type { AIProvider, AIProviderInput, AIProviderOutput } from "./types";

export class RuleProvider implements AIProvider {
  readonly name = "rule";
  readonly kind = "rule" as const;

  async isAvailable(): Promise<boolean> { return true; }

  async respond(input: AIProviderInput): Promise<AIProviderOutput> {
    const { trigger, runtimeContext: ctx } = input;

    if (ctx.modes.doNotDisturb) return { shouldSpeak: false, reason: "dnd" };
    if (ctx.fullscreenLikely) return { shouldSpeak: false, reason: "fullscreen" };
    if (ctx.modes.quietMode && trigger === "randomIdle") return { shouldSpeak: false, reason: "quiet" };

    switch (trigger) {
      case "downloadsPile": {
        const n = ctx.folderSignals.downloadsFileCount ?? 0;
        if (n > 20) return { text: "Downloads、あとで見るものが増えてるかも", shouldSpeak: true, emotion: "aware" };
        return { shouldSpeak: false };
      }
      case "desktopPile": {
        const n = ctx.folderSignals.desktopFileCount ?? 0;
        if (n > 15) return { text: "Desktopに色々たまってきてる", shouldSpeak: true, emotion: "aware" };
        return { shouldSpeak: false };
      }
      case "longIdle":
        if (ctx.idleMinutes > 30) return { text: "今はそのまま続けてよさそう", shouldSpeak: true, emotion: "idle" };
        return { shouldSpeak: false };
      case "manualCall":
        return { text: "呼んだ？", shouldSpeak: true, emotion: "aware" };
      case "randomIdle":
        return { text: "...", shouldSpeak: true, emotion: "idle" };
      default:
        return { shouldSpeak: false };
    }
  }
}
