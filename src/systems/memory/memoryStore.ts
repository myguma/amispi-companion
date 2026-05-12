// ローカルメモリシステム (v0: localStorage)
// 将来: tauri-plugin-store または SQLite に移行予定
// 設計原則: ユーザーが閲覧・削除できる構造であること

import type { MemoryEvent, MemoryEventType } from "../../types/companion";

const STORAGE_KEY = "amispi_companion_events";
const MAX_EVENTS = 500;

/** 簡易ID生成（uuid不要・衝突確率は十分低い） */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadEvents(): MemoryEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEvents(events: MemoryEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // ストレージがいっぱいの場合は古いイベントを削除して再試行
    const trimmed = events.slice(-Math.floor(MAX_EVENTS / 2));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // サイレント失敗
    }
  }
}

/** メモリ統計型 */
export type MemoryStats = {
  totalEvents:   number;
  appStartCount: number;
  clickCount:    number;
  speechCount:   number;
  noteCount:     number;
  oldestEventAt: number | null;
  newestEventAt: number | null;
};

/**
 * メモリイベントを記録する
 */
export function logEvent(
  type: MemoryEventType,
  data?: Record<string, unknown>
): void {
  const events = loadEvents();
  const newEvent: MemoryEvent = {
    id: generateId(),
    type,
    timestamp: Date.now(),
    data,
  };

  events.push(newEvent);

  // 上限を超えた場合は古いものを削除
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }

  saveEvents(events);
}

/**
 * 最新のイベントを取得する (逆順)
 */
export function getRecentEvents(limit = 20): MemoryEvent[] {
  const events = loadEvents();
  return events.slice(-limit).reverse();
}

/**
 * 全イベントを取得する (古い順)
 */
export function getAllEvents(): MemoryEvent[] {
  return loadEvents();
}

/**
 * 特定タイプのイベントのみ取得する (古い順)
 */
export function getEventsByType(type: MemoryEventType): MemoryEvent[] {
  return loadEvents().filter((e) => e.type === type);
}

/**
 * 全イベントを削除する
 */
export function clearEvents(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 特定タイプのイベントのみ削除する
 */
export function clearEventsByType(type: MemoryEventType): void {
  const events = loadEvents().filter((e) => e.type !== type);
  saveEvents(events);
}

/**
 * 総イベント数を取得する
 */
export function getEventCount(): number {
  return loadEvents().length;
}

/**
 * メモリ統計を取得する
 */
export function getMemoryStats(): MemoryStats {
  const events = loadEvents();
  return {
    totalEvents:   events.length,
    appStartCount: events.filter((e) => e.type === "app_start").length,
    clickCount:    events.filter((e) => e.type === "character_clicked").length,
    speechCount:   events.filter((e) => e.type === "speech_shown").length,
    noteCount:     events.filter((e) => e.type === "note_saved").length,
    oldestEventAt: events.length > 0 ? events[0].timestamp : null,
    newestEventAt: events.length > 0 ? events[events.length - 1].timestamp : null,
  };
}

/**
 * 前回のapp_startからの経過時間をミリ秒で返す
 * 初回の場合は null を返す
 */
export function getTimeSinceLastSession(): number | null {
  const events = loadEvents();
  const previousStarts = events.filter((e) => e.type === "app_start");

  if (previousStarts.length < 2) return null;

  // 最後から2番目のapp_startを「前回セッション」とみなす
  const prev = previousStarts[previousStarts.length - 2];
  return Date.now() - prev.timestamp;
}
