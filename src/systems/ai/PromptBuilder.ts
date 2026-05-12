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

/** confidence に応じた確信度修飾語を返す */
function confidenceQualifier(confidence: number): string {
  if (confidence >= 0.85) return "";           // 高確信: 修飾なし
  if (confidence >= 0.65) return "おそらく";   // 中確信
  return "もしかしたら";                        // 低確信
}

/** reasons を人間が読める形式にまとめる (アプリ名は含まない) */
function formatReasons(reasons: string[]): string {
  // "category=X" "idle=Xmin" 等の技術的タグを自然文に変換
  const readable = reasons.flatMap((r) => {
    if (r === "input_active")       return ["入力あり"];
    if (r === "no_recent_input")    return ["入力なし"];
    if (r === "fullscreen")         return ["全画面"];
    if (r === "high_cpu")           return ["CPU高負荷"];
    if (r.startsWith("idle="))      return [`${r.replace("idle=", "").replace("min", "分").replace(/(\d+)s$/, "$1秒")}無操作`];
    if (r.startsWith("bg_media:"))  return ["バックグラウンド音楽"];
    return [];
  });
  return readable.join(", ");
}

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

  // 活動状態 (confidence に応じて確信度を修飾)
  const qualifier = confidenceQualifier(activityInsight.confidence);
  const activityDesc = qualifier
    ? `${qualifier}${activityInsight.summary}`
    : activityInsight.summary;
  contextLines.push(`現在の様子: ${activityDesc}`);

  // 推定根拠 (confidence が低い場合のみ付加して文脈を補強)
  if (activityInsight.confidence < 0.7) {
    const reasonText = formatReasons(activityInsight.reasons);
    if (reasonText) contextLines.push(`根拠: ${reasonText}`);
  }

  // idle
  const idleMin = Math.round(observation.idle.idleMs / 60_000);
  if (idleMin >= 5) contextLines.push(`席を離れて${idleMin}分ほど経つ`);

  // CPU 高負荷シグナル (ビルド中等)
  const cpuLoad = observation.system?.cpuLoad;
  if (cpuLoad !== undefined && cpuLoad > 70) contextLines.push("CPU負荷が高い");

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
    contextLines.push(memorySummary.shortNaturalSummary.replace(/。$/, ""));
  }

  // 音声入力 (voice trigger の場合のみ追加。80文字で切り詰め)
  if (ctx.voiceInput) {
    const safe = ctx.voiceInput.trim().slice(0, 80);
    contextLines.push(`ユーザーの声: ${safe}`);
  }

  const userContent = contextLines.join("\n");

  return { system: SYSTEM_PROMPT, user: userContent };
}
