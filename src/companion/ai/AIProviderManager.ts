import type { AIProvider, AIProviderOutput, CompanionContext, LastAIResultDebug } from "./types";
import { MockProvider } from "./MockProvider";
import { RuleProvider } from "./RuleProvider";
import { OllamaProvider } from "./OllamaProvider";
import { getSettings } from "../../settings/store";

// ──────────────────────────────────────────
// LastAIResultDebug — 最後のAI応答デバッグ情報
// useLastAIResult() で AI設定画面から参照できる
// ──────────────────────────────────────────

let _lastResult: LastAIResultDebug = { source: "none", updatedAt: 0 };
const _resultSubs = new Set<() => void>();

export function getLastAIResult(): LastAIResultDebug { return _lastResult; }

export function subscribeLastAIResult(fn: () => void): () => void {
  _resultSubs.add(fn);
  return () => { _resultSubs.delete(fn); };
}

function setLastResult(r: LastAIResultDebug): void {
  _lastResult = r;
  _resultSubs.forEach((fn) => fn());
}

// ──────────────────────────────────────────
// プロバイダー
// OllamaProvider はキャッシュせず毎回現在の設定で生成
// (キャッシュすると設定変更後も古いモデルが使われ続ける)
// ──────────────────────────────────────────

const STATIC_PROVIDERS: Record<string, AIProvider> = {
  rule: new RuleProvider(),
  mock: new MockProvider(),
};

export async function getAIResponse(ctx: CompanionContext): Promise<AIProviderOutput> {
  const s      = getSettings();
  const engine = s.aiEngine ?? "none";

  if (engine === "none") {
    setLastResult({ source: "none", updatedAt: Date.now() });
    return { shouldSpeak: false, reason: "engine_none" };
  }

  const t0 = Date.now();

  // ── Ollama ─────────────────────────────────────────────────────
  if (engine === "ollama") {
    const provider = new OllamaProvider(s.ollamaBaseUrl, s.ollamaModel, s.ollamaTimeoutMs);

    const available = await provider.isAvailable();
    if (!available) {
      setLastResult({
        source: "fallback",
        fallbackReason: "unavailable",
        baseUrl: s.ollamaBaseUrl,
        model: s.ollamaModel,
        updatedAt: Date.now(),
      });
      return { shouldSpeak: false, reason: "unavailable" };
    }

    try {
      const out      = await provider.respond(ctx);
      const latencyMs = Date.now() - t0;

      if (out.shouldSpeak && out.text) {
        setLastResult({
          source: "ollama",
          model: s.ollamaModel,
          baseUrl: s.ollamaBaseUrl,
          latencyMs,
          responsePreview: out.text.slice(0, 60),
          updatedAt: Date.now(),
        });
      } else {
        setLastResult({
          source: "fallback",
          fallbackReason: out.reason ?? "empty_response",
          model: s.ollamaModel,
          baseUrl: s.ollamaBaseUrl,
          latencyMs,
          updatedAt: Date.now(),
        });
      }
      return out;
    } catch (e) {
      const latencyMs = Date.now() - t0;
      setLastResult({
        source: "fallback",
        fallbackReason: "exception",
        model: s.ollamaModel,
        errorMessage: (e instanceof Error ? e.message : String(e)).slice(0, 100),
        latencyMs,
        updatedAt: Date.now(),
      });
      return { shouldSpeak: false, reason: "error" };
    }
  }

  // ── rule / mock ────────────────────────────────────────────────
  const provider = STATIC_PROVIDERS[engine] ?? STATIC_PROVIDERS.rule;

  if (!(await provider.isAvailable())) {
    setLastResult({ source: "fallback", fallbackReason: "unavailable", updatedAt: Date.now() });
    return { shouldSpeak: false, reason: "unavailable" };
  }

  try {
    const out      = await provider.respond(ctx);
    const latencyMs = Date.now() - t0;
    setLastResult({
      source: engine as "rule" | "mock",
      latencyMs,
      responsePreview: out.text?.slice(0, 60),
      updatedAt: Date.now(),
    });
    return out;
  } catch (e) {
    setLastResult({
      source: "fallback",
      fallbackReason: "exception",
      errorMessage: (e instanceof Error ? e.message : String(e)).slice(0, 100),
      updatedAt: Date.now(),
    });
    return { shouldSpeak: false, reason: "error" };
  }
}
