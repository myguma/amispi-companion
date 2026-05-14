// ローカル記憶イベントをコンパニオンが使える「記憶サマリー」に変換する純粋モジュール

import type { MemoryEvent } from "../../types/companion";
import { classifyBreak } from "./memorySummary";
import { buildDailySummary } from "./dailySummary";
import type { MemoryNoteCategory, SavedMemoryNote } from "../../systems/memory/memoryStore";

export type CompanionMemorySummary = {
  todayClickCount: number;
  todaySpeechCount: number;
  recentSpeechCount: number;
  sessionCountToday: number;
  lastSessionBreak: "none" | "short" | "hours" | "longDay";
  promptMemoryNotes: Pick<SavedMemoryNote, "text" | "category" | "pinned">[];
  promptMemoryNoteCount: number;
  excludedMemoryNoteCount: number;
  shortNaturalSummary: string; // LLM プロンプトに渡す短い自然文
};

const MEMORY_NOTE_CATEGORIES: MemoryNoteCategory[] = [
  "preference",
  "project",
  "creative_direction",
  "technical_context",
  "personal_note",
  "avoid",
  "style_preference",
];

function isTodayMs(ts: number): boolean {
  const now = new Date();
  const d   = new Date(ts);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth()    === now.getMonth() &&
    d.getDate()     === now.getDate()
  );
}

export function buildMemorySummary(events: MemoryEvent[]): CompanionMemorySummary {
  const todayEvents = events.filter((e) => isTodayMs(e.timestamp));

  const todayClickCount   = todayEvents.filter((e) => e.type === "character_clicked").length;
  const todaySpeechCount  = todayEvents.filter((e) => e.type === "speech_shown").length;
  const sessionCountToday = todayEvents.filter((e) => e.type === "app_start").length;
  const recentSpeechCount = events.slice(-50).filter((e) => e.type === "speech_shown").length;
  const lastSessionBreak  = classifyBreak();
  const allNotes = events
    .filter((e) => e.type === "note_saved")
    .map(noteFromEvent)
    .filter((note): note is SavedMemoryNote => note !== null);
  const promptMemoryNotes = allNotes
    .filter((note) => note.includeInPrompt)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    })
    .slice(0, 5)
    .map(({ text, category, pinned }) => ({ text, category, pinned }));
  const excludedMemoryNoteCount = allNotes.filter((note) => !note.includeInPrompt).length;

  const daily = buildDailySummary(events);

  const summary = buildNaturalSummary({
    todayClickCount,
    todaySpeechCount,
    sessionCountToday,
    recentSpeechCount,
    lastSessionBreak,
    dailyNatural: daily.naturalSummary,
    activeHoursToday: daily.activeHoursToday,
  });

  return {
    todayClickCount,
    todaySpeechCount,
    recentSpeechCount,
    sessionCountToday,
    lastSessionBreak,
    promptMemoryNotes,
    promptMemoryNoteCount: promptMemoryNotes.length,
    excludedMemoryNoteCount,
    shortNaturalSummary: summary,
  };
}

function normalizeNoteCategory(value: unknown): MemoryNoteCategory {
  return typeof value === "string" && MEMORY_NOTE_CATEGORIES.includes(value as MemoryNoteCategory)
    ? value as MemoryNoteCategory
    : "personal_note";
}

function noteFromEvent(event: MemoryEvent): SavedMemoryNote | null {
  const text = typeof event.data?.text === "string" ? event.data.text.trim() : "";
  if (!text) return null;
  return {
    id: event.id,
    timestamp: event.timestamp,
    updatedAt: typeof event.data?.updatedAt === "number" && Number.isFinite(event.data.updatedAt)
      ? event.data.updatedAt
      : event.timestamp,
    text: text.slice(0, 240),
    category: normalizeNoteCategory(event.data?.category),
    pinned: event.data?.pinned === true,
    includeInPrompt: event.data?.includeInPrompt !== false,
  };
}

function buildNaturalSummary(s: {
  todayClickCount: number;
  todaySpeechCount: number;
  sessionCountToday: number;
  recentSpeechCount: number;
  lastSessionBreak: string;
  dailyNatural: string;
  activeHoursToday: number;
}): string {
  const parts: string[] = [];

  // セッション間隔
  if (s.lastSessionBreak === "longDay")  parts.push("前回から日が明けた");
  else if (s.lastSessionBreak === "hours") parts.push("少し時間が空いてから再開した");
  else if (s.lastSessionBreak === "short") parts.push("短い休憩のあと戻ってきた");

  // 今日の活動概要 (dailySummary の情報を優先)
  if (s.dailyNatural) {
    parts.push(s.dailyNatural.replace(/。$/, ""));
  } else {
    // フォールバック: 旧ロジック
    if (s.sessionCountToday > 1) parts.push(`今日は${s.sessionCountToday}回目の起動`);
    if (s.todayClickCount > 5)   parts.push("何度か呼ばれている");
  }

  return parts.length > 0 ? parts.join("。") + "。" : "";
}
