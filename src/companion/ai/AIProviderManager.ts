import type { AIProvider, AIProviderInput, AIProviderOutput } from "./types";
import { MockProvider } from "./MockProvider";
import { RuleProvider } from "./RuleProvider";

const PROVIDERS: Record<string, AIProvider> = {
  rule: new RuleProvider(),
  mock: new MockProvider(),
};

// cloud / local_http はデフォルト無効 — 将来スタブ追加予定
let _active = "rule";

export function setActiveProvider(kind: string): void {
  if (kind in PROVIDERS) _active = kind;
}

export async function getAIResponse(input: AIProviderInput): Promise<AIProviderOutput> {
  const p = PROVIDERS[_active] ?? PROVIDERS.mock;
  if (!(await p.isAvailable())) return { shouldSpeak: false, reason: "unavailable" };
  try {
    return await p.respond(input);
  } catch {
    return { shouldSpeak: false, reason: "error" };
  }
}
