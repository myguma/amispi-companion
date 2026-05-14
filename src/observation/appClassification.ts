import type { AppCategory, ObservationSnapshot } from "./types";

export const APP_CATEGORY_OPTIONS: AppCategory[] = [
  "browser",
  "terminal",
  "ide",
  "daw",
  "music",
  "media",
  "game",
  "chat",
  "design",
  "file_manager",
  "archive_tool",
  "installer",
  "document",
  "notes",
  "system",
  "self",
  "ai_chat",
  "ai_assistant",
  "ai_search",
  "unknown",
];

export const APP_CATEGORY_LABELS: Record<AppCategory, string> = {
  browser: "ブラウザ",
  terminal: "ターミナル",
  ide: "IDE/エディタ",
  daw: "DAW/音楽制作",
  music: "音楽",
  media: "メディア",
  game: "ゲーム",
  chat: "チャット/通話",
  design: "デザイン",
  file_manager: "ファイル管理",
  archive_tool: "アーカイブ",
  installer: "インストーラー",
  document: "ドキュメント",
  notes: "ノート",
  system: "システム",
  self: "自アプリ",
  ai_chat: "AIチャット",
  ai_assistant: "AIアシスタント",
  ai_search: "AI検索",
  unknown: "不明",
  office: "オフィス",
  communication: "チャット/通話",
};

export function normalizeProcessName(name: string): string {
  return name.trim().toLowerCase();
}

export function appCategoryLabel(category: string): string {
  return APP_CATEGORY_LABELS[category as AppCategory] ?? category;
}

export function applyCustomAppClassifications(
  snapshot: ObservationSnapshot,
  custom: Record<string, AppCategory> = {},
): ObservationSnapshot {
  const activeApp = snapshot.activeApp;
  if (!activeApp) return snapshot;

  const processName = normalizeProcessName(activeApp.processName);
  const override = custom[processName];
  if (!override || override === activeApp.category) return snapshot;

  return {
    ...snapshot,
    activeApp: {
      ...activeApp,
      category: override,
      classificationSource: "custom",
      classificationReason: `user_override:${processName}->${override}`,
    },
  };
}
