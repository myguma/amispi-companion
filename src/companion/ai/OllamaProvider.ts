// Ollama ローカル LLM プロバイダー
// http://localhost:11434 に接続し、ローカルで発話テキストを生成する
// クラウド送信なし・外部サーバー送信なし

import type { AIProvider, AIProviderOutput, CompanionContext } from "./types";
import { buildPrompt } from "../../systems/ai/PromptBuilder";
import { filterGeneratedText } from "../../systems/ai/QualityFilter";

const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL    = "llama3.2:3b";
const DEFAULT_TIMEOUT  = 8_000;

export class OllamaProvider implements AIProvider {
  readonly name = "ollama";
  readonly kind = "local_http" as const;

  private baseUrl: string;
  private model: string;
  private timeoutMs: number;

  constructor(baseUrl = DEFAULT_BASE_URL, model = DEFAULT_MODEL, timeoutMs = DEFAULT_TIMEOUT) {
    this.baseUrl   = baseUrl;
    this.model     = model;
    this.timeoutMs = timeoutMs;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const id   = setTimeout(() => ctrl.abort(), 4_000);
      const res  = await fetch(`${this.baseUrl}/api/tags`, { signal: ctrl.signal });
      clearTimeout(id);
      return res.ok;
    } catch {
      return false;
    }
  }

  async respond(ctx: CompanionContext): Promise<AIProviderOutput> {
    const { system, user } = buildPrompt(ctx);

    const ctrl   = new AbortController();
    const timeId = setTimeout(() => ctrl.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        signal:  ctrl.signal,
        body: JSON.stringify({
          model:  this.model,
          stream: false,
          messages: [
            { role: "system",    content: system },
            { role: "user",      content: user },
          ],
          options: { temperature: 0.7, num_predict: 60 },
        }),
      });

      clearTimeout(timeId);
      if (!res.ok) return { shouldSpeak: false, reason: "http_error" };

      const json = await res.json() as { message?: { content?: string } };
      const raw  = json?.message?.content ?? "";

      const filtered = filterGeneratedText(raw);
      if (!filtered.ok) {
        console.warn("[Ollama] filtered:", filtered.reason, "|", raw);
        return { shouldSpeak: false, reason: filtered.reason };
      }

      return { text: filtered.text, shouldSpeak: true };

    } catch (e) {
      clearTimeout(timeId);
      if ((e as Error).name === "AbortError") {
        return { shouldSpeak: false, reason: "timeout" };
      }
      console.warn("[Ollama] error:", e);
      return { shouldSpeak: false, reason: "error" };
    }
  }
}
