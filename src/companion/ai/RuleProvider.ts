// ルールベース AI プロバイダー
// Ollama 未設定時のフォールバック。CompanionContext を見て文脈的な短文を返す。

import type { AIProvider, AIProviderOutput, CompanionContext } from "./types";
import type { InferredActivity } from "../activity/inferActivity";

// ────────────────────────────────────────────────
// テキストプール定義
// ────────────────────────────────────────────────

// クリック/voice時のactivity別返答 (ユーザーが呼びかけた場合)
const CLICK_BY_ACTIVITY: Readonly<Record<InferredActivity, readonly string[]>> = {
  deepFocus:      ["...なに？", "ここにいるよ", "集中してたんだ"],
  coding:         ["...呼んだ？", "コードの中にいたね", "なに？"],
  composing:      ["音の部屋から来た", "...なに？", "ここにいるよ"],
  browsing:       ["調べものしてたね", "...なに？", "呼んだ？"],
  reading:        ["読んでたみたい", "...ん？", "ここにいるよ"],
  watchingVideo:  ["見てた途中か", "...なに？", "邪魔しちゃった"],
  listeningMusic: ["音が流れてたね", "...なに？", "呼んだ？"],
  gaming:         ["ゲーム中だったね", "...なに？", "お疲れ"],
  idle:           ["...呼んだ？", "少し間があったみたい", "ここにいるよ"],
  away:           ["戻ってきた", "おかえり", "...いた"],
  breakLikely:    ["少し休んでたね", "...ん？", "ここにいるよ"],
  unknown:        ["...なに？", "ここにいるよ", "呼んだ？"],
};

// voice入力あり (transcript がある場合) のactivity別返答
const VOICE_BY_ACTIVITY: Readonly<Record<InferredActivity, readonly string[]>> = {
  deepFocus:      ["集中してた。なに？", "...なに？"],
  coding:         ["コードの話？", "...なに？"],
  composing:      ["音の話？なに？", "...なに？"],
  browsing:       ["調べてたね。なに？", "...なに？"],
  reading:        ["読んでたみたい。なに？", "...ん？"],
  watchingVideo:  ["見てたんだ。なに？", "...なに？"],
  listeningMusic: ["音が流れてたね。なに？", "...なに？"],
  gaming:         ["ゲーム中だったね。なに？", "...なに？"],
  idle:           ["...なに？", "呼んだ？"],
  away:           ["戻ってきたんだ。なに？", "...いた。なに？"],
  breakLikely:    ["少し休んでたね。なに？", "...なに？"],
  unknown:        ["...なに？", "呼んだ？"],
};

// observation/idle トリガーのactivity別返答 (自律発話向け)
// 空配列 = このactivityでは発話しない
const OBSERVATION_BY_ACTIVITY: Readonly<Partial<Record<InferredActivity, readonly string[]>>> = {
  deepFocus:      [],
  coding:         ["コードの中にいる。今は流れを切らない方がよさそう"],
  composing:      ["音の部屋にいるね。今日は形を触っている感じ"],
  browsing:       ["調べものが少し長い。ひとつだけ手に戻すなら、今でも間に合う"],
  reading:        ["読む時間に入ってる。急がなくてよさそう"],
  watchingVideo:  [],
  listeningMusic: ["音が流れてる。今日は耳の方で考えてるみたい"],
  gaming:         [],
  idle:           ["少し離れてたみたい。戻るなら小さくでいい"],
  away:           ["席を外してた気配。まだ何も急がなくていい"],
  breakLikely:    ["少し間がある"],
};

// folder pile 返答 (confidence が低くても常に返す)
const DOWNLOADS_PILE = [
  "Downloadsが少し積もってる。今じゃなくていいけど、机の端にある",
  "Downloads、あとで見るものが増えてるかも",
];
const DESKTOP_PILE = [
  "デスクトップに少し物が増えてる。あとで広げればいい",
  "Desktopに色々たまってきてる",
];

// ────────────────────────────────────────────────
// 重複回避ロールバッファ
// ────────────────────────────────────────────────

function pickFromPool(pool: readonly string[], history: string[], maxRecent = 2): string | null {
  if (pool.length === 0) return null;
  const available = pool.filter((l) => !history.includes(l));
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

  // 直近の発話を activity 別に記憶 (重複防止)
  private readonly _history: string[] = [];

  async isAvailable(): Promise<boolean> { return true; }

  async respond(ctx: CompanionContext): Promise<AIProviderOutput> {
    const sp  = ctx.speechSettings;
    const obs = ctx.observation;

    // ── SpeechPolicy チェック ─────────────────────────────
    if (sp.doNotDisturb)                                          return { shouldSpeak: false, reason: "dnd" };
    if (obs.fullscreenLikely && sp.suppressWhenFullscreen)        return { shouldSpeak: false, reason: "fullscreen" };
    if (sp.quietMode && ctx.trigger === "idle")                   return { shouldSpeak: false, reason: "quiet" };

    const kind       = ctx.activityInsight.kind;
    const confidence = ctx.activityInsight.confidence;
    const media      = obs.media;
    const dlCount    = obs.folders.downloads?.fileCount ?? 0;
    const dtCount    = obs.folders.desktop?.fileCount   ?? 0;

    // ── click / voice / manual / wake / return ──────────────
    if (
      ctx.trigger === "click" ||
      ctx.trigger === "voice" ||
      ctx.trigger === "manual" ||
      ctx.trigger === "wake" ||
      ctx.trigger === "return"
    ) {
      // voiceInput があれば voice 専用プールを使う
      const useVoice = ctx.trigger === "voice" && !!ctx.voiceInput;
      const pool = useVoice ? VOICE_BY_ACTIVITY[kind] : CLICK_BY_ACTIVITY[kind];

      // confidence が低い場合はより汎用的な返答にフォールバック
      if (confidence < 0.5) {
        const fallbacks = ["...なに？", "ここにいるよ", "呼んだ？"];
        const text = pickFromPool(fallbacks, this._history);
        return { text: text ?? "...なに？", shouldSpeak: true, emotion: "aware" };
      }

      const text = pickFromPool(pool, this._history);
      return { text: text ?? "...なに？", shouldSpeak: true, emotion: "aware" };
    }

    // ── idle (ランダム独り言タイマーから) ────────────────────
    if (ctx.trigger === "idle") {
      // deepFocus / gaming / watching中は発話しない
      if (kind === "deepFocus" || kind === "gaming" || kind === "watchingVideo") {
        return { shouldSpeak: false, reason: "silent_mode" };
      }

      const pool = OBSERVATION_BY_ACTIVITY[kind];
      if (!pool || pool.length === 0) return { shouldSpeak: false };

      const text = pickFromPool(pool, this._history);
      if (!text) return { shouldSpeak: false };
      return { text, shouldSpeak: true, emotion: "idle" };
    }

    // ── observation (ファイル増加・状態変化観察) ─────────────
    if (ctx.trigger === "observation") {
      // folder pile 優先
      if (dlCount > 20) {
        const text = pickFromPool(DOWNLOADS_PILE, this._history);
        return { text: text ?? DOWNLOADS_PILE[0], shouldSpeak: true, emotion: "aware" };
      }
      if (dtCount > 15) {
        const text = pickFromPool(DESKTOP_PILE, this._history);
        return { text: text ?? DESKTOP_PILE[0], shouldSpeak: true, emotion: "aware" };
      }

      // media が流れている場合
      if (media?.audioLikelyActive && kind !== "gaming" && kind !== "watchingVideo") {
        return { shouldSpeak: false };
      }

      // activity 別の observation 発話
      const pool = OBSERVATION_BY_ACTIVITY[kind];
      if (!pool || pool.length === 0) return { shouldSpeak: false };
      const text = pickFromPool(pool, this._history);
      if (!text) return { shouldSpeak: false };
      return { text, shouldSpeak: true, emotion: "idle" };
    }

    return { shouldSpeak: false };
  }
}
