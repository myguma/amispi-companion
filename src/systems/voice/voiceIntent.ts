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
  if (/(こんにちは|こんばんは|おはよう|もしもし|やあ|はじめまして)/.test(text)) return "greeting";
  if (/(聞こえ|きこえ|聴こえ|届いて|届く|聞こえてる|聞こえますか|聴こえますか)/.test(text)) return "hearing_test";
  if (/(画面.*見え|見えてる|何が見え|画面.*見え|スクリーン.*見え)/.test(text)) return "screen_visibility_question";
  if (/(今のアプリ|どのアプリ|アプリ.*何|状態.*分か|何を認識|何のアプリ)/.test(text)) return "app_state_question";
  if (/(今何見|今なに見|何見て|何を見て|今何して|何が分か|何.*見てる)/.test(text)) return "observation_question";
  if (/[？?]$/.test(text)) return "casual_chat";
  return "unknown";
}

/** voice/text共通ローカル会話ルーター。LLMに流すべきでないintentを先に処理する。
 *  null を返した場合のみ LLM へ進む。 */
export function buildLocalConversationResponse(intent: VoiceIntent, ctx: CompanionContext, rawInput?: string): string | null {
  switch (intent) {
    case "hearing_test":
      return "聞こえてる。今の声は届いてる";

    case "greeting": {
      const greet = rawInput?.trim().slice(0, 6) ?? "こんにちは";
      const prefix = greet.startsWith("おはよう") ? "おはよう" :
                     greet.startsWith("こんばんは") ? "こんばんは" :
                     greet.startsWith("もしもし") ? "もしもし" : "こんにちは";
      return `${prefix}。声は届いてる`;
    }

    case "screen_visibility_question":
      return "画面そのものは見てない。少しの状態だけ分かる";

    case "observation_question": {
      const signals = _buildSignals(ctx);
      if (signals.length > 0) return `画面全体じゃなくて、${signals[0]}の気配だけ`;
      return "画面全体じゃなくて、今いる場所の気配だけ";
    }

    case "app_state_question": {
      const signals = _buildSignals(ctx);
      if (signals.length > 0) return `今は、${signals[0]}みたい`;
      return "今のアプリの種類と、少しの状態だけ分かる";
    }

    case "casual_chat":
    case "unknown":
    default:
      return null;
  }
}

function _buildSignals(ctx: CompanionContext): string[] {
  const signals: string[] = [];
  const summary = ctx.activityInsight.summary;
  if (summary && summary !== "何かしている" && summary !== "設定画面が前面") {
    signals.push(summary);
  }
  const downloads = ctx.observation.folders.downloads?.fileCount ?? 0;
  if (downloads > 20) signals.push("Downloadsの多さ");
  if (ctx.observation.media?.audioLikelyActive) signals.push("音の気配");

  // filenameSignals が存在する場合のみ、フォルダ由来のシグナルを追加
  if (ctx.observation.folders?.downloads?.filenameSignals) {
    const folders = [ctx.observation.folders?.downloads, ctx.observation.folders?.desktop].filter(Boolean);
    for (const folder of folders) {
      if (folder?.installerPileLikely) signals.push("インストーラーが増えてる");
      else if (folder?.archivePileLikely) signals.push("圧縮ファイルが増えてる");
      else if (folder?.audioExportLikely) signals.push("音の書き出しっぽいものがある");
      else if (folder?.imageExportLikely) signals.push("画像が溜まってる");
      else if (folder?.dawProjectLikely) signals.push("DAWプロジェクトがある");
    }
  }

  return signals;
}

/** 後方互換エイリアス */
export const buildObservationQuestionResponse = (intent: VoiceIntent, ctx: CompanionContext): string | null =>
  buildLocalConversationResponse(intent, ctx);
