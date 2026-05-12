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
  { id: "long_idle_01", trigger: "longIdle", text: "少し、離れてた？", emotion: "idle", priority: 0, cooldownMs: 30 * M, durationMs: 5000, displayMode: "bubble", interruptibility: "avoidDuringFocus" },
  { id: "long_idle_02", trigger: "longIdle", text: "戻ってきた。", emotion: "idle", priority: 0, cooldownMs: 30 * M, durationMs: 5000, displayMode: "bubble", interruptibility: "avoidDuringFocus" },
  { id: "long_idle_03", trigger: "longIdle", text: "...いた。", emotion: "idle", priority: 0, cooldownMs: 30 * M, durationMs: 4000, displayMode: "bubble", interruptibility: "avoidDuringFocus" },

  // ──── 全画面 ─────────────────────────────────────────
  { id: "fs_01", trigger: "fullscreenDetected", text: "静かにするね。", emotion: "idle", priority: 1, cooldownMs: 20 * M, durationMs: 3500, displayMode: "tiny", interruptibility: "avoidDuringFocus" },
  { id: "fs_02", trigger: "fullscreenDetected", text: "見てる。黙ってる。", emotion: "idle", priority: 1, cooldownMs: 20 * M, durationMs: 3500, displayMode: "tiny", interruptibility: "avoidDuringFocus" },

  // ──── メディア視聴 ────────────────────────────────────
  { id: "media_01", trigger: "mediaDetected", text: "見てるね。静かにする。", emotion: "idle", priority: 1, cooldownMs: 30 * M, durationMs: 3500, displayMode: "tiny", interruptibility: "avoidDuringFocus" },
  { id: "media_02", trigger: "mediaDetected", text: "...邪魔しない。", emotion: "idle", priority: 1, cooldownMs: 30 * M, durationMs: 3500, displayMode: "tiny", interruptibility: "avoidDuringFocus" },

  // ──── ゲーム中 ────────────────────────────────────────
  { id: "game_01", trigger: "gamingDetected", text: "……がんばれ。", emotion: "idle", priority: 1, cooldownMs: 30 * M, durationMs: 3500, displayMode: "tiny", interruptibility: "avoidDuringFocus" },
  { id: "game_02", trigger: "gamingDetected", text: "邪魔しない。", emotion: "idle", priority: 1, cooldownMs: 30 * M, durationMs: 3000, displayMode: "tiny", interruptibility: "avoidDuringFocus" },

  // ──── Downloads 増加 ──────────────────────────────────
  { id: "dl_01", trigger: "downloadsPile", text: "Downloads、あとで見るものが増えてるかも", emotion: "aware", priority: 1, cooldownMs: 4 * H, durationMs: 6000, displayMode: "bubble", interruptibility: "avoidDuringFocus" },

  // ──── Desktop 散乱 ────────────────────────────────────
  { id: "dt_01", trigger: "desktopPile", text: "Desktopに色々たまってきてる", emotion: "aware", priority: 1, cooldownMs: 8 * H, durationMs: 6000, displayMode: "bubble", interruptibility: "avoidDuringFocus" },

  // ──── 連打 ───────────────────────────────────────────
  { id: "oc_01", trigger: "overClicked", text: "いる。いるよ。", emotion: "aware", priority: 3, cooldownMs: 3 * M, durationMs: 4000, displayMode: "bubble", interruptibility: "safe", cry: { id: "oc1", synth: { kind: "surprised", pitch: 1.3, durationMs: 120 } } },
  { id: "oc_02", trigger: "overClicked", text: "そんなに呼ばなくても……", emotion: "aware", priority: 3, cooldownMs: 3 * M, durationMs: 4000, displayMode: "bubble", interruptibility: "safe" },
  { id: "oc_03", trigger: "overClicked", text: "……落ち着いて。", emotion: "aware", priority: 3, cooldownMs: 3 * M, durationMs: 4000, displayMode: "bubble", interruptibility: "safe" },

  // ──── 起動: 休憩あけ ──────────────────────────────────
  { id: "rab_01", trigger: "returnAfterBreak", text: "……おかえり。", emotion: "idle", priority: 1, cooldownMs: 24 * H, durationMs: 5000, displayMode: "bubble", interruptibility: "safe" },
  { id: "rab_02", trigger: "returnAfterBreak", text: "少し、時間あいたね。", emotion: "idle", priority: 1, cooldownMs: 24 * H, durationMs: 5000, displayMode: "bubble", interruptibility: "safe" },
  { id: "rab_03", trigger: "returnAfterBreak", text: "また、ここにいる。", emotion: "idle", priority: 1, cooldownMs: 24 * H, durationMs: 5000, displayMode: "bubble", interruptibility: "safe" },

  // ──── 起動: 長期休憩あけ (1日以上) ────────────────────
  { id: "ralb_01", trigger: "returnAfterLongBreak", text: "……おかえり。久しぶり。", emotion: "idle", priority: 1, cooldownMs: 24 * H, durationMs: 6000, displayMode: "bubble", interruptibility: "safe" },
  { id: "ralb_02", trigger: "returnAfterLongBreak", text: "昨日ぶり、かな。", emotion: "idle", priority: 1, cooldownMs: 24 * H, durationMs: 5000, displayMode: "bubble", interruptibility: "safe" },
  { id: "ralb_03", trigger: "returnAfterLongBreak", text: "また来た。", emotion: "idle", priority: 1, cooldownMs: 24 * H, durationMs: 4000, displayMode: "bubble", interruptibility: "safe" },

  // ──── 活動遷移 (composing 開始) ──────────────────────
  { id: "at_composing_01", trigger: "activityTransition", text: "音の方に入ったみたい。少し静かにしてる。", emotion: "idle", priority: 1, cooldownMs: 30 * M, durationMs: 4500, displayMode: "tiny", interruptibility: "avoidDuringFocus", tags: ["composing_start"] },
  { id: "at_composing_02", trigger: "activityTransition", text: "制作に入った気配。邪魔しない。", emotion: "idle", priority: 1, cooldownMs: 30 * M, durationMs: 4000, displayMode: "tiny", interruptibility: "avoidDuringFocus", tags: ["composing_start"] },

  // ──── 活動遷移 (coding 開始) ─────────────────────────
  { id: "at_coding_01", trigger: "activityTransition", text: "コードに入った。流れを切らないでおく。", emotion: "idle", priority: 1, cooldownMs: 30 * M, durationMs: 4500, displayMode: "tiny", interruptibility: "avoidDuringFocus", tags: ["coding_start"] },
  { id: "at_coding_02", trigger: "activityTransition", text: "作業に戻ったみたい。黙ってる。", emotion: "idle", priority: 1, cooldownMs: 30 * M, durationMs: 4000, displayMode: "tiny", interruptibility: "avoidDuringFocus", tags: ["coding_start"] },

  // ──── 活動遷移 (音楽再生 開始) ───────────────────────
  { id: "at_music_01", trigger: "activityTransition", text: "音楽が始まった。", emotion: "idle", priority: 0, cooldownMs: 20 * M, durationMs: 3500, displayMode: "tiny", interruptibility: "avoidDuringFocus", tags: ["music_start"] },
  { id: "at_music_02", trigger: "activityTransition", text: "音が流れてる。", emotion: "idle", priority: 0, cooldownMs: 20 * M, durationMs: 3000, displayMode: "tiny", interruptibility: "avoidDuringFocus", tags: ["music_start"] },

  // ──── 活動遷移 (離席から復帰) ────────────────────────
  { id: "at_return_01", trigger: "activityTransition", text: "戻ってきた。小さく始めればいい。", emotion: "idle", priority: 1, cooldownMs: 20 * M, durationMs: 5000, displayMode: "bubble", interruptibility: "safe", tags: ["return_from_away"] },
  { id: "at_return_02", trigger: "activityTransition", text: "……おかえり。", emotion: "idle", priority: 1, cooldownMs: 20 * M, durationMs: 4000, displayMode: "bubble", interruptibility: "safe", tags: ["return_from_away"] },
];

export function getTimeTag(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}
