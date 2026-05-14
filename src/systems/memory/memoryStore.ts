// ローカルメモリシステム (v0: localStorage)
// 将来: tauri-plugin-store または SQLite に移行予定
// 設計原則: ユーザーが閲覧・削除できる構造であること

import type { MemoryEvent, MemoryEventType } from "../../types/companion";

const STORAGE_KEY = "amispi_companion_events";
const MAX_EVENTS = 500;

export type MemoryNoteCategory =
  | "preference"
  | "project"
  | "creative_direction"
  | "technical_context"
  | "personal_note"
  | "avoid"
  | "style_preference";

export type SavedMemoryNote = {
  id: string;
  timestamp: number;
  updatedAt: number;
  text: string;
  category: MemoryNoteCategory;
  pinned: boolean;
  includeInPrompt: boolean;
};

export type MemoryNoteImportResult = {
  importedCount: number;
  skippedCount: number;
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

function normalizeNoteCategory(value: unknown): MemoryNoteCategory {
  return typeof value === "string" && MEMORY_NOTE_CATEGORIES.includes(value as MemoryNoteCategory)
    ? value as MemoryNoteCategory
    : "personal_note";
}

function normalizeSavedMemoryNote(event: MemoryEvent): SavedMemoryNote | null {
  if (event.type !== "note_saved") return null;
  const text = typeof event.data?.text === "string" ? event.data.text.trim() : "";
  if (!text) return null;
  const updatedAt = typeof event.data?.updatedAt === "number" && Number.isFinite(event.data.updatedAt)
    ? event.data.updatedAt
    : event.timestamp;

  return {
    id: event.id,
    timestamp: event.timestamp,
    updatedAt,
    text,
    category: normalizeNoteCategory(event.data?.category),
    pinned: event.data?.pinned === true,
    includeInPrompt: event.data?.includeInPrompt !== false,
  };
}

function noteToEventData(note: Omit<SavedMemoryNote, "id" | "timestamp">): Record<string, unknown> {
  return {
    text: note.text.trim().slice(0, 240),
    category: note.category,
    pinned: note.pinned,
    includeInPrompt: note.includeInPrompt,
    updatedAt: note.updatedAt,
  };
}

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

export type MemoryRetentionResult = {
  enabled: boolean;
  retentionDays: number;
  beforeCount: number;
  afterCount: number;
  deletedCount: number;
  cutoffTimestamp: number | null;
};

export type MemoryExportPayload = {
  schemaVersion: 1;
  appVersion: string;
  exportedAt: string;
  retentionDays: number;
  eventCount: number;
  eventTypes: Record<MemoryEventType, number>;
  range: {
    oldestEventAt: string | null;
    newestEventAt: string | null;
  };
  events: MemoryEvent[];
};

const EMPTY_EVENT_TYPE_COUNTS: Record<MemoryEventType, number> = {
  app_start: 0,
  character_clicked: 0,
  speech_shown: 0,
  state_changed: 0,
  note_saved: 0,
};

function buildRetentionResult(events: MemoryEvent[], retentionDays: number, now: number): MemoryRetentionResult {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    return {
      enabled: false,
      retentionDays,
      beforeCount: events.length,
      afterCount: events.length,
      deletedCount: 0,
      cutoffTimestamp: null,
    };
  }

  const cutoffTimestamp = now - retentionDays * 24 * 60 * 60 * 1000;
  const afterCount = events.filter((event) => (
    typeof event.timestamp !== "number" ||
    !Number.isFinite(event.timestamp) ||
    event.timestamp >= cutoffTimestamp
  )).length;

  return {
    enabled: true,
    retentionDays,
    beforeCount: events.length,
    afterCount,
    deletedCount: events.length - afterCount,
    cutoffTimestamp,
  };
}

/**
 * 保存期間を超えた MemoryEvent 数を数える。
 * timestamp が不正な既存イベントは、互換性のため削除対象にしない。
 */
export function countExpiredEvents(retentionDays: number, now = Date.now()): MemoryRetentionResult {
  return buildRetentionResult(loadEvents(), retentionDays, now);
}

/**
 * 保存期間を超えた MemoryEvent を削除する。
 * retentionDays <= 0 は無期限として扱い、自動削除しない。
 */
export function pruneExpiredEvents(retentionDays: number, now = Date.now()): MemoryRetentionResult {
  const events = loadEvents();
  const result = buildRetentionResult(events, retentionDays, now);

  if (!result.enabled || result.deletedCount === 0 || result.cutoffTimestamp === null) {
    return result;
  }

  const cutoffTimestamp = result.cutoffTimestamp;
  const kept = events.filter((event) => (
    typeof event.timestamp !== "number" ||
    !Number.isFinite(event.timestamp) ||
    event.timestamp >= cutoffTimestamp
  ));
  saveEvents(kept);
  return { ...result, afterCount: kept.length, deletedCount: events.length - kept.length };
}

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
 * ローカル記憶をJSON export用の安定したpayloadに整形する。
 * 外部送信は行わず、呼び出し側がローカルファイルとして保存する。
 */
export function buildMemoryExportPayload(
  appVersion: string,
  retentionDays: number,
  now = Date.now()
): MemoryExportPayload {
  const events = loadEvents();
  const eventTypes = events.reduce<Record<MemoryEventType, number>>((acc, event) => {
    acc[event.type] = (acc[event.type] ?? 0) + 1;
    return acc;
  }, { ...EMPTY_EVENT_TYPE_COUNTS });

  const oldest = events.length > 0 ? events[0].timestamp : null;
  const newest = events.length > 0 ? events[events.length - 1].timestamp : null;

  return {
    schemaVersion: 1,
    appVersion,
    exportedAt: new Date(now).toISOString(),
    retentionDays,
    eventCount: events.length,
    eventTypes,
    range: {
      oldestEventAt: typeof oldest === "number" && Number.isFinite(oldest) ? new Date(oldest).toISOString() : null,
      newestEventAt: typeof newest === "number" && Number.isFinite(newest) ? new Date(newest).toISOString() : null,
    },
    events,
  };
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
 * ユーザーが手動で記録したメモをメモリに保存する
 * memoryMode が ask_before_long_term の場合に承認済みメモとして使用する
 */
export function saveMemoryNote(
  text: string,
  options: Partial<Pick<SavedMemoryNote, "category" | "pinned" | "includeInPrompt">> = {}
): void {
  const clean = text.trim().slice(0, 240);
  if (!clean) return;
  logEvent("note_saved", {
    text: clean,
    category: normalizeNoteCategory(options.category),
    pinned: options.pinned === true,
    includeInPrompt: options.includeInPrompt !== false,
    updatedAt: Date.now(),
  });
}

/**
 * 保存済みメモ一覧（note_savedイベント）を新しい順で返す。
 * v1.4.0以前の古いnote_savedは personal_note / prompt対象 / unpinned として扱う。
 */
export function getSavedMemoryNotes(): SavedMemoryNote[] {
  return loadEvents()
    .map(normalizeSavedMemoryNote)
    .filter((note): note is SavedMemoryNote => note !== null)
    .sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * プロンプト投入対象のユーザー承認済みメモ。
 * pinnedを優先し、件数を絞ってAIコンテキストが過長にならないようにする。
 */
export function getPromptMemoryNotes(limit = 5): SavedMemoryNote[] {
  return getSavedMemoryNotes()
    .filter((note) => note.includeInPrompt)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    })
    .slice(0, limit);
}

/**
 * 保存済みメモを編集する。対象がnote_savedでない場合は何もしない。
 */
export function updateMemoryNote(
  id: string,
  patch: Partial<Pick<SavedMemoryNote, "text" | "category" | "pinned" | "includeInPrompt">>
): void {
  const events = loadEvents();
  let changed = false;
  const next = events.map((event) => {
    if (event.id !== id || event.type !== "note_saved") return event;
    const current = normalizeSavedMemoryNote(event);
    if (!current) return event;
    const text = typeof patch.text === "string" ? patch.text.trim().slice(0, 240) : current.text;
    if (!text) return event;
    changed = true;
    return {
      ...event,
      data: noteToEventData({
        text,
        category: patch.category !== undefined ? normalizeNoteCategory(patch.category) : current.category,
        pinned: patch.pinned !== undefined ? patch.pinned === true : current.pinned,
        includeInPrompt: patch.includeInPrompt !== undefined ? patch.includeInPrompt !== false : current.includeInPrompt,
        updatedAt: Date.now(),
      }),
    };
  });
  if (changed) saveEvents(next);
}

/**
 * Memory export JSONからユーザー承認済みメモだけを取り込む。
 * 発話ログや観測ログはimportしない。
 */
export function importMemoryNotesFromPayload(payload: unknown): MemoryNoteImportResult {
  const events = (payload as { events?: unknown })?.events;
  if (!Array.isArray(events)) return { importedCount: 0, skippedCount: 0 };

  let importedCount = 0;
  let skippedCount = 0;
  const existing = loadEvents();
  const knownTexts = new Set(
    existing
      .map(normalizeSavedMemoryNote)
      .filter((note): note is SavedMemoryNote => note !== null)
      .map((note) => `${note.category}:${note.text}`)
  );

  for (const raw of events) {
    const event = raw as MemoryEvent;
    const note = normalizeSavedMemoryNote(event);
    if (!note) {
      skippedCount += 1;
      continue;
    }
    const dedupeKey = `${note.category}:${note.text}`;
    if (knownTexts.has(dedupeKey)) {
      skippedCount += 1;
      continue;
    }
    knownTexts.add(dedupeKey);
    existing.push({
      id: generateId(),
      type: "note_saved",
      timestamp: Date.now(),
      data: noteToEventData({
        text: note.text,
        category: note.category,
        pinned: note.pinned,
        includeInPrompt: note.includeInPrompt,
        updatedAt: Date.now(),
      }),
    });
    importedCount += 1;
  }

  if (existing.length > MAX_EVENTS) {
    existing.splice(0, existing.length - MAX_EVENTS);
  }
  saveEvents(existing);
  return { importedCount, skippedCount };
}

/**
 * 指定IDのイベントを削除する
 */
export function deleteEventById(id: string): void {
  saveEvents(loadEvents().filter((e) => e.id !== id));
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
