// LLM 出力のサニタイズ・品質チェック
// 禁止表現・長文・アシスタント文・英語混入を排除する

const MAX_LENGTH = 80;
const MIN_LENGTH = 2;

const FORBIDDEN_PATTERNS = [
  /私はAI/,
  /AIアシスタント/,
  /お手伝いでき/,
  /何か.*できますか/,
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
  /\.\.\./,              // 省略記号 (文章が途切れている)
  /。。/,                // 壊れた句読点
];

// 英単語 (3文字超の連続ASCII英字) が含まれているか検出
const ENGLISH_WORD_PATTERN = /[A-Za-z]{4,}/;

// 文章の途中切れパターン: 「は」「が」「を」等の格助詞で終わるものだけ拒否
// 「ーはがを」は切れているが「にでも」は自然な終止もあるため除外
const TRUNCATED_PATTERN = /[はがをへ]$/;

export type FilterResult =
  | { ok: true; text: string }
  | { ok: false; reason: string };

export function filterGeneratedText(raw: string): FilterResult {
  const text = raw.trim();

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

  // 途中切れ (助詞・助動詞で終わる)
  if (TRUNCATED_PATTERN.test(text)) {
    return { ok: false, reason: "truncated_sentence" };
  }

  return { ok: true, text };
}
