export type VoiceTranscriptValidation =
  | { ok: true; text: string }
  | { ok: false; reason: "empty" | "blank_audio" | "noise" | "symbol_only" | "english_when_ja_expected" };

export type VoiceTranscriptOptions = {
  whisperLanguage?: string;
};

const BLANK_TOKENS = new Set([
  "blank_audio",
  "[blank_audio]",
  "(blank_audio)",
  "no_speech",
  "[no_speech]",
  "(no_speech)",
  "music",
  "[music]",
  "(music)",
]);

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export function validateVoiceTranscript(input: string, options?: VoiceTranscriptOptions): VoiceTranscriptValidation {
  const text = input.trim().replace(/\s+/g, " ");
  if (!text) return { ok: false, reason: "empty" };

  const token = normalizeToken(text);
  if (BLANK_TOKENS.has(token)) return { ok: false, reason: "blank_audio" };
  if (/^\[.*\]$/.test(text) && /blank|silence|noise|music|no[_\s-]?speech/i.test(text)) {
    return { ok: false, reason: "blank_audio" };
  }

  if (/^[….\-ー、。！？!?♪\s]+$/.test(text)) return { ok: false, reason: "symbol_only" };
  if (text.length === 1 && !/[ぁ-んァ-ヶ一-龠々0-9０-９]/.test(text)) {
    return { ok: false, reason: "noise" };
  }

  // 日本語モードで ASCII 英語のみの場合は低信頼として弾く
  if (options?.whisperLanguage === "ja") {
    const hasJapanese = /[ぁ-んァ-ヶ一-龠々]/.test(text);
    const isAsciiOnly = /^[\x20-\x7E\s]+$/.test(text);
    if (!hasJapanese && isAsciiOnly && text.length > 8) {
      return { ok: false, reason: "english_when_ja_expected" };
    }
  }

  return { ok: true, text: text.slice(0, 200) };
}
