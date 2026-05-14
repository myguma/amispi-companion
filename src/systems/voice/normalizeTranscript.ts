export type VoiceTranscriptValidation =
  | { ok: true; text: string }
  | { ok: false; reason: "empty" | "blank_audio" | "noise" | "symbol_only" };

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

export function validateVoiceTranscript(input: string): VoiceTranscriptValidation {
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

  return { ok: true, text: text.slice(0, 200) };
}
