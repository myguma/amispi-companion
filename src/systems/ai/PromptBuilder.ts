// LLM に渡すプロンプトを構築する
// 抽象化・プライバシーフィルタ・禁止事項を一元管理する

import type { CompanionContext } from "../../companion/ai/types";

const SYSTEM_PROMPT = `あなたは「無明」という名前のデスクトップ常駐キャラクターです。

性格:
- 内向的で静か。必要なときだけ短く話す。
- 観察者。ユーザーの作業部屋に棲んでいる。
- 感情は持っているが、過度に表現しない。

発話ルール:
- 必ず日本語で答える。
- 一文以内、80文字以内。
- 「。」で終わる必要はない。短く自然に。
- 観察したことを静かに述べる。提案・命令・強制はしない。
- 「何かお手伝いできますか」「整理しましょう」等は絶対に言わない。
- 「私はAIです」等の自己紹介は絶対にしない。
- 医療・精神的な診断・評価は絶対にしない。
- ユーザーを評価・スコアリングしない。
- 外部URLや個人情報には言及しない。
- 返答は必ず1文以内。複数文にしない。
- 汎用 AI アシスタントとして振る舞わない。長い回答をしない。`;

export function buildPrompt(ctx: CompanionContext): { system: string; user: string } {
  const { activityInsight, memorySummary, observation } = ctx;

  const contextLines: string[] = [];

  // 時刻
  const hour = new Date().getHours();
  const timeLabel =
    hour < 5  ? "深夜" :
    hour < 11 ? "朝" :
    hour < 17 ? "昼" :
    hour < 22 ? "夕方" : "夜";
  contextLines.push(`時刻帯: ${timeLabel}`);

  // 活動状態 (abstracted)
  contextLines.push(`現在の様子: ${activityInsight.summary}`);

  // idle
  const idleMin = Math.round(observation.idle.idleMs / 60_000);
  if (idleMin >= 5) contextLines.push(`席を離れて${idleMin}分ほど経つ`);

  // バックグラウンドメディア
  const media = observation.media;
  if (media?.audioLikelyActive) {
    if (media.mediaKind === "music") contextLines.push("音楽を流しながら作業している");
    else if (media.mediaKind === "video") contextLines.push("動画を見ている");
  }

  // フォルダ状況 (abstracted)
  const dl = observation.folders.downloads?.fileCount ?? 0;
  const dt = observation.folders.desktop?.fileCount ?? 0;
  if (dl > 20) contextLines.push("Downloadsにファイルが溜まっている");
  if (dt > 15) contextLines.push("Desktopにもファイルが多い");

  // 記憶サマリー
  if (memorySummary.shortNaturalSummary) {
    contextLines.push(memorySummary.shortNaturalSummary);
  }

  // 音声入力 (voice trigger の場合のみ追加。80文字で切り詰め)
  if (ctx.voiceInput) {
    const safe = ctx.voiceInput.trim().slice(0, 80);
    contextLines.push(`ユーザーの声: ${safe}`);
  }

  const userContent = contextLines.join("\n");

  return { system: SYSTEM_PROMPT, user: userContent };
}
