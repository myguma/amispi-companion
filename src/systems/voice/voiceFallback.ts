// Voice fallback — transcript は保存せず、その場の返答生成にだけ使う。

import type { CompanionContext } from "../../companion/ai/types";

const MAX_FALLBACK_LEN = 60;

function normalizeTranscript(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[「」『』"'`]/g, "")
    .replace(/[。！？!?]+$/g, "")
    .slice(0, 80);
}

function responseSafeTranscript(input: string): string {
  return input
    .replace(/[A-Za-z]+/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[、,。\s]+|[、,。\s]+$/g, "")
    .trim();
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

function isObservationQuestion(text: string): boolean {
  return /(何見て|何を見て|今何して|今の状態|どのアプリ|何が見えて|何を認識|何が分か|画面.*見え|見えてる)/.test(text);
}

function buildObservationFallback(text: string, ctx?: CompanionContext): string | null {
  if (!isObservationQuestion(text)) return null;
  if (/画面.*見え|見えてる/.test(text)) {
    return "画面そのものは見てない、少しの状態だけ分かる";
  }
  const summary = ctx?.activityInsight.summary;
  if (summary && summary !== "何かしている" && summary !== "設定画面が前面") {
    return `今は、${summary}みたい`.slice(0, MAX_FALLBACK_LEN);
  }
  return "今のアプリと、少しの作業の気配だけ分かる";
}

export function sanitizeVoiceResponse(input: string): string {
  let text = input.trim().replace(/\s+/g, " ");
  text = text
    .replace(/[？！]。/g, (m) => m[0])
    .replace(/。。+/g, "。")
    .replace(/\.{2,}/g, "…")
    .replace(/。+\s*ん\s*$/g, "")
    .replace(/[、。！？!?…\s]*ん\s*$/g, "")
    .replace(/[。！？!?]+$/g, "");

  const parts = text
    .split(/[。！？!?]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1) {
    text = parts[0];
  }
  return text.slice(0, 80);
}

export function buildVoiceFallback(transcript: string, ctx?: CompanionContext): string {
  const text = normalizeTranscript(transcript);
  if (!text) return "うまく聞き取れなかった。";
  const responseText = responseSafeTranscript(text);

  const observed = buildObservationFallback(text, ctx);
  if (observed) return sanitizeVoiceResponse(observed);

  if (isGreeting(text)) return "こんにちは、声は届いてる";
  if (isHearingQuestion(text)) return "聞こえてる、少しだけここで聞いてる";

  const numberish = findNumberish(responseText || text);
  if (numberish) {
    const head = firstChunk(responseText || text);
    const line = head && !head.includes(numberish)
      ? `${head}と${numberish}、聞こえた`
      : `${numberish}、聞こえた`;
    return sanitizeVoiceResponse(line.slice(0, MAX_FALLBACK_LEN));
  }

  if (!responseText) return "少し聞こえたけど、言葉が崩れた";
  return sanitizeVoiceResponse(`${responseText.slice(0, 36)}、聞こえた`.slice(0, MAX_FALLBACK_LEN));
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
