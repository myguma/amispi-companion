import type { CompanionContext } from "../../companion/ai/types";

export type VoiceIntent =
  | "greeting"
  | "hearing_test"
  | "observation_question"
  | "screen_visibility_question"
  | "app_state_question"
  | "casual_chat"
  | "unknown";

export function classifyVoiceIntent(input: string): VoiceIntent {
  const text = input.trim();
  if (!text) return "unknown";
  if (/(こんにちは|こんばんは|おはよう|もしもし|やあ)/.test(text)) return "greeting";
  if (/(聞こえ|きこえ|聴こえ|届いて|届く)/.test(text)) return "hearing_test";
  if (/(画面.*見え|見えてる|何が見え)/.test(text)) return "screen_visibility_question";
  if (/(今のアプリ|どのアプリ|アプリ.*何|状態.*分か|何を認識)/.test(text)) return "app_state_question";
  if (/(今何見|今なに見|何見て|何を見て|今何して|何が分か)/.test(text)) return "observation_question";
  if (/[？?]$/.test(text)) return "casual_chat";
  return "unknown";
}

export function buildObservationQuestionResponse(intent: VoiceIntent, ctx: CompanionContext): string | null {
  if (
    intent !== "observation_question" &&
    intent !== "screen_visibility_question" &&
    intent !== "app_state_question"
  ) {
    return null;
  }

  if (intent === "screen_visibility_question") {
    return "画面そのものは見てない、少しの状態だけ分かる";
  }

  const summary = ctx.activityInsight.summary;
  if (ctx.activityInsight.kind === "composing") {
    return "音の部屋にいるみたい";
  }

  const signals: string[] = [];
  if (summary && summary !== "何かしている" && summary !== "設定画面が前面") {
    signals.push(summary);
  }
  const downloads = ctx.observation.folders.downloads?.fileCount ?? 0;
  if (downloads > 20) signals.push("Downloadsの多さ");
  if (ctx.observation.media?.audioLikelyActive) signals.push("音の気配");

  if (intent === "app_state_question" && signals.length > 0) {
    return `今は、${signals[0]}みたい`;
  }
  if (signals.length > 1) {
    return `今は${signals[0]}と、${signals[1]}くらい`;
  }
  if (signals.length === 1) {
    return `画面全体じゃなくて、${signals[0]}の気配だけ`;
  }

  return "今のアプリと、少しの作業の気配だけ分かる";
}
