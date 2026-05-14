// ルールベース AI プロバイダー
// Ollama 未設定時のフォールバック。CompanionContext を見て文脈的な短文を返す。

import type { AIProvider, AIProviderOutput, CompanionContext } from "./types";
import type { InferredActivity } from "../activity/inferActivity";
import { buildVoiceFallback } from "../../systems/voice/voiceFallback";

// ────────────────────────────────────────────────
// テキストプール定義
// ────────────────────────────────────────────────

// クリック/voice時のactivity別返答 (ユーザーが呼びかけた場合)
const CLICK_BY_ACTIVITY: Readonly<Record<InferredActivity, readonly string[]>> = {
  deepFocus:      ["...なに？", "ここにいるよ", "集中してたんだ", "呼んだ？"],
  coding:         ["...呼んだ？", "コードの中にいたね", "なに？", "ここにいたよ"],
  composing:      ["音の部屋から来た", "...なに？", "ここにいるよ", "音の中にいたね"],
  browsing:       ["調べものしてたね", "...なに？", "呼んだ？", "ここにいるよ"],
  reading:        ["読んでたみたい", "...ん？", "ここにいるよ", "呼んだ？"],
  watchingVideo:  ["見てた途中か", "...なに？", "邪魔しちゃった", "呼んだ？"],
  listeningMusic: ["音が流れてたね", "...なに？", "呼んだ？", "ここにいるよ"],
  gaming:         ["ゲーム中だったね", "...なに？", "お疲れ", "呼んだ？"],
  idle:           ["...呼んだ？", "少し間があったみたい", "ここにいるよ", "うん、いたよ"],
  away:           ["戻ってきた", "おかえり", "...いた", "久しぶり"],
  breakLikely:    ["少し休んでたね", "...ん？", "ここにいるよ", "呼んだ？"],
  design:         ["デザインしてたんだ", "...なに？", "ここにいるよ", "呼んだ？"],
  notes:          ["書いてたんだね", "...なに？", "ここにいるよ", "呼んだ？"],
  document:       ["読んでたみたい", "...なに？", "ここにいるよ", "呼んだ？"],
  unknown:        ["...なに？", "ここにいるよ", "呼んだ？", "うん"],
};

// voice入力あり (transcript がある場合) のactivity別返答
const VOICE_BY_ACTIVITY: Readonly<Record<InferredActivity, readonly string[]>> = {
  deepFocus:      ["集中してた。なに？", "...なに？", "ここにいる。なに？"],
  coding:         ["コードの話？", "...なに？", "聞こえてる。なに？"],
  composing:      ["音の話？なに？", "...なに？", "聞こえてる"],
  browsing:       ["調べてたね。なに？", "...なに？", "聞こえてる"],
  reading:        ["読んでたみたい。なに？", "...ん？", "聞こえてる"],
  watchingVideo:  ["見てたんだ。なに？", "...なに？", "聞こえてる"],
  listeningMusic: ["音が流れてたね。なに？", "...なに？", "聞こえてる"],
  gaming:         ["ゲーム中だったね。なに？", "...なに？", "聞こえてる"],
  idle:           ["...なに？", "呼んだ？", "聞こえてる"],
  away:           ["戻ってきたんだ。なに？", "...いた。なに？", "おかえり。なに？"],
  breakLikely:    ["少し休んでたね。なに？", "...なに？", "聞こえてる"],
  design:         ["デザインしてたんだ。なに？", "...なに？", "聞こえてる"],
  notes:          ["書いてたんだね。なに？", "...なに？", "聞こえてる"],
  document:       ["読んでたみたい。なに？", "...なに？", "聞こえてる"],
  unknown:        ["...なに？", "呼んだ？", "聞こえてる"],
};

// observation/idle トリガーのactivity別返答 (自律発話向け)
// 空配列 = このactivityでは発話しない
const OBSERVATION_BY_ACTIVITY: Readonly<Partial<Record<InferredActivity, readonly string[]>>> = {
  deepFocus:      [],
  coding:         [
    "コードの中にいるみたい",
    "同じ場所に、少し長くいるみたい",
    "何か作ってるんだろうな",
    "ずっと同じところを触ってる気がする",
    "ここにいる",
    "なんか動いてる",
  ],
  composing:      [
    "音の部屋にいるね",
    "音の方に、しばらくいるみたい",
    "音が出てくる前のやつを触ってる",
    "ずっと音の中にいるね",
  ],
  browsing:       [
    "調べものの中にいるね",
    "同じ場所を見てるみたい",
    "何かを追ってる気配",
    "ずっとブラウザの中にいる",
    "また調べてる",
    "探してるのかな",
  ],
  reading:        [
    "読む時間に入ってる",
    "静かに読んでるみたい",
    "何かじっくり見てるんだろうな",
    "ゆっくりしてる感じ",
  ],
  watchingVideo:  [],
  listeningMusic: [
    "音が流れてる",
    "耳の方で考えてるみたい",
    "音楽がずっと続いてる",
    "音のそばで作業してる",
  ],
  gaming:         [],
  idle:           [
    "少し間がある",
    "ここにいるよ",
    "静かだ",
    "今どこにいるんだろう",
    "ちょっとだけ間がある",
    "何もしてない時間",
  ],
  away:           [
    "席を外してた気配",
    "少し離れてたみたい",
    "戻ってくる気配がする",
    "少し間があいた",
  ],
  breakLikely:    [
    "少し間がある",
    "休んでるのかな",
    "ここで待ってるよ",
    "ちょっとだけ静か",
  ],
  design:         [
    "デザインしてるみたい",
    "画面の見た目を触ってる感じ",
    "何か形にしてるのかな",
    "じっくり見てるね",
  ],
  notes:          [
    "何か書いてるみたい",
    "まとめてるのかな",
    "ノートの中にいるね",
    "書く時間に入ってる",
  ],
  document:       [
    "ドキュメントを見てるみたい",
    "何か読んでるのかな",
    "じっくり確認してる感じ",
  ],
  unknown:        [
    "ここにいるよ",
    "何かしてるみたい",
    "ずっと何か触ってるね",
    "静かに動いてる",
    "うん、いる",
  ],
};

// suggestion 系発話 (activity に関わらず使える; signal が出たときだけ)
const SUGGESTION_POOL = [
  "Downloadsが少し増えてる。あとでまとめて整理できそう",
  "デスクトップに物が増えてきてる。気になったら片付けてみるといいかも",
  "インストーラーが残ってる気がする。終わったら消せるかも",
  "圧縮ファイルが溜まってるみたい。あとでいい",
  "音声書き出しっぽいものがある。作業が進んでるんだろうな",
  "コードのプロジェクトがある。そっちにいるのかな",
];

// check-in 系 (長い idle / away 復帰後)
const CHECK_IN_POOL = [
  "久しぶり",
  "戻ってきた",
  "また会ったね",
  "ここにいたよ",
  "お疲れ",
  "間があいたね",
];

// question 系 (呼びかけに対して使える)
const QUESTION_POOL = [
  "何してたの",
  "今どんな感じ",
  "調子はどう",
];

// creative prompt 系 (composing / design / 音楽系のとき)
const CREATIVE_POOL = [
  "音、どこまで進んだんだろう",
  "作ってるもの、形になってきた？",
  "何かを作ってる気配がする",
  "デザインが動いてる感じ",
];

// technical prompt 系 (coding / terminal のとき)
const TECHNICAL_POOL = [
  "コード、詰まってる？",
  "ビルド通ってるといいな",
  "何かと戦ってる感じがする",
  "ここから見てると、頑張ってるのが分かる",
];

// folder pile 返答 (confidence が低くても常に返す)
const DOWNLOADS_PILE = [
  "Downloadsが少し積もってる。今じゃなくていいけど、机の端にある",
  "Downloads、あとで見るものが増えてるかも",
  "Downloadsに何かたまってる。急がなくていいけど",
];
const DESKTOP_PILE = [
  "デスクトップに少し物が増えてる。あとで広げればいい",
  "Desktopに色々たまってきてる",
  "デスクトップが少しにぎやかになってる",
];

// ────────────────────────────────────────────────
// 重複回避ロールバッファ
// ────────────────────────────────────────────────

function normalizeLine(line: string): string {
  return line.replace(/[、。！？…\s]/g, "");
}

function recentSpeechTexts(ctx: CompanionContext, limit = 5): string[] {
  return ctx.recentEvents
    .filter((e) => e.type === "speech_shown" && typeof e.data?.text === "string")
    .slice(-limit)
    .map((e) => String(e.data?.text));
}

function pickFromPool(pool: readonly string[], history: string[], maxRecent = 3, recentTexts: readonly string[] = []): string | null {
  if (pool.length === 0) return null;
  const recentNormalized = recentTexts.map(normalizeLine);
  const available = pool.filter((l) => {
    const normalized = normalizeLine(l);
    return !history.includes(l) && !recentNormalized.includes(normalized);
  });
  const candidates = available.length > 0 ? available : [...pool];
  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  history.push(picked);
  if (history.length > maxRecent) history.shift();
  return picked;
}

// ────────────────────────────────────────────────
// RuleProvider 本体
// ────────────────────────────────────────────────

export class RuleProvider implements AIProvider {
  readonly name = "rule";
  readonly kind = "rule" as const;

  private readonly _history: string[] = [];

  async isAvailable(): Promise<boolean> { return true; }

  async respond(ctx: CompanionContext): Promise<AIProviderOutput> {
    const sp  = ctx.speechSettings;
    const obs = ctx.observation;
    const memory = ctx.memorySummary;
    const recentTexts = recentSpeechTexts(ctx);

    // ── SpeechPolicy チェック ─────────────────────────────
    if (sp.doNotDisturb)                                          return { shouldSpeak: false, reason: "dnd" };
    if (obs.fullscreenLikely && sp.suppressWhenFullscreen)        return { shouldSpeak: false, reason: "fullscreen" };
    if (sp.quietMode && (ctx.trigger === "idle" || ctx.trigger === "observation")) {
      return { shouldSpeak: false, reason: "quiet" };
    }
    if (sp.focusMode && (ctx.trigger === "idle" || ctx.trigger === "observation")) {
      return { shouldSpeak: false, reason: "focus" };
    }

    const kind       = ctx.activityInsight.kind;
    const confidence = ctx.activityInsight.confidence;
    const media      = obs.media;
    const dlCount    = obs.folders.downloads?.fileCount ?? 0;
    const dtCount    = obs.folders.desktop?.fileCount   ?? 0;

    // ── click / voice / manual / wake / return ──────────────
    if (
      ctx.trigger === "click" ||
      ctx.trigger === "voice" ||
      ctx.trigger === "text" ||
      ctx.trigger === "manual" ||
      ctx.trigger === "wake" ||
      ctx.trigger === "return"
    ) {
      if ((ctx.trigger === "voice" || ctx.trigger === "text") && ctx.voiceInput?.trim()) {
        return { text: buildVoiceFallback(ctx.voiceInput, ctx), shouldSpeak: true, emotion: "aware" };
      }

      const useVoice = ctx.trigger === "voice" && !!ctx.voiceInput;
      const pool = [
        ...(useVoice ? VOICE_BY_ACTIVITY[kind] : CLICK_BY_ACTIVITY[kind]),
        ...contextualManualPool(memory),
      ];

      if (confidence < 0.5) {
        const fallbacks = ["...なに？", "ここにいるよ", "呼んだ？", "うん"];
        const text = pickFromPool(fallbacks, this._history, 3, recentTexts);
        return { text: text ?? "...なに？", shouldSpeak: true, emotion: "aware" };
      }

      const text = pickFromPool(pool, this._history, 3, recentTexts);
      return { text: text ?? "...なに？", shouldSpeak: true, emotion: "aware" };
    }

    // ── idle (ランダム独り言タイマーから) ────────────────────
    if (ctx.trigger === "idle") {
      if (kind === "deepFocus" || kind === "gaming" || kind === "watchingVideo") {
        return { shouldSpeak: false, reason: "silent_mode" };
      }
      if (memory.todaySpeechCount >= 60) {
        return { shouldSpeak: false, reason: "talked_enough_today" };
      }

      // creative/technical プールを activity に応じて混ぜる
      const extraPool =
        (kind === "composing" || kind === "design") ? CREATIVE_POOL :
        (kind === "coding")                          ? TECHNICAL_POOL :
        [];

      const basePool = OBSERVATION_BY_ACTIVITY[kind] ?? OBSERVATION_BY_ACTIVITY.unknown ?? [];
      const pool = [...basePool, ...extraPool, ...contextualIdlePool(memory)];
      if (pool.length === 0) return { shouldSpeak: false };

      const text = pickFromPool(pool, this._history, 4, recentTexts);
      if (!text) return { shouldSpeak: false };
      return { text, shouldSpeak: true, emotion: "idle" };
    }

    // ── observation (ファイル増加・状態変化観察) ─────────────
    if (ctx.trigger === "observation") {
      // folder pile 優先
      if (dlCount > 20) {
        const text = pickFromPool(DOWNLOADS_PILE, this._history, 3, recentTexts);
        return { text: text ?? DOWNLOADS_PILE[0], shouldSpeak: true, emotion: "aware" };
      }
      if (dtCount > 15) {
        const text = pickFromPool(DESKTOP_PILE, this._history, 3, recentTexts);
        return { text: text ?? DESKTOP_PILE[0], shouldSpeak: true, emotion: "aware" };
      }

      // signal ベースの suggestion
      const signals = ctx.signals ?? [];
      if (signals.length > 0) {
        const sigText = pickFromPool(SUGGESTION_POOL, this._history, 3, recentTexts);
        if (sigText) return { text: sigText, shouldSpeak: true, emotion: "aware" };
      }

      // media が流れている場合は静かにする
      if (media?.audioLikelyActive && kind !== "gaming" && kind !== "watchingVideo") {
        return { shouldSpeak: false };
      }

      // activity 別の observation 発話 (unknown も含む)
      const pool = OBSERVATION_BY_ACTIVITY[kind] ?? OBSERVATION_BY_ACTIVITY.unknown ?? [];
      if (pool.length === 0) return { shouldSpeak: false };
      const text = pickFromPool(pool, this._history, 4, recentTexts);
      if (!text) return { shouldSpeak: false };
      return { text, shouldSpeak: true, emotion: "idle" };
    }

    return { shouldSpeak: false };
  }
}

function contextualManualPool(memory: CompanionContext["memorySummary"]): string[] {
  const pool: string[] = [];
  if (memory.todayClickCount >= 10) {
    pool.push("今日は、よく呼ばれるね", "また呼んだね");
  } else if (memory.todayClickCount >= 4) {
    pool.push("何度か会ってるね");
  }

  if (memory.sessionCountToday >= 3) {
    pool.push("また来たね", "何度か戻ってきてる");
  }

  return pool;
}

function contextualIdlePool(memory: CompanionContext["memorySummary"]): string[] {
  const pool: string[] = [];
  if (memory.sessionCountToday >= 2 && memory.todaySpeechCount < 4) {
    pool.push("また、ここにいるね");
  }
  if (memory.todayClickCount >= 10 && memory.todaySpeechCount < 5) {
    pool.push("今日は、よく呼ばれるね");
  }
  return pool;
}

// check-in / question / creative プールのエクスポート (テスト・外部参照用)
export { CHECK_IN_POOL, QUESTION_POOL, CREATIVE_POOL, TECHNICAL_POOL };
