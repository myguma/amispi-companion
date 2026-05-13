// 今日のセッション活動パターンを要約する純粋モジュール
// MemoryEvent の集計のみ — 生データは渡さない

import type { MemoryEvent } from "../../types/companion";

export type DailySummary = {
  /** 今日の最初の起動 timestamp (ms)。null = 今日のデータなし */
  sessionStartTime: number | null;
  /** 今日の app_start 回数 */
  sessionCountToday: number;
  /** 今日の character_clicked 回数 */
  todayClickCount: number;
  /** 今日の speech_shown 回数 */
  todaySpeechCount: number;
  /** 最初の起動からの経過時間 (時間, 小数第1位) */
  activeHoursToday: number;
  /** LLM プロンプト / UI 向けの自然文 */
  naturalSummary: string;
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

export function buildDailySummary(events: MemoryEvent[]): DailySummary {
  const todayEvents = events.filter((e) => isTodayMs(e.timestamp));

  const todayClickCount  = todayEvents.filter((e) => e.type === "character_clicked").length;
  const todaySpeechCount = todayEvents.filter((e) => e.type === "speech_shown").length;
  const todayStarts      = todayEvents.filter((e) => e.type === "app_start");
  const sessionCountToday = todayStarts.length;

  const sessionStartTime = sessionCountToday > 0
    ? Math.min(...todayStarts.map((e) => e.timestamp))
    : null;

  const activeHoursToday = sessionStartTime !== null
    ? Math.round((Date.now() - sessionStartTime) / (60 * 60 * 1000) * 10) / 10
    : 0;

  const naturalSummary = buildNaturalSummary({
    sessionStartTime,
    sessionCountToday,
    todayClickCount,
    todaySpeechCount,
    activeHoursToday,
  });

  return {
    sessionStartTime,
    sessionCountToday,
    todayClickCount,
    todaySpeechCount,
    activeHoursToday,
    naturalSummary,
  };
}

function buildNaturalSummary(s: {
  sessionStartTime: number | null;
  sessionCountToday: number;
  todayClickCount: number;
  todaySpeechCount: number;
  activeHoursToday: number;
}): string {
  const parts: string[] = [];

  if (s.sessionStartTime !== null) {
    const startHour = new Date(s.sessionStartTime).getHours();
    if (startHour < 6)       parts.push("深夜から起動している");
    else if (startHour < 10) parts.push("朝早くから起動している");
  }

  if (s.activeHoursToday >= 8)      parts.push(`今日は${Math.round(s.activeHoursToday)}時間以上起動している`);
  else if (s.activeHoursToday >= 4) parts.push(`今日は${Math.round(s.activeHoursToday)}時間ほど起動している`);
  else if (s.activeHoursToday >= 2) parts.push(`今日は${Math.round(s.activeHoursToday)}時間ほど動いている`);

  if (s.sessionCountToday >= 3) parts.push("何度か戻ってきている");

  if (s.todayClickCount >= 10)     parts.push("よく呼ばれている");
  else if (s.todayClickCount >= 4) parts.push("何度か呼ばれている");

  return parts.length > 0 ? parts.join("。") + "。" : "";
}
