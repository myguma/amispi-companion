// Voice fallback — transcript は保存せず、その場の返答生成にだけ使う。

const MAX_FALLBACK_LEN = 60;

function normalizeTranscript(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[「」『』"'`]/g, "")
    .replace(/[。！？!?]+$/g, "")
    .slice(0, 80);
}

function isGreeting(text: string): boolean {
  return /(こんにちは|こんばんは|おはよう|やあ|もしもし)/.test(text);
}

function isHearingQuestion(text: string): boolean {
  return /(聞こえ|きこえ|聴こえ|届いて|届く)/.test(text) && /[？?]?/.test(text);
}

function findNumberish(text: string): string | null {
  const m = text.match(/[0-9０-９一二三四五六七八九〇零壱弐参]{2,}/);
  return m?.[0] ?? null;
}

function firstChunk(text: string): string {
  return text
    .split(/[、,。.!！?？\s]+/)
    .map((p) => p.trim())
    .filter(Boolean)[0]
    ?.slice(0, 18) ?? text.slice(0, 18);
}

export function buildVoiceFallback(transcript: string): string {
  const text = normalizeTranscript(transcript);
  if (!text) return "うまく聞き取れなかった。";

  if (isGreeting(text)) return "こんにちは。声、届いてる";
  if (isHearingQuestion(text)) return "聞こえてる。少しだけ、ここで聞いてる";

  const numberish = findNumberish(text);
  if (numberish) {
    const head = firstChunk(text);
    const line = head && !head.includes(numberish)
      ? `${head}と${numberish}、聞こえた`
      : `${numberish}、聞こえた`;
    return line.slice(0, MAX_FALLBACK_LEN);
  }

  return `${text.slice(0, 36)}、聞こえた`.slice(0, MAX_FALLBACK_LEN);
}

export function isGenericVoiceLine(text: string): boolean {
  const normalized = text.trim().replace(/[、。！？…\s.?!]/g, "");
  return [
    "ここにいる",
    "ここにいるよ",
    "うん聞こえてる",
    "聞こえてる",
    "呼んだ",
    "ん",
    "なに",
    "何",
  ].includes(normalized);
}
