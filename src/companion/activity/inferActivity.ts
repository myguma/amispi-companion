// 観測スナップショットから現在の活動状態を推定する純粋モジュール
// 注意: observation/types.ts の ActivityKind とは別型 (名前衝突回避のため InferredActivity)

import type { ObservationSnapshot } from "../../observation/types";

export type InferredActivity =
  | "coding"         // IDE / terminal 使用中
  | "composing"      // DAW / 音楽制作
  | "browsing"       // ブラウザ通常使用 (アクティブ操作中)
  | "reading"        // ブラウザ等で記事・文書を読んでいる (入力なし)
  | "watchingVideo"  // 動画視聴 (全画面またはメディアアプリ)
  | "listeningMusic" // 音楽再生 (非全画面メディア)
  | "gaming"         // ゲーム
  | "deepFocus"      // IDE + 短い idle → 集中作業中
  | "idle"           // 軽い idle (5-30分)
  | "away"           // 長時間離席 (30分超)
  | "breakLikely"    // office / unknown + 中程度 idle
  | "unknown";       // 判定不能

export type ActivityInsight = {
  kind: InferredActivity;
  confidence: number; // 0.0 ~ 1.0
  reasons: string[];  // デバッグ用の推定根拠 (アプリ名は含まない)
  summary: string;    // LLM プロンプトや UI に使う自然文 (日本語)
};

const AWAY_MS    = 30 * 60 * 1000; // 30分
const IDLE_MS    =  5 * 60 * 1000; // 5分
const FOCUS_MS   =      60 * 1000; // 1分 — deepFocus 候補
const READING_MS =      30 * 1000; // 30秒以上 browser 無入力 → reading 候補
const HIGH_CPU   = 70;             // % — コンパイル等の目安

export function inferActivity(snapshot: ObservationSnapshot): ActivityInsight {
  const idle        = snapshot.idle.idleMs;
  const inputActive = snapshot.idle.inputActiveRecently;
  const cat         = snapshot.activeApp?.category;
  const fs          = snapshot.fullscreenLikely;
  const cpuLoad     = snapshot.system?.cpuLoad;

  // ── 離席 (最優先) ─────────────────────────────────────────────
  if (idle >= AWAY_MS) {
    return {
      kind: "away", confidence: 0.95,
      reasons: [`idle>${Math.round(idle / 60000)}min`],
      summary: "しばらく離れている",
    };
  }

  // ── ゲーム ────────────────────────────────────────────────────
  if (cat === "game") {
    const reasons = ["category=game"];
    if (fs) reasons.push("fullscreen");
    return { kind: "gaming", confidence: fs ? 0.95 : 0.88, reasons, summary: "ゲーム中" };
  }

  // ── DAW / 音楽制作 ────────────────────────────────────────────
  if (cat === "daw") {
    const reasons = ["category=daw"];
    if (cpuLoad !== undefined && cpuLoad > HIGH_CPU) reasons.push("high_cpu");
    return { kind: "composing", confidence: 0.9, reasons, summary: "音の部屋にいる" };
  }

  // ── IDE ───────────────────────────────────────────────────────
  if (cat === "ide") {
    const reasons: string[] = ["category=ide"];
    if (cpuLoad !== undefined && cpuLoad > HIGH_CPU) reasons.push("high_cpu");

    if (idle < FOCUS_MS) {
      if (inputActive) reasons.push("input_active");
      return {
        kind: "deepFocus",
        confidence: inputActive ? 0.92 : 0.8,
        reasons: [...reasons, "idle<1min"],
        summary: "コードに集中している",
      };
    }

    // 高 CPU + IDE → ビルド中の可能性
    if (cpuLoad !== undefined && cpuLoad > HIGH_CPU) {
      return {
        kind: "coding", confidence: 0.82, reasons,
        summary: "何かビルドしている",
      };
    }

    return {
      kind: "coding", confidence: 0.78,
      reasons: [...reasons, `idle=${Math.round(idle / 60000)}min`],
      summary: "コードを触っている",
    };
  }

  // ── ターミナル ────────────────────────────────────────────────
  if (cat === "terminal") {
    const reasons: string[] = ["category=terminal"];
    if (inputActive) reasons.push("input_active");
    return {
      kind: "coding",
      confidence: inputActive ? 0.8 : 0.7,
      reasons,
      summary: "ターミナルで作業中",
    };
  }

  // ── メディアアプリ ────────────────────────────────────────────
  if (cat === "media") {
    if (fs) {
      return { kind: "watchingVideo", confidence: 0.88, reasons: ["category=media", "fullscreen"], summary: "動画を見ている" };
    }
    return { kind: "listeningMusic", confidence: 0.75, reasons: ["category=media", "windowed"], summary: "音楽を流している" };
  }

  // ── ブラウザ ──────────────────────────────────────────────────
  if (cat === "browser") {
    if (fs) {
      return { kind: "watchingVideo", confidence: 0.82, reasons: ["category=browser", "fullscreen"], summary: "ブラウザで動画を見ている" };
    }
    // 入力がしばらくない → 読み物中の可能性
    if (!inputActive && idle >= READING_MS && idle < IDLE_MS) {
      return {
        kind: "reading",
        confidence: 0.65,
        reasons: ["category=browser", "no_recent_input", `idle=${Math.round(idle / 1000)}s`],
        summary: "何かを読んでいる",
      };
    }
    if (idle < IDLE_MS) {
      return {
        kind: "browsing",
        confidence: inputActive ? 0.75 : 0.65,
        reasons: ["category=browser", inputActive ? "input_active" : "windowed"],
        summary: "ブラウザで調べている",
      };
    }
  }

  // ── バックグラウンド音楽 ──────────────────────────────────────
  const media = snapshot.media;
  if (media?.audioLikelyActive && media.mediaKind === "music") {
    return {
      kind: "listeningMusic", confidence: 0.65,
      reasons: [`bg_media:${media.sourceCategory}`],
      summary: "音楽を流しながら作業中",
    };
  }

  // ── office 系 ─────────────────────────────────────────────────
  if (cat === "office") {
    if (idle >= IDLE_MS) {
      return { kind: "breakLikely", confidence: 0.6, reasons: ["category=office", "idle>=5min"], summary: "少し休んでいるかも" };
    }
    const reasons: string[] = ["category=office"];
    if (inputActive) reasons.push("input_active");
    return { kind: "browsing", confidence: 0.55, reasons, summary: "書類を触っている" };
  }

  // ── 軽い idle ─────────────────────────────────────────────────
  if (idle >= IDLE_MS) {
    return {
      kind: "idle", confidence: 0.7,
      reasons: [`idle=${Math.round(idle / 60000)}min`],
      summary: "少し間がある",
    };
  }

  // ── 分類不能 ──────────────────────────────────────────────────
  if (inputActive) {
    return { kind: "unknown", confidence: 0.35, reasons: ["input_active", "no_category_match"], summary: "何かしている" };
  }
  return { kind: "unknown", confidence: 0.3, reasons: ["no_strong_signal"], summary: "何かしている" };
}

/** ActivityInsight をプロンプト用の短い日本語テキストに変換する */
export function activityToPromptHint(insight: ActivityInsight): string {
  return insight.summary;
}
