import type { CompanionContext, ReactionIntent } from "./types";
import { topSignal } from "../../systems/observation/observationSignals";

const QUESTION_HINTS = [
  "?", "？", "なに", "何", "どこ", "どれ", "いつ", "なぜ", "どう", "見て", "わかる", "分かる",
];

export function selectReactionIntent(ctx: CompanionContext): ReactionIntent {
  const kind = ctx.activityInsight.kind;
  const top = topSignal(ctx.signals ?? []);
  const input = ctx.voiceInput?.trim() ?? "";

  if ((ctx.trigger === "voice" || ctx.trigger === "text") && input) {
    if (QUESTION_HINTS.some((hint) => input.includes(hint))) return "question";
    if (kind === "coding") return "technical_prompt";
    if (kind === "composing" || kind === "design") return "creative_prompt";
    return "playful";
  }

  if (top && top.strength >= 0.5) {
    if (top.kind === "downloads_pile" || top.kind === "installer_pile" || top.kind === "archive_pile" || top.kind === "image_pile") {
      return "cleanup_prompt";
    }
    if (top.kind === "long_idle" || top.kind === "user_returned") return "quiet_presence";
    if (top.kind === "code_work") return "technical_prompt";
    if (top.kind === "audio_work" || top.kind === "daw_active") return "creative_prompt";
    if (top.kind === "fullscreen" || top.kind === "gaming") return "careful_warning";
    return "suggestion";
  }

  if (ctx.recentEvents.slice(-20).some((e) => e.type === "note_saved")) {
    return "memory_reflection";
  }

  if (ctx.trigger === "click" || ctx.trigger === "manual" || ctx.trigger === "wake") return "playful";
  if (ctx.trigger === "return") return "quiet_presence";

  if (kind === "coding") return "technical_prompt";
  if (kind === "composing" || kind === "design") return "creative_prompt";
  if (kind === "deepFocus") return "focus_support";
  if (ctx.trigger === "observation") return "observation";

  return "quiet_presence";
}

export function ensureReactionIntent(ctx: CompanionContext): CompanionContext {
  if (ctx.reactionIntent) return ctx;
  return { ...ctx, reactionIntent: selectReactionIntent(ctx) };
}

export function describeReactionIntent(intent: ReactionIntent): string {
  switch (intent) {
    case "quiet_presence":
      return "静かな存在感だけを出す。説明や提案はしない。";
    case "observation":
      return "観察した変化を短く言う。断定しすぎない。";
    case "suggestion":
      return "軽い示唆に留める。命令や説教にしない。";
    case "question":
      return "ユーザーの問いに短く答える。見えていないものは見えていないと言う。";
    case "memory_reflection":
      return "保存済みメモの気配を自然に反映する。本文を長く引用しない。";
    case "creative_prompt":
      return "制作中の流れを邪魔せず、作っているものへの短い反応にする。";
    case "technical_prompt":
      return "コードや作業の詰まりに寄り添うが、指示や評価はしない。";
    case "cleanup_prompt":
      return "片付けの気配を軽く言う。今すぐ整理しろとは言わない。";
    case "focus_support":
      return "集中を邪魔しない。必要なら短く控えめにする。";
    case "playful":
      return "呼びかけへの小さな反応。短すぎる単語だけで終わらない。";
    case "careful_warning":
      return "邪魔しない判断を優先し、必要な時だけ控えめに知らせる。";
  }
}
