import type { AIProvider, AIProviderOutput, CompanionContext, LastAIResultDebug, AIResultSource } from "./types";
import { MockProvider } from "./MockProvider";
import { RuleProvider } from "./RuleProvider";
import { OllamaProvider } from "./OllamaProvider";
import { OpenAIProvider } from "./OpenAIProvider";
import { getSettings } from "../../settings/store";
import { recordAIRuntimeTrace } from "../../systems/debug/aiRuntimeTraceStore";
import { ensureReactionIntent } from "./reactionIntent";

// ──────────────────────────────────────────
// LastAIResultDebug — 最後のAI応答デバッグ情報
// useLastAIResult() で AI設定画面・DebugPage から参照できる
// ──────────────────────────────────────────

let _lastResult: LastAIResultDebug = { source: "none", status: "skipped", updatedAt: 0 };
const _resultSubs = new Set<() => void>();

export function getLastAIResult(): LastAIResultDebug { return _lastResult; }

export function subscribeLastAIResult(fn: () => void): () => void {
  _resultSubs.add(fn);
  return () => { _resultSubs.delete(fn); };
}

function setLastResult(r: LastAIResultDebug): void {
  _lastResult = r;
  recordAIRuntimeTrace(r);
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
  ctx = ensureReactionIntent(ctx);
  const s      = getSettings();
  const engine = s.aiEngine ?? "none";
  const trigger = ctx.trigger;
  const intent = ctx.reactionIntent;
  const baseTrace = { trigger, intent };

  if (engine === "none") {
    setLastResult({ source: "none", status: "skipped", ...baseTrace, updatedAt: Date.now() });
    return { shouldSpeak: false, intent, reason: "engine_none" };
  }

  const t0 = Date.now();

  // ── Ollama ─────────────────────────────────────────────────────
  if (engine === "ollama") {
    const provider = new OllamaProvider(s.ollamaBaseUrl, s.ollamaModel, s.ollamaTimeoutMs);

    const avail = await provider.checkAvailability();
    if (!avail.available) {
      setLastResult({
        source: "fallback",
        status: "failed",
        ...baseTrace,
        fallbackReason: avail.reason,
        baseUrl: s.ollamaBaseUrl,
        model: s.ollamaModel,
        updatedAt: Date.now(),
      });
      return { shouldSpeak: false, intent, reason: avail.reason };
    }

    try {
      const out      = await provider.respond(ctx);
      const latencyMs = Date.now() - t0;

      if (out.shouldSpeak && out.text) {
        setLastResult({
          source: "ollama",
          status: "success",
          ...baseTrace,
          model: s.ollamaModel,
          baseUrl: s.ollamaBaseUrl,
          latencyMs,
          responsePreview: out.text.slice(0, 80),
          updatedAt: Date.now(),
        });
      } else {
        setLastResult({
          source: "fallback",
          status: "fallback",
          ...baseTrace,
          fallbackReason: out.reason ?? "empty_response",
          fallbackFrom: "ollama",
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
        status: "failed",
        ...baseTrace,
        fallbackFrom: "ollama",
        fallbackReason: "exception",
        model: s.ollamaModel,
        errorMessage: (e instanceof Error ? e.message : String(e)).slice(0, 100),
        latencyMs,
        updatedAt: Date.now(),
      });
      return { shouldSpeak: false, intent, reason: "error" };
    }
  }

  // ── OpenAI ────────────────────────────────────────────────────
  if (engine === "openai") {
    if (!s.openaiApiKey?.trim()) {
      setLastResult({
        source: "fallback",
        status: "skipped",
        ...baseTrace,
        fallbackFrom: "openai",
        fallbackReason: "missing_api_key",
        safeReason: "missing_api_key",
        updatedAt: Date.now(),
      });
      // key 未設定時は rule にフォールバック
      const ruleOut = await STATIC_PROVIDERS.rule.respond(ctx).catch(() => ({ shouldSpeak: false as const, reason: "rule_error" }));
      if (ruleOut.shouldSpeak && ruleOut.text) {
        setLastResult({
          source: "rule",
          status: "fallback",
          ...baseTrace,
          fallbackFrom: "openai",
          fallbackTo: "rule",
          fallbackReason: "missing_api_key",
          safeReason: "missing_api_key",
          responsePreview: ruleOut.text.slice(0, 80),
          updatedAt: Date.now(),
        });
      }
      return ruleOut;
    }

    const provider = new OpenAIProvider(
      s.openaiApiKey,
      s.openaiModel,
      s.openaiBaseUrl,
      s.openaiTimeoutMs,
      s.openaiSendObservationSignals,
      s.openaiSendMemoryNotes,
    );

    let openaiFailReason: string | undefined;
    let openaiSafeReason: string | undefined;
    let openaiHttpStatus: number | undefined;
    let openaiProviderErrorCode: string | undefined;

    try {
      const out      = await provider.respond(ctx);
      const latencyMs = Date.now() - t0;

      if (out.shouldSpeak && out.text) {
        setLastResult({
          source: "openai",
          status: "success",
          ...baseTrace,
          model: s.openaiModel,
          baseUrl: s.openaiBaseUrl,
          latencyMs,
          responsePreview: out.text.slice(0, 80),
          updatedAt: Date.now(),
        });
        return out;
      }

      openaiFailReason = out.reason ?? "openai_no_speech";
      openaiSafeReason = out.safeReason ?? openaiFailReason;
      openaiHttpStatus = out.httpStatus;
      openaiProviderErrorCode = out.providerErrorCode;
      const qualityRejected = openaiFailReason === "openai_empty_or_too_long";
      setLastResult({
        source: "fallback",
        status: "fallback",
        ...baseTrace,
        fallbackFrom: "openai",
        fallbackReason: openaiFailReason,
        safeReason: openaiSafeReason,
        model: s.openaiModel,
        latencyMs,
        httpStatus: openaiHttpStatus,
        providerErrorCode: openaiProviderErrorCode,
        qualityRejected,
        qualityRejectedReason: qualityRejected ? openaiFailReason : undefined,
        updatedAt: Date.now(),
      });
    } catch (e) {
      const latencyMs = Date.now() - t0;
      openaiFailReason = "openai_exception";
      openaiSafeReason = "network_error";
      setLastResult({
        source: "fallback",
        status: "failed",
        ...baseTrace,
        fallbackFrom: "openai",
        fallbackReason: openaiFailReason,
        safeReason: openaiSafeReason,
        model: s.openaiModel,
        errorMessage: (e instanceof Error ? e.message : String(e)).slice(0, 100),
        latencyMs,
        updatedAt: Date.now(),
      });
    }

    // OpenAI 失敗 → Ollama → Rule の順でフォールバック
    if (s.ollamaBaseUrl) {
      const ollamaProvider = new OllamaProvider(s.ollamaBaseUrl, s.ollamaModel, s.ollamaTimeoutMs);
      const avail = await ollamaProvider.checkAvailability().catch(() => ({ available: false as const, reason: "check_failed" }));
      if (avail.available) {
        const out = await ollamaProvider.respond(ctx).catch(() => null);
        if (out?.shouldSpeak && out.text) {
          setLastResult({
            source: "ollama",
            status: "fallback",
            ...baseTrace,
            fallbackFrom: "openai",
            fallbackTo: "ollama",
            fallbackReason: openaiFailReason,
            safeReason: openaiSafeReason,
            model: s.ollamaModel,
            httpStatus: openaiHttpStatus,
            providerErrorCode: openaiProviderErrorCode,
            latencyMs: Date.now() - t0,
            responsePreview: out.text.slice(0, 80),
            updatedAt: Date.now(),
          });
          return out;
        }
      }
    }

    const ruleOut = await STATIC_PROVIDERS.rule.respond(ctx).catch(() => ({ shouldSpeak: false as const, reason: "rule_error" }));
    if (ruleOut.shouldSpeak && ruleOut.text) {
      setLastResult({
        source: "rule",
        status: "fallback",
        ...baseTrace,
        fallbackFrom: "openai",
        fallbackTo: "rule",
        fallbackReason: openaiFailReason,
        safeReason: openaiSafeReason,
        httpStatus: openaiHttpStatus,
        providerErrorCode: openaiProviderErrorCode,
        latencyMs: Date.now() - t0,
        responsePreview: ruleOut.text.slice(0, 80),
        updatedAt: Date.now(),
      });
    }
    return ruleOut;
  }

  // ── rule / mock ────────────────────────────────────────────────
  const provider = STATIC_PROVIDERS[engine] ?? STATIC_PROVIDERS.rule;

  if (!(await provider.isAvailable())) {
    setLastResult({ source: "fallback", status: "failed", ...baseTrace, fallbackReason: "unavailable", updatedAt: Date.now() });
    return { shouldSpeak: false, intent, reason: "unavailable" };
  }

  try {
    const out      = await provider.respond(ctx);
    const latencyMs = Date.now() - t0;
    setLastResult({
      source: engine as AIResultSource,
      status: out.shouldSpeak ? "success" : "skipped",
      ...baseTrace,
      latencyMs,
      responsePreview: out.text?.slice(0, 80),
      updatedAt: Date.now(),
    });
    return out;
  } catch (e) {
    setLastResult({
      source: "fallback",
      status: "failed",
      ...baseTrace,
      fallbackReason: "exception",
      errorMessage: (e instanceof Error ? e.message : String(e)).slice(0, 100),
      updatedAt: Date.now(),
    });
    return { shouldSpeak: false, intent, reason: "error" };
  }
}
