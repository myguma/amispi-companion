// 吹き出しコンポーネント
// テキストを短く表示してフェードアウトする
// キャラクター上部に配置

import type { LastAIResultDebug } from "../companion/ai/types";

interface SpeechBubbleProps {
  text: string | null;
  debugMode?: boolean;
  aiResult?: LastAIResultDebug;
}

export function SpeechBubble({ text, debugMode = false, aiResult }: SpeechBubbleProps) {
  if (!text) return null;

  return (
    <div className="speech-bubble" role="status" aria-live="polite">
      {debugMode && aiResult && aiResult.source !== "none" && (
        <span className="speech-bubble-ai-badge">
          {aiResult.source}{aiResult.model ? ` / ${aiResult.model}` : ""}{aiResult.status ? ` / ${aiResult.status}` : ""}
        </span>
      )}
      <span>{text}</span>
      {/* 吹き出しの三角形 */}
      <div className="speech-bubble-tail" aria-hidden="true" />
    </div>
  );
}
