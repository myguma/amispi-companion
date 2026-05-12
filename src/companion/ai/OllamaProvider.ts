// Ollama ローカル LLM プロバイダー
// Rust コマンド経由で HTTP リクエストを送る (WebView2 CORS 回避)
// クラウド送信なし・外部サーバー送信なし

import { invoke } from "@tauri-apps/api/core";
import type { AIProvider, AIProviderOutput, CompanionContext } from "./types";
import { buildPrompt } from "../../systems/ai/PromptBuilder";
import { filterGeneratedText } from "../../systems/ai/QualityFilter";

const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL    = "llama3.2:3b";
const DEFAULT_TIMEOUT  = 20_000;

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export type AvailabilityResult = {
  available: boolean;
  reason: string; // "ok" | "model_not_found:X" | "timeout" | "network_error:X" | "exception:X"
};

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

  // AIProvider インターフェース実装 (boolean)
  async isAvailable(): Promise<boolean> {
    const r = await this.checkAvailability();
    return r.available;
  }

  // 詳細な可用性チェック — AIProviderManager が fallbackReason に使う
  async checkAvailability(): Promise<AvailabilityResult> {
    if (isTauri) {
      return this._checkViaTauri();
    }
    // dev 環境 (ブラウザ) は直接 fetch — CORS が通る場合のみ動作
    return this._checkViaBrowserFetch();
  }

  private async _checkViaTauri(): Promise<AvailabilityResult> {
    try {
      const json = await invoke<string>("ollama_list_models", { baseUrl: this.baseUrl });
      const data = JSON.parse(json) as { models?: Array<{ name: string }> };
      const models = data.models ?? [];
      if (this.model && models.length > 0) {
        const exists = models.some((m) => m.name === this.model);
        if (!exists) {
          return { available: false, reason: `model_not_found:${this.model}` };
        }
      }
      return { available: true, reason: "ok" };
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 120);
      return { available: false, reason: `exception:${msg}` };
    }
  }

  private async _checkViaBrowserFetch(): Promise<AvailabilityResult> {
    try {
      const ctrl = new AbortController();
      const id   = setTimeout(() => ctrl.abort(), 4_000);
      const res  = await fetch(`${this.baseUrl}/api/tags`, { signal: ctrl.signal });
      clearTimeout(id);
      return { available: res.ok, reason: res.ok ? "ok" : `http_error:${res.status}` };
    } catch (e) {
      const name = (e as Error).name;
      return {
        available: false,
        reason: name === "AbortError" ? "timeout" : `network_error:${String(e).slice(0, 60)}`,
      };
    }
  }

  async respond(ctx: CompanionContext): Promise<AIProviderOutput> {
    const { system, user } = buildPrompt(ctx);

    if (isTauri) {
      return this._respondViaTauri(system, user);
    }
    return this._respondViaBrowserFetch(system, user);
  }

  private async _respondViaTauri(system: string, user: string): Promise<AIProviderOutput> {
    try {
      const json = await invoke<string>("ollama_chat", {
        baseUrl:   this.baseUrl,
        model:     this.model,
        system,
        user,
        timeoutMs: this.timeoutMs,
      });
      return this._parseResponse(json);
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 100);
      if (msg.includes("timed out") || msg.includes("deadline")) {
        return { shouldSpeak: false, reason: "timeout" };
      }
      return { shouldSpeak: false, reason: `error:${msg}` };
    }
  }

  private async _respondViaBrowserFetch(system: string, user: string): Promise<AIProviderOutput> {
    const ctrl   = new AbortController();
    const timeId = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        signal:  ctrl.signal,
        body: JSON.stringify({
          model: this.model, stream: false,
          messages: [
            { role: "system", content: system },
            { role: "user",   content: user   },
          ],
          options: { temperature: 0.7, num_predict: 60 },
        }),
      });
      clearTimeout(timeId);
      if (!res.ok) return { shouldSpeak: false, reason: "http_error" };
      const json = await res.text();
      return this._parseResponse(json);
    } catch (e) {
      clearTimeout(timeId);
      if ((e as Error).name === "AbortError") {
        return { shouldSpeak: false, reason: "timeout" };
      }
      return { shouldSpeak: false, reason: "error" };
    }
  }

  private _parseResponse(json: string): AIProviderOutput {
    try {
      const data = JSON.parse(json) as { message?: { content?: string } };
      const raw  = data?.message?.content ?? "";
      const filtered = filterGeneratedText(raw);
      if (!filtered.ok) {
        console.warn("[Ollama] filtered:", filtered.reason, "|", raw.slice(0, 80));
        return { shouldSpeak: false, reason: filtered.reason };
      }
      return { text: filtered.text, shouldSpeak: true };
    } catch (e) {
      return { shouldSpeak: false, reason: `parse_error:${String(e).slice(0, 60)}` };
    }
  }
}
