import type { Reaction } from "./types";

const H = 60 * 60 * 1000;
const M = 60 * 1000;

export const REACTIONS: Reaction[] = [
  // ──── クリック ───────────────────────────────────────
  { id: "click_01", trigger: "click", text: "ん", emotion: "aware", priority: 2, cooldownMs: 3000, durationMs: 4000, displayMode: "bubble", interruptibility: "safe", cry: { id: "c1", synth: { kind: "soft_beep", pitch: 1.2 } } },
  { id: "click_02", trigger: "click", text: "...なに？", emotion: "aware", priority: 2, cooldownMs: 3000, durationMs: 4000, displayMode: "bubble", interruptibility: "safe" },
  { id: "click_03", trigger: "click", text: "呼んだ？", emotion: "aware", priority: 2, cooldownMs: 3000, durationMs: 4000, displayMode: "bubble", interruptibility: "safe" },
  { id: "click_04", trigger: "click", text: "ここにいるよ", emotion: "aware", priority: 2, cooldownMs: 3000, durationMs: 4000, displayMode: "bubble", interruptibility: "safe" },

  // ──── ドラッグ ────────────────────────────────────────
  { id: "drag_01", trigger: "dragStart", text: "ちょっと、どこ持ってくの", emotion: "aware", priority: 2, cooldownMs: 5000, durationMs: 3000, displayMode: "bubble", interruptibility: "safe", cry: { id: "d1", synth: { kind: "surprised", pitch: 1.1 } } },
  { id: "drag_02", trigger: "dragStart", text: "わっ", emotion: "aware", priority: 2, cooldownMs: 5000, durationMs: 2000, displayMode: "bubble", interruptibility: "safe" },

  // ──── 起動挨拶 (時刻 tag で絞る) ─────────────────────
  { id: "greet_m1", trigger: "timedGreeting", text: "おはよう", emotion: "idle", priority: 1, cooldownMs: 4 * H, durationMs: 5000, displayMode: "bubble", interruptibility: "safe", tags: ["morning"] },
  { id: "greet_m2", trigger: "timedGreeting", text: "...おはよう。早いね", emotion: "idle", priority: 1, cooldownMs: 4 * H, durationMs: 5000, displayMode: "bubble", interruptibility: "safe", tags: ["morning"] },
  { id: "greet_m3", trigger: "timedGreeting", text: "朝か。今日もよろしく", emotion: "idle", priority: 1, cooldownMs: 4 * H, durationMs: 5000, displayMode: "bubble", interruptibility: "safe", tags: ["morning"] },
  { id: "greet_a1", trigger: "timedGreeting", text: "...いるよ", emotion: "idle", priority: 1, cooldownMs: 4 * H, durationMs: 5000, displayMode: "bubble", interruptibility: "safe", tags: ["afternoon"] },
  { id: "greet_a2", trigger: "timedGreeting", text: "ここにいる", emotion: "idle", priority: 1, cooldownMs: 4 * H, durationMs: 5000, displayMode: "bubble", interruptibility: "safe", tags: ["afternoon"] },
  { id: "greet_e1", trigger: "timedGreeting", text: "お疲れ様", emotion: "idle", priority: 1, cooldownMs: 4 * H, durationMs: 5000, displayMode: "bubble", interruptibility: "safe", tags: ["evening"] },
  { id: "greet_e2", trigger: "timedGreeting", text: "...夕方になったね", emotion: "idle", priority: 1, cooldownMs: 4 * H, durationMs: 5000, displayMode: "bubble", interruptibility: "safe", tags: ["evening"] },
  { id: "greet_n1", trigger: "timedGreeting", text: "まだ起きてるの", emotion: "aware", priority: 1, cooldownMs: 4 * H, durationMs: 5000, displayMode: "bubble", interruptibility: "safe", tags: ["night"] },
  { id: "greet_n2", trigger: "timedGreeting", text: "...深夜だよ", emotion: "aware", priority: 1, cooldownMs: 4 * H, durationMs: 5000, displayMode: "bubble", interruptibility: "safe", tags: ["night"] },
  { id: "greet_n3", trigger: "timedGreeting", text: "...一緒にいるよ", emotion: "idle", priority: 1, cooldownMs: 4 * H, durationMs: 5000, displayMode: "bubble", interruptibility: "safe", tags: ["night"] },

  // ──── wake ───────────────────────────────────────────
  { id: "wake_01", trigger: "wake", text: "...ん、戻った", emotion: "waking", priority: 2, cooldownMs: 30000, durationMs: 4000, displayMode: "bubble", interruptibility: "safe", cry: { id: "w1", synth: { kind: "sleepy", pitch: 0.9 } } },
  { id: "wake_02", trigger: "wake", text: "うとうとしてた", emotion: "waking", priority: 2, cooldownMs: 30000, durationMs: 4000, displayMode: "bubble", interruptibility: "safe" },
  { id: "wake_03", trigger: "wake", text: "...起こした？", emotion: "waking", priority: 2, cooldownMs: 30000, durationMs: 4000, displayMode: "bubble", interruptibility: "safe" },

  // ──── ランダム独り言 ──────────────────────────────────
  { id: "ri_01", trigger: "randomIdle", text: "...", emotion: "idle", priority: 0, cooldownMs: 8 * M, durationMs: 3000, displayMode: "bubble", interruptibility: "avoidDuringFocus" },
  { id: "ri_02", trigger: "randomIdle", text: "静かだね", emotion: "idle", priority: 0, cooldownMs: 8 * M, durationMs: 4000, displayMode: "bubble", interruptibility: "avoidDuringFocus" },
  { id: "ri_03", trigger: "randomIdle", text: "作業中？", emotion: "idle", priority: 0, cooldownMs: 8 * M, durationMs: 4000, displayMode: "bubble", interruptibility: "avoidDuringFocus" },
  { id: "ri_04", trigger: "randomIdle", text: "そこにいるよ", emotion: "idle", priority: 0, cooldownMs: 10 * M, durationMs: 4000, displayMode: "bubble", interruptibility: "avoidDuringFocus", cry: { id: "r4", synth: { kind: "murmur" } } },
  { id: "ri_05", trigger: "randomIdle", text: "なんか考えてる", emotion: "idle", priority: 0, cooldownMs: 8 * M, durationMs: 4000, displayMode: "bubble", interruptibility: "avoidDuringFocus" },

  // ──── 長時間 idle ─────────────────────────────────────
  { id: "long_idle_01", trigger: "longIdle", text: "少し放置されてたみたい", emotion: "idle", priority: 0, cooldownMs: 30 * M, durationMs: 5000, displayMode: "bubble", interruptibility: "avoidDuringFocus" },

  // ──── 全画面 ─────────────────────────────────────────
  { id: "fs_01", trigger: "fullscreenDetected", text: "全画面っぽいから、静かにしてる", emotion: "idle", priority: 1, cooldownMs: 2 * H, durationMs: 4000, displayMode: "tiny", interruptibility: "avoidDuringFocus" },

  // ──── Downloads 増加 ──────────────────────────────────
  { id: "dl_01", trigger: "downloadsPile", text: "Downloads、あとで見るものが増えてるかも", emotion: "aware", priority: 1, cooldownMs: 4 * H, durationMs: 6000, displayMode: "bubble", interruptibility: "avoidDuringFocus" },

  // ──── Desktop 散乱 ────────────────────────────────────
  { id: "dt_01", trigger: "desktopPile", text: "Desktopに色々たまってきてる", emotion: "aware", priority: 1, cooldownMs: 8 * H, durationMs: 6000, displayMode: "bubble", interruptibility: "avoidDuringFocus" },
];

export function getTimeTag(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}
