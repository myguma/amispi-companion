// LLM 出力のサニタイズ・品質チェック
// 禁止表現・長文・アシスタント文を排除する

const MAX_LENGTH = 80;

const FORBIDDEN_PATTERNS = [
  /私はAI/,
  /AIアシスタント/,
  /お手伝いでき/,
  /整理しましょう/,
  /タスク/,
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
];

export type FilterResult =
  | { ok: true; text: string }
  | { ok: false; reason: string };

export function filterGeneratedText(raw: string): FilterResult {
  const text = raw.trim();

  if (!text) return { ok: false, reason: "empty" };

  if (text.length > MAX_LENGTH) {
    // 80文字で切り詰めて返す（完全拒否より優先）
    const trimmed = text.slice(0, MAX_LENGTH).replace(/[。、]?$/, "");
    if (!trimmed) return { ok: false, reason: "too_long_and_untrimable" };
    return { ok: true, text: trimmed };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) {
      return { ok: false, reason: `forbidden_pattern:${pattern.source}` };
    }
  }

  return { ok: true, text };
}
