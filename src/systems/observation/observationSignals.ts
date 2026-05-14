// observationSignals.ts — ObservationSnapshot → ObservationSignal 変換
// Raw snapshot dataを直接会話に使わず、安全なSignalに変換する

import type { ObservationSnapshot, FolderSummary } from "../../observation/types";

export type ObservationSignalKind =
  | "downloads_pile"
  | "installer_pile"
  | "archive_pile"
  | "audio_work"
  | "image_pile"
  | "daw_active"
  | "music_playing"
  | "video_playing"
  | "long_idle"
  | "user_returned"
  | "code_work"
  | "settings_open"
  | "fullscreen"
  | "gaming";

export type ObservationSignal = {
  kind: ObservationSignalKind;
  strength: number; // 0.0-1.0
  summary: string;
};

function folderSignals(folder: FolderSummary | undefined, source: "downloads" | "desktop"): ObservationSignal[] {
  if (!folder) return [];
  const signals: ObservationSignal[] = [];

  if (folder.installerPileLikely) {
    signals.push({ kind: "installer_pile", strength: 0.8, summary: `${source}にインストーラーがある` });
  }
  if (folder.archivePileLikely) {
    signals.push({ kind: "archive_pile", strength: 0.6, summary: `${source}に圧縮ファイルが増えてる` });
  }
  if (folder.audioExportLikely) {
    signals.push({ kind: "audio_work", strength: 0.7, summary: `${source}に音声書き出しがある` });
  }
  if (folder.imagePileLikely && folder.imageExportLikely) {
    signals.push({ kind: "image_pile", strength: 0.5, summary: `${source}に画像が溜まってる` });
  }
  if (folder.dawProjectLikely) {
    signals.push({ kind: "daw_active", strength: 0.8, summary: "DAWプロジェクトがある" });
  }
  if (!folder.installerPileLikely && !folder.archivePileLikely && folder.fileCount > 50 && source === "downloads") {
    signals.push({ kind: "downloads_pile", strength: 0.4, summary: "Downloadsにファイルが溜まってる" });
  }

  return signals;
}

export function buildObservationSignals(snapshot: ObservationSnapshot): ObservationSignal[] {
  const signals: ObservationSignal[] = [];

  // アイドル
  const idleMs = snapshot.idle.idleMs;
  if (idleMs >= 30 * 60 * 1000) {
    signals.push({ kind: "long_idle", strength: 1.0, summary: "長い間離席中" });
  } else if (idleMs >= 5 * 60 * 1000) {
    signals.push({ kind: "long_idle", strength: 0.5, summary: "しばらく操作なし" });
  }

  // フルスクリーン
  if (snapshot.fullscreenLikely) {
    const cat = snapshot.activeApp?.category ?? "unknown";
    if (cat === "game") {
      signals.push({ kind: "gaming", strength: 0.9, summary: "ゲームっぽい" });
    } else {
      signals.push({ kind: "fullscreen", strength: 0.7, summary: "フルスクリーン中" });
    }
  }

  // メディア
  if (snapshot.media?.audioLikelyActive) {
    const kind = snapshot.media.mediaKind;
    if (kind === "music") {
      signals.push({ kind: "music_playing", strength: 0.8, summary: "音楽が流れてる" });
    } else if (kind === "video") {
      signals.push({ kind: "video_playing", strength: 0.8, summary: "動画を見てる" });
    }
  }

  // アクティブアプリ
  const cat = snapshot.activeApp?.category;
  if (cat === "daw") {
    signals.push({ kind: "daw_active", strength: 0.9, summary: "DAWで作業中" });
  } else if (cat === "ide") {
    signals.push({ kind: "code_work", strength: 0.8, summary: "コードを書いてる" });
  } else if (cat === "self") {
    signals.push({ kind: "settings_open", strength: 0.5, summary: "設定を開いてる" });
  }

  // フォルダシグナル
  signals.push(...folderSignals(snapshot.folders?.downloads, "downloads"));
  signals.push(...folderSignals(snapshot.folders?.desktop, "desktop"));

  // 重複を kind でdedup（最初のものを優先）
  const seen = new Set<string>();
  return signals.filter((s) => {
    if (seen.has(s.kind)) return false;
    seen.add(s.kind);
    return true;
  });
}

export function topSignal(signals: ObservationSignal[]): ObservationSignal | null {
  if (signals.length === 0) return null;
  return signals.reduce((best, cur) => cur.strength > best.strength ? cur : best);
}
