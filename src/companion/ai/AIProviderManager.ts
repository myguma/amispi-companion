import type { AIProvider, AIProviderInput, AIProviderOutput, AIEngine } from "./types";
import { MockProvider } from "./MockProvider";
import { RuleProvider } from "./RuleProvider";
import { OllamaProvider } from "./OllamaProvider";
import { getSettings } from "../../settings/store";

// プロバイダーインスタンス (設定変更時に再生成)
let _ollamaProvider: OllamaProvider | null = null;

function getOllamaProvider(): OllamaProvider {
  const s = getSettings();
  const url   = (s as { ollamaBaseUrl?: string }).ollamaBaseUrl   ?? "http://localhost:11434";
  const model = (s as { ollamaModel?: string }).ollamaModel        ?? "llama3.2:3b";
  const ms    = (s as { ollamaTimeoutMs?: number }).ollamaTimeoutMs ?? 8_000;

  if (!_ollamaProvider) {
    _ollamaProvider = new OllamaProvider(url, model, ms);
  }
  return _ollamaProvider;
}

/** 設定変更時に Ollama インスタンスをリセットする */
export function resetOllamaProvider(): void {
  _ollamaProvider = null;
}

const STATIC_PROVIDERS: Record<string, AIProvider> = {
  none: new RuleProvider(), // none = rule ベースの静かな fallback
  rule: new RuleProvider(),
  mock: new MockProvider(),
};

function resolveProvider(engine: AIEngine): AIProvider {
  if (engine === "ollama") return getOllamaProvider();
  return STATIC_PROVIDERS[engine] ?? STATIC_PROVIDERS.rule;
}

export async function getAIResponse(input: AIProviderInput): Promise<AIProviderOutput> {
  const s      = getSettings();
  const engine = ((s as { aiEngine?: AIEngine }).aiEngine) ?? "none";

  // engine=none は AI を使わない → 即 fallback
  if (engine === "none") return { shouldSpeak: false, reason: "engine_none" };

  const provider = resolveProvider(engine);

  if (!(await provider.isAvailable())) {
    return { shouldSpeak: false, reason: "unavailable" };
  }

  try {
    return await provider.respond(input);
  } catch (e) {
    console.warn("[AIProviderManager] error:", e);
    return { shouldSpeak: false, reason: "error" };
  }
}
