// 観測スナップショットから現在の活動状態を推定する純粋モジュール
// 注意: observation/types.ts の ActivityKind とは別型 (名前衝突回避のため InferredActivity)

import type { ObservationSnapshot } from "../../observation/types";

export type InferredActivity =
  | "coding"        // IDE / terminal 使用中
  | "composing"     // DAW / 音楽制作
  | "browsing"      // ブラウザ通常使用
  | "watchingVideo" // 動画視聴 (全画面またはメディアアプリ)
  | "listeningMusic"// 音楽再生 (非全画面メディア)
  | "gaming"        // ゲーム
  | "deepFocus"     // IDE + 短い idle → 集中作業中
  | "idle"          // 軽い idle (5-30分)
  | "away"          // 長時間離席 (30分超)
  | "breakLikely"   // office / unknown + 中程度 idle
  | "unknown";      // 判定不能

export type ActivityInsight = {
  kind: InferredActivity;
  confidence: number; // 0.0 ~ 1.0
  reasons: string[];  // デバッグ用の推定根拠
  summary: string;    // LLM プロンプトや UI に使う自然文 (日本語)
};

const AWAY_MS    = 30 * 60 * 1000;
const IDLE_MS    = 5 * 60 * 1000;
const FOCUS_MS   = 60 * 1000; // 1分以内なら deepFocus の候補

export function inferActivity(snapshot: ObservationSnapshot): ActivityInsight {
  const idle = snapshot.idle.idleMs;
  const cat  = snapshot.activeApp?.category;
  const fs   = snapshot.fullscreenLikely;

  // 離席
  if (idle >= AWAY_MS) {
    return { kind: "away", confidence: 0.95, reasons: ["idle > 30min"], summary: "しばらく離れている" };
  }

  // ゲーム
  if (cat === "game") {
    return { kind: "gaming", confidence: 0.9, reasons: ["category=game"], summary: "ゲーム中" };
  }

  // DAW / 音楽制作
  if (cat === "daw") {
    return { kind: "composing", confidence: 0.9, reasons: ["category=daw"], summary: "音の部屋にいる" };
  }

  // IDE
  if (cat === "ide") {
    if (idle < FOCUS_MS) {
      return { kind: "deepFocus", confidence: 0.85, reasons: ["category=ide", "idle<1min"], summary: "コードに集中している" };
    }
    return { kind: "coding", confidence: 0.8, reasons: ["category=ide"], summary: "コードを触っている" };
  }

  // ターミナル
  if (cat === "terminal") {
    return { kind: "coding", confidence: 0.75, reasons: ["category=terminal"], summary: "ターミナルで作業中" };
  }

  // メディアアプリ
  if (cat === "media") {
    if (fs) {
      return { kind: "watchingVideo", confidence: 0.85, reasons: ["category=media", "fullscreen"], summary: "動画を見ている" };
    }
    return { kind: "listeningMusic", confidence: 0.75, reasons: ["category=media", "!fullscreen"], summary: "音楽を流している" };
  }

  // ブラウザ
  if (cat === "browser") {
    if (fs) {
      return { kind: "watchingVideo", confidence: 0.8, reasons: ["category=browser", "fullscreen"], summary: "ブラウザで動画を見ている" };
    }
    if (idle < IDLE_MS) {
      return { kind: "browsing", confidence: 0.7, reasons: ["category=browser", "active"], summary: "ブラウザで調べている" };
    }
  }

  // バックグラウンドで音楽アプリが起動中
  const media = snapshot.media;
  if (media?.audioLikelyActive && media.mediaKind === "music") {
    return { kind: "listeningMusic", confidence: 0.65, reasons: [`bg_media:${media.sourceCategory}`], summary: "音楽を流しながら作業中" };
  }

  // office 系 + idle
  if (cat === "office") {
    if (idle >= IDLE_MS) {
      return { kind: "breakLikely", confidence: 0.6, reasons: ["category=office", "idle>=5min"], summary: "少し休んでいるかも" };
    }
    return { kind: "browsing", confidence: 0.55, reasons: ["category=office"], summary: "書類を触っている" };
  }

  // 軽い idle
  if (idle >= IDLE_MS) {
    return { kind: "idle", confidence: 0.7, reasons: ["idle>=5min"], summary: "少し間がある" };
  }

  return { kind: "unknown", confidence: 0.3, reasons: ["no strong signal"], summary: "何かしている" };
}

/** ActivityInsight をプロンプト用の短い日本語テキストに変換する */
export function activityToPromptHint(insight: ActivityInsight): string {
  return insight.summary;
}
