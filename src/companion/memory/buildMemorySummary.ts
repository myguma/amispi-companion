// ローカル記憶イベントをコンパニオンが使える「記憶サマリー」に変換する純粋モジュール

import type { MemoryEvent } from "../../types/companion";
import { classifyBreak } from "./memorySummary";
import { buildDailySummary } from "./dailySummary";

export type CompanionMemorySummary = {
  todayClickCount: number;
  todaySpeechCount: number;
  recentSpeechCount: number;
  sessionCountToday: number;
  lastSessionBreak: "none" | "short" | "hours" | "longDay";
  shortNaturalSummary: string; // LLM プロンプトに渡す短い自然文
};

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

  return { todayClickCount, todaySpeechCount, recentSpeechCount, sessionCountToday, lastSessionBreak, shortNaturalSummary: summary };
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
