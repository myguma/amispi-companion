// LLM 出力のサニタイズ・品質チェック
// 禁止表現・長文・アシスタント文・英語混入を排除する

import type { CompanionContext } from "../../companion/ai/types";
import { isGenericVoiceLine, sanitizeVoiceResponse } from "../voice/voiceFallback";

const MAX_LENGTH = 80;
const MIN_LENGTH = 2;

const FORBIDDEN_PATTERNS = [
  /私はAI/,
  /AIアシスタント/,
  /お手伝いでき/,
  /お手伝い.*ますか/,
  /何か.*できますか/,
  /何か.*手伝/,
  /整理しましょう/,
  /しましょう/,
  /してください/,
  /休憩してください/,
  /休憩しましょう/,
  /休みましょう/,
  /頑張/,
  /タスク/,
  /作業しています/,
  /クリックしています/,
  /疲れています/,
  /病気/,
  /治療/,
  /依存/,
  /うつ/,
  /診断/,
  /精神/,
  /メンタル/,
  /セラピー/,
  /http/,
  /www\./,
  /\.com/,
  /continued/i,          // 英語続く表現
  /continue/i,
  /继续观察/,
  /继续/,
  /观察/,
  /請/,
  /请/,
  /\.\.\./,              // 省略記号 (文章が途切れている)
  /。。/,                // 壊れた句読点
  /？。/,
  /！。/,
  /\?\./,
];

// ASCII英字はvoice/character返答では原則使わない
const ENGLISH_WORD_PATTERN = /[A-Za-z]/;

// 文章の途中切れパターン: 「は」「が」「を」等の格助詞で終わるものだけ拒否
// 「ーはがを」は切れているが「にでも」は自然な終止もあるため除外
const TRUNCATED_PATTERN = /[はがをへ]$/;

export type FilterResult =
  | { ok: true; text: string }
  | { ok: false; reason: string };

export type FilterOptions = {
  trigger?: CompanionContext["trigger"];
  voiceInput?: string;
};

export function filterGeneratedText(raw: string, options: FilterOptions = {}): FilterResult {
  const text = options.trigger === "voice" && options.voiceInput?.trim()
    ? sanitizeVoiceResponse(raw)
    : raw.trim()
        .replace(/[？！]。/g, (m) => m[0])
        .replace(/。。+/g, "。");

  if (!text) return { ok: false, reason: "empty" };

  // 長すぎる → 拒否 (v0.1.37〜: truncate しない)
  if (text.length > MAX_LENGTH) {
    return { ok: false, reason: "too_long" };
  }

  // 短すぎる
  if (text.length < MIN_LENGTH) {
    return { ok: false, reason: "too_short" };
  }

  // 禁止パターン
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) {
      return { ok: false, reason: `forbidden_pattern:${pattern.source}` };
    }
  }

  // 英単語混入
  if (ENGLISH_WORD_PATTERN.test(text)) {
    return { ok: false, reason: "english_word_detected" };
  }

  if (options.trigger === "voice" && options.voiceInput?.trim() && isGenericVoiceLine(text)) {
    return { ok: false, reason: "voice_generic_response" };
  }

  // 途中切れ (助詞・助動詞で終わる)
  if (TRUNCATED_PATTERN.test(text)) {
    return { ok: false, reason: "truncated_sentence" };
  }

  return { ok: true, text };
}
