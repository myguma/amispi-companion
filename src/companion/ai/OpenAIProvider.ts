// OpenAI API プロバイダー
// 明示的ON・API key設定時のみ使用。デフォルトOFF。
// raw filename / window title / transcript履歴 / file content は送らない。
// 送るのは: user input / ObservationSignal (抽象化済み) / app category / process名 /
//           短いtimeline summary / user-approved memory notes (設定ONの場合)

import type { AIProvider, AIProviderOutput, CompanionContext } from "./types";
import { buildPrompt } from "../../systems/ai/PromptBuilder";
import { topSignal } from "../../systems/observation/observationSignals";
import { getSavedMemoryNotes } from "../../systems/memory/memoryStore";
import { filterGeneratedText } from "../../systems/ai/QualityFilter";

/** DebugPage に表示するペイロードプレビュー (センシティブデータを含まない) */
export type OpenAIPayloadPreview = {
  model: string;
  systemPromptChars: number;
  userPromptPreview: string;
  signalsSent: string[];
  topSignalSent: string | null;
  memorySentCount: number;
  voiceInputIncluded: boolean;
  rawFilenamesSent: false;
  rawWindowTitleSent: false;
  rawTranscriptHistorySent: false;
  builtAt: number;
};

let _lastPayloadPreview: OpenAIPayloadPreview | null = null;
const _previewSubs = new Set<() => void>();

export function getOpenAIPayloadPreview(): OpenAIPayloadPreview | null { return _lastPayloadPreview; }

export function subscribeOpenAIPayloadPreview(fn: () => void): () => void {
  _previewSubs.add(fn);
  return () => { _previewSubs.delete(fn); };
}

function setPayloadPreview(p: OpenAIPayloadPreview): void {
  _lastPayloadPreview = p;
  _previewSubs.forEach((fn) => fn());
}

function normalizeOpenAIHttpError(status: number, bodyText: string): {
  reason: string;
  safeReason: string;
  providerErrorCode?: string;
} {
  let providerErrorCode: string | undefined;
  let providerErrorType: string | undefined;
  let providerMessage: string | undefined;

  try {
    const parsed = JSON.parse(bodyText) as {
      error?: { code?: unknown; type?: unknown; message?: unknown };
    };
    providerErrorCode = typeof parsed.error?.code === "string" ? parsed.error.code : undefined;
    providerErrorType = typeof parsed.error?.type === "string" ? parsed.error.type : undefined;
    providerMessage = typeof parsed.error?.message === "string" ? parsed.error.message : undefined;
  } catch {
    // Non-JSON error bodies are treated as opaque text below.
  }

  const haystack = [providerErrorCode, providerErrorType, providerMessage, bodyText]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (status === 401 || status === 403) {
    return { reason: "unauthorized", safeReason: "unauthorized", providerErrorCode };
  }
  if (status === 404) {
    return { reason: "model_not_found", safeReason: "model_not_found", providerErrorCode };
  }
  if (status === 429) {
    if (haystack.includes("insufficient_quota")) {
      return { reason: "insufficient_quota", safeReason: "billing_or_quota", providerErrorCode };
    }
    if (haystack.includes("billing")) {
      return { reason: "billing_not_active", safeReason: "billing_or_quota", providerErrorCode };
    }
    if (haystack.includes("quota_exceeded") || haystack.includes("quota")) {
      return { reason: "quota_exceeded", safeReason: "billing_or_quota", providerErrorCode };
    }
    if (haystack.includes("rate_limit_exceeded") || haystack.includes("rate limit")) {
      return { reason: "rate_limited", safeReason: "rate_limited", providerErrorCode };
    }
    return { reason: "rate_or_quota_limited", safeReason: "billing_or_rate_limit", providerErrorCode };
  }
  if (status >= 500) {
    return { reason: "network_error", safeReason: "network_error", providerErrorCode };
  }
  return { reason: `openai_http_${status}`, safeReason: "invalid_response", providerErrorCode };
}

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly kind = "cloud_openai" as const;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
    private readonly sendSignals: boolean,
    private readonly sendMemoryNotes: boolean,
  ) {}

  async isAvailable(): Promise<boolean> {
    return this.apiKey.trim().length > 0;
  }

  async respond(ctx: CompanionContext): Promise<AIProviderOutput> {
    if (!this.apiKey.trim()) {
      return { shouldSpeak: false, intent: ctx.reactionIntent, reason: "openai_key_empty" };
    }

    // buildPrompt は既にraw dataを含まない安全な形式
    const { system, user } = buildPrompt(ctx);

    // signals / memory notes の概要 (デバッグ用; 本体プロンプトには追加済み)
    const signals = ctx.signals ?? [];
    const top = topSignal(signals);
    const memNotes = this.sendMemoryNotes ? getSavedMemoryNotes().slice(0, 5) : [];

    // ─── payload preview を保存 (DebugPage 用) ───────────────────
    setPayloadPreview({
      model: this.model,
      systemPromptChars: system.length,
      userPromptPreview: user.slice(0, 200),
      signalsSent: this.sendSignals ? signals.map((s) => s.summary) : [],
      topSignalSent: this.sendSignals && top ? top.summary : null,
      memorySentCount: memNotes.length,
      voiceInputIncluded: !!ctx.voiceInput?.trim(),
      rawFilenamesSent: false,
      rawWindowTitleSent: false,
      rawTranscriptHistorySent: false,
      builtAt: Date.now(),
    });

    const messages: { role: "system" | "user"; content: string }[] = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: 120,
          temperature: 0.85,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const bodyText = (await res.text().catch(() => "")).slice(0, 2000);
        const details = normalizeOpenAIHttpError(res.status, bodyText);
        return { shouldSpeak: false, intent: ctx.reactionIntent, httpStatus: res.status, ...details };
      }

      let json: { choices?: { message?: { content?: string } }[] };
      try {
        json = await res.json() as { choices?: { message?: { content?: string } }[] };
      } catch {
        return { shouldSpeak: false, intent: ctx.reactionIntent, reason: "invalid_response", safeReason: "invalid_response" };
      }
      const raw = json.choices?.[0]?.message?.content?.trim() ?? "";

      if (!raw || raw.length > 120) {
        return { shouldSpeak: false, intent: ctx.reactionIntent, reason: "openai_empty_or_too_long", safeReason: "invalid_response" };
      }

      const filtered = filterGeneratedText(raw, { trigger: ctx.trigger, voiceInput: ctx.voiceInput });
      if (!filtered.ok) {
        return { shouldSpeak: false, intent: ctx.reactionIntent, reason: filtered.reason, safeReason: "quality_rejected" };
      }

      return { text: filtered.text, shouldSpeak: true, emotion: "idle", intent: ctx.reactionIntent };
    } catch (e) {
      clearTimeout(timer);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("abort") || msg.includes("AbortError")) {
        return { shouldSpeak: false, intent: ctx.reactionIntent, reason: "timeout", safeReason: "timeout" };
      }
      return { shouldSpeak: false, intent: ctx.reactionIntent, reason: "network_error", safeReason: "network_error" };
    }
  }
}
