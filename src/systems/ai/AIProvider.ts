// AIプロバイダー抽象インターフェース
// このファイルを変更せずに、プロバイダーを差し替えられる設計

import type { AIProvider, MemoryEvent } from "../../types/companion";
import { MockProvider } from "./MockProvider";

// 現在のアクティブプロバイダー
let activeProvider: AIProvider = new MockProvider();

/**
 * AIプロバイダーを切り替える
 * 将来: OpenAI / Ollama / Anthropic に切り替えるためのエントリーポイント
 */
export function setAIProvider(provider: AIProvider): void {
  activeProvider = provider;
}

/**
 * 現在のプロバイダーからレスポンスを取得する
 * プロバイダーが利用不可の場合は空文字を返す
 */
export async function getAIResponse(
  recentEvents: MemoryEvent[],
  userInput?: string
): Promise<string> {
  const available = await activeProvider.isAvailable();
  if (!available) return "";

  try {
    const response = await activeProvider.respond(recentEvents, userInput);
    // 吹き出しに収まるよう最大60文字に切り詰める
    return response.slice(0, 60);
  } catch {
    return "";
  }
}

export type { AIProvider };
