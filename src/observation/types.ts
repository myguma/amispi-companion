// 観測データ型定義
// Rust バックエンドから受け取る構造。生データは Rust 側でフィルタ済み。

export type AppCategory =
  | "ide"
  | "daw"
  | "browser"
  | "media"
  | "game"
  | "office"
  | "terminal"
  | "communication"
  | "system"
  | "design"        // デザインツール (Figma / Photoshop等)
  | "notes"         // ノート / メモアプリ (Obsidian等)
  | "archive_tool"  // アーカイブマネージャー (7-Zip / WinRAR等)
  | "document"      // PDFビューア / ドキュメントビューア
  | "self"      // 自アプリ (設定画面・コンパニオン本体)
  | "unknown";

export type FolderSummary = {
  folderKind: "desktop" | "downloads" | "custom";
  fileCount: number;
  dirCount: number;
  totalSizeBytes: number;
  extensionCounts: Record<string, number>;
  recentFileCount: number;
  screenshotPileLikely: boolean;
  audioPileLikely: boolean;
  imagePileLikely: boolean;
  filenameSignals: string[];
  installerPileLikely: boolean;
  archivePileLikely: boolean;
  audioExportLikely: boolean;
  imageExportLikely: boolean;
  dawProjectLikely: boolean;
  codeProjectLikely: boolean;
  tempDownloadLikely: boolean;
};

export type MediaContext = {
  audioLikelyActive: boolean;
  mediaKind: "music" | "video" | "none";
  sourceCategory: "music_app" | "video_app" | "daw" | "browser" | "none";
};

export type ObservationSnapshot = {
  timestamp: string;
  idle: {
    idleMs: number;
    inputActiveRecently: boolean;
  };
  activeApp?: {
    processName: string;
    category: AppCategory;
  };
  activeWindow?: {
    titleRedacted: string | null;
    included: boolean;
  };
  fullscreenLikely: boolean;
  folders: {
    desktop?: FolderSummary;
    downloads?: FolderSummary;
  };
  system?: {
    cpuLoad?: number;
    memoryLoad?: number;
  };
  media?: MediaContext;
  privacy: {
    permissionLevel: number;
    titleIncluded: boolean;
    filenamesIncluded: boolean;
    contentIncluded: boolean;
    cloudAllowed: boolean;
  };
};

export type ActivityKind =
  | "active"
  | "idle"
  | "deepFocus"
  | "mediaWatching"
  | "gamingLikely"
  | "fullscreen"
  | "away";

export function deriveActivity(snap: ObservationSnapshot): ActivityKind {
  const idleMs = snap.idle.idleMs;
  if (idleMs > 30 * 60 * 1000) return "away";
  const cat = snap.activeApp?.category;
  if (snap.fullscreenLikely) {
    if (cat === "game") return "gamingLikely";
    if (cat === "media") return "mediaWatching";
    return "fullscreen";
  }
  if (idleMs > 5 * 60 * 1000) return "idle";
  return "active";
}

export const EMPTY_SNAPSHOT: ObservationSnapshot = {
  timestamp: new Date().toISOString(),
  idle: { idleMs: 0, inputActiveRecently: true },
  fullscreenLikely: false,
  folders: {},
  privacy: {
    permissionLevel: 0,
    titleIncluded: false,
    filenamesIncluded: false,
    contentIncluded: false,
    cloudAllowed: false,
  },
};
