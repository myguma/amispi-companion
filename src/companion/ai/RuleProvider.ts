import type { AIProvider, AIProviderOutput, CompanionContext } from "./types";

export class RuleProvider implements AIProvider {
  readonly name = "rule";
  readonly kind = "rule" as const;

  async isAvailable(): Promise<boolean> { return true; }

  async respond(ctx: CompanionContext): Promise<AIProviderOutput> {
    const sp  = ctx.speechSettings;
    const obs = ctx.observation;

    if (sp.doNotDisturb) return { shouldSpeak: false, reason: "dnd" };
    if (obs.fullscreenLikely && sp.suppressWhenFullscreen) return { shouldSpeak: false, reason: "fullscreen" };
    if (sp.quietMode && ctx.trigger === "idle") return { shouldSpeak: false, reason: "quiet" };

    const idleMinutes    = Math.round(obs.idle.idleMs / 60_000);
    const desktopCount   = obs.folders.desktop?.fileCount ?? 0;
    const downloadsCount = obs.folders.downloads?.fileCount ?? 0;

    switch (ctx.trigger) {
      case "click":
      case "voice":
      case "manual":
        return { text: "呼んだ？", shouldSpeak: true, emotion: "aware" };
      case "idle":
        if (idleMinutes > 30) return { text: "今はそのまま続けてよさそう", shouldSpeak: true, emotion: "idle" };
        return { shouldSpeak: false };
      case "observation":
        if (downloadsCount > 20) return { text: "Downloads、あとで見るものが増えてるかも", shouldSpeak: true, emotion: "aware" };
        if (desktopCount > 15)   return { text: "Desktopに色々たまってきてる", shouldSpeak: true, emotion: "aware" };
        return { shouldSpeak: false };
      default:
        return { shouldSpeak: false };
    }
  }
}
