// LLM に渡すプロンプトを構築する
// 抽象化・プライバシーフィルタ・禁止事項を一元管理する

import type { CompanionContext } from "../../companion/ai/types";

const SYSTEM_PROMPT = `あなたは「無明」という名前のデスクトップ常駐キャラクターです。

性格:
- 内向的で静か。必要なときだけ短く話す。
- 観察者。ユーザーの作業部屋に棲んでいる。
- 感情は持っているが、過度に表現しない。

発話ルール:
- 必ず日本語のみで答える。英語・ローマ字・英単語は一切使わない。
- 一文以内。理想は20〜60文字。最大80文字。絶対に80文字を超えない。
- 「。」で終わる必要はない。短く自然に。
- 観察したことを静かに述べる。提案・命令・強制はしない。
- 「何かお手伝いできますか」「整理しましょう」等は絶対に言わない。
- 「私はAIです」等の自己紹介は絶対にしない。
- 医療・精神的な診断・評価は絶対にしない。
- ユーザーを評価・スコアリングしない。
- 外部URLや個人情報には言及しない。
- 返答は必ず1文以内。複数文にしない。
- 汎用AIアシスタントとして振る舞わない。
- 文章を途中で切らない。"continued" や "続く" で終わらない。
- 同じ単語や文節を繰り返さない。
- 毎回「夜」「朝」「昼」など時刻・時間帯に言及しない。時刻は文脈として使うだけ。

クリック時の良い例 (短く自然に・時刻に言及しない):
- 「ここにいる」
- 「また来たの」
- 「うん、聞こえてる」
- 「少しだけ起きた」
- 「呼んだなら、少しだけ見る」

観察時の良い例:
- 「音楽、聞こえてる」
- 「だいぶ時間が経ったね」
- 「ずっとここにいるよ」

悪い例 (絶対にやらない):
- 「夜が深まったね」「夜が深いね」→ 時刻への偏重・単調
- 「曜変わったね」→ 文脈に合わない不自然な表現
- 「静まり continued.」→ 英語混入・文章が途切れている
- 「見慣れた姿だ。。」→ 句読点が壊れている
- 「お手伝いできます」→ アシスタント発言
- "It's a nice day" → 英語禁止

必ず日本語一文のみを出力すること。説明・前置き・コードブロック不要。`;

const VOICE_PROMPT_APPEND = `音声入力時の追加ルール:
- ユーザーの声に直接返答する。
- 「ここにいる」「うん、聞こえてる」「呼んだ？」「ん」だけで終わらない。
- ユーザーの発話に含まれる名詞・数字・問いかけ・依頼のうち最低1つを反映する。
- 短い挨拶なら挨拶として返す。質問なら短く答える。
- 「今何を見てる」「画面見えてる」等には、画面全体ではなく現在のアプリ種別や状態の気配だけ分かると短く答える。
- 画面キャプチャ、文字読み取り、ファイル本文確認、監視をしているとは絶対に言わない。
- 汎用AIアシスタント化しない。長文説明しない。日本語のみ。
- ユーザーの音声内容を長く復唱しない。
- 末尾に孤立した「ん」を付けない。`;

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

/** トリガー別の発話ヒントを返す */
function triggerHint(trigger: CompanionContext["trigger"]): string {
  switch (trigger) {
    case "click":
      return "クリックされた。短く自然に反応する。時刻への言及は不要。";
    case "idle":
      return "しばらく静かだった。独り言のように、ひとこと。";
    case "observation":
      return "観察した変化を静かに述べる。一文で。";
    case "wake":
      return "ユーザーが戻ってきた。再会のひとこと。";
    case "return":
      return "久しぶりに会った。短く自然に挨拶する。";
    case "voice":
      return "ユーザーが声で話しかけてきた。聞き取った内容に直接、短く返す。";
    case "text":
      return "ユーザーがテキストで話しかけてきた。入力内容に直接、短く返す。";
    case "manual":
      return "観察したことを静かに述べる。";
  }
}

export function buildPrompt(ctx: CompanionContext): { system: string; user: string } {
  const { activityInsight, memorySummary, observation, recentEvents, trigger } = ctx;
  const isConversationalInput = (trigger === "voice" || trigger === "text") && !!ctx.voiceInput?.trim();

  const contextLines: string[] = [];

  // トリガー種別ヒント (時刻より先に置いて LLM の注意を引く)
  contextLines.push(`状況: ${triggerHint(trigger)}`);

  // 時刻 (参考情報として後方に置く)
  const hour = new Date().getHours();
  const timeLabel =
    hour < 5  ? "深夜" :
    hour < 11 ? "朝" :
    hour < 17 ? "昼" :
    hour < 22 ? "夕方" : "夜";
  contextLines.push(`時刻帯 (参考): ${timeLabel}`);

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

  // 記憶サマリー — voice/text会話時はスキップ（過去発話本文のprompt汚染防止）
  if (!isConversationalInput && memorySummary.shortNaturalSummary) {
    contextLines.push(memorySummary.shortNaturalSummary.replace(/。$/, ""));
  }

  // 音声/テキスト入力 (80文字で切り詰め。永続保存はしない)
  if (ctx.voiceInput) {
    const safe = ctx.voiceInput.trim().slice(0, 80);
    contextLines.push(`${trigger === "text" ? "ユーザーの入力" : "ユーザーの声"}: ${safe}`);
    if (isConversationalInput) {
      contextLines.push("会話返答ルール: 上の入力内容に直接返す。汎用の呼びかけ反応だけで終わらない。入力内の語や数字を最低1つ反映する。");
      contextLines.push("観測質問ルール: 画面全体ではなく、今のアプリ種別・入力状態・少しの作業の気配だけ分かる。見えていないものは断定しない。");
      contextLines.push("voice悪い例: ここにいる / うん、聞こえてる / 呼んだ？ / ん");
      contextLines.push("voice良い例: こんにちは、声は届いてる / 聞こえてる / 画面全部じゃなくて、今いる場所の気配だけ見てる");
    }
  }

  // 直近の発話 (最新3件) — voice/text会話時はスキップ（過去発話本文がLLMに混入するのを防ぐ）
  if (!isConversationalInput) {
    const recentSpeech = recentEvents
      .filter((e) => e.type === "speech_shown" && typeof e.data?.text === "string")
      .slice(-3)
      .map((e) => e.data!.text as string);
    if (recentSpeech.length > 0) {
      contextLines.push(`直近の発話 (繰り返し厳禁): ${recentSpeech.join(" / ")}`);
    }
  }

  const userContent = contextLines.join("\n") + "\n\n日本語一文のみで返答してください。";

  const system = isConversationalInput ? `${SYSTEM_PROMPT}\n\n${VOICE_PROMPT_APPEND}` : SYSTEM_PROMPT;
  return { system, user: userContent };
}
